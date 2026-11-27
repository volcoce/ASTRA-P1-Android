#!/usr/bin/env python3
"""B6: isolated, reproducible CSS regression evidence. Never modifies production."""
import argparse
import csv
import hashlib
import json
import os
import platform
import shutil
import subprocess
import sys
from collections import Counter, defaultdict
from pathlib import Path
from PIL import Image, ImageChops
from importlib.metadata import version

ROOT = Path(__file__).resolve().parents[1]
REFS = {
    'baseline': '1f3790dc760322d7bf8b90e8b7822e5bf91a00bd',
    'b1': 'c5d2735edb9ab7f2be6b1ee8619ead385447279f',
    'b2': '666a85ea96787cc889050f9dc58aea2e2bde0e69',
    'b5': '8191a4ba01ca6c9ff8897d4d273adfa626d43f62',
}
OUT = ROOT / 'tests/artifacts/b6'
SHOT_DIRS = ('screenshots', 'p1-screenshots', 'ui-catalog')

def run(args, cwd=ROOT, env=None):
    print('+', ' '.join(map(str,args)), flush=True)
    subprocess.run(list(map(str,args)), cwd=cwd, env=env, check=True)

def output(args, cwd=ROOT):
    return subprocess.check_output(args, cwd=cwd, text=True).strip()

def read(path):
    return json.loads(path.read_text(encoding='utf-8'))

def write(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def capture(label, ref, dest, repeat=False):
    work = dest / 'checkout'
    dest.mkdir(parents=True)
    run(['git','worktree','add','--detach',work,ref])
    try:
        env = {**os.environ,'TZ':'UTC','LANG':'en_US.UTF-8',
               'ASTRA_SCREENSHOT_DIR':str(work/'tests/artifacts/screenshots')}
        run(['npm','ci'],work,env)
        run(['npm','run','lint:css'],work,env)
        run(['npm','run','bundle'],work,env)
        run(['npm','test'],work,env)
        run([sys.executable,'tests/css-coverage.py'],work,env)
        art = work/'tests/artifacts'
        for name in SHOT_DIRS:
            shutil.copytree(art/name,dest/name)
        shutil.copy2(art/'css-coverage/css-coverage.json',dest/'coverage.json')
        shutil.copy2(art/'ui-referential.json',dest/'geometry.json')
        bundle = work/'app/src/main/assets/astra.bundle.css'
        shutil.copy2(bundle,dest/'astra.bundle.css')
        report=read(dest/'coverage.json')
        if report['commit'] != ref or report['errors'] or report['unmatched_cdp_ranges']:
            raise RuntimeError(f'{label}: invalid coverage')
        if report['bundle_sha256'] != hashlib.sha256(bundle.read_text(encoding='utf-8').encode()).hexdigest():
            raise RuntimeError(f'{label}: bundle hash mismatch')
        manifest={'commit':ref,'bundle_sha256':digest(bundle),
                  'bundle_bytes':bundle.stat().st_size,
                  'lock_sha256':digest(work/'package-lock.json'),
                  'node':output(['node','--version'],work),
                  'npm':output(['npm','--version'],work),
                  'python':sys.version,'playwright':version('playwright'),
                  'pillow':version('Pillow'),'platform':platform.platform()}
        write(dest/'manifest.json',manifest)
    finally:
        run(['git','worktree','remove','--force',work])

def images(root):
    return {p.relative_to(root).as_posix():p for d in SHOT_DIRS
            for p in (root/d).rglob('*.png')}

def compare_images(a,b,dest):
    left,right=images(a),images(b)
    if not left or not right:
        raise RuntimeError('No screenshots')
    diffs=[]
    for name in sorted(left.keys()|right.keys()):
        if name not in left or name not in right:
            diffs.append({'case':name,'status':'missing','side':'before' if name not in left else 'after'})
            continue
        with Image.open(left[name]) as x, Image.open(right[name]) as y:
            x,y=x.convert('RGBA'),y.convert('RGBA')
            if x.size!=y.size:
                diffs.append({'case':name,'status':'dimensions','before':x.size,'after':y.size})
                continue
            delta=ImageChops.difference(x,y)
            channels=delta.split()
            mask=channels[0]
            for ch in channels[1:]:
                mask=ImageChops.lighter(mask,ch)
            changed=sum(mask.histogram()[1:])
            if changed:
                target=dest/name
                target.parent.mkdir(parents=True,exist_ok=True)
                mask.point(lambda v:255 if v else 0).save(target)
                diffs.append({'case':name,'status':'pixels','changed':changed,
                              'total':x.width*x.height,'bounds':mask.getbbox()})
    return {'before':len(left),'after':len(right),'compared':len(left.keys()&right.keys()),
            'differences':diffs}

def signature(r):
    # Exact compiled selector/context/declaration text, not offsets.
    # A changed selector group may be equivalent; report, do not guess.
    return json.dumps([r['context'],r['selector'],r['css']],ensure_ascii=False)

def observed_delta(a,b):
    def index(root):
        rows=defaultdict(list)
        for r in read(root/'coverage.json')['rules']:
            if r['used'] and not r['technical']:
                rows[signature(r)].append(r)
        return rows
    x,y=index(a),index(b)
    removed,added=[],[]
    for k in x.keys()|y.keys():
        n=len(x[k])-len(y[k])
        if n>0: removed.extend(x[k][:n])
        if n<0: added.extend(y[k][:-n])
    return {'removed_or_changed':removed,'added_or_changed':added,
            'net':sum(map(len,y.values()))-sum(map(len,x.values())),
            'note':'Exact compiled signatures only; minifier regrouping and selector pruning require manual reconciliation.'}

def residual(root):
    rows=[]
    for r in read(root/'coverage.json')['rules']:
        if r['technical'] or r['used']: continue
        tags=[]
        if any(c.startswith(('@media ','@supports ','@container ')) for c in r['context']):
            tags.append('conditional')
        import re
        if re.search(r':(?:hover|active|focus(?:-visible|-within)?|visited|disabled|checked|invalid|target|open)\b',r['selector']):
            tags.append('interaction-or-state')
        if re.search(r'\[(?:aria-|data-|hidden\b|open\b|disabled\b)',r['selector']):
            tags.append('attribute-state')
        if '::' in r['selector']: tags.append('pseudo-element')
        if not tags: tags=['unclassified']
        rows.append({'selector':r['selector'],'context':r['context'],'css':r['css'],
                     'source_candidates':r['source_candidates'],'tags':tags,
                     'decision':'retain pending review','start':r['start']})
    return rows

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reuse',action='store_true',help='Compare existing evidence, without rerunning suites')
    args=parser.parse_args()
    OUT.mkdir(parents=True,exist_ok=True)
    refs={**REFS,'baseline-repeat':REFS['baseline'],'b5-repeat':REFS['b5']}
    if not args.reuse:
        for label,ref in refs.items():
            if (OUT/label).exists():
                raise SystemExit(f'Existing evidence: {OUT/label}; move it aside or use --reuse')
        for label,ref in refs.items():
            capture(label,ref,OUT/label)
    manifests={label:read(OUT/label/'manifest.json') for label in refs}
    for label,ref in refs.items():
        if manifests[label]['commit']!=ref: raise RuntimeError('Wrong reference: '+label)
        if digest(OUT/label/'astra.bundle.css')!=manifests[label]['bundle_sha256']:
            raise RuntimeError('Changed bundle: '+label)
        r=read(OUT/label/'coverage.json')
        if r['commit']!=ref or r['errors'] or r['unmatched_cdp_ranges']:
            raise RuntimeError('Invalid coverage: '+label)
    for key in ('lock_sha256','node','npm','python','playwright','pillow','platform'):
        if len({m[key] for m in manifests.values()})!=1:
            raise RuntimeError('Different environments: '+key)
    pairs=[('baseline','baseline-repeat'),('b5','b5-repeat'),('baseline','b5')]
    comparisons={a+'--'+b:compare_images(OUT/a,OUT/b,OUT/'diffs'/(a+'--'+b)) for a,b in pairs}
    write(OUT/'visual.json',comparisons)
    write(OUT/'b2-observed-delta.json',observed_delta(OUT/'b1',OUT/'b2'))
    write(OUT/'final-observed-delta.json',observed_delta(OUT/'baseline',OUT/'b5'))
    rows=residual(OUT/'b5')
    write(OUT/'residual.json',rows)
    with (OUT/'residual.csv').open('w',encoding='utf-8',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=['start','selector','context','tags','source_candidates','decision','css'])
        writer.writeheader()
        for row in rows:
            writer.writerow({k:json.dumps(v,ensure_ascii=False) if isinstance(v,list) else v for k,v in row.items()})
    summary={'visual':{k:{'compared':v['compared'],'differences':len(v['differences'])} for k,v in comparisons.items()},
             'residual_count':len(rows),'residual_tags':dict(Counter(t for r in rows for t in r['tags'])),
             'b2_net_observed':read(OUT/'b2-observed-delta.json')['net'],
             'manual_review_required':['residual dispositions','B2 signature reconciliation','physical Android','CI'],
             'visual_pass':all(not v['differences'] for v in comparisons.values())}
    write(OUT/'summary.json',summary)
    print(json.dumps(summary,ensure_ascii=False,indent=2))
    if not summary['visual_pass']: raise SystemExit(1)

if __name__=='__main__':
    main()

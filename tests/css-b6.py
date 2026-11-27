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


# Applied identically to all historical worktrees, without editing their sources.
# A single screenshot is taken; no retry, mask, tolerance or best-of selection.
def capture_worker(report_path):
    import runpy
    from playwright.sync_api import Page
    original = Page.screenshot
    report = []
    settle = """async () => {
      const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
      const snapshot = () => ({
        viewport: [innerWidth, innerHeight, devicePixelRatio],
        document: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
        fonts: [...document.fonts].map(f => [f.family, f.style, f.weight, f.status]),
        svgText: [...document.querySelectorAll('svg text')].filter(e => e.getClientRects().length).map(e => {
          const b = e.getBBox(), m = e.getScreenCTM(), r = e.getBoundingClientRect(), s = getComputedStyle(e);
          return {text:e.textContent, bbox:[b.x,b.y,b.width,b.height],
            rect:[r.x,r.y,r.width,r.height], matrix:m?[m.a,m.b,m.c,m.d,m.e,m.f]:null,
            length:e.getComputedTextLength(), font:[s.fontFamily,s.fontSize,s.fontWeight,s.fontStyle]};
        })
      });
      let previous = '', consecutive = 0;
      for (let i=0; i<120; i++) {
        await document.fonts.ready;
        await frame();
        const state = snapshot(), key = JSON.stringify(state);
        consecutive = document.fonts.status === 'loaded' && key === previous ? consecutive+1 : 0;
        if (consecutive >= 3) return state;
        previous = key;
      }
      throw new Error('B6 capture: fonts/SVG layout did not stabilize');
    }"""
    def screenshot(page, *args, **kwargs):
        path = kwargs.get('path')
        name = Path(path).name if path else ''
        if not name.startswith('overview-'):
            return original(page, *args, **kwargs)
        before = page.evaluate(settle)
        result = original(page, *args, **kwargs)
        after = page.evaluate(settle)
        report.append({'case': name, 'browser': page.context.browser.version,
                       'before': before, 'after': after})
        if before != after:
            raise RuntimeError(f'{name}: SVG/font geometry changed across capture')
        return result
    Page.screenshot = screenshot
    try:
        tests = Path.cwd() / 'tests'
        sys.path.insert(0, str(tests))
        runpy.run_path(str(tests / 'css-coverage.py'), run_name='__main__')
    finally:
        Page.screenshot = original
        write(report_path, report)
    if len(report) != 7 or len({row['case'] for row in report}) != 7:
        raise RuntimeError('B6 capture: missing overview diagnostics')


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
        run([sys.executable, str(Path(__file__).resolve()), '--capture-worker', str(dest/'capture-diagnostics.json')],work,env)
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
                  'pillow':version('Pillow'),'platform':platform.platform(),
                  'capture_protocol_sha256':digest(Path(__file__).resolve()),
                  'browser_versions':sorted({row['browser'] for row in read(dest/'capture-diagnostics.json')})}
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
    global OUT
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reuse',action='store_true',help='Compare existing evidence, without rerunning suites')
    parser.add_argument('--output-dir', type=Path, default=OUT, help='New evidence directory; preserve prior runs')
    args=parser.parse_args()
    OUT=args.output_dir.resolve()
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
    # Old evidence remains inspectable; do not mix different capture protocols.
    for key in ('capture_protocol_sha256','browser_versions'):
        values={json.dumps(m.get(key),sort_keys=True) for m in manifests.values()}
        if len(values)!=1: raise RuntimeError('Different capture environments: '+key)
    pairs=[('baseline','baseline-repeat'),('b5','b5-repeat'),('baseline','b5'),
           ('baseline-repeat','b5-repeat')]
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
             'visual_pass':all(v['before']==v['after']==v['compared']==103 and not v['differences'] for v in comparisons.values())}
    write(OUT/'summary.json',summary)
    print(json.dumps(summary,ensure_ascii=False,indent=2))
    if not summary['visual_pass']: raise SystemExit(1)

if __name__=='__main__':
    if len(sys.argv)==3 and sys.argv[1]=='--capture-worker':
        capture_worker(Path(sys.argv[2]))
    else:
        main()

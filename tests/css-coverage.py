#!/usr/bin/env python3
"""Measure matched CSS rules across the existing synthetic UI test suites.

CDP offsets are UTF-16 code units in the compiled stylesheet, not file bytes.
Unmatched ranges are candidates for review, never proof of dead CSS.
"""
import hashlib
import html
import json
import os
import runpy
import subprocess
from contextlib import contextmanager
from pathlib import Path
from playwright import sync_api

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tests/artifacts/css-coverage'
SUITES = ('ui-smoke.py', 'ui-referential.py', 'ui-catalog.py')
BUNDLE = ROOT / 'app/src/main/assets/astra.bundle.css'


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    bundle = BUNDLE.read_text(encoding='utf-8')
    encoded = bundle.encode('utf-16-le')
    all_rules = {}
    results = []
    errors = []
    active = {}
    current = None
    original = sync_api.sync_playwright
    originals = []

    def wrap(cls, name, factory):
        old = getattr(cls, name)
        originals.append((cls, name, old))
        setattr(cls, name, factory(old))

    def attach(page):
        if page in active:
            return
        session = page.context.new_cdp_session(page)
        session.send('DOM.enable')
        headers = {}
        session.on('CSS.styleSheetAdded', lambda event: headers.update(
            {event['header']['styleSheetId']: event['header']}))
        session.send('CSS.enable')
        session.send('CSS.startRuleUsageTracking')
        active[page] = (session, headers, current)

    def finish(page):
        item = active.pop(page, None)
        if item is None:
            return
        session, headers, suite = item
        found = False
        count = 0
        try:
            entries = session.send('CSS.stopRuleUsageTracking')['ruleUsage']
            ids = {}
            for entry in entries:
                sid = entry['styleSheetId']
                if sid not in ids:
                    try:
                        source = session.send('CSS.getStyleSheetText', {'styleSheetId': sid})['text']
                        ids[sid] = source == bundle
                    except Exception:
                        ids[sid] = False
                if not ids[sid]:
                    continue
                found = True
                start, end = entry['startOffset'], entry['endOffset']
                if not 0 <= start < end <= len(encoded)//2:
                    raise ValueError(f'Invalid CSS offsets: {start}, {end}')
                record = all_rules.setdefault((start, end), set())
                if entry['used']:
                    record.add(suite)
                count += 1
            results.append({'suite': suite, 'matched_bundle': found, 'entries': count})
            if not found:
                errors.append(f'{suite}: no exact production bundle match')
        except Exception as exc:
            errors.append(f'{suite}: {exc}')
        finally:
            try:
                session.detach()
            except Exception:
                pass

    def new_page(old):
        def call(self, *args, **kwargs):
            page = old(self, *args, **kwargs)
            attach(page)
            return page
        return call

    def close_context(old):
        def call(self, *args, **kwargs):
            for page in list(active):
                if page.context == self:
                    finish(page)
            return old(self, *args, **kwargs)
        return call

    def close_browser(old):
        def call(self, *args, **kwargs):
            for page in list(active):
                if page.context.browser == self:
                    finish(page)
            return old(self, *args, **kwargs)
        return call

    @contextmanager
    def tracked_playwright():
        with original() as pw:
            try:
                yield pw
            finally:
                for page in list(active):
                    finish(page)

    wrap(sync_api.BrowserContext, 'new_page', new_page)
    wrap(sync_api.Browser, 'new_page', new_page)
    wrap(sync_api.BrowserContext, 'close', close_context)
    wrap(sync_api.Browser, 'close', close_browser)
    sync_api.sync_playwright = tracked_playwright
    os.environ.setdefault('ASTRA_SCREENSHOT_DIR', str(ROOT/'tests/artifacts/screenshots'))
    try:
        for current in SUITES:
            try:
                runpy.run_path(str(ROOT/'tests'/current), run_name='__main__')
            except Exception as exc:
                errors.append(f'{current}: test failed: {exc}')
    finally:
        sync_api.sync_playwright = original
        for cls, name, old in reversed(originals):
            setattr(cls, name, old)

    inventory = json.loads(subprocess.check_output(
        ['node', 'tests/css-inventory.mjs'], cwd=ROOT, text=True))
    rules = inventory['rules']
    # Match on exact rule end; CDP may start at the selector or its first token.
    # Reject ambiguous/unmapped observations instead of silently inflating coverage.
    by_end = {}
    for r in rules:
        if not r['technical']:
            by_end.setdefault(r['end'], []).append(r)
        r['suites'] = []
    unmatched = []
    structural = []
    technical_ranges = []
    structures = inventory['structures']
    for (start, end), suites in sorted(all_rules.items()):
        candidates = [r for r in by_end.get(end, []) if r['start'] <= start < end]
        if len(candidates) != 1:
            # Match only exact AST structure boundaries, never broad containment.
            groups = [a for a in structures if
                      (start == a['headerStart'] and end in (a['headerEnd'], a['end']))
                      or (start == a['start'] and end in (a['headerEnd'], a['end']))]
            record = {'start': start, 'end': end, 'suites': sorted(suites)}
            if len(groups) == 1:
                structural.append({**record, 'name': groups[0]['name'], 'params': groups[0]['params']})
            elif any(r['technical'] and r['start'] <= start < end == r['end'] for r in rules):
                technical_ranges.append(record)
            else:
                unmatched.append(record)
            continue
        r = candidates[0]
        r['suites'] = sorted(set(r['suites']) | suites)
    for r in rules:
        r['used'] = bool(r['suites'])
        r['status'] = ('technical' if r['technical'] else 'observed' if r['used']
                       else 'conditional-not-observed' if any(c.startswith(('@media ', '@supports ', '@container ')) for c in r['context'])
                       else 'not-observed')
        r['css'] = encoded[2*r['start']:2*r['end']].decode('utf-16-le')
    eligible = [r for r in rules if not r['technical']]
    used = sum(r['used'] for r in eligible)
    if not eligible or not used or not all(any(p['suite']==s and p['matched_bundle'] for p in results) for s in SUITES):
        errors.append('Missing usable coverage from one or more suites')
    if unmatched:
        errors.append(f'{len(unmatched)} CDP ranges could not be reconciled with the independent inventory')
    summary = {}
    for r in eligible:
        candidates = r['source_candidates']
        files = {c['file'] for c in candidates}
        key = next(iter(files)) if len(files)==1 else '(ambiguous)' if files else '(unmapped)'
        item = summary.setdefault(key, {'compiled_rules': 0, 'observed': 0, 'not_observed': 0})
        item['compiled_rules'] += 1
        item['observed' if r['used'] else 'not_observed'] += 1
    report = {'version': '2.1', 'commit': subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
              'bundle_sha256': hashlib.sha256(bundle.encode()).hexdigest(),
              'offset_unit': 'UTF-16 code units; end exclusive', 'pages': results,
              'rules_inventory': len(rules), 'rules_eligible': len(eligible),
              'rules_technical': len(rules)-len(eligible), 'rules_reported': len(all_rules),
              'rules_used': used, 'rules_not_observed': len(eligible)-used,
              'coverage_percent': round(100*used/len(eligible),2) if eligible else None,
              'source_inventory': inventory['sources'], 'by_source_candidate': summary,
              'structural_cdp_count': len(structural), 'technical_cdp_count': len(technical_ranges),
              'structural_cdp_ranges': structural, 'technical_cdp_ranges': technical_ranges,
              'unmatched_cdp_ranges': unmatched, 'errors': errors, 'rules': rules,
              'limitations': 'Rule matching, not declaration or selector-branch coverage. Source attribution is approximate selector matching, not a source map. Unobserved does not mean dead; technical keyframes excluded.'}
    (OUT/'css-coverage.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    rows = ''.join('<tr><td>'+str(r['start'])+'</td><td>'+html.escape(r['status'])+'</td><td><code>'+html.escape(r['css'])+'</code></td></tr>' for r in rules)
    (OUT/'css-coverage.html').write_text('<!doctype html><meta charset="utf-8"><title>ASTRA CSS coverage</title><style>body{font:16px system-ui;margin:2rem}td{vertical-align:top;padding:.4rem;border-bottom:1px solid #ddd}code{overflow-wrap:anywhere}table{width:100%;table-layout:fixed}td:first-child{width:5rem}td:nth-child(2){width:9rem}</style><h1>ASTRA CSS coverage</h1><p>'+str(used)+' / '+str(len(eligible))+' independently inventoried style rules matched</p><p>'+html.escape(report['limitations'])+'</p><pre>'+html.escape('\n'.join(errors))+'</pre><table>'+rows+'</table>',encoding='utf-8')
    print(f'CSS coverage: {used}/{len(eligible)} inventoried style rules matched; {len(errors)} errors')
    if errors:
        raise SystemExit(1)


if __name__ == '__main__':
    main()

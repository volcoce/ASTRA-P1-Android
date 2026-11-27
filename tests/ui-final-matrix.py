#!/usr/bin/env python3
"""P4 final matrix: 11 interface states × 5 widths × 2 themes.

Uses the established deterministic sky fixture and shipped CSS bundle.
Timing is diagnostic Chromium route-entry latency, not Android performance.
Every case has an explicit result; a missing case is a CI failure.
"""
import json
import runpy
import time
from pathlib import Path
from shutil import which
from playwright.sync_api import sync_playwright

REPO = Path(__file__).resolve().parents[1]
ROOT = REPO / 'app/src/main/assets'
ART = REPO / 'tests/artifacts' / 'p4-final'
REF = runpy.run_path(str(REPO / 'tests/ui-referential.py'))
FIXTURE = REF['FIXTURE']
WIDTHS = ((320,730),(360,780),(393,844),(768,1024),(1280,800))
THEMES = ('light','dark')
SCREENS = (
    ('today','.astra-day-hero'),
    ('calendar','.astra-calendar-board'),
    ('calendar-day','#calendarDayDialog[open]'),
    ('personal-event','#personalEventDialog[open]'),
    ('journal','#journalNote'),
    ('profile','.natal-home'),
    ('explore','.natal-explore'),
    ('compare','.natal-compare'),
    ('birth','#birthForm'),
    ('settings','#astraSettingsDialog[open]'),
    ('natal-detail','#natalSelectionInfo'),
)
EXPECTED = len(WIDTHS)*len(THEMES)*len(SCREENS)
GEOMETRY = """() => {
  const nav=document.querySelector('.bottom-nav'),main=document.querySelector('.main');
  const modal=document.querySelector('dialog[open]');
  const sheet=document.querySelector('#natalSelectionInfo');
  const bounds=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
  const visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility==='visible';
  const surface=modal||sheet;
  return {
    width:innerWidth,height:innerHeight,
    overflow:document.documentElement.scrollWidth-innerWidth,
    main:bounds(main),nav:bounds(nav),
    modal:modal?bounds(modal):null,sheet:sheet?bounds(sheet):null,
    targets:[...(surface||document).querySelectorAll('.bottom-nav .nav,.arrow,.astra-calendar-date-picker')]
      .filter(visible).map(e=>({label:e.getAttribute('aria-label'),...bounds(e)})),
    heading:document.querySelector('h1.page-title')?.textContent||'',
    focusInModal:!modal||modal.contains(document.activeElement),
    dialogs:document.querySelectorAll('dialog[open]').length
  };
}"""

def setup_page(browser,theme):
    context=browser.new_context(viewport={'width':393,'height':844},color_scheme=theme)
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.clock.set_fixed_time(__import__('datetime').datetime(2026,11,23,12,0,tzinfo=__import__('datetime').timezone.utc))
    page.goto('about:blank')
    page.add_script_tag(content=FIXTURE['JS'])
    layout=(REPO/'astro/chart-layout.mjs').read_text()
    layout=layout.replace("import {mod} from './core.mjs';","const mod=(x,n=360)=>((x%n)+n)%n;")
    layout=layout.replace('export const ','const ').replace('export function ','function ')
    page.add_script_tag(content=layout+"\nwindow.ASTRA_ENGINE.layoutPlanetLabels=layoutPlanetLabels;")
    html=(ROOT/'index.html').read_text()
    for tag in ('<script src="runtime.bundle.js"></script><script src="app.js" defer></script>',
                '<link rel="stylesheet" href="astra.bundle.css">',
                '<script src="theme-bootstrap.js"></script>'):
        html=html.replace(tag,'')
    page.set_content(html)
    page.add_script_tag(content=(ROOT/'theme-bootstrap.js').read_text())
    page.add_style_tag(content=(ROOT/'astra.bundle.css').read_text())
    page.evaluate("""theme=>localStorage.setItem('astra-public-v1',JSON.stringify({
        appearance:theme,elementPalette:'vivid',
        profile:{date:'1994-05-12',time:'18:40',timeKnown:true,timezone:'Europe/Paris',
        latitude:48.8534,longitude:2.3488,place:{name:'Paris',label:'Paris · France',latitude:48.8534,longitude:2.3488,timezone:'Europe/Paris'}}
    }))""",theme)
    page.add_script_tag(content=(ROOT/'app.js').read_text())
    page.add_script_tag(path=str(REPO/'node_modules/axe-core/axe.min.js'))
    return context,page,errors

def tab(page,name):
    page.locator('[data-tab="'+name+'"]').click()
    page.locator('[data-tab="'+name+'"][aria-current="page"]').wait_for()

def reset(page):
    # Exercise real close buttons rather than removing dialogs from the DOM.
    for selector in ('#personalEventDialog[open] [data-personal-close]',
                     '#calendarDayDialog[open] [data-calendar-sheet-close]',
                     '#astraSettingsDialog[open] [data-settings-close]',
                     '[data-close-natal-detail]'):
        close=page.locator(selector)
        if close.count() and close.first.is_visible():
            close.first.click()
    tab(page,'today')
    page.locator('.astra-day-hero').wait_for()

def open_screen(page,screen):
    if screen=='today':
        return
    if screen in ('calendar','calendar-day','personal-event'):
        tab(page,'calendar')
        page.locator('.calendar .day[data-day="2026-11-23"]').wait_for()
        if screen!='calendar':
            page.locator('.calendar .day[data-day="2026-11-23"]').click()
        if screen=='personal-event':
            page.locator('[data-personal-new]').click()
        return
    if screen=='journal':
        page.locator('.astra-day-journal-link[data-goto="journal"]').click()
        return
    if screen in ('profile','explore','compare','natal-detail'):
        tab(page,'profile')
        page.locator('.natal-home').wait_for()
        if screen=='explore':
            page.locator('[data-profile-screen="explore"]').click()
        elif screen=='compare':
            page.locator('[data-explore-transits]').click()
        elif screen=='natal-detail':
            page.locator('.natal-wheel [data-natal-body="Sun"]').click()
        return
    if screen in ('birth','settings'):
        page.locator('#settingsButton').click()
        page.locator('#astraSettingsDialog[open]').wait_for()
        page.locator('[data-settings-section="astrology"]').click()
        if screen=='birth':
            page.locator('[data-settings-birth]').click()
        return
    raise ValueError('Unknown screen: '+screen)

def run():
    ART.mkdir(parents=True,exist_ok=True)
    shots=ART/'screenshots'
    shots.mkdir(exist_ok=True)
    report={'expected':EXPECTED,'cases':[],'failures':[],
            'fixture':'synthetic sky, production CSS, Chromium',
            'timing':'route entry to visible selector and two animation frames; diagnostic only'}
    def check(entry,ok,message):
        if not ok:
            entry['failures'].append(message)
    try:
        with sync_playwright() as pw:
            chrome=which('chromium') or which('google-chrome') or which('google-chrome-stable')
            if not chrome:
                raise RuntimeError('Chromium absent')
            browser=pw.chromium.launch(headless=True,executable_path=chrome,args=['--no-sandbox'])
            for theme in THEMES:
                for width,height in WIDTHS:
                    context,page,errors=setup_page(browser,theme)
                    page.set_viewport_size({'width':width,'height':height})
                    page.set_default_timeout(5000)
                    if errors:
                        report['failures'].extend(f'{theme}-{width} startup JavaScript: {error}' for error in errors)
                    reference=None
                    for screen,selector in SCREENS:
                        label=f'{theme}-{width}-{screen}'
                        entry={'case':label,'theme':theme,'width':width,'height':height,
                               'screen':screen,'failures':[]}
                        report['cases'].append(entry)
                        error_start=len(errors)
                        try:
                            reset(page)
                            began=time.perf_counter()
                            open_screen(page,screen)
                            page.locator(selector).first.wait_for()
                            page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
                            entry['route_ms']=round((time.perf_counter()-began)*1000,1)
                            page.evaluate('window.scrollTo(0,0)')
                            g=page.evaluate(GEOMETRY)
                            entry['geometry']=g
                            check(entry,g['overflow']<=1,'document horizontal overflow')
                            check(entry,abs(g['nav']['bottom']-g['height'])<=1,'navigation not anchored')
                            check(entry,g['dialogs']<=1,'overlapping modal dialogs')
                            check(entry,g['focusInModal'],'focus outside open modal')
                            if screen=='today':
                                reference=g['main']
                            if reference:
                                check(entry,abs(g['main']['left']-reference['left'])<=1 and
                                      abs(g['main']['right']-reference['right'])<=1,'inconsistent main gutters')
                            for name in ('modal','sheet'):
                                b=g[name]
                                if b:
                                    check(entry,b['left']>=-1 and b['right']<=width+1,
                                          name+' outside horizontal viewport')
                            for t in g['targets']:
                                check(entry,t['width']>=47.99 and t['height']>=47.99,
                                      'undersized primary target: '+str(t['label']))
                            page.screenshot(path=str(shots/(label+'.png')),animations='disabled')
                            entry['screenshot']='screenshots/'+label+'.png'
                            result=page.evaluate("""async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}})""")
                            entry['axe']=[{'id':v['id'],'impact':v['impact'],
                                           'nodes':[n['target'] for n in v['nodes']],
                                           'details':[{'target':n['target'],'html':n.get('html'),
                                                       'summary':n.get('failureSummary'),
                                                       'checks':[c.get('data') for c in n.get('any',[])]}
                                                      for n in v['nodes']]}
                                          for v in result['violations']]
                            entry['axe_incomplete']=[{'id':v['id'],'nodes':[n['target'] for n in v['nodes']]}
                                                     for v in result['incomplete']]
                            for v in entry['axe']:
                                check(entry,v['impact'] not in ('critical','serious'),
                                      'axe '+v['id']+' '+str(v['details']))
                        except Exception as exc:
                            entry['failures'].append(str(exc))
                        finally:
                            for error in errors[error_start:]:
                                entry['failures'].append('JavaScript: '+error)
                            entry['passed']=not entry['failures']
                            report['failures'].extend(label+': '+msg for msg in entry['failures'])
                            print(label+(': PASS' if entry['passed'] else ': FAIL'),flush=True)
                    context.close()
            browser.close()
    except Exception as exc:
        report['failures'].append(str(exc))
    finally:
        expected={f'{theme}-{width}-{screen}' for theme in THEMES for width,_ in WIDTHS for screen,_ in SCREENS}
        actual=[entry['case'] for entry in report['cases']]
        if set(actual)!=expected or len(actual)!=EXPECTED:
            report['failures'].append('Incomplete or duplicate matrix: '+str(sorted(expected-set(actual))))
        report['executed']=len(actual)
        report['passed']=sum(entry.get('passed',False) for entry in report['cases'])
        (ART/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(f"P4: {report['passed']}/{EXPECTED} configurations passed")
    if report['failures']:
        raise AssertionError('\n'.join(report['failures']))

if __name__=='__main__':
    run()

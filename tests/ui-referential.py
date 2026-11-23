#!/usr/bin/env python3
"""P1 UI contract: production bundle, deterministic synthetic sky, actual Chromium geometry and axe."""
import json
import runpy
from pathlib import Path
from shutil import which
from playwright.sync_api import sync_playwright

REPO = Path(__file__).resolve().parents[1]
ROOT = REPO / 'app/src/main/assets'
ART = REPO / 'tests/artifacts'
SHOTS = ART / 'p1-screenshots'
FIXTURE = runpy.run_path(str(REPO / 'tests/ui-smoke.py'))
WIDTHS = (320, 360, 393, 768, 1280, 1440)
ROUTES = ('today', 'month', 'calendar', 'profile')
GEOMETRY = """() => {
  const main=document.querySelector('.main'),nav=document.querySelector('.bottom-nav');
  const box=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,height:r.height,bottom:r.bottom}};
  const visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility==='visible';
  return {
    overflow:document.documentElement.scrollWidth-innerWidth,
    main:box(main),nav:box(nav),viewport:innerHeight,
    targets:[...document.querySelectorAll('.bottom-nav .nav,.arrow,.astra-calendar-date-picker')]
      .filter(visible).map(e=>({label:e.getAttribute('aria-label'),...box(e)}))
  };
}"""
RIBBON = """() => {
  const lum=rgb=>rgb.reduce((s,n,i)=>{const x=n/255;return s+[.2126,.7152,.0722][i]*(x<=.04045?x/12.92:((x+.055)/1.055)**2.4)},0);
  const rgba=s=>s.match(/[\\d.]+/g).map(Number);
  const results=[];
  for(const el of document.querySelectorAll('.calendar .day .astra-calendar-date-number')){
    const r=el.getBoundingClientRect(),style=getComputedStyle(el);
    const ink=rgba(style.color),own=rgba(style.backgroundColor);
    const week=el.closest('.astra-calendar-date-week');
    const segments=[...week.querySelectorAll('.astra-solar-ribbon-segment')];
    const backgrounds=own[3]!==0?[own]:segments.filter(s=>{
      const b=s.getBoundingClientRect();return b.left<r.right-0.5&&b.right>r.left+0.5;
    }).map(s=>rgba(getComputedStyle(s).backgroundColor));
    for(const bg of backgrounds){
      if(bg[3]===0)continue;
      const a=lum(ink.slice(0,3)),b=lum(bg.slice(0,3));
      results.push({date:el.parentElement.dataset.day,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)});
    }
  }
  return results;
}"""

def run():
    ART.mkdir(parents=True,exist_ok=True)
    SHOTS.mkdir(exist_ok=True)
    report={'geometry':[], 'ribbon':[], 'axe':[], 'failures':[]}
    failures=report['failures']
    def check(ok, message):
        if not ok: failures.append(message)
    try:
        with sync_playwright() as pw:
            chrome=which('chromium') or which('google-chrome') or which('google-chrome-stable')
            if not chrome: raise RuntimeError('Chromium absent')
            browser=pw.chromium.launch(headless=True,executable_path=chrome,args=['--no-sandbox'])
            for theme in ('light','dark'):
                context=browser.new_context(viewport={'width':393,'height':844},color_scheme=theme)
                page=context.new_page()
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
                for width in WIDTHS:
                    page.set_viewport_size({'width':width,'height':900})
                    reference=None
                    for route in ROUTES:
                        page.locator('[data-tab="'+route+'"]').click()
                        page.locator('.main > .screen-intro').wait_for()
                        page.wait_for_timeout(120)
                        label=f'{theme}-{width}-{route}'
                        g=page.evaluate(GEOMETRY)
                        report['geometry'].append({'case':label,**g})
                        check(g['overflow']<=1,label+' horizontal overflow')
                        check(abs(g['nav']['bottom']-g['viewport'])<=1,label+' navigation not fixed to bottom')
                        if reference is None: reference=g['main']
                        check(abs(g['main']['left']-reference['left'])<=1 and abs(g['main']['right']-reference['right'])<=1,label+' unequal reading gutters')
                        for target in g['targets']:
                            check(target['width']>=47.99 and target['height']>=47.99,label+' undersized '+str(target))
                        if route=='calendar':
                            picker=page.locator('#astraCalendarDatePicker')
                            inner=page.locator('.calendar.astra-calendar-board').evaluate("""e=>{const s=getComputedStyle(e);return e.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight)}""")
                            check(picker.is_visible()==(inner<336),label+' date picker visibility')
                            if width==393:
                                for palette in ('classic','vivid'):
                                    page.evaluate("p=>document.documentElement.dataset.astraPalette=p",palette)
                                    contrast=page.evaluate(RIBBON)
                                    report['ribbon'].append({'case':label+'-'+palette,'labels':contrast})
                                    check(bool(contrast),label+' no ribbon samples')
                                    for item in contrast:
                                        check(item['ratio']>=4.5,label+' '+palette+' contrast '+str(item))
                                page.evaluate("document.documentElement.dataset.astraPalette='vivid'")
                        page.screenshot(path=str(SHOTS/(label+'.png')),animations='disabled')
                        if width in (393,1280):
                            result=page.evaluate("""async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}})""")
                            violations=[{'id':v['id'],'impact':v['impact'],'nodes':[n['target'] for n in v['nodes']]} for v in result['violations']]
                            report['axe'].append({'case':label,'violations':violations})
                            for v in violations:
                                if v['impact'] in ('critical','serious'): failures.append(label+' axe '+v['id']+' '+str(v['nodes']))
                context.close()
            browser.close()
    except Exception as exc:
        failures.append(str(exc))
    finally:
        (ART/'ui-referential.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    if failures:
        raise AssertionError('\n'.join(failures))
    print('P1: responsive geometry, calendar contrast and axe checks passed')

if __name__=='__main__':
    run()

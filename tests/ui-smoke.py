#!/usr/bin/env python3
"""P2 browser smoke tests using a synthetic astronomical engine.
Astronomical truth is tested by runtime.test.mjs in CI, not this mock.
"""
import os
from pathlib import Path
from shutil import which
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1] / 'app/src/main/assets'

JS = r"""
window._store = {};
Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window._store[k]||null,setItem:(k,v)=>{window._store[k]=String(v)},removeItem:k=>{delete window._store[k]}}});
window.ASTRA_ENGINE = {
 validateProfile(p){if(!p.date || (p.timeKnown!==false&&!p.time) || !p.timezone || !Number.isFinite(Number(p.latitude)))throw Error('Profil invalide');return true;},
 moonPhase(){return 128.1},
 formatSign(lon){return lon===250?'10° Sagittaire':lon===235?'25° Scorpion':lon===37?'7° Taureau':lon===61?'1° Gémeaux':'7° Bélier'},
 dailySky(day,zone,mode){return {day,timezone:zone,mode,at:new Date(day+'T12:00:00Z').toISOString(),
  sunLongitude:day.startsWith('2026-10-')?235:day.startsWith('2026-12-')?250:Number(day.slice(-2))<19?235:250,moonLongitude:window.__moonScenario&&day.endsWith('-20')?37:7,moonPhase:128.1}},
 sunSignIngress(day,zone,mode){return null},
 moonSignChanges(day,zone,mode){return window.__moonScenario&&day.endsWith('-20')?
  [{at:day+'T13:09:00Z',fromSign:'Taureau',toSign:'Gémeaux',fromIndex:1,toIndex:2,mode}]:[]},
 formatSignExact(){return '07°00′00″ Bélier'},formatOrbExact(orb){return orb.toFixed(2)+'°'},
 filterNatalAspects(list,filter){return filter==='all'?[...list]:list.filter(a=>a.aspect===filter)},
 describeNatalPlanet(body,lng,house,approx){return {title:body==='Moon'?'Lune':'Soleil',astronomy:approx?'Position indicative à midi local':'Longitude calculée',convention:'Lecture astrologique traditionnelle du signe et de la planète.',question:'Quel sens pour ce domaine ?',disclaimer:'Lecture symbolique non prédictive'}},
 describeNatalHouse(n){return {title:'Maison '+n,astronomy:'Cuspide calculée',convention:'Domaine traditionnel de la maison.',question:'Comment cette maison est-elle vécue ?',disclaimer:'Lecture symbolique'}},
 describeNatalAspect(a){return {title:'Aspect natal '+a.aspect,astronomy:'Écart calculé',convention:'Symbolisme conventionnel de l’aspect.',question:'Comment ces thèmes interagissent-ils ?',disclaimer:'Lecture symbolique'}},

 normalizePlace(p){return {...p,label:p.label||'Paris · Île-de-France · France'}},
 searchCities:async q=>[{name:'Paris',label:'Paris · Île-de-France · France',latitude:48.8534,longitude:2.3488,timezone:'Europe/Paris',admin1:'Île-de-France',country:'France'}],
 localToUtc(date,time,zone,fold=null){if(date==='2026-10-25' && time==='02:30' && fold===null)throw Error('Heure ambiguë');return new Date(date+'T'+(time||'12:00')+':00.000Z')},
 upcomingMoonPhases(start,zone,mode){
  const d=new Date(start);
  const names=['Nouvelle Lune','Premier quartier','Pleine Lune','Dernier quartier'];
  return names.map((name,i)=>{
    const at=new Date(d.getTime()+(i+1)*6*86400000);
    return {name,quarter:i,day:at.toISOString().slice(0,10),at:at.toISOString(),moonLongitude:i*90+15};
  });
 },
 transitContactWindow(p,at,body,natal,angle){return {body,natal,angle,orb:2,start:new Date(new Date(at).getTime()-2*86400000).toISOString(),end:new Date(new Date(at).getTime()+2*86400000).toISOString(),limited:false}},
 secondaryProgressions(p,target,mode){return {target:new Date(target).toISOString(),progressedAt:'1994-06-13T12:00:00.000Z',moonUncertain:p.timeKnown===false,positions:{Sun:40,Mercury:60,Venus:90,Mars:120,Jupiter:150,Saturn:180,Uranus:210,Neptune:240,Pluto:270,...(p.timeKnown!==false?{Moon:45}:{})},convention:'jour-pour-an'}},
 compositeMidpoints(a,b,mode){return {mode,positions:{Sun:37,Mercury:60,Venus:90,Mars:120,Jupiter:150,Saturn:180,Uranus:210,Neptune:240,Pluto:270,...(a.timeKnown!==false&&b.timeKnown!==false?{Moon:45}:{})},moonUncertain:a.timeKnown===false||b.timeKnown===false,houses:null}},

 natalChart(profile,mode,houseSystem='placidus'){const known=profile?.timeKnown!==false;const asc=151.5,mc=53.1,start=houseSystem==='whole'?150:asc;return {timeKnown:known,approximateNoon:!known,positions:{Sun:7,Moon:23,Mercury:32,Venus:55,Mars:91,Jupiter:123,Saturn:141,Uranus:175,Neptune:203,Pluto:270},houses:known?{ascendant:asc,midheaven:mc,system:houseSystem==='whole'?'Signes entiers':houseSystem==='equal'?'Maisons égales':'Placidus',cusps:houseSystem==='placidus'?[151.5,172,199,233,270,304,331.5,352,19,53.1,90,124]:Array.from({length:12},(_,i)=>(start+i*30)%360),polarFallback:false}:null,aspects:[{a:'Sun',b:'Mars',aspect:'Carré',glyph:'□',orb:1}]}},
 transitSnapshot(profile,instant,mode,houseSystem){
   return {at:new Date(instant).toISOString(),mode,houseSystem,
     chart:this.natalChart(profile,mode,houseSystem),
     positions:{Sun:249,Moon:32,Mercury:285,Venus:298,Mars:17,Jupiter:141,Saturn:276,Uranus:51,Neptune:348,Pluto:305},
     contacts:[{body:'Sun',natal:'Mars',aspect:'Carré',glyph:'□',angle:90,delta:0.34,orb:2,trend:'applying'}],
     approximateNatal:profile?.timeKnown===false};
 },
 houseOf(lon,cusps){for(let i=0;i<12;i++){let d=(lon-cusps[i]+360)%360,w=(cusps[(i+1)%12]-cusps[i]+360)%360;if(d<w)return i+1;}return null;},
 describeEvent(e){return {kind:'Interprétation',title:e.name||'Soleil trigone Lune natal',tone:'Lecture symbolique',astronomy:'Mesure astronomique calculée.',interpretation:'Lecture astrologique sans causalité.',question:'Quelle observation personnelle noter ?',disclaimer:'Pas de prédiction scientifique.'}},
 calculateMonth(profile,year,month,mode){
   const n=new Date(year,month,0).getDate(),days={};
   for(let d=1;d<=n;d++){
     const k=year+'-'+String(month).padStart(2,'0')+'-'+String(d).padStart(2,'0');
     days[k]={active:[{type:'active',body:'Sun',natal:'Moon',aspect:'Trigone',angle:120,delta:.43,orb:1.7}],
       exact:month===11&&d===23?[
          {type:'exact',body:'Moon',natal:'Venus',aspect:'Sextile',at:k+'T03:34:00Z'},
          {type:'exact',body:'Moon',natal:'Neptune',aspect:'Carré',at:k+'T09:47:00Z'},
          {type:'exact',body:'Moon',natal:'Moon',aspect:'Trigone',at:k+'T21:40:00Z'},
          {type:'exact',body:'Moon',natal:'Saturn',aspect:'Sextile',at:k+'T23:09:00Z'},
          {type:'exact',body:'Moon',natal:'Jupiter',aspect:'Trigone',at:k+'T23:13:00Z'}
        ]:[{type:'exact',body:[5,9,20,23].includes(d)?'Sun':'Mercury',natal:'Moon',aspect:'Trigone',at:k+'T11:30:00Z'}],
       sunLongitudeAtNoon:d<19?235:250,
       sunIngress:d===19?{at:k+'T06:24:00Z',fromIndex:7,toIndex:8,
         fromSign:'Scorpion',toSign:'Sagittaire',mode}:null,
       moonPhaseAtNoon:d===5?5:d===20?180:d<9?65:d<18?128:d<24?225:315,
       sky:d===5?[{type:'moon',name:'Nouvelle Lune',at:k+'T14:00:00Z',moonLongitude:11}]:d===20?[{type:'moon',name:'Pleine Lune',at:k+'T14:00:00Z',moonLongitude:61}]:[]};
   }
   return {days,chart:this.natalChart(),mode};
 }
};
"""


# Contrast is measured on the actual computed foreground and opaque ancestor
# background, not just on colour-token pairs in a source stylesheet.
CONTRAST_JS = """() => {
  const rgb=value=>{
    const match=value.match(/^rgba?\(([^)]+)\)$/);
    if(!match)return null;
    const values=match[1].split(',').map(Number);
    return {channels:values.slice(0,3),alpha:values[3]??1};
  };
  const lum=channels=>channels.reduce((sum,raw,i)=>{
    const x=raw/255;
    return sum+(x<=0.04045?x/12.92:Math.pow((x+0.055)/1.055,2.4))*[0.2126,0.7152,0.0722][i];
  },0);
  return ['.top .brand','.bottom-nav .nav.active','.bottom-nav .nav:not(.active)',
          '.screen-intro .page-title','.card .card-title'].map(selector=>{
    const el=document.querySelector(selector);
    if(!el)return {selector,error:'missing'};
    const fg=rgb(getComputedStyle(el).color).channels;
    let parent=el,bg=[255,255,255];
    while(parent){
      const color=rgb(getComputedStyle(parent).backgroundColor);
      if(color&&color.alpha>=0.999){bg=color.channels;break}
      parent=parent.parentElement;
    }
    const a=lum(fg),b=lum(bg);
    return {selector,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),
            foreground:fg,background:bg};
  });
}"""

if __name__ == '__main__':
    try:
        with sync_playwright() as pw:
            chrome=which('chromium') or which('google-chrome') or which('google-chrome-stable')
            if not chrome:
                raise RuntimeError('Chromium ou Google Chrome non trouvé sur ce PC/runner.')
            browser=pw.chromium.launch(headless=True,executable_path=chrome,args=['--no-sandbox'])
            context=browser.new_context(viewport={'width':393,'height':844},accept_downloads=True)
            context.add_init_script(JS)
            page=context.new_page();errors=[]
            shots=Path(os.environ['ASTRA_SCREENSHOT_DIR']) if os.environ.get('ASTRA_SCREENSHOT_DIR') else None
            if shots: shots.mkdir(parents=True,exist_ok=True)
            def capture(name):
                if shots:
                    # Toasts from earlier test actions are not part of the
                    # resting screen; they obscure widget hierarchy.
                    page.evaluate("document.getElementById('toast').hidden=true")
                    page.screenshot(path=str(shots / (name+'.png')),full_page=True,animations='disabled')
            def capture_element(name,selector):
                if shots:
                    page.evaluate("document.getElementById('toast').hidden=true")
                    page.locator(selector).first.screenshot(path=str(shots / (name+'.png')),
                                                             animations='disabled')
            def audit_disclosures(route):
                """Check every disclosure on this rendered route, open or closed."""
                items=page.evaluate("""() => [...document.querySelectorAll('details.astra-disclosure')].map(el=>{
                  const summary=el.querySelector(':scope > summary');
                  const body=el.querySelector(':scope > .astra-disclosure-body');
                  if(!summary||!body)return {component:el.className,error:'missing summary/body'};
                  const top=getComputedStyle(summary),inside=getComputedStyle(body);
                  const asFloat=value=>parseFloat(value);
                  const first=body.firstElementChild;
                  const offset=el.open&&first
                    ?first.getBoundingClientRect().left-body.getBoundingClientRect().left
                    :null;
                  return {component:el.className,open:el.open,
                    titleLeft:asFloat(top.paddingLeft),titleRight:asFloat(top.paddingRight),
                    bodyLeft:asFloat(inside.paddingLeft),bodyRight:asFloat(inside.paddingRight),
                    titleHeight:asFloat(top.minHeight),firstChildOffset:offset};
                })""")
                for item in items:
                    assert not item.get('error'),(route,item)
                    for prop in ('titleLeft','titleRight','bodyLeft','bodyRight'):
                        assert item[prop]>=15,(route,item)
                    assert item['titleHeight']>=48,(route,item)
                    if item['firstChildOffset'] is not None:
                        assert item['firstChildOffset']>=14,(route,item)
                return len(items)

            def verify_active_aspects_gutters(label):
                # Measure real geometry, not just the presence of CSS classes.
                details=page.locator('details.astra-active-panel')
                assert details.count()==1,label
                assert details.locator(':scope > .astra-disclosure-body').count()==1,label
                initially_open=details.get_attribute('open') is not None
                if not initially_open:
                    details.locator(':scope > summary').click()
                result=details.evaluate("""el=>{
                    const summary=el.querySelector(':scope > summary');
                    const heading=summary.querySelector('span');
                    const body=el.querySelector(':scope > .astra-disclosure-body');
                    const desc=body?.querySelector(':scope > p');
                    const feed=body?.querySelector(':scope > .astra-event-feed');
                    const row=feed?.querySelector(':scope > .event-button');
                    const glyph=row?.querySelector('.event-glyph');
                    const arrow=row?.querySelector('.event-arrow');
                    if(!body||!desc||!feed||!row||!glyph||!arrow)
                      return {error:'missing canonical content',markup:el.outerHTML.slice(0,500)};
                    const outer=el.getBoundingClientRect(),
                          head=heading.getBoundingClientRect(),
                          copy=desc.getBoundingClientRect(),
                          icon=glyph.getBoundingClientRect(),
                          right=arrow.getBoundingClientRect();
                    const css=getComputedStyle(body),headStyle=getComputedStyle(summary);
                    return {
                      titleInset:head.left-outer.left,
                      descriptionInset:copy.left-outer.left,
                      glyphInset:icon.left-outer.left,
                      arrowInset:outer.right-right.right,
                      bodyPadding:parseFloat(css.paddingLeft),
                      titlePadding:parseFloat(headStyle.paddingLeft),
                      feedPadding:parseFloat(getComputedStyle(feed).paddingLeft),
                      horizontalOverflow:document.documentElement.scrollWidth>innerWidth+2,
                      duplicateArrow:summary.querySelector('[aria-hidden="true"]')!==null,
                    };
                }""")
                assert 'error' not in result,(label,result)
                assert not result['horizontalOverflow'],(label,result)
                assert not result['duplicateArrow'],(label,result)
                assert result['bodyPadding']>=15,(label,result)
                assert result['titlePadding']>=15,(label,result)
                assert result['feedPadding']==0,(label,result)
                for part in ('titleInset','descriptionInset','glyphInset','arrowInset'):
                    assert result[part]>=14,(label,result)
                assert abs(result['titleInset']-result['descriptionInset'])<=3,(label,result)
                assert abs(result['glyphInset']-result['descriptionInset'])<=3,(label,result)
                capture('active-aspects-'+label)
                if not initially_open:
                    details.locator(':scope > summary').click()
                return result

            page.on('pageerror',lambda e: errors.append(str(e)))
            html=(ROOT/'index.html').read_text(encoding='utf-8')
            html=html.replace('<script src="runtime.bundle.js"></script><script src="app.js" defer></script>','')
            html=html.replace('<link rel="stylesheet" href="astra.bundle.css">','')
            html=html.replace('<script src="theme-bootstrap.js"></script>','')
            page.goto('about:blank')
            page.add_script_tag(content=JS)
            # Use the REAL layout solver with the mock astronomy engine.
            layout=(ROOT.parents[3] / 'astro/chart-layout.mjs').read_text(encoding='utf-8')
            layout=layout.replace("import {mod} from './core.mjs';", "const mod=(x,n=360)=>((x%n)+n)%n;")
            layout=layout.replace('export const ', 'const ').replace('export function ', 'function ')
            page.add_script_tag(content=layout + "\nwindow.ASTRA_ENGINE.layoutPlanetLabels=layoutPlanetLabels;")
            page.set_content(html)
            page.add_script_tag(content=(ROOT/'theme-bootstrap.js').read_text(encoding='utf-8'))
            page.add_style_tag(content=(ROOT/'astra.bundle.css').read_text(encoding='utf-8'))
            # Verify the browser interprets the real CSS layers and the same
            # semantic colours in both themes before JavaScript renders routes.
            cascade=page.evaluate("""() => {
              const root=document.documentElement;
              const layers=[...document.styleSheets].flatMap(s=>[...s.cssRules])
                .map(rule=>/^@layer\\s+([\\w-]+)\\s*\\{/.exec(rule.cssText)?.[1])
                .filter(Boolean);
              const initial=root.getAttribute('data-astra-theme');
              const snapshot=mode=>{
                root.setAttribute('data-astra-theme',mode);
                const css=getComputedStyle(root);
                return {
                  calendarInk:css.getPropertyValue('--astra-calendar-ink').trim(),
                  phaseFull:css.getPropertyValue('--astra-phase-full-bg').trim(),
                  phaseNew:css.getPropertyValue('--astra-phase-new-bg').trim()
                };
              };
              const light=snapshot('light'),dark=snapshot('dark');
              if(initial===null)root.removeAttribute('data-astra-theme');
              else root.setAttribute('data-astra-theme',initial);
              return {layers,light,dark};
            }""")
            assert set(cascade['layers']) >= {'legacy','tokens','components','features','layout'},cascade
            assert cascade['light']['calendarInk']=='#102A34',cascade
            assert cascade['dark']['calendarInk']=='#F8EFD5',cascade
            assert cascade['light']['phaseFull']=='#F5DBA2',cascade
            assert cascade['dark']['phaseFull']=='#EEC983',cascade
            assert cascade['light']['phaseNew']=='#DDD6F4',cascade
            assert cascade['dark']['phaseNew']=='#C7B9E5',cascade
            page.add_script_tag(content=(ROOT/'app.js').read_text(encoding='utf-8'))
            # P0 design regression: verify computed font sizes and flat surfaces.
            px=lambda selector: page.locator(selector).first.evaluate(
                "el => parseFloat(getComputedStyle(el).fontSize)"
            )
            assert px('.nav')>=12
            assert page.locator('[data-tab="today"]').get_attribute('aria-label')=='Ce jour'
            assert page.locator('[data-tab="today"] .nav-label').inner_text()=='Ce jour'
            assert page.locator('.bottom-nav [data-tab]').count()==4
            assert page.locator('.bottom-nav .nav-label').all_text_contents()==[
                'Ce jour','Ce mois','Calendrier','Mon ciel'
            ]
            assert page.locator('[data-tab="month"]').get_attribute('aria-label')=='Ce mois'
            assert page.locator('[data-tab="calendar"]').get_attribute('aria-label')=='Calendrier'
            assert page.locator('.bottom-nav [data-tab="journal"]').count()==0
            assert px('.lead')>=14
            assert px('.tiny')>=13
            for item in page.evaluate(CONTRAST_JS):
                assert item.get('ratio',0)>=4.5,('light',item)
            assert page.locator('.card').first.evaluate(
                "el => getComputedStyle(el).boxShadow"
            ) == 'none'
            assert page.locator('.app-shell').evaluate(
                "el => getComputedStyle(el).backgroundImage"
            ) == 'none'
            # Journal stays available even without a birth chart.
            page.locator('.welcome-card [data-goto="journal"]').click()
            assert page.locator('#journalNote').count()==1
            assert page.locator('.bottom-nav [data-tab]').count()==4
            page.locator('.astra-journal-back').click()
            assert page.locator('.welcome-card').count()==1
            page.get_by_text('Configurer mon thème natal').click()
            # A15 and compact screen: birth fields remain usable with keyboard.
            page.set_viewport_size({'width':360,'height':720})
            capture('galaxy-a15-form-360')
            assert page.evaluate("document.documentElement.scrollWidth")<=362
            page.locator('#birthCity').focus()
            # Hardware keyboard / mere focus must not hide navigation.
            assert not page.evaluate("document.body.classList.contains('astra-input-active')")
            page.set_viewport_size({'width':360,'height':460})  # virtual IME
            page.wait_for_timeout(75)
            assert page.evaluate("document.body.classList.contains('astra-input-active')")
            assert page.locator('.bottom-nav').evaluate(
                "el => getComputedStyle(el).visibility"
            )=='hidden'
            page.set_viewport_size({'width':360,'height':720})
            page.wait_for_timeout(75)
            assert page.locator('.bottom-nav').evaluate(
                "el => getComputedStyle(el).visibility"
            )=='visible'
            page.locator('#birthCity').evaluate("el => el.blur()")
            page.set_viewport_size({'width':393,'height':844})
            page.locator('#birthDate').fill('1994-05-12')
            page.locator('#birthTime').fill('18:40')
            assert page.locator('#birthZone').count()==0 and page.locator('#lat').count()==0 and page.locator('#lng').count()==0
            page.locator('#birthCity').fill('Paris')
            page.locator('[data-search-place]').click()
            page.locator('[data-place]').first.wait_for(timeout=1500)
            page.locator('[data-place]').first.click()
            assert page.locator('.city-technical').get_attribute('open') is None
            page.locator('.city-technical summary').click()
            assert 'Europe/Paris' in page.locator('.city-confirmed').inner_text()
            page.get_by_role('button',name='Calculer mon thème natal').click()
            page.wait_for_timeout(250)
            assert 'Paris' in page.evaluate("JSON.parse(localStorage.getItem('astra-public-v1')).profile.place.label")
            assert page.evaluate("JSON.parse(localStorage.getItem('astra-public-v1')).profile.latitude")==48.8534
            page.locator('[data-tab="profile"]').click()
            assert page.locator('#natalChart .natal-wheel').count()==1
            # UX P0: sky-first landing. No advanced toolbars or form on home.
            assert page.locator('.natal-home').count()==1
            assert page.locator('.natal-home .natal-wheel-viewport').evaluate(
                "el => getComputedStyle(el).backgroundImage"
            ) == 'none'
            # P1: natal summary uses one clear grouped surface, not borderless tiles.
            assert page.locator('.natal-home .natal-primary-cards').evaluate(
                "el => parseFloat(getComputedStyle(el).borderTopWidth)"
            ) >= 1
            assert page.locator('.natal-summary-item').count()==3
            assert [x.strip() for x in page.locator('.natal-summary-name').all_text_contents()]==['Soleil','Lune','Ascendant']
            assert page.locator('.natal-summary-icon').all_text_contents()==['☼','☽','↑']
            # Real signs derive from the astronomical positions in the mocked
            # profile: Sun 7° Aries, Moon 23° Aries, Ascendant 1.5° Virgo.
            assert [x.replace('︎','').strip() for x in page.locator('.natal-summary-sign').all_text_contents()]==['♈','♈','♍']
            assert page.locator('.natal-glyph-separator').count()==0
            # People should see the sign names, not guess glyph pairs.
            assert page.locator('.natal-summary-name').first.is_visible()
            assert page.locator('.natal-summary-value').all_text_contents()==['Bélier','Bélier','Vierge']
            assert page.locator('h1.page-title').count()==1
            assert page.locator('.natal-home-header .card-title').inner_text()=='Ta carte de naissance'
            # Mon ciel must remain a visible, padded, bordered card in both themes.
            surface=page.locator('.natal-home.card').evaluate("""el=>{
              const css=getComputedStyle(el);
              return {border:parseFloat(css.borderTopWidth),
                padding:parseFloat(css.paddingLeft),background:css.backgroundColor};
            }""")
            assert surface['border']>=1,surface
            assert surface['padding']>=14,surface
            assert surface['background'] not in ('rgba(0, 0, 0, 0)','transparent'),surface
            # The heading and subtitle must align with the centered summary and
            # primary action at both mobile and desktop breakpoints.
            def assert_birth_heading_alignment():
                geometry=page.evaluate("""() => {
                  const box=q=>document.querySelector(q).getBoundingClientRect();
                  return {
                    title:box('.natal-home-header .card-title').left,
                    subtitle:box('.natal-home-header .natal-home-subtitle').left,
                    heading:box('.natal-home-header').left,
                    summary:box('.natal-home .natal-primary-cards').left,
                    action:box('.natal-home .natal-home-actions--primary').left,
                    cardBorder:parseFloat(getComputedStyle(document.querySelector('.natal-home')).borderTopWidth),
                    cardPadding:parseFloat(getComputedStyle(document.querySelector('.natal-home')).paddingLeft),
                    viewport:document.documentElement.clientWidth,
                    scroll:document.documentElement.scrollWidth
                  };
                }""")
                for k in ('title','subtitle','summary','action'):
                    assert abs(geometry[k]-geometry['heading'])<=3,geometry
                assert geometry['scroll']<=geometry['viewport']+2,geometry
            assert_birth_heading_alignment()
            page.set_viewport_size({'width':1280,'height':800})
            assert_birth_heading_alignment()
            capture('natal-heading-aligned-desktop-1280')
            page.set_viewport_size({'width':393,'height':844})
            assert page.locator('.natal-home-actions button').count()==2
            assert 'Explorer les positions' in page.locator('.natal-main-action').inner_text()
            assert 'Comparer deux dates' in page.locator('.natal-secondary-action').inner_text()
            assert page.locator('.natal-summary-item').first.get_attribute('aria-label')=='Soleil en Bélier'
            assert page.locator('.natal-overview-tabs button').count()==3
            page.locator('[data-overview-pane="planets"]').click()
            assert page.locator('.natal-home .natal-position').count()==10
            assert page.locator('.natal-home .natal-wheel').count()==0
            page.locator('[data-overview-pane="aspects"]').click()
            assert page.locator('.natal-home .natal-aspect').count()==1
            assert page.locator('.natal-panel-lead').is_visible()
            page.locator('[data-overview-pane="wheel"]').click()
            assert page.locator('.natal-home .natal-wheel').count()==1
            assert page.locator('.natal-glossary').get_attribute('open') is None
            page.locator('.natal-glossary summary').click()
            assert audit_disclosures('natal-home')>=2
            assert 'Orbe' in page.locator('.natal-glossary').inner_text()
            assert page.locator('.natal-advanced').count()==0
            assert page.locator('.natal-control-stack').count()==0
            assert page.locator('.natal-filter').count()==0
            assert page.locator('#birthForm').count()==0
            assert page.locator('.natal-home-actions button').count()==2
            # A15 layout (~360 CSS px) plus compact and large phones, tablets
            # and desktop. These are simulated responsive layouts, not
            # measurements taken on a physical Samsung A15.
            for width,height in ((320,700),(360,780),(360,620),(375,812),
                                 (393,844),(412,915),(480,860),
                                 (768,1024),(1280,800)):
                page.set_viewport_size({'width':width,'height':height})
                assert page.evaluate('document.documentElement.scrollWidth')<=width+2,(width,height)
                # Every major item in Mon ciel uses the SAME horizontal gutter,
                # even when the selected tab switches away from the wheel.
                geometry=page.evaluate("""() => {
                  const box=s=>document.querySelector(s).getBoundingClientRect();
                  const intro=box('.screen-intro'),header=box('.natal-home-header');
                  const introEl=document.querySelector('.screen-intro');
                  const introStyle=getComputedStyle(introEl);
                  const card=box('.natal-home');
                  const cardStyle=getComputedStyle(document.querySelector('.natal-home'));
                  const selectors=[
                    '.natal-primary-cards','.natal-home-actions--primary',
                    '.natal-overview-tabs','.natal-wheel-viewport',
                    '.natal-home-hint','.natal-focus-launch',
                    '.natal-glossary','.natal-home-actions--secondary',
                    '.natal-extras'];
                  return {
                    intro:{left:intro.left+parseFloat(introStyle.paddingLeft),
                      right:intro.right-parseFloat(introStyle.paddingRight)},
                    card:{left:card.left,right:card.right,
                      border:parseFloat(cardStyle.borderTopWidth),
                      padding:parseFloat(cardStyle.paddingLeft),
                      background:cardStyle.backgroundColor},
                    header:{left:header.left,right:header.right},
                    regions:selectors.map(selector=>{
                      const r=box('.natal-home>'+selector);
                      return {selector,left:r.left,right:r.right};
                    }),
                    actions:['.natal-main-action','.natal-secondary-action'].map(s=>({
                      selector:s,left:box(s).left,right:box(s).right
                    }))};
                }""")
                assert geometry['card']['border']>=1,(width,geometry)
                assert geometry['card']['padding']>=14,(width,geometry)
                assert geometry['card']['background'] not in ('rgba(0, 0, 0, 0)','transparent'),(width,geometry)
                # The introduction uses the outer page column. The header,
                # regions and actions use the inner padding box of the card.
                assert abs(geometry['intro']['left']-geometry['card']['left'])<=2,(width,geometry)
                assert abs(geometry['intro']['right']-geometry['card']['right'])<=2,(width,geometry)
                for item in [*geometry['regions'],*geometry['actions']]:
                    assert abs(item['left']-geometry['header']['left'])<=2,(width,item,geometry)
                    assert abs(item['right']-geometry['header']['right'])<=2,(width,item,geometry)
                assert geometry['header']['left']>=geometry['card']['left']+geometry['card']['padding'],(width,geometry)
                metrics=page.locator('.natal-home .natal-wheel-viewport').evaluate("""el=>({
                  client:el.clientWidth,scroll:el.scrollWidth,
                  svg:el.querySelector('svg').getBoundingClientRect().width
                })""")
                assert metrics['svg']<=metrics['client']+2,(width,height,metrics)
                assert metrics['scroll']<=metrics['client']+2,(width,height,metrics)
                nav=page.locator('.bottom-nav').evaluate("""el=>({
                  top:el.getBoundingClientRect().top,
                  bottom:el.getBoundingClientRect().bottom,
                  window:innerHeight
                })""")
                assert page.locator('.bottom-nav').evaluate("el => getComputedStyle(el).position")=='fixed',(width,height,nav)
                assert nav['top']>=0 and nav['bottom']<=height+2,(width,height,nav)
                if (width,height) in ((320,700),(360,780),(360,620),(393,844),(412,915),(768,1024),(1280,800)):
                    capture('overview-'+str(width)+'x'+str(height))
            # The shared reading-column contract is invariant around the
            # compact, mobile, tablet and desktop breakpoint boundaries.
            for width,height in ((360,780),(400,844),(480,900),
                                 (799,1024),(800,1024),(1100,900)):
                page.set_viewport_size({'width':width,'height':height})
                for tab,selector in (
                    ('today','.astra-day-hero'),
                    ('month','.astra-month-hero'),
                    ('calendar','.calendar.astra-calendar-board'),
                    ('profile','.natal-home.card')
                ):
                    page.locator(f'[data-tab="{tab}"]').click()
                    positions=page.evaluate("""selector => {
                      const main=document.querySelector('.main');
                      const intro=main.querySelector('.screen-intro');
                      const panel=main.querySelector(selector);
                      if(!intro||!panel)return null;
                      const rect=main.getBoundingClientRect();
                      const css=getComputedStyle(main);
                      const left=rect.left+parseFloat(css.paddingLeft);
                      const right=rect.right-parseFloat(css.paddingRight);
                      const ir=intro.getBoundingClientRect(),pr=panel.getBoundingClientRect();
                      return {left,right,intro:[ir.left,ir.right],
                        panel:[pr.left,pr.right],
                        nav:getComputedStyle(document.querySelector('.bottom-nav')).position,
                        documentWidth:document.documentElement.scrollWidth};
                    }""",selector)
                    assert positions is not None,(width,tab)
                    assert positions['nav']=='fixed',(width,tab,positions)
                    assert positions['documentWidth']<=width+2,(width,tab,positions)
                    for left,right in (positions['intro'],positions['panel']):
                        assert abs(left-positions['left'])<=2,(width,tab,positions)
                        assert abs(right-positions['right'])<=2,(width,tab,positions)
            page.set_viewport_size({'width':360,'height':780})
            # The primary purpose must be visible without having to scroll,
            # above the fixed bottom navigation on a Galaxy A15-like screen.
            first=page.locator('.natal-main-action').bounding_box()
            navtop=page.locator('.bottom-nav').bounding_box()
            assert first and navtop and first['y']+first['height']<navtop['y'],(first,navtop)
            text_style=page.add_style_tag(content=
                '.nav{font-size:18px!important}.natal-home-header .card-title{font-size:27px!important}')
            assert page.evaluate('document.documentElement.scrollWidth')<=362
            # System text enlargement cannot make adjacent tab labels collide.
            tabwidths=page.locator('.bottom-nav .nav').evaluate_all("""els=>els.map(e=>({
              w:e.clientWidth,scroll:e.scrollWidth
            }))""")
            assert all(x['scroll']<=x['w']+2 for x in tabwidths),tabwidths
            calendar_label=page.locator('[data-tab="calendar"] .nav-label').evaluate("""el=>({
              height:el.getBoundingClientRect().height,
              line:parseFloat(getComputedStyle(el).lineHeight)
            })""")
            # P1 intentionally lets long labels use up to two lines at large text sizes.
            assert calendar_label['height']<=calendar_label['line']*2.2,calendar_label
            capture('galaxy-a15-large-text-360')
            text_style.evaluate('node=>node.remove()')
            page.set_viewport_size({'width':393,'height':844})
            assert page.evaluate(
                "getComputedStyle(document.documentElement).getPropertyValue('--astra-focus-ring').trim()"
            )=='#1E404F'  # Retro Pop P0/P3 focus token
            # P2.1: immersive reading keeps home uncluttered and restores focus.
            page.locator('.natal-home [data-open-focus]').click()
            # P0 uses a native HTML dialog opened with showModal().
            assert page.locator('dialog.natal-focus[open][aria-modal="true"]').count()==1
            assert page.locator('.bottom-nav').evaluate("e => getComputedStyle(e).visibility")=='hidden'
            capture('focus-natal-393')
            assert page.locator('.natal-focus .natal-wheel').count()==1
            assert page.evaluate("document.body.classList.contains('astra-focus-open')")
            assert page.evaluate("document.activeElement.hasAttribute('data-close-focus')")
            # Samsung's system back gesture closes the full-screen chart first.
            assert page.evaluate('window.ASTRA_HANDLE_BACK()') is True
            assert page.locator('.natal-focus').count()==0
            assert page.locator('.natal-home').count()==1
            page.locator('.natal-home [data-open-focus]').click()
            for width,height in ((320,480),(360,580),(360,780)):
                page.set_viewport_size({'width':width,'height':height})
                assert page.locator('.natal-focus-close').is_visible()
                assert page.evaluate('document.documentElement.scrollWidth')<=width+2
                capture('focus-'+str(width)+'x'+str(height))
            page.set_viewport_size({'width':393,'height':844})
            page.locator('.natal-focus [data-natal-zoom="0.25"]').click()
            assert '125 %' in page.locator('.natal-focus .natal-zoom').inner_text()
            page.locator('.natal-focus [data-natal-zoom="reset"]').click()
            page.keyboard.press('Escape')
            assert page.locator('.natal-focus').count()==0
            assert page.locator('.natal-home').count()==1
            assert page.evaluate("document.activeElement.hasAttribute('data-open-focus')")
            head=page.locator('.natal-primary-cards').bounding_box()
            wheel=page.locator('.natal-wheel-viewport').bounding_box()
            assert head is not None and wheel is not None and head['y']<wheel['y']
            assert page.locator('.natal-summary-name').first.evaluate("e => parseFloat(getComputedStyle(e).fontSize)")>=12
            assert page.locator('.natal-main-action').evaluate("e => e.getBoundingClientRect().height")>=48
            assert page.locator('.wheel-zodiac-sector').count()==12
            for element in ('fire','earth','air','water'):
                assert page.locator('.wheel-zodiac-sector.zodiac-element-'+element).count()==3
            # Reference palette: Fire red-orange, Air yellow, Water blue, Earth green.
            expected_fills={'fire':'rgb(255, 61, 20)','air':'rgb(247, 252, 53)',
                            'water':'rgb(21, 155, 242)','earth':'rgb(70, 205, 23)'}
            for element,expected_fill in expected_fills.items():
                actual=page.locator('.natal-home .wheel-zodiac-sector.zodiac-element-'+element).first.evaluate(
                    'el => getComputedStyle(el).fill'
                )
                assert actual==expected_fill,(element,actual,expected_fill)
            assert page.locator('.wheel-house-sector').count()==12
            # The true degree markers never move; labels use the actual solver.
            labels=page.locator('.natal-planet-hit').evaluate_all("""items => items.map(e => ({
              body:e.dataset.natalBody, actual:Number(e.dataset.trueLongitude),
              label:Number(e.dataset.labelLongitude)
            }))""")
            assert len(labels)==10
            expected={'Sun':7,'Moon':23,'Mercury':32,'Venus':55,'Mars':91,
                      'Jupiter':123,'Saturn':141,'Uranus':175,'Neptune':203,'Pluto':270}
            for item in labels:
                assert abs(item['actual']-expected[item['body']])<1e-5
            vals=sorted(x['label'] for x in labels)
            gaps=[(vals[(i+1)%len(vals)]-vals[i]+360)%360 for i in range(len(vals))]
            assert min(gaps)>=13.99, gaps
            assert page.locator('#natalChart .natal-position').count()==0  # essential hides detailed tables
            assert page.locator('[data-natal-view]').count()==0
            assert page.locator('[data-house-system]').count()==0
            assert page.evaluate("JSON.parse(localStorage.getItem('astra-public-v1')).natalZodiac")=='tropical'
            # Interactive planet wheel in both modes
            page.locator('.natal-wheel [data-natal-body="Sun"]').click()
            assert 'Soleil' in page.locator('#natalSelectionInfo').inner_text()
            # After SVG rerender, the focused keyboard control stays focused.
            page.locator('.natal-wheel [data-natal-body="Moon"]').focus()
            page.keyboard.press('Enter')
            assert page.locator('[data-close-natal-detail]').count()==1
            assert page.evaluate("document.activeElement.hasAttribute('data-close-natal-detail')") is True
            assert 'Lune' in page.locator('#natalSelectionInfo').inner_text()
            assert 'Donnée calculée' in page.locator('#natalSelectionInfo').inner_text()
            page.locator('[data-close-natal-detail]').click()
            assert page.locator('#natalSelectionInfo').count()==0
            page.locator('[data-profile-screen="explore"]').click()
            assert page.locator('.natal-explore').count()==1
            assert page.evaluate('window.ASTRA_HANDLE_BACK()') is True
            assert page.locator('.natal-home').count()==1
            page.locator('[data-profile-screen="explore"]').click()
            assert page.locator('.natal-explore').count()==1
            assert page.locator('h1.page-title').inner_text()=='Comprendre mon thème'
            assert page.locator('.natal-explore .card-title').filter(has_text='Explorer mon thème').count()==0
            capture('explore-393')
            assert page.locator('.natal-explore-toolbar .natal-back').count()==1
            assert page.locator('.natal-explore-toolbar .natal-settings-link').count()==1
            assert page.locator('.natal-explore-intro').count()==1
            # Same centered content column at 320, 393, 768 and 1280 px.
            for width in (320,393,768,1280):
                page.set_viewport_size({'width':width,'height':800})
                bounds=page.evaluate("""() => {
                  const rect=x=>document.querySelector(x).getBoundingClientRect();
                  const card=rect('.natal-explore');
                  const toolbar=rect('.natal-explore-toolbar');
                  const tabs=rect('.natal-explore-tabs');
                  const panel=rect('.natal-explorer-panel');
                  const list=rect('.natal-positions');
                  const nav=rect('.bottom-nav');
                  return {page:document.documentElement.scrollWidth,
                    viewport:document.documentElement.clientWidth,
                    columns:[toolbar,tabs,panel,list].map(x=>({left:x.left,right:x.right})),
                    card:{left:card.left,right:card.right},
                    nav:nav.top,cardBottom:card.bottom,
                    navPosition:getComputedStyle(document.querySelector('.bottom-nav')).position};
                }""")
                assert bounds['page']<=bounds['viewport']+2,(width,bounds)
                cols=bounds['columns']
                assert all(abs(row['left']-cols[0]['left'])<=3 for row in cols),(width,bounds)
                assert all(abs(row['right']-cols[0]['right'])<=3 for row in cols),(width,bounds)
                assert all(row['left']>=bounds['card']['left'] and row['right']<=bounds['card']['right']+2 for row in cols),(width,bounds)
                assert bounds['navPosition']=='fixed',bounds
                if width in (320,1280):
                    capture(f'explore-layout-{width}')
            page.set_viewport_size({'width':393,'height':844})
            assert page.locator('.natal-control-stack').count()==0
            assert page.locator('#birthForm').count()==0
            assert page.locator('.natal-explore-tabs button').count()==3
            assert page.locator('[data-explore-section="planets"]').get_attribute('aria-pressed')=='true'
            assert page.locator('#natalChart .natal-position').count()==10
            assert page.locator('#natalChart .natal-aspect').count()==0
            assert '07°00′00″' in page.locator('#natalChart .natal-positions').inner_text()
            page.locator('[data-explore-section="houses"]').click()
            assert page.locator('#natalChart .natal-house-chip').count()==12
            assert page.locator('#natalChart .natal-position').count()==0
            page.locator('[data-explore-section="aspects"]').click()
            assert page.locator('#natalChart .natal-aspect').count()==1
            page.locator('[data-natal-aspect-filter="Carré"]').click()
            assert page.locator('#natalChart .natal-aspect').count()==1
            page.locator('#natalChart .natal-aspect').first.click()
            assert 'Lecture astrologique traditionnelle' in page.locator('#natalSelectionInfo').inner_text()
            page.locator('[data-close-natal-detail]').click()
            page.locator('[data-natal-aspect-filter="Sextile"]').click()
            assert page.locator('#natalChart .natal-aspect').count()==0
            page.locator('[data-natal-aspect-filter="all"]').click()
            assert page.locator('#natalChart .natal-aspect').count()==1
            # P2: matrix, house systems, double wheel and graphic exports.
            assert page.locator('.natal-matrix-disclosure').count()==1
            assert page.locator('.natal-matrix-disclosure').get_attribute('open') is None
            page.locator('.natal-matrix-disclosure summary').click()
            assert page.locator('#natalChart .natal-matrix').count()==1
            assert page.locator('#natalChart .natal-matrix button').count()==1
            page.locator('.natal-matrix button').click()
            assert 'Aspect natal' in page.locator('#natalSelectionInfo').inner_text()
            assert page.locator('.natal-matrix button').first.get_attribute('aria-pressed')=='true'
            page.locator('[data-close-natal-detail]').click()
            page.locator('[data-profile-screen="settings"]').click()
            assert page.locator('.natal-settings').count()==1
            assert page.locator('.natal-more-options').get_attribute('open') is None
            capture('settings-393')
            page.locator('.natal-more-options summary').click()
            assert page.locator('.natal-more-options').get_attribute('open') is not None
            assert audit_disclosures('natal-settings')>=1
            assert page.locator('#birthForm').count()==1
            assert page.locator('.natal-primary-cards').count()==0
            page.locator('[data-house-system="whole"]').focus()
            page.keyboard.press('Enter')
            assert page.locator('[data-house-system="whole"]').get_attribute('aria-pressed')=='true'
            assert page.evaluate("document.activeElement.dataset.houseSystem")=='whole'
            assert 'Signes entiers' in page.locator('#natalChart').inner_text()
            page.locator('[data-house-system="equal"]').click()
            assert page.locator('[data-house-system="equal"]').get_attribute('aria-pressed')=='true'
            page.locator('[data-house-system="placidus"]').click()
            page.locator('[data-natal-zoom="0.25"]').click()
            assert '125 %' in page.locator('.natal-zoom').inner_text()
            page.locator('[data-natal-zoom="reset"]').click()
            assert '100 %' in page.locator('.natal-zoom').inner_text()
            page.locator('[data-wheel-layout="double"]').click()
            page.locator('[data-profile-screen="overview"]').click()
            assert page.locator('.natal-home').count()==1
            page.locator('[data-explore-transits]').click()
            assert page.locator('.natal-compare').count()==1
            assert page.locator('h1.page-title').inner_text()=='Comparer deux dates'
            assert page.locator('.natal-compare .card-title').filter(has_text='Comparer avec les transits').count()==0
            capture('compare-393')
            assert page.locator('.natal-double-wheel').count()==1
            assert page.locator('.natal-transit-hit').count()==10
            page.locator('.natal-compare [data-open-focus]').click()
            assert page.locator('.natal-focus .natal-double-wheel').count()==1
            assert page.locator('.natal-focus .natal-transit-hit').count()==10
            page.locator('.natal-focus [data-close-focus]').click()
            assert page.locator('.natal-compare .natal-double-wheel').count()==1
            assert page.locator('.natal-contact-section').count()==1
            assert page.locator('[data-transit-step]').count()==0
            assert page.locator('#transitDay').count()==1
            page.locator('[data-transit-range="slow"]').click()
            assert page.locator('.natal-contact-list button').count()==0
            page.locator('[data-transit-range="fast"]').click()
            assert page.locator('.natal-contact-list button').count()==1
            page.locator('[data-transit-range="all"]').click()
            page.locator('.natal-contact-list [data-transit-contact]').first.click()
            assert 'Appliquant' in page.locator('#natalSelectionInfo').inner_text()
            assert 'Période dans l’orbe' in page.locator('#natalSelectionInfo').inner_text()
            page.locator('[data-close-natal-detail]').click()
            page.locator('.natal-transit-hit[data-transit-body="Sun"]').click()
            assert 'transit' in page.locator('#natalSelectionInfo').inner_text()
            assert page.locator('.natal-contact-list button').first.get_attribute('aria-pressed')=='true'
            assert '12:00' in page.locator('#natalSelectionInfo').inner_text() or 'UTC' in page.locator('#natalSelectionInfo').inner_text()
            page.locator('[data-close-natal-detail]').click()
            page.locator('#transitTime').fill('13:30')
            page.locator('#transitTime').dispatch_event('change')
            assert page.evaluate("document.activeElement.id")=='transitTime'
            saved=page.evaluate("JSON.parse(localStorage.getItem('astra-public-v1'))")
            assert saved['transitTime']=='13:30'
            page.locator('[data-profile-screen="overview"]').click()
            page.locator('.natal-extras summary').click()
            page.locator('[data-profile-screen="progressions"]').click()
            assert page.locator('.natal-progressions').count()==1
            assert page.locator('.natal-progression-row').count()==10
            assert page.locator('[data-progression-step]').count()==0
            assert page.locator('#progressionDay').count()==1
            page.locator('[data-profile-screen="overview"]').click()
            page.locator('.natal-extras summary').click()
            page.locator('[data-profile-screen="composite"]').click()
            assert page.locator('.natal-composite').count()==1
            page.locator('#secondDate').fill('1996-07-19')
            page.locator('#secondTime').fill('06:30')
            page.locator('#secondCity').fill('Paris')
            page.locator('[data-search-composite-place]').click()
            page.locator('[data-composite-place]').first.click()
            page.locator('#compositeForm button[type="submit"]').click()
            assert page.locator('.natal-composite-result').count()==1
            assert page.locator('.natal-composite-result .natal-progression-row').count()==10
            page.locator('[data-profile-screen="overview"]').click()
            page.locator('[data-profile-screen="settings"]').click()
            # Native settings hold export tools, preview wheel remains available.
            page.locator('.natal-preview-disclosure summary').click()
            assert audit_disclosures('natal-preview')>=1
            assert page.locator('.natal-settings .natal-wheel').count()==1
            # Browser-generated exports should be real files, not only UI alerts.
            with page.expect_download(timeout=6000) as d:
                page.locator('[data-export-chart="svg"]').click()
            assert d.value.suggested_filename.endswith('.svg')
            assert b'<svg' in Path(d.value.path()).read_bytes()
            with page.expect_download(timeout=9000) as d:
                page.locator('[data-export-chart="png"]').click()
            assert d.value.suggested_filename.endswith('.png')
            assert Path(d.value.path()).read_bytes().startswith(b'\\x89PNG'.decode('unicode_escape').encode('latin1'))
            page.locator('[data-wheel-layout="natal"]').click()
            page.locator('[data-profile-screen="overview"]').click()
            assert page.locator('.natal-double-wheel').count()==0
            page.locator('[data-profile-screen="explore"]').click()
            page.locator('[data-explore-section="houses"]').click()
            assert page.locator('#natalChart .natal-house-chip').count()==12
            page.locator('.natal-explore-wheel summary').click()
            assert audit_disclosures('natal-explorer')>=1
            assert page.locator('#natalChart .natal-wheel').count()==1
            page.locator('.natal-wheel [data-natal-house="1"]').click()
            assert 'Maison 1' in page.locator('#natalSelectionInfo').inner_text()
            page.locator('[data-close-natal-detail]').click()
            page.locator('.natal-wheel [data-natal-house="2"]').focus()
            page.keyboard.press('Space')
            assert page.evaluate("document.activeElement.hasAttribute('data-close-natal-detail')") is True
            assert 'Maison 2' in page.locator('#natalSelectionInfo').inner_text()
            page.keyboard.press('Escape')
            assert page.locator('#natalSelectionInfo').count()==0
            page.locator('[data-profile-screen="settings"]').click()
            page.locator('[data-natal-zodiac="sidereal"]').click()
            assert page.locator('[data-natal-zodiac="sidereal"]').get_attribute('aria-pressed')=='true'
            page.locator('[data-profile-screen="overview"]').click()
            assert 'Sidéral' in page.locator('#natalChart').inner_text()
            page.locator('[data-profile-screen="settings"]').click()
            page.locator('[data-natal-zodiac="tropical"]').click()
            page.locator('[data-natal-view="essential"]').click()
            page.locator('[data-profile-screen="overview"]').click()
            settings=page.evaluate("JSON.parse(localStorage.getItem('astra-public-v1'))")
            assert settings['natalView']=='essential' and settings['natalZodiac']=='tropical'
            # Compare the two reference palettes on the SAME natal wheel and
            # calendar geometry. Persisted choices must affect live CSS & export.
            page.set_viewport_size({'width':393,'height':844})
            page.locator('[data-profile-screen="settings"]').click()
            assert page.locator('[data-element-palette]').count()==2
            light_palettes={
                'classic':{'fire':'#FAB617','air':'#E7F6FD','water':'#00ADEF','earth':'#896B49'},
                'vivid':{'fire':'#FF3D14','air':'#F7FC35','water':'#159BF2','earth':'#46CD17'},
            }
            for palette,hues in light_palettes.items():
                option=page.locator('[data-element-palette="'+palette+'"]')
                option.click()
                assert option.get_attribute('aria-pressed')=='true',palette
                assert page.evaluate('document.documentElement.dataset.astraPalette')==palette
                assert page.evaluate("JSON.parse(localStorage.getItem('astra-public-v1')).elementPalette")==palette
                actual=page.evaluate("""() => {
                  const root=getComputedStyle(document.documentElement);
                  return Object.fromEntries(['fire','air','water','earth'].map(e=>
                    [e,root.getPropertyValue('--astra-zodiac-'+e).trim()]));
                }""")
                assert actual==hues,(palette,actual)
                capture('palette-'+palette+'-settings-light-393')
                page.locator('[data-profile-screen="overview"]').click()
                for element,colour in hues.items():
                    expected_fill='rgb('+', '.join(str(int(colour[i:i+2],16)) for i in (1,3,5))+')'
                    actual_fill=page.locator('.natal-home .wheel-zodiac-sector.zodiac-element-'+element).first.evaluate(
                        'el=>getComputedStyle(el).fill'
                    )
                    assert actual_fill==expected_fill,(palette,element,actual_fill)
                capture_element('palette-'+palette+'-wheel-light-393','.natal-home .natal-wheel')
                page.locator('[data-tab="calendar"]').click()
                capture_element('palette-'+palette+'-calendar-light-393','.astra-calendar-board')
                page.locator('[data-tab="profile"]').click()
                page.locator('[data-profile-screen="settings"]').click()
            # P3: both appearance modes, readable ribbon ink and reduced motion.
            # The palette comparison has already returned to the settings view.
            page.locator('[data-appearance="dark"]').click()
            assert page.evaluate("document.documentElement.dataset.astraTheme")=='dark'
            page.wait_for_timeout(200)  # let any theme surface transitions settle
            for item in page.evaluate(CONTRAST_JS):
                assert item.get('ratio',0)>=4.5,('dark',item)
            # The classical option must also work in night mode.
            page.locator('[data-element-palette="classic"]').click()
            assert page.evaluate("""() => {
              const style=getComputedStyle(document.documentElement);
              return document.documentElement.dataset.astraPalette==='classic' &&
                style.getPropertyValue('--solar-fire-bg').trim()==='#7C5217' &&
                style.getPropertyValue('--solar-earth-bg').trim()==='#6D5136' &&
                style.getPropertyValue('--solar-air-bg').trim()==='#395665' &&
                style.getPropertyValue('--solar-water-bg').trim()==='#105D87';
            }""")
            page.locator('[data-profile-screen="overview"]').click()
            capture_element('palette-classic-wheel-dark-393','.natal-home .natal-wheel')
            page.locator('[data-tab="calendar"]').click()
            capture_element('palette-classic-calendar-dark-393','.astra-calendar-board')
            page.locator('[data-tab="profile"]').click()
            page.locator('[data-profile-screen="settings"]').click()
            page.locator('[data-element-palette="vivid"]').click()
            capture('palette-vivid-settings-dark-393')
            page.locator('[data-profile-screen="overview"]').click()
            capture_element('palette-vivid-wheel-dark-393','.natal-home .natal-wheel')
            page.locator('[data-tab="calendar"]').click()
            capture_element('palette-vivid-calendar-dark-393','.astra-calendar-board')
            page.locator('[data-tab="profile"]').click()
            page.locator('[data-profile-screen="settings"]').click()
            assert page.evaluate('document.documentElement.dataset.astraPalette')=='vivid'
            assert page.evaluate(
                "getComputedStyle(document.documentElement).getPropertyValue('--astra-calendar-ink').trim()"
            )=='#F8EFD5'
            capture('settings-dark-393')
            # Regression: the natal reading must not use pale text on white cards.
            page.locator('[data-profile-screen="overview"]').click()
            page.locator('.natal-wheel [data-natal-body="Sun"]').click()
            assert page.locator('#natalSelectionInfo').is_visible()
            reading=page.evaluate("""() => {
              const sheet=document.querySelector('#natalSelectionInfo');
              const nav=document.querySelector('.bottom-nav');
              const rgb=x=>(x.match(/[\\d.]+/g)||[]).slice(0,3).map(Number);
              const lum=x=>rgb(x).map(v=>{
                v/=255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4;
              }).reduce((a,b,i)=>a+b*[.2126,.7152,.0722][i],0);
              const ratio=(a,b)=>{
                const x=lum(a),y=lum(b);
                return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
              };
              const selectors=[
                ['sheet-title','.natal-context-bar h2','.natal-context-bar'],
                ['close','.natal-context-bar button','.natal-context-bar button'],
                ['planet','.natal-detail-body h3','.natal-context-sheet'],
                ['fact-heading','.natal-fact>b','.natal-fact'],
                ['fact-text','.natal-fact p','.natal-fact'],
                ['symbolic-heading','.natal-symbolic>b','.natal-symbolic'],
                ['symbolic-text','.natal-symbolic p','.natal-symbolic'],
                ['reflection-heading','.natal-reflection>b','.natal-reflection'],
                ['reflection-text','.natal-reflection p','.natal-reflection']
              ];
              const values=Object.fromEntries(selectors.map(([name,selector,bg])=>{
                const el=sheet.querySelector(selector);
                const surface=sheet.querySelector(bg)||sheet;
                return [name,ratio(getComputedStyle(el).color,
                                  getComputedStyle(surface).backgroundColor)];
              }));
              const sr=sheet.getBoundingClientRect(),nr=nav.getBoundingClientRect();
              return {values,bottomGap:nr.top-sr.bottom,
                surface:getComputedStyle(sheet.querySelector('.natal-fact')).backgroundColor};
            }""")
            assert all(value>=4.5 for value in reading['values'].values()),reading
            assert reading['bottomGap']>=7,reading
            assert reading['surface']!='rgb(255, 255, 255)',reading
            capture('natal-reading-dark-393')
            page.set_viewport_size({'width':1280,'height':800})
            desktop_gap=page.evaluate("""() => {
              const sheet=document.querySelector('#natalSelectionInfo').getBoundingClientRect();
              const nav=document.querySelector('.bottom-nav').getBoundingClientRect();
              return nav.top-sheet.bottom;
            }""")
            assert desktop_gap>=7,desktop_gap
            capture('natal-reading-dark-desktop-1280')
            page.set_viewport_size({'width':393,'height':844})
            page.locator('[data-close-natal-detail]').click()
            # The old pale accordion still leaked into dark Mon ciel.
            overview_colors=page.evaluate("""() => {
              const items=['.natal-home .natal-glossary','.natal-home .natal-extras'];
              return items.map(s=>{
                const e=document.querySelector(s);
                const x=getComputedStyle(e);
                const label=getComputedStyle(e.querySelector('summary'));
                return {background:x.backgroundColor,text:label.color};
              });
            }""")
            assert all(item['background']!='rgb(255, 255, 255)' for item in overview_colors),overview_colors
            page.locator('[data-profile-screen="explore"]').click()
            assert page.locator('.natal-explore-toolbar .natal-settings-link').count()==1
            explore_colors=page.evaluate("""() => {
              const selectors=['.natal-explore .natal-position','.natal-explore .natal-explore-tabs','.natal-explore .natal-aspects'];
              return selectors.map(s=>{
                const e=document.querySelector(s);
                if(!e)return null;
                const style=getComputedStyle(e);
                return {background:style.backgroundColor,text:style.color};
              }).filter(Boolean);
            }""")
            assert len(explore_colors)>=2,explore_colors
            assert all(item['background']!='rgb(255, 255, 255)' for item in explore_colors),explore_colors
            capture('explore-dark-393')
            page.locator('.natal-explore-toolbar .natal-settings-link').click()
            page.locator('[data-tab="calendar"]').click()
            capture('calendar-dark-393')
            assert page.evaluate("""() => {
              const root=getComputedStyle(document.documentElement);
              return root.getPropertyValue('--solar-earth-bg').trim()==='#326B1A' &&
                root.getPropertyValue('--solar-water-bg').trim()==='#185E9E' &&
                root.getPropertyValue('--solar-air-bg').trim()==='#776A0D';
            }""")
            assert page.locator('.calendar .day').first.evaluate(
                "el => getComputedStyle(el).color"
            )=='rgb(248, 239, 213)'
            # Aspect text, category and disclosure must meet contrast in dark mode.
            # The pastel glyph uses independent ink, never recolour the glyph itself.
            page.locator('[data-tab="today"]').click()
            verify_active_aspects_gutters('dark-393')
            assert page.locator('.astra-event-feed .event-button').count()>0
            contrast=page.evaluate("""() => {
              const feed=document.querySelector('.astra-event-feed');
              const first=feed?.querySelector('.event-button');
              const title=first?.querySelector('.event-body b');
              const category=first?.querySelector('.event-category-label');
              const arrow=first?.querySelector('.event-arrow');
              const rgb=value=>(value.match(/[\\d.]+/g)||[]).slice(0,3).map(Number);
              const luminance=value=>{
                const channels=rgb(value).map(x=>{
                  x/=255;return x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4;
                });
                return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
              };
              const contrast=(text,bg)=>{
                const a=luminance(text),b=luminance(bg);
                return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
              };
              const bg=getComputedStyle(feed).backgroundColor;
              return {
                title:contrast(getComputedStyle(title).color,bg),
                category:category?contrast(getComputedStyle(category).color,bg):null,
                arrow:contrast(getComputedStyle(arrow).color,bg),
                buttonLabel:getComputedStyle(first).color,
                moreWidth:(()=>{
                  const more=document.querySelector('.astra-event-list-toggle');
                  return more?more.getBoundingClientRect().width:null;
                })()
              };
            }""")
            assert contrast['title']>=4.5,contrast
            if contrast['category'] is not None:
                assert contrast['category']>=4.5,contrast
            assert contrast['arrow']>=3,contrast
            if contrast['moreWidth'] is not None:
                assert contrast['moreWidth']<=390,contrast
            capture('today-dark-readable-events-393')
            page.locator('[data-tab="profile"]').click()
            page.locator('[data-profile-screen="settings"]').click()
            page.emulate_media(reduced_motion='reduce')
            assert page.locator('.bottom-nav .nav').first.evaluate(
                "e => getComputedStyle(e).transitionDuration"
            )=='0s'
            page.emulate_media(reduced_motion='no-preference')
            page.locator('[data-appearance="light"]').click()
            assert page.evaluate("document.documentElement.dataset.astraTheme")=='light'
            assert page.evaluate("""() => {
              const root=getComputedStyle(document.documentElement);
              return root.getPropertyValue('--solar-earth-bg').trim()==='#46CD17' &&
                root.getPropertyValue('--solar-water-bg').trim()==='#159BF2';
            }""")
            page.locator('[data-profile-screen="overview"]').click()
            assert page.locator('#orb').count()==0
            # New default: full wheel is fitted to the 320 px screen.
            # Explicit 125–200% zoom is the only reason for internal scrolling.
            page.set_viewport_size({'width':320,'height':730})
            assert page.locator('.natal-wheel-viewport').count()==1
            widths=page.locator('.natal-wheel-viewport').evaluate("""e => ({
              client:e.clientWidth,scroll:e.scrollWidth,width:e.querySelector('svg').getBoundingClientRect().width
            })""")
            assert widths['scroll']<=widths['client']+2,widths
            assert 180<=widths['width']<=widths['client']+2,widths
            assert page.evaluate("document.documentElement.scrollWidth")<=322
            assert page.locator('#birthForm').count()==0
            # P0 visual guardrails at 320px across all four destinations.
            for tab in ('today','month','calendar','profile'):
                page.locator(f'[data-tab="{tab}"]').click()
                assert page.evaluate("document.documentElement.scrollWidth") <= 322, tab
                if tab=='today':
                    assert px('.event-sub')>=13
                    assert page.locator('.astra-week-day').count()==7
                    assert page.locator('.astra-week-day[aria-pressed="true"]').count()==1
                    assert page.locator('.astra-day-hero').count()==1
                    assert page.locator('.astra-day-moon-moments').count()==0
                    assert page.locator('.astra-moon-title').inner_text()=='Lune en Bélier'
                    assert page.locator('.astra-hero-moon-icon .astra-phase-graphic').count()==1
                    assert page.locator('.astra-hero-moon-icon .astra-phase-graphic.astra-phase-3').count()==1
                    assert page.locator('.astra-moon-phase').inner_text()=='Lune gibbeuse croissante'
                    assert page.locator('.astra-sky-reference').is_visible()
                    assert '12 h' in page.locator('.astra-sky-reference').inner_text()
                    assert page.locator('.astra-moon-title').evaluate(
                        "el=>parseFloat(getComputedStyle(el).fontSize)")>=22
                    assert page.locator('.astra-insight-tile').count()==0
                    assert page.locator('.astra-day-journal-link').count()==1
                    assert page.locator('.astra-hero-orbit').count()==0
                    assert 'Soleil en' in page.locator('.astra-solar-daily-band').inner_text()
                    assert page.locator('.astra-lunar-milestone').count()==0
                    assert page.locator('[data-step-day]').count()==0
                    selected_date=page.locator('.astra-week-day.is-selected').get_attribute('data-day')
                    expected_count=5 if selected_date.endswith('11-23') else 2 if int(selected_date[-2:]) in (5,20) else 1
                    assert page.locator('.astra-day-hero .astra-hero-stat strong').inner_text()==str(expected_count)
                    assert page.locator('.astra-event-list-rows [data-event]').count()==min(expected_count,3)
                    verify_active_aspects_gutters('light-320')
                    capture('today-flo-layout-320')
                elif tab=='month':
                    assert page.locator('h1.page-title').inner_text()=='Ce mois'
                    assert page.locator('.astra-month-hero').count()==1
                    assert page.locator('.astra-month-hero strong').first.inner_text().isdigit()
                    assert page.locator('.astra-month-phase').count()==2
                    assert page.locator('.astra-month-phase.new').count()==1
                    assert page.locator('.astra-month-phase.full').count()==1
                    assert 'Pleine Lune en Gémeaux' in page.locator('.astra-month-phase.full').inner_text()
                    assert page.locator('.astra-month-event').count()==0
                    assert page.locator('.astra-event-day-list').count()==1
                    rows=page.locator('.astra-event-day-row')
                    assert rows.count()<=5
                    days=rows.evaluate_all("(els)=>els.map(e=>e.dataset.monthOpenDay)")
                    assert days==sorted(set(days)),days
                    for item in rows.all():
                        assert item.locator('.astra-event-day-date strong').inner_text().isdigit()
                        assert 'événement' in item.locator('.astra-event-day-heading').inner_text()
                        assert item.locator('.astra-event-day-preview').inner_text()
                    assert page.locator('.calendar').count()==0
                    assert page.locator('.astra-lunar-milestone').count()==0
                    capture('month-320')
                elif tab=='calendar':
                    assert px('.weekday')>=12
                    assert page.locator('.astra-month-hero').count()==0
                    assert page.locator('.astra-lunar-milestone').count()==0
                    assert page.locator('.astra-calendar-day-summary').count()==0
                    assert page.locator('.astra-personal-create').count()==0
                    assert page.locator('#calendarDayDialog').count()==0
                    assert page.locator('[data-calendar-view]').count()==0
                elif tab=='profile':
                    assert px('.natal-home-subtitle')>=14
            # Monthly overview and detailed calendar must be separate but linked.
            page.locator('[data-tab="month"]').click()
            initial_month=page.locator('.astra-month-navigation h2').inner_text()
            page.locator('.astra-month-navigation [data-month="-1"]').click()
            page.wait_for_timeout(140)
            assert page.locator('.astra-month-navigation h2').inner_text()!=initial_month
            assert page.locator('#monthEventsTitle').inner_text()=='Journées du mois'
            rows=page.locator('.astra-event-day-row')
            assert rows.count()==5
            grouped_days=rows.evaluate_all("(els)=>els.map(e=>e.dataset.monthOpenDay)")
            assert grouped_days==sorted(set(grouped_days)),grouped_days
            assert len(grouped_days)==5
            assert all('événement' in text for text in rows.locator('.astra-event-day-heading').all_inner_texts())
            first_day=grouped_days[0]
            rows.first.click()
            assert page.locator('[data-tab="calendar"]').get_attribute('aria-current')=='page'
            assert page.locator('.calendar .day.selected').get_attribute('data-day')==first_day
            # Calendar is exhaustive: the monthly list is only a preview by day.
            page.locator('[data-tab="month"]').click()
            assert page.locator('.astra-month-navigation h2').inner_text()==initial_month
            page.locator('.astra-month-navigation [data-month="1"]').click()
            page.wait_for_timeout(140)
            assert page.locator('#monthEventsTitle').inner_text()=='Journées du mois'
            future_days=page.locator('.astra-event-day-row').evaluate_all("(els)=>els.map(e=>e.dataset.monthOpenDay)")
            assert len(future_days)==5 and future_days==sorted(set(future_days)),future_days
            # "Ce jour" is not allowed to inherit the browsed month.
            page.locator('[data-tab="today"]').click()
            page.locator('.astra-day-hero').wait_for(timeout=2500)
            assert page.locator('.astra-week-day.is-selected').get_attribute('data-day')==page.evaluate(
                "new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0')+'-'+String(new Date().getDate()).padStart(2,'0')"
            )
            page.locator('[data-tab="month"]').click()
            page.locator('.astra-month-hero').wait_for(timeout=2500)
            assert page.locator('.astra-month-navigation h2').inner_text()==initial_month
            assert page.locator('#monthEventsTitle').inner_text()=='Prochains jours avec événements'
            month_group_days=page.locator('.astra-event-day-row').evaluate_all("(els)=>els.map(e=>e.dataset.monthOpenDay)")
            assert month_group_days==sorted(set(month_group_days)),month_group_days
            assert len(month_group_days)<=5
            # A busy date (23 November) still occupies just ONE day row.
            if '2026-11-23' in month_group_days:
                assert month_group_days.count('2026-11-23')==1
                crowded=page.locator('.astra-event-day-row[data-month-open-day="2026-11-23"]')
                assert crowded.locator('.astra-event-day-heading').inner_text()=='5 événements'
                assert crowded.locator('.astra-event-day-preview').inner_text().count(' · ')>=1
            chosen=page.locator('.astra-month-phase.new').get_attribute('data-month-open-day')
            page.locator('.astra-month-phase.new').click()
            assert page.locator('[data-tab="calendar"]').get_attribute('aria-current')=='page'
            assert page.locator('.calendar .day.selected').get_attribute('data-day')==chosen
            page.locator('[data-tab="month"]').click()
            page.locator('.astra-month-calendar-link').click()
            assert page.locator('[data-tab="calendar"]').get_attribute('aria-current')=='page'
            page.locator('[data-tab="month"]').click()
            page.locator('.astra-month-metrics button[data-goto="journal"]').click()
            assert page.locator('#journalNote').count()==1
            assert page.locator('.astra-journal-back').count()==1
            page.locator('.astra-journal-back').click()
            assert page.locator('[data-tab="today"]').get_attribute('aria-current')=='page'
            # Reproduce the confusing case: Taurus at noon, ingress later,
            # and Full Moon in Gemini that evening. All are simultaneous truths
            # about different instants, never conflicting labels.
            page.locator('[data-tab="today"]').click()
            target=page.evaluate("""() => {
              const d=new Date();
              return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-20';
            }""")
            for _ in range(8):
                if page.locator(f'.astra-week-day[data-day="{target}"]').count():break
                first=page.locator('.astra-week-day').first.get_attribute('data-day')
                page.locator('[data-week-shift="-7"]' if target<first else '[data-week-shift="7"]').click()
                page.wait_for_timeout(70)
            assert page.locator(f'.astra-week-day[data-day="{target}"]').count()==1
            page.evaluate('window.__moonScenario=true')
            page.locator(f'.astra-week-day[data-day="{target}"]').click()
            assert page.locator('.astra-day-hero').count()==1
            assert page.locator('.astra-day-moon-moments').count()==0
            assert page.locator('.astra-moon-title').inner_text()=='Taureau → Gémeaux'
            assert page.locator('.astra-moon-title').get_attribute('aria-label')=='Lune en Taureau puis Gémeaux'
            assert 'Changement à' in page.locator('.astra-moon-phase').inner_text()
            assert page.locator('.astra-moon-phase time').count()==1
            assert 'Position à 12 h' in page.locator('.astra-sky-reference').inner_text()
            # The noon Moon icon is preserved and the full-moon inset uses
            # its own exact phase icon and zodiac position at the event.
            assert page.locator('.astra-hero-moon-icon .astra-phase-graphic').count()==1
            assert page.locator('.astra-day-hero .astra-lunar-highlight.is-full').count()==1
            assert page.locator('.astra-lunar-highlight-kicker').inner_text()=='ÉVÉNEMENT LUNAIRE MAJEUR'
            assert page.locator('.astra-lunar-highlight-title').inner_text()=='Pleine Lune en Gémeaux'
            assert page.locator('.astra-lunar-highlight-time').count()==1
            assert page.locator('.astra-lunar-highlight-icon .astra-phase-graphic.astra-phase-4').count()==1
            times=page.locator('.astra-day-hero time').all_text_contents()
            assert len(times)==2
            assert all(time.strip() for time in times)
            assert page.locator('.astra-lunar-milestone').count()==0
            page.evaluate('window.__moonScenario=false')
            page.locator('[data-tab="today"]').click()
            # Flo-inspired placement remains functional, not just a mockup.
            page.locator('[data-tab="today"]').click()
            before=page.locator('.astra-week-day.is-selected').get_attribute('data-day')
            page.locator('[data-week-shift="7"]').click()
            after=page.locator('.astra-week-day.is-selected').get_attribute('data-day')
            assert after!=before
            page.locator('[data-week-shift="-7"]').click()
            assert page.locator('.astra-week-day.is-selected').get_attribute('data-day')==before
            page.locator('.astra-hero-link').click()
            assert page.evaluate('document.activeElement.id')=='todayEventsTitle'
            page.locator('.astra-day-journal-link[data-goto="journal"]').click()
            assert page.locator('#journalNote').count()==1
            page.locator('[data-tab="today"]').click()
            assert page.evaluate("document.documentElement.scrollWidth")<=322
            # Samsung-sized widths and tablet/desktop should not overflow.
            for width in (360,375,393,412,768,1280):
                page.set_viewport_size({'width':width,'height':844})
                assert page.evaluate("document.documentElement.scrollWidth") <= width+2, width
                if width in (393,1280):
                    verify_active_aspects_gutters('light-'+str(width))
                if width in (360,393,412):
                    assert page.locator('.astra-week-day').count()==7
                    assert page.locator('.astra-day-hero').is_visible()
                    capture('today-flo-layout-'+str(width))
                    page.locator('[data-tab="month"]').click()
                    assert page.locator('.astra-month-hero').is_visible()
                    assert page.evaluate('document.documentElement.scrollWidth')<=width+2
                    capture('month-'+str(width))
                    page.locator('[data-tab="today"]').click()
            page.set_viewport_size({'width':320,'height':730})
            # Return to Mon ciel after exercising the daily home widgets.
            page.locator('[data-tab="profile"]').click()
            page.locator('[data-profile-screen="settings"]').click()
            assert page.locator('.calculation-details').first.get_attribute('open') is None
            page.locator('.calculation-details summary').first.click()
            assert 'Orbes automatiques' in page.locator('#birthForm').inner_text()
            page.locator('[data-tab="calendar"]').click()
            assert page.locator('.calendar-options').count()==1
            assert page.locator('.calendar-options').get_attribute('open') is None
            assert page.locator('.calendar-help').count()==1
            assert page.locator('.calendar-help').get_attribute('open') is None
            assert page.evaluate("""() => {
              const calendar=document.querySelector('.astra-calendar-board');
              const options=document.querySelector('.calendar-options');
              return !!calendar&&!!options&&Boolean(calendar.compareDocumentPosition(options)&Node.DOCUMENT_POSITION_FOLLOWING);
            }"""), 'Options should be positioned after the calendar board'
            assert page.locator('h1.page-title').inner_text()=='Calendrier'
            # A single ribbon layer spans the seven date cells of each week.
            assert page.locator('.calendar .astra-calendar-date-week').count()>0
            assert page.locator('.calendar .astra-adjacent-day').count()>0
            assert page.locator('.calendar .astra-solar-ribbon-segment.is-outside-month').count()>0
            assert page.locator('.calendar .astra-calendar-date-week').first.locator('.astra-solar-ribbon-segment').count()>=2
            assert page.locator('.calendar .astra-solar-ribbon-segment.is-outside-month').first.evaluate(
                "el => getComputedStyle(el).backgroundColor"
            )=='rgb(164, 214, 245)'
            assert page.locator('.calendar .astra-adjacent-day[data-day="2026-10-26"]').count()==1
            assert page.locator('.calendar .astra-adjacent-day[data-day="2026-12-06"]').count()==1
            assert page.locator('.calendar .astra-adjacent-day').first.get_attribute('aria-label').__contains__('hors du mois affiché')
            assert page.locator('.calendar .astra-adjacent-day.moon-new').count()>=1
            assert page.locator('.calendar .astra-adjacent-day.moon-new .moon-phase-badge').first.evaluate(
                "el => getComputedStyle(el).borderTopStyle"
            )=='solid'
            assert page.locator('.calendar .day.moon-new .moon-phase-badge').count()==1
            assert page.locator('.calendar .day.moon-full .moon-phase-badge').count()==1
            assert page.locator('.calendar .day.moon-full .moon-phase-badge').evaluate("el => getComputedStyle(el).borderTopStyle")=='solid'
            assert page.locator('.calendar .astra-solar-ribbon-backdrop').count()>0
            assert page.locator('.calendar .astra-solar-ribbon-segment.solar-element-water').count()>0
            assert page.locator('.calendar .astra-solar-ribbon-segment.solar-element-fire').count()>0
            assert page.locator('.calendar .day.astra-solar-cell').count()==0
            assert page.locator('.calendar .day[data-day$="-19"]').count()==1
            assert '50/50' in page.locator('.calendar .day[data-day$="-19"]').get_attribute('aria-label')
            assert 'Soleil dominant' in page.locator('.astra-calendar-solar-note').inner_text()
            assert 'Scorpion' in page.locator('.astra-calendar-solar-note').inner_text()
            assert '72 %' not in page.locator('.astra-calendar-solar-note').inner_text()
            page.locator('.calendar-help > summary').click()
            assert 'Signe solaire le plus présent' in page.locator('.calendar-help-body').inner_text()
            assert '50/50' in page.locator('.calendar-help-body').inner_text()
            page.locator('.calendar-help > summary').click()
            page.locator('.calendar .day[data-day$="-19"]').click()
            assert page.locator('#calendarDayDialog[open]').count()==1
            assert 'moitié-moitié' in page.locator('.astra-calendar-sheet-solar').inner_text()
            page.locator('[data-calendar-sheet-close]').click()
            page.locator('.calendar .day[data-day$="-20"]').click()
            assert page.locator('#calendarDayDialog[open]').count()==1
            page.locator('[data-calendar-sheet-close]').click()
            # Calculated phase icon for every day; New/Full highlighted
            # separately. There are no exact-Sun-aspect marker decorations.
            new_moon=page.locator('.calendar .day.moon-new')
            full_moon=page.locator('.calendar .day.moon-full')
            assert new_moon.count()==1 and full_moon.count()==1
            assert new_moon.get_attribute('data-day').endswith('-05')
            assert full_moon.get_attribute('data-day').endswith('-20')
            assert 'Nouvelle Lune' in new_moon.get_attribute('aria-label')
            assert 'Pleine Lune' in full_moon.get_attribute('aria-label')
            month_days=page.locator('.calendar .day').count()
            assert page.locator('.calendar .day .moon-phase-badge').count()==month_days
            assert page.locator('.calendar .day .moon-phase-badge .astra-phase-graphic').count()==month_days
            # Regression for the 0.8.6 screenshot: SVG icons accidentally had
            # class="calendar" and inherited the panel padding and border,
            # causing doubled outlines, misplaced Moon disks and overlaps.
            assert page.locator('.calendar svg.calendar').count()==0
            assert page.locator('.calendar .day .astra-phase-variant-cell').count()==month_days
            assert page.evaluate("""() => {
              const within=(a,b)=>a.left>=b.left-1&&a.right<=b.right+1&&
                a.top>=b.top-1&&a.bottom<=b.bottom+1;
              const cells=[...document.querySelectorAll('.cal-grid .day')];
              const icons=[...document.querySelectorAll('.calendar-phase-legend .astra-phase-graphic')];
              return cells.every(cell=>{
                const svg=cell.querySelector('.moon-phase-badge svg');
                const moon=svg?.querySelector('circle.phase-night');
                if(!svg||!moon)return false;
                const rect=svg.getBoundingClientRect(),container=cell.getBoundingClientRect();
                const css=getComputedStyle(svg);
                const bar=cell.querySelector('.sun-aspect-line');
                return css.paddingLeft==='0px'&&css.borderLeftWidth==='0px'&&
                  rect.width<=23&&rect.height<=23&&
                  within(rect,container)&&within(moon.getBoundingClientRect(),rect)&&
                  (!bar||within(bar.getBoundingClientRect(),container));
              })&&icons.every(svg=>{
                const css=getComputedStyle(svg);
                return css.paddingLeft==='0px'&&css.borderLeftWidth==='0px'&&
                  svg.getBoundingClientRect().height<=23;
              });
            }"""),'Moon icons and Sun bars must fit their own cells'
            assert page.evaluate('document.documentElement.scrollWidth')<=322
            assert new_moon.locator('.astra-phase-graphic.astra-phase-0').count()==1
            assert full_moon.locator('.astra-phase-graphic.astra-phase-4').count()==1
            assert page.locator('.calendar .day.sun-exact').count()==0
            assert page.locator('.calendar .day .sun-aspect-line').count()==0
            assert page.locator('.calendar-phase-legend .cal-legend-item').count()==2
            assert 'Aspect solaire exact' not in page.locator('.calendar-phase-legend').inner_text()
            assert 'Nouvelle Lune' in page.locator('.calendar-phase-legend').inner_text()
            assert 'Pleine Lune' in page.locator('.calendar-phase-legend').inner_text()
            assert page.evaluate("""() => [...document.querySelectorAll('.calendar .day:not(.moon-new):not(.moon-full) .moon-phase-badge')].every(el =>
              getComputedStyle(el).backgroundColor === 'rgba(0, 0, 0, 0)')""")
            # Solar element colors remain independent of the event filter.
            page.locator('.calendar-options > summary').click()
            assert audit_disclosures('calendar')>=1
            page.locator('#eventFilter').select_option('exact')
            assert page.locator('.calendar .day.moon-new').count()==1
            assert page.locator('.calendar .day.moon-full').count()==1
            assert page.locator('.calendar .astra-solar-ribbon-backdrop').count()>0
            assert page.locator('.calendar .day .moon-phase-badge').count()==month_days
            # The menu stays open across filter-triggered re-renders.
            assert page.locator('.calendar-options').get_attribute('open') is not None
            page.locator('#eventFilter').select_option('moon')
            assert page.locator('.calendar .astra-solar-ribbon-segment.starts-at-ingress').count()==1
            assert page.locator('.calendar .day .moon-phase-badge').count()==month_days
            # Calendar filters cannot erase the unfiltred daily summary.
            page.locator('[data-tab="today"]').click()
            day_key=page.locator('.astra-week-day.is-selected').get_attribute('data-day')
            expected=5 if day_key.endswith('11-23') else 2 if int(day_key[-2:]) in (5,20) else 1
            assert page.locator('.astra-day-hero .astra-hero-stat strong').inner_text()==str(expected)
            page.locator('[data-tab="calendar"]').click()
            assert page.locator('.calendar-options').get_attribute('open') is not None
            page.locator('#eventFilter').select_option('all')
            capture('calendar-320')
            # Personal events belong IN each week of the grid, never in a list below.
            assert page.locator('.astra-calendar-day-summary').count()==0
            assert page.locator('.astra-personal-create').count()==0
            assert page.locator('[data-calendar-view]').count()==0
            # Five exact events remain in ONE card before and after expansion.
            # The expansion button is a footer rather than a second event card.
            page.locator('.calendar .day[data-day="2026-11-23"]').click()
            assert page.locator('#calendarDayDialog[open]').count()==1
            page.locator('[data-calendar-open-day]').click()
            assert page.locator('#todayEvents .astra-event-list-card').count()==1
            assert page.locator('#todayEvents .astra-event-feed').count()==1
            assert page.locator('#todayEvents .astra-more-events').count()==0
            assert page.locator('#todayEvents .astra-event-list-rows .astra-event-row').count()==3
            assert page.locator('#todayEvents .astra-event-list-toggle').inner_text().startswith('Afficher les 2')
            assert page.locator('#todayEvents .astra-event-list-toggle').get_attribute('aria-expanded')=='false'
            assert page.locator('#todayEvents .event-category-label').count()==0
            assert page.locator('#todayEvents .astra-event-list-head h2').inner_text()=='Événements du jour'
            assert page.locator('#todayEvents .astra-event-list-head p').inner_text().endswith('5 événements')
            for width in (320,393,1280):
                page.set_viewport_size({'width':width,'height':844})
                page.locator('.astra-event-list-toggle').click()
                assert page.locator('.astra-event-list-rows .astra-event-row').count()==5
                assert page.locator('.astra-event-list-toggle').get_attribute('aria-expanded')=='true'
                assert page.locator('.astra-event-list-toggle').inner_text().startswith('Réduire')
                assert page.locator('.astra-event-list-toggle').evaluate('e=>document.activeElement===e')
                assert page.locator('#todayEvents .astra-event-feed').count()==1
                times=page.locator('#todayEvents .astra-event-row time').all_inner_texts()
                assert len(times)==5,times
                assert page.locator('.astra-event-row .astra-event-meta').count()==5
                alignment=page.locator('#todayEvents').evaluate("""el=>{
                  const root=el.querySelector('.astra-event-list-card').getBoundingClientRect();
                  const rows=[...el.querySelectorAll('.astra-event-row')];
                  const times=rows.map(row=>row.querySelector('time').getBoundingClientRect());
                  const right=rows.map(row=>row.querySelector('.event-arrow').getBoundingClientRect());
                  const counts=el.querySelectorAll('.astra-event-list-card').length;
                  return {cards:counts,inset:rows[0].getBoundingClientRect().left-root.left,
                    timeAlignment:times.every((t,i)=>i===0||Math.abs(t.right-times[0].right)<1.5),
                    arrowAlignment:right.every((a,i)=>i===0||Math.abs(a.right-right[0].right)<1.5),
                    overflow:document.documentElement.scrollWidth>innerWidth+2};
                }""")
                assert alignment['cards']==1 and alignment['inset']>=-1,(width,alignment)
                assert alignment['timeAlignment'] and alignment['arrowAlignment'],(width,alignment)
                assert not alignment['overflow'],(width,alignment)
                capture('daily-events-expanded-'+str(width))
                page.locator('.astra-event-list-toggle').click()
                assert page.locator('.astra-event-list-rows .astra-event-row').count()==3
                assert page.locator('.astra-event-list-toggle').get_attribute('aria-expanded')=='false'
            page.set_viewport_size({'width':320,'height':730})
            page.locator('[data-tab="calendar"]').click()
            page.locator('.calendar .day[data-day="2026-11-23"]').click()
            assert page.locator('#calendarDayDialog[open]').count()==1
            page.locator('#calendarDayDialog [data-personal-new]').click()
            assert page.locator('#personalEventDialog[open]').count()==1
            page.locator('#personalTitle').fill('Séjour sur trois jours')
            page.locator('#personalStart').fill('2026-11-23')
            page.locator('#personalEnd').fill('2026-11-25')
            assert page.locator('#personalAllDay').is_checked()
            page.locator('#personalEventForm button[type="submit"]').click()
            assert page.locator('#personalEventDialog').count()==0
            assert page.locator('.astra-personal-calendar-event[aria-label*="Séjour sur trois jours"]').count()==1
            assert 'grid-column:1 / span 3' in page.locator(
                '.astra-personal-calendar-event[aria-label*="Séjour sur trois jours"]').get_attribute('style')
            stored=page.evaluate("JSON.parse(localStorage.getItem('astra-public-v1'))")
            assert stored['calendarEvents'][0]['start']=='2026-11-23'
            assert stored['calendarEvents'][0]['end']=='2026-11-25'

            # Crosses both a week boundary and November -> December.
            page.locator('.calendar .day[data-day="2026-11-27"]').click()
            page.locator('#calendarDayDialog [data-personal-new]').click()
            page.locator('#personalTitle').fill('Voyage fin novembre')
            page.locator('#personalStart').fill('2026-11-27')
            page.locator('#personalEnd').fill('2026-12-04')
            page.locator('#personalEventForm button[type="submit"]').click()
            assert page.locator('.astra-personal-calendar-event[aria-label*="Voyage fin novembre"]').count()==2
            page.locator('.calendar .day[data-day="2026-11-29"]').click()
            assert 'Voyage fin novembre' in page.locator('#calendarDayDialog').inner_text()
            page.locator('[data-calendar-sheet-close]').click()
            page.locator('.month-head [data-month="1"]').click()
            page.wait_for_timeout(120)
            assert page.locator('.astra-personal-calendar-event[aria-label*="Voyage fin novembre"]').count()>=1
            assert 'continues-before' in page.locator(
                '.astra-personal-calendar-event[aria-label*="Voyage fin novembre"]').first.get_attribute('class')
            page.locator('.month-head [data-month="-1"]').click()
            page.wait_for_timeout(120)

            # A timed one-day appointment uses the same calendar grid.
            page.locator('.calendar .day[data-day="2026-11-24"]').click()
            page.locator('#calendarDayDialog [data-personal-new]').click()
            page.locator('#personalTitle').fill('Consultation')
            page.locator('#personalStart').fill('2026-11-24')
            page.locator('#personalEnd').fill('2026-11-24')
            page.locator('#personalAllDay').uncheck()
            assert page.locator('#personalTimeFields').is_visible()
            page.locator('#personalStartTime').fill('13:30')
            page.locator('#personalEndTime').fill('15:00')
            page.locator('#personalEventForm button[type="submit"]').click()
            personal_button=page.locator('.astra-personal-calendar-event[aria-label*="Consultation"]')
            assert personal_button.count()==1
            assert '13:30' in personal_button.inner_text()
            personal_button.click()
            assert page.locator('#personalEventDialog[open]').count()==1
            assert page.locator('#personalAllDay').is_checked() is False
            page.locator('#personalTitle').fill('Consultation modifiée')
            page.locator('#personalEventForm button[type="submit"]').click()
            assert page.locator('.astra-personal-calendar-event[aria-label*="Consultation modifiée"]').count()==1
            page.locator('.astra-personal-calendar-event[aria-label*="Consultation modifiée"]').click()
            page.once('dialog', lambda dialog: dialog.accept())
            page.locator('[data-personal-delete]').click()
            assert page.locator('.astra-personal-calendar-event[aria-label*="Consultation modifiée"]').count()==0
            saved=page.evaluate("JSON.parse(localStorage.getItem('astra-public-v1'))")
            assert len(saved['calendarEvents'])==2

            # Selected date opens a contextual dialog, not a separate page section.
            chosen=page.locator('.calendar .day.moon-full').get_attribute('data-day')
            page.locator('.calendar .day.moon-full').click()
            assert page.locator('#calendarDayDialog[open]').count()==1
            assert page.locator('.calendar .day.selected').get_attribute('data-day')==chosen
            assert 'Pleine Lune' in page.locator('#calendarDayDialog').inner_text()
            assert page.evaluate('document.documentElement.scrollWidth')<=322
            capture('calendar-embedded-320')
            page.locator('[data-calendar-open-day]').click()
            assert page.locator('[data-tab="today"]').get_attribute('aria-current')=='page'
            assert page.locator('.astra-week-day.is-selected').get_attribute('data-day')==chosen
            assert page.locator('.astra-day-hero').count()==1
            page.locator('[data-tab="calendar"]').click()
            page.locator('.calendar .day.moon-full').click()
            page.locator('#calendarDayDialog [data-event]').first.click(timeout=2000)
            assert page.locator('#detailPanel').count()==1
            assert audit_disclosures('event-detail')>=2
            assert 'Lecture astrologique' in page.locator('#detailPanel').inner_text()
            assert page.locator('#detailPanel .astra-event-facts').count()==1
            assert page.locator('#detailPanel .astra-event-technical').count()==1
            assert page.locator('#detailPanel .astra-event-technical').get_attribute('open') is None
            assert page.evaluate('document.activeElement.id')=='detailPanel'
            # Regression: opening an event disclosure must retain inner gutters.
            page.locator('#detailPanel .astra-event-technical > summary').click()
            for width in (320,393,1280):
                page.set_viewport_size({'width':width,'height':844})
                spacing=page.locator('#detailPanel .astra-event-technical').evaluate("""el => {
                  const summary=el.querySelector(':scope > summary');
                  const body=el.querySelector('.astra-event-disclosure-body');
                  const info=[summary,body].map(node=>{
                    const css=getComputedStyle(node);
                    return {left:parseFloat(css.paddingLeft),right:parseFloat(css.paddingRight)};
                  });
                  return {summary:info[0],body:info[1],
                    factsOffset:body.querySelector('.astra-event-facts').getBoundingClientRect().left-
                                body.getBoundingClientRect().left};
                }""")
                assert spacing['summary']['left']>=14,(width,spacing)
                assert spacing['summary']['right']>=14,(width,spacing)
                assert spacing['body']['left']>=14,(width,spacing)
                assert audit_disclosures('detail-'+str(width))>=2
                assert spacing['body']['right']>=14,(width,spacing)
                assert spacing['factsOffset']>=14,(width,spacing)
                assert page.evaluate('document.documentElement.scrollWidth')<=width+2,(width,spacing)
                if width==320:
                    capture('event-disclosure-padded-mobile-320')
                elif width==1280:
                    capture('event-disclosure-padded-desktop-1280')
            page.set_viewport_size({'width':320,'height':730})
            page.locator('#detailPanel .astra-event-technical > summary').click()
            assert 'Référence horaire' in page.locator('#detailPanel').text_content()
            assert page.locator('[data-detail-step]').count()==0
            page.get_by_role('button',name='Noter dans mon journal').click()
            assert page.locator('#journalNote').count()==1
            assert 'Quelle observation' in page.locator('#journalNote').input_value()
            page.locator('[data-mood="5"]').click()
            page.locator('#energyRange').fill('4')
            page.locator('[data-tag="creation"]').click()
            page.locator('#journalNote').fill('Une belle journée de création.')
            page.locator('[data-save="1"]').click()
            stored=page.evaluate("JSON.parse(localStorage.getItem('astra-public-v1'))")
            day=list(stored['journal'].values())[0]
            assert day['mood']==5 and day['energy']==4 and day['tags']==['creation']
            assert 'création' in day['note']
            assert '5.0/5' in page.locator('.insights').inner_text()
            page.locator('#journalSearch').fill('création')
            page.locator('#journalSearch').dispatch_event('change')
            assert 'Une belle journée' in page.locator('.history-item').inner_text()
            # A new page on the same origin is unavailable without HTTP navigation;
            # verify that the serialized entry survives an in-app view change.
            page.locator('[data-tab="today"]').click()
            page.locator('.astra-day-journal-link[data-goto="journal"]').click()
            assert page.get_by_text('Comment tu te sens ?').count()==1
            capture('journal-320')
            # Returning to the daily tab really goes to the present. The older
            # journal entry is preserved in history, not copied onto today.
            assert 'Une belle journée de création.' in page.locator('.history-item').first.inner_text()
            assert page.locator('#journalNote').input_value()!='Une belle journée de création.'
            assert page.locator('#journalNote').is_visible()
            page.locator('#journalNote').focus()
            assert page.locator('.bottom-nav').evaluate(
                "e => getComputedStyle(e).visibility"
            )=='visible'
            page.set_viewport_size({'width':320,'height':480})
            page.wait_for_timeout(75)
            assert page.locator('.bottom-nav').evaluate(
                "e => getComputedStyle(e).visibility"
            )=='hidden'
            page.set_viewport_size({'width':320,'height':730})
            page.wait_for_timeout(75)
            assert page.locator('.bottom-nav').evaluate(
                "e => getComputedStyle(e).visibility"
            )=='visible'
            page.locator('#journalNote').evaluate('e => e.blur()')
            # P1: unknown birth hour should not invent an Ascendant or houses.
            page.locator('[data-tab="profile"]').click()
            assert page.locator('#birthForm').count()==0
            page.locator('[data-profile-screen="settings"]').click()
            page.locator('#unknownBirthTime').check()
            assert page.locator('#birthTime').is_disabled()
            page.get_by_role('button',name='Calculer mon thème natal').click()
            page.wait_for_timeout(250)
            saved=page.evaluate("JSON.parse(localStorage.getItem('astra-public-v1'))")
            assert saved['profile']['timeKnown'] is False
            assert saved['profile']['time'] is None
            assert saved['journal'], 'Existing journal must survive updating birth time'
            page.locator('[data-tab="profile"]').click()
            assert page.locator('#natalChart .natal-wheel').count()==1
            assert page.locator('#natalChart .wheel-house-sector').count()==0
            assert page.locator('#natalChart [data-natal-house]').count()==0
            assert 'Heure de naissance inconnue' in page.locator('#natalChart').inner_text()
            assert 'Ascendant' not in page.locator('.natal-primary-cards').inner_text()
            page.locator('.natal-wheel [data-natal-body="Moon"]').click()
            assert 'indicative' in page.locator('#natalSelectionInfo').inner_text()
            page.locator('[data-close-natal-detail]').click()
            page.locator('[data-profile-screen="explore"]').click()
            assert page.locator('#natalChart .natal-position').count()==10
            assert page.locator('[data-explore-section="houses"]').count()==0
            page.locator('[data-explore-section="aspects"]').click()
            assert page.locator('#natalChart .natal-house-chip').count()==0
            assert page.locator('#natalChart .natal-aspect').count()==1
            # Back goes from Explorer to home, then to Today; on Today
            # without a panel the native Activity may exit normally.
            assert page.evaluate('window.ASTRA_HANDLE_BACK()') is True
            assert page.locator('.natal-home').count()==1
            assert page.evaluate('window.ASTRA_HANDLE_BACK()') is True
            assert page.locator('[data-tab="today"]').get_attribute('aria-current')=='page'
            assert page.evaluate('window.ASTRA_HANDLE_BACK()') is False
            assert not errors, errors
            print('UI Android adaptive: 320–1280 px, Galaxy A15, IME, Android Back, natal and journal: OK')
            browser.close()
    finally:
        pass

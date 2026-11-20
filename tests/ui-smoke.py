#!/usr/bin/env python3
"""P2 browser smoke tests using a synthetic astronomical engine.
Astronomical truth is tested by runtime.test.mjs in CI, not this mock.
"""
from pathlib import Path
from shutil import which
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1] / 'app/src/main/assets'

JS = r"""
window._store = {};
Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window._store[k]||null,setItem:(k,v)=>{window._store[k]=String(v)},removeItem:k=>{delete window._store[k]}}});
window.ASTRA_ENGINE = {
 validateProfile(p){if(!p.date || (p.timeKnown!==false&&!p.time) || !p.timezone || !Number.isFinite(Number(p.latitude)))throw Error('Profil invalide');return true;},
 moonPhase(){return 128.1},formatSign(){return '7° Bélier'},
 formatSignExact(){return '07°00′00″ Bélier'},formatOrbExact(orb){return orb.toFixed(2)+'°'},
 filterNatalAspects(list,filter){return filter==='all'?[...list]:list.filter(a=>a.aspect===filter)},
 describeNatalPlanet(body,lng,house,approx){return {title:body==='Moon'?'Lune':'Soleil',astronomy:approx?'Position indicative à midi local':'Longitude calculée',convention:'Lecture astrologique traditionnelle du signe et de la planète.',question:'Quel sens pour ce domaine ?',disclaimer:'Lecture symbolique non prédictive'}},
 describeNatalHouse(n){return {title:'Maison '+n,astronomy:'Cuspide calculée',convention:'Domaine traditionnel de la maison.',question:'Comment cette maison est-elle vécue ?',disclaimer:'Lecture symbolique'}},
 describeNatalAspect(a){return {title:'Aspect natal '+a.aspect,astronomy:'Écart calculé',convention:'Symbolisme conventionnel de l’aspect.',question:'Comment ces thèmes interagissent-ils ?',disclaimer:'Lecture symbolique'}},

 normalizePlace(p){return {...p,label:p.label||'Paris · Île-de-France · France'}},
 searchCities:async q=>[{name:'Paris',label:'Paris · Île-de-France · France',latitude:48.8534,longitude:2.3488,timezone:'Europe/Paris',admin1:'Île-de-France',country:'France'}],
 localToUtc(date,time,zone,fold=null){if(date==='2026-10-25' && time==='02:30' && fold===null)throw Error('Heure ambiguë');return new Date('1994-05-12T16:40:00.000Z')},
 natalChart(profile){const known=profile?.timeKnown!==false;return {timeKnown:known,approximateNoon:!known,positions:{Sun:7,Moon:23,Mercury:32,Venus:55,Mars:91,Jupiter:123,Saturn:141,Uranus:175,Neptune:203,Pluto:270},houses:known?{ascendant:151.5,midheaven:53.1,system:'Placidus',cusps:[151.5,172,199,233,270,304,331.5,352,19,53.1,90,124],polarFallback:false}:null,aspects:[{a:'Sun',b:'Mars',aspect:'Carré',glyph:'□',orb:1}]}},
 houseOf(lon,cusps){for(let i=0;i<12;i++){let d=(lon-cusps[i]+360)%360,w=(cusps[(i+1)%12]-cusps[i]+360)%360;if(d<w)return i+1;}return null;},
 describeEvent(e){return {kind:'Interprétation',title:e.name||'Soleil trigone Lune natal',tone:'Lecture symbolique',astronomy:'Mesure astronomique calculée.',interpretation:'Lecture astrologique sans causalité.',question:'Quelle observation personnelle noter ?',disclaimer:'Pas de prédiction scientifique.'}},
 calculateMonth(profile,year,month,mode){
   const n=new Date(year,month,0).getDate(),days={};
   for(let d=1;d<=n;d++){
     const k=year+'-'+String(month).padStart(2,'0')+'-'+String(d).padStart(2,'0');
     days[k]={active:[{type:'active',body:'Sun',natal:'Moon',aspect:'Trigone',angle:120,delta:.43,orb:1.7}], exact:[{type:'exact',body:'Sun',natal:'Moon',aspect:'Trigone',at:k+'T11:30:00Z'}], sky:[{type:'moon',name:'Pleine Lune',at:k+'T14:00:00Z'}]};
   }
   return {days,chart:this.natalChart(),mode};
 }
};
"""

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
            page.on('pageerror',lambda e: errors.append(str(e)))
            html=(ROOT/'index.html').read_text(encoding='utf-8')
            html=html.replace('<script src="runtime.bundle.js"></script><script src="app.js" defer></script>','')
            html=html.replace('<link rel="stylesheet" href="style.css">','')
            page.goto('about:blank')
            page.add_script_tag(content=JS)
            # Use the REAL layout solver with the mock astronomy engine.
            layout=(ROOT.parents[3] / 'astro/chart-layout.mjs').read_text(encoding='utf-8')
            layout=layout.replace("import {mod} from './core.mjs';", "const mod=(x,n=360)=>((x%n)+n)%n;")
            layout=layout.replace('export const ', 'const ').replace('export function ', 'function ')
            page.add_script_tag(content=layout + "\nwindow.ASTRA_ENGINE.layoutPlanetLabels=layoutPlanetLabels;")
            page.set_content(html)
            page.add_style_tag(content=(ROOT/'style.css').read_text(encoding='utf-8'))
            page.add_script_tag(content=(ROOT/'app.js').read_text(encoding='utf-8'))
            page.get_by_text('Configurer mon thème natal').click()
            page.locator('#birthDate').fill('1994-05-12')
            page.locator('#birthTime').fill('18:40')
            assert page.locator('#birthZone').count()==0 and page.locator('#lat').count()==0 and page.locator('#lng').count()==0
            page.locator('#birthCity').fill('Paris')
            page.locator('[data-search-place]').click()
            page.locator('[data-place]').first.wait_for(timeout=1500)
            page.locator('[data-place]').first.click()
            assert 'Europe/Paris' in page.locator('.city-confirmed').inner_text()
            page.get_by_role('button',name='Calculer mon thème natal').click()
            page.wait_for_timeout(250)
            assert 'Paris' in page.evaluate("JSON.parse(localStorage.getItem('astra-public-v1')).profile.place.label")
            assert page.evaluate("JSON.parse(localStorage.getItem('astra-public-v1')).profile.latitude")==48.8534
            page.locator('[data-tab="profile"]').click()
            assert page.locator('#natalChart .natal-wheel').count()==1
            assert page.locator('.wheel-ring-legend').count()==1
            assert page.locator('.wheel-zodiac-sector').count()==12
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
            assert page.locator('[data-natal-view="essential"]').get_attribute('aria-pressed')=='true'
            assert page.locator('[data-natal-zodiac="tropical"]').get_attribute('aria-pressed')=='true'
            # Interactive planet wheel in both modes
            page.locator('.natal-wheel [data-natal-body="Sun"]').click()
            assert 'Soleil' in page.locator('#natalSelectionInfo').inner_text()
            # After SVG rerender, the focused keyboard control stays focused.
            page.locator('.natal-wheel [data-natal-body="Moon"]').focus()
            page.keyboard.press('Enter')
            assert page.evaluate("document.activeElement.dataset.natalBody")=='Moon'
            assert 'Lune' in page.locator('#natalSelectionInfo').inner_text()
            assert 'Donnée calculée' in page.locator('#natalSelectionInfo').inner_text()
            page.locator('[data-natal-view="complete"]').click()
            assert page.locator('#natalChart .natal-position').count()==10
            assert page.locator('#natalChart .natal-aspect').count()==1
            assert '07°00′00″' in page.locator('#natalChart .natal-positions').inner_text()
            page.locator('[data-natal-aspect-filter="Carré"]').click()
            assert page.locator('#natalChart .natal-aspect').count()==1
            page.locator('#natalChart .natal-aspect').first.click()
            assert 'Lecture astrologique traditionnelle' in page.locator('#natalSelectionInfo').inner_text()
            page.locator('[data-natal-aspect-filter="Sextile"]').click()
            assert page.locator('#natalChart .natal-aspect').count()==0
            page.locator('[data-natal-aspect-filter="all"]').click()
            assert page.locator('#natalChart .natal-aspect').count()==1
            assert page.locator('#natalChart [data-natal-house]').count()>=12
            page.locator('.natal-wheel [data-natal-house="1"]').click()
            assert 'Maison 1' in page.locator('#natalSelectionInfo').inner_text()
            page.locator('.natal-wheel [data-natal-house="2"]').focus()
            page.keyboard.press('Space')
            assert page.evaluate("document.activeElement.dataset.natalHouse")=='2'
            assert 'Maison 2' in page.locator('#natalSelectionInfo').inner_text()
            page.locator('[data-natal-zodiac="sidereal"]').click()
            assert page.locator('[data-natal-zodiac="sidereal"]').get_attribute('aria-pressed')=='true'
            assert 'sidéral' in page.locator('#natalChart').inner_text()
            page.locator('[data-natal-zodiac="tropical"]').click()
            page.locator('[data-natal-view="essential"]').click()
            settings=page.evaluate("JSON.parse(localStorage.getItem('astra-public-v1'))")
            assert settings['natalView']=='essential' and settings['natalZodiac']=='tropical'
            assert page.locator('#orb').count()==0
            # Ensure the wheel remains legible with a narrow 320 px viewport,
            # without creating page-wide horizontal overflow.
            page.set_viewport_size({'width':320,'height':730})
            assert page.locator('.natal-wheel-viewport').count()==1
            widths=page.locator('.natal-wheel-viewport').evaluate("""e => ({
              client:e.clientWidth,scroll:e.scrollWidth,width:e.querySelector('svg').getBoundingClientRect().width
            })""")
            assert widths['scroll']>widths['client'],widths
            assert widths['width']>=319,widths
            assert page.evaluate("document.documentElement.scrollWidth")<=322
            assert 'Orbes automatiques' in page.locator('#birthForm').inner_text()
            page.locator('[data-tab="calendar"]').click()
            page.locator('[data-event]').first.click(timeout=2000)
            assert page.locator('#detailPanel').count()==1
            assert 'Lecture astrologique' in page.locator('#detailPanel').inner_text()
            page.get_by_role('button',name='Répondre dans mon journal').click()
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
            page.locator('[data-tab="journal"]').click()
            assert page.locator('#journalNote').input_value()=='Une belle journée de création.'
            assert page.locator('[data-tag="creation"]').get_attribute('aria-pressed')=='true'
            # P1: unknown birth hour should not invent an Ascendant or houses.
            page.locator('[data-tab="profile"]').click()
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
            assert 'Ascendant' not in page.locator('.natal-highlights').inner_text()
            page.locator('.natal-wheel [data-natal-body="Moon"]').click()
            assert 'indicative' in page.locator('#natalSelectionInfo').inner_text()
            page.locator('[data-natal-view="complete"]').click()
            assert page.locator('#natalChart .natal-position').count()==10
            assert page.locator('#natalChart .natal-house-chip').count()==0
            assert page.locator('#natalChart .natal-aspect').count()==1
            assert not errors, errors
            print('UI P2: profil, détails, prompt, humeurs, énergie, tags, enregistrement, recherche, rafraîchissement et journal : OK')
            browser.close()
    finally:
        pass

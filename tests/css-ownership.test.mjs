import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import postcss from 'postcss';
import {CSS_SOURCES} from '../scripts/css-sources.mjs';

const read=file=>readFileSync(new URL('../app/src/main/assets/'+file,import.meta.url),'utf8');
const disclosureClasses=[
 'astra-event-disclosure','calendar-help','calendar-options','natal-glossary',
 'natal-extras','natal-more-options','calculation-details','natal-preview-disclosure',
 'natal-matrix-disclosure','natal-explore-wheel','city-technical','astra-active-panel'
];
const gutterProperties=new Set(['padding','padding-left','padding-right',
 'padding-inline','padding-inline-start','padding-inline-end','padding-top',
 'padding-bottom','min-height']);
const owner='astra-components.css';

test('All 16 stylesheets parse and the global disclosure contract has one owner',()=>{
 assert.equal(CSS_SOURCES.length,16);
 const source=postcss.parse(read(owner),{from:owner});
 for(const [selector,property] of [
  ['.astra-disclosure','padding'],
  ['.astra-disclosure>summary','padding'],
  ['.astra-disclosure-body','padding']
 ]){
  const matches=[];
  source.walkRules(rule=>{
   if(rule.selector===selector)rule.walkDecls(property,d=>matches.push(d));
  });
  assert.equal(matches.length,1,selector+' must have exactly one '+property);
 }
 for(const file of CSS_SOURCES){
  const parsed=postcss.parse(read(file),{from:file});
  if(file===owner)continue;
  parsed.walkRules(rule=>{
   const selector=rule.selector;
   const known=disclosureClasses.some(name=>selector.includes('.'+name));
   const heading=known&&selector.includes('summary');
   const body=selector.includes('.astra-disclosure-body');
   const root=disclosureClasses.some(name=>{
    const parts=selector.split(',').map(s=>s.trim());
    return parts.includes('.'+name);
   });
   rule.walkDecls(decl=>{
    if((heading||body)&&gutterProperties.has(decl.prop)){
     assert.fail(file+' : '+selector+' overrides global disclosure '+decl.prop);
    }
    if(root&&decl.prop.startsWith('padding')){
     assert.fail(file+' : '+selector+' overrides global disclosure shell '+decl.prop);
    }
   });
  });
 }
});

test('Every interactive disclosure is assembled with shared component classes',()=>{
 const app=read('app.js');
 for(const type of disclosureClasses){
  assert.ok(app.includes(type+' astra-disclosure'),type+' is not componentized');
 }
 assert.equal((app.match(/astra-event-disclosure-body astra-disclosure-body/g)||[]).length,2);
 assert.match(app,/astra-disclosure-body astra-disclosure-actions/);
 assert.match(app,/calendar-help-body astra-disclosure-body/);
 const tokens=read('astra-tokens.css'),components=read(owner);
 for(const role of ['--astra-component-inset','--astra-disclosure-block-inset',
   '--astra-disclosure-body-top','--astra-disclosure-body-bottom']){
  assert.ok(tokens.includes(role+':'),role);
  assert.ok(components.includes('var('+role+')'),role);
 }
});

test('Shared AppShell, reading column, card surface and navigation have one owner',()=>{
 const expected=new Map([
  ['.main','astra-layout.css'],['.app-shell','astra-layout.css'],
  ['.bottom-nav','astra-layout.css'],['.card','astra-components.css']
 ]);
 for(const [selector,ownerFile] of expected){
  let found=0;
  for(const file of CSS_SOURCES){
   postcss.parse(read(file),{from:file}).walkRules(rule=>{
    if(rule.selector!==selector)return;
    assert.equal(file,ownerFile,selector+' was redeclared by '+file);
    found++;
   });
  }
  assert.equal(found,1,selector+' has '+found+' owners');
 }
});

test('Only the global component paints shared cards and card modifiers',()=>{
 const components=postcss.parse(read('astra-components.css'),{from:'astra-components.css'});
 const layout=postcss.parse(read('astra-layout.css'),{from:'astra-layout.css'});
 let ordinary=0,emphasis=0,reading=0;
 components.walkRules(rule=>{
  if(rule.selector==='.card')ordinary++;
  if(rule.selector==='.card.astra-card--emphasis')emphasis++;
 });
 assert.equal(ordinary,1);assert.equal(emphasis,1);
 layout.walkRules(rule=>{
  if(rule.selector!=='.card.astra-reading-card')return;
  reading++;
  rule.walkDecls(d=>{
   assert.ok(['width','min-width','box-sizing'].includes(d.prop),
     'Layout must not paint cards: '+d.prop);
  });
 });
 assert.equal(reading,1);
 for(const file of CSS_SOURCES.filter(f=>!['astra-components.css','astra-layout.css'].includes(f))){
  postcss.parse(read(file),{from:file}).walkRules(rule=>{
   if(!rule.selector.includes('.card.astra-reading-card'))return;
   rule.walkDecls(d=>{
    assert.doesNotMatch(d.prop,/^(?:padding|background|border|box-shadow)/,
     file+' paints shared card from '+rule.selector);
   });
  });
 }
});


test('Active aspects disclosure cannot bypass shared body gutters',()=>{
 const app=read('app.js');
 const legacy=read('atlas-ui.css'),features=read('astra-p1-screens.css');
 const shared=read('astra-components.css');
 assert.match(app,/class="astra-active-panel astra-disclosure astra-disclosure--surface"/);
 assert.match(app,/class="astra-disclosure-count"/);
 assert.match(app,/'<div class="astra-disclosure-body">'[\s\S]*?Angles entre les planètes présents à midi,[\s\S]*?'<div class="astra-event-feed">/);
 assert.doesNotMatch(legacy,/\.astra-active-panel\s*\{[^}]*padding\s*:/s);
 assert.doesNotMatch(legacy,/\.astra-active-panel\s+\.astra-event-feed\s*\{/s);
 assert.doesNotMatch(features,/\.astra-active-panel\s*\{[^}]*background\s*:/s);
 assert.match(shared,/\.astra-disclosure-body>\.astra-event-feed\s*\{[^}]*padding:0;/s);
 assert.match(shared,/\.astra-disclosure\.astra-disclosure--surface\s*\{/s);
});


test('Today EventList is single-surface and controlled by one accessible footer',()=>{
 const app=read('app.js');
 const shared=read('astra-components.css');
 const legacy=read('atlas-ui.css');
 const accessibility=read('astra-p3-accessibility.css');
 assert.match(app,/<div class="astra-event-list-card">/);
 assert.match(app,/<div class="astra-event-feed astra-event-list-rows" id="todayEventsList">/);
 assert.match(app,/displayed\.map\(e=>row\(e,true\)\)/);
 assert.match(app,/aria-controls="todayEventsList" aria-expanded="/);
 assert.match(app,/data-today-expand="1"/);
 assert.doesNotMatch(app,/class="astra-more-events"/);
 assert.doesNotMatch(legacy,/\.astra-more-events/);
 assert.doesNotMatch(accessibility,/\.astra-more-events/);
 for(const type of ['.astra-event-list-card','.astra-event-list-head',
   '.astra-event-list-rows>.astra-event-row','.astra-event-list-footer',
   '.astra-event-list-toggle','.astra-event-time','.astra-event-meta']){
  assert.ok(shared.includes(type),type+' must be shared component CSS');
 }
 for(const file of CSS_SOURCES.filter(f=>f!=='astra-components.css')){
  postcss.parse(read(file),{from:file}).walkRules(rule=>{
    if(!rule.selector.includes('.astra-event-list'))return;
    rule.walkDecls(decl=>{
      assert.ok(!/^(?:padding|margin|border|background|width|min-height)/.test(decl.prop),
        file+' redefines shared event list '+rule.selector+' '+decl.prop);
    });
  });
 }
});


test('Monthly event summaries are grouped by day before applying the five-row limit',()=>{
 const app=read('app.js'),shared=read('astra-components.css');
 const p1=read('astra-p1-screens.css'),legacy=read('atlas-ui.css');
 const month=app.slice(app.indexOf('  function monthOverview() {'),
   app.indexOf('  function personalCalendarWeek('));
 assert.match(month,/eventDays=records\.map\(/);
 assert.match(month,/upcomingDays=isCurrentMonth\?eventDays\.filter/);
 assert.match(month,/featuredDays=upcomingDays\.slice\(0,5\)/);
 assert.match(month,/const profileToday=/);
 assert.match(month,/majorMoon=events=>/);
 assert.match(month,/dayPreview=events=>/);
 assert.match(month,/data-month-open-day=/);
 assert.match(month,/astra-event-day-row/);
 assert.match(month,/Prochains jours avec événements/);
 assert.match(month,/Journées du mois/);
 assert.doesNotMatch(month,/exactEvents\.slice\(0,5\)/);
 assert.doesNotMatch(month,/Premiers événements du mois/);
 for(const css of [legacy,p1]){
   assert.doesNotMatch(css,/\.astra-month-event(?:s|-day|-text)?(?:\s*[{>,:]|\.)/);
 }
 for(const classname of ['astra-event-day-list','astra-event-day-row',
   'astra-event-day-date','astra-event-day-content','astra-event-day-heading',
   'astra-event-day-preview','astra-event-day-moon','astra-event-day-arrow']){
   assert.ok(shared.includes('.'+classname),classname+' owned by shared component CSS');
 }
 for(const file of CSS_SOURCES.filter(file=>file!=='astra-components.css')){
   postcss.parse(read(file),{from:file}).walkRules(rule=>{
     if(!rule.selector.includes('.astra-event-day-'))return;
     rule.walkDecls(decl=>{
       assert.doesNotMatch(decl.prop,/^(?:padding|background|border|margin|min-height)/,
         file+' must not override DayEventSummary '+rule.selector);
     });
   });
 }
});

test('Week, month and calendar chevrons share one global arrow component',()=>{
 const app=read('app.js');
 const components=read('astra-components.css');
 const week=app.slice(app.indexOf('function weekStrip()'),app.indexOf('function moonPhaseIcon('));
 assert.match(week,/class="arrow" data-week-shift="-7" aria-label="Semaine précédente"/);
 assert.match(week,/class="arrow" data-week-shift="7" aria-label="Semaine suivante"/);
 for(const shift of ['-1','1'])assert.match(app,new RegExp('class="arrow" data-month="'+shift+'"'));
 const stylesheet=postcss.parse(components,{from:'astra-components.css'});
 const shared=[];
 stylesheet.walkRules(rule=>{if(rule.selector==='.arrow')shared.push(rule)});
 assert.equal(shared.length,1,'Arrow geometry must be owned by the global component');
 const declarations=new Map();
 shared[0].walkDecls(d=>declarations.set(d.prop,d.value));
 for(const prop of ['width','height','min-width','min-height'])assert.equal(declarations.get(prop),'var(--astra-control-min)');
 for(const filename of CSS_SOURCES.filter(f=>f!=='astra-components.css')){
  postcss.parse(read(filename),{from:filename}).walkRules(rule=>{
   assert.notEqual(rule.selector,'.arrow',filename+' defines a duplicate arrow');
   assert.ok(!rule.selector.includes('.astra-week-controls button'),
     filename+' overrides shared week navigation chevrons');
   assert.ok(!rule.selector.includes('.month-head .arrow'),
     filename+' overrides shared month navigation chevrons');
  });
 }
});

test('Global settings have one responsive dialog and single owners for shared preferences',()=>{
 const html=read('index.html'),app=read('app.js');
 const css=postcss.parse(read('astra-components.css'),{from:'astra-components.css'});
 assert.match(html,/id="settingsButton"[^>]+aria-haspopup="dialog"/);
 assert.ok(html.indexOf('aria-label="Mon ciel"')<html.indexOf('id="settingsButton"'),'Paramètres must follow Mon ciel');
 assert.ok(html.indexOf('id="settingsButton"')<html.indexOf('</nav>'),'Settings must be part of bottom navigation');
 assert.match(html,/<dialog id="astraSettingsDialog" class="astra-settings-dialog"/);
 for(const category of ['astrology','appearance','data','advanced']){
  assert.ok(app.includes("['"+category+"'"),category+' settings tab missing');
 }
 assert.match(app,/globalSettingsDialog\.showModal\(\)/);
 assert.match(app,/if\(\$\('astraSettingsDialog'\)\?\.open\)/);
 assert.match(app,/function updateGlobalSettings\(/);
 const profile=app.slice(app.indexOf('  function profile() {'),app.indexOf('  function render() {'));
 for(const orphan of ['appearancePanel()','diagnosticsPanel()','astra-privacy-settings',
   'data-element-palette=','data-appearance=','data-house-system=','data-natal-zodiac=']){
  assert.ok(!profile.includes(orphan),'Global preference leaked into Mon ciel: '+orphan);
 }
 const natal=app.slice(app.indexOf('  function renderNatalChart(chart)'),app.indexOf('  function appearancePanel()'));
 assert.ok(!natal.includes('data-house-system='));
 assert.ok(!natal.includes('data-natal-zodiac='));
 const global=app.slice(app.indexOf('  function settingsAstrologyPanel()'),app.indexOf('  function profile() {'));
 for(const pref of ['data-mode','data-house-system','data-natal-zodiac']){
  assert.ok(global.includes(pref),'Astrology settings missing '+pref);
 }
 let dialogRule=0,triggerRule=0;
 css.walkRules(rule=>{
  if(rule.selector==='.astra-settings-dialog')dialogRule++;
  if(rule.selector==='.bottom-nav #settingsButton[aria-expanded="true"]')triggerRule++;
 });
 assert.equal(dialogRule,2,'One base dialog rule and one responsive adjustment');
 assert.match(read('astra-layout.css'),/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.equal((app.match(/data-profile-screen="settings">Personnaliser/g)||[]).length,0,
   'The contextual Mon ciel personalization buttons must be removed');
 assert.match(app,/state\.profile\?'Personnaliser mon thème'/);
 assert.equal(triggerRule,1);
 for(const filename of CSS_SOURCES.filter(f=>f!=='astra-components.css')){
  postcss.parse(read(filename),{from:filename}).walkRules(rule=>{
   assert.ok(!rule.selector.includes('.astra-settings-dialog'),
     filename+' overrides the global settings dialog');
  });
 }
});

test('Shared touch targets and action spacing are governed by global tokens',()=>{
 const tokens=postcss.parse(read('astra-tokens.css'),{from:'astra-tokens.css'});
 const vars=new Map();
 tokens.walkDecls(decl=>{if(decl.prop.startsWith('--astra-'))vars.set(decl.prop,decl.value)});
 assert.equal(vars.get('--astra-control-min'),'48px');
 assert.equal(vars.get('--astra-touch-gap'),'8px');
 const layout=postcss.parse(read('astra-layout.css'),{from:'astra-layout.css'});
 const rules=new Map();
 layout.walkRules(rule=>{
  if(!rules.has(rule.selector))rules.set(rule.selector,[]);
  rules.get(rule.selector).push(rule);
 });
 const property=(selector,name)=>{
  const rule=rules.get(selector)?.[0];assert.ok(rule,'Missing '+selector);
  let value=null;
  rule.walkDecls(name,decl=>value=decl.value);
  return value;
 };
 assert.equal(property('button','min-height'),'var(--astra-control-min)');
 assert.equal(property('button:not(.day):not(.astra-week-day)','min-width'),
   'var(--astra-control-min)');
 assert.equal(property('.bottom-nav','gap'),'var(--astra-touch-gap)');
 assert.match(read('style.css'),/grid-template-columns:var\(--astra-control-min\) minmax\(0,1fr\) var\(--astra-control-min\)/);
 const controlGroup=[...rules.keys()].find(key=>key.includes('.natal-zoom')&&key.includes('.astra-week-controls'));
 assert.ok(controlGroup,'Shared spacing must cover compact controls, month and settings');
 assert.equal(property(controlGroup,'gap'),'var(--astra-touch-gap)');
 assert.ok(read('astra-components.css').includes('font-size:.75rem'),
   'Tiny navigation should retain legible labels');
});

test('Today lunar hero contains no duplicate event counter or jump action',()=>{
 const app=read('app.js');
 const hero=app.slice(app.indexOf("'<section class=\"astra-day-hero\""),
   app.indexOf("'<section class=\"astra-feed\" id=\"todayEvents\""));
 assert.ok(hero.length>0,'Daily lunar hero must exist');
 assert.doesNotMatch(hero,/astra-hero-stat|astra-hero-link|événements calculés pour cette date/);
 assert.doesNotMatch(app,/data-scroll-to="todayEvents"/);
 assert.match(app,/<div class="astra-event-list-head"><h2 id="todayEventsTitle">Événements du jour<\/h2>/);
 assert.match(app,/data-today-expand="1"/);
 for(const file of CSS_SOURCES){
  const css=read(file);
  assert.doesNotMatch(css,/astra-hero-stat|astra-hero-link/,
    file+' must not style the deleted hero actions');
 }
});


test('App opens on a contextual page title without any permanent masthead',()=>{
 const html=read('index.html'),app=read('app.js');
 assert.doesNotMatch(html,/<header class="top"/);
 assert.doesNotMatch(html,/class="identity"|class="emblem"|class="brand"/);
 assert.match(html,/<main id="app" class="main"><\/main>/);
 assert.match(app,/const header = \(name,description\) => `<header class="screen-intro">/);
 assert.doesNotMatch(app,/homeButton/);
 for(const filename of CSS_SOURCES){
  const parsed=postcss.parse(read(filename),{from:filename});
  parsed.walkRules(rule=>{
   const selectors=rule.selector.split(',').map(s=>s.trim());
   for(const selector of selectors){
    assert.ok(!/(?:^|\s)\.top(?:\s|$|\.|:)/.test(selector),
      filename+' retains obsolete masthead selector '+selector);
    assert.ok(!/\.(?:identity|emblem|brand-sub|top-today)(?:\s|$|\.|:)/.test(selector),
      filename+' retains obsolete brand component '+selector);
   }
  });
 }
});

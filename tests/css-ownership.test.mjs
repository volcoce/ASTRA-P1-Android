import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import postcss from 'postcss';
import {CSS_SOURCES} from '../scripts/css-sources.mjs';

const read=file=>readFileSync(new URL('../app/src/main/assets/'+file,import.meta.url),'utf8');
const disclosureClasses=[
 'astra-event-disclosure','calendar-help','calendar-options','natal-glossary',
 'natal-more-options','calculation-details','natal-preview-disclosure',
 'natal-matrix-disclosure','city-technical','astra-active-panel'
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
 assert.match(app,/natal-reading-more[\s\S]*?astra-disclosure-body/);
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
 assert.match(read('astra-layout.css'),/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
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
 assert.match(app,/const header = name => `<header class="screen-intro">/);
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

test('Edge-to-edge system chrome uses transparent Android bars and one CSS safe-area source',()=>{
 const java=readFileSync(new URL('../app/src/main/java/org/astra/publicapp/MainActivity.java',import.meta.url),'utf8');
 const app=read('app.js'),html=read('index.html'),tokens=read('astra-tokens.css'),layout=read('astra-layout.css');
 for(const expected of [
  'setDecorFitsSystemWindows(false)',
  'View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN',
  'View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION',
  'setStatusBarColor(Color.TRANSPARENT)',
  'setNavigationBarColor(Color.TRANSPARENT)',
  'setNavigationBarContrastEnforced(false)',
  'LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES',
  '.setInsets(WindowInsets.Type.systemBars()',
  '| WindowInsets.Type.displayCutout(), Insets.NONE)',
  'replaceSystemWindowInsets(0, 0, 0, 0)',
  'WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout()',
  "setProperty('--astra-native-inset-top'",
  "setProperty('--astra-native-inset-bottom'",
  "setProperty('--astra-native-inset-left'",
  "setProperty('--astra-native-inset-right'",
  'ASTRA_NATIVE_UI',
  'setSystemBarsAppearance(dark ? 0 : LIGHT_BAR_FLAGS'
 ]){
  assert.ok(java.includes(expected),'Missing native edge-to-edge contract: '+expected);
 }
 assert.doesNotMatch(java,/root\.setPadding\(bars\.left|ASTRA_CHART_EXPORT|ChartExportBridge/);
 assert.match(html,/viewport-fit=cover/);
 assert.match(app,/window\.ASTRA_NATIVE_UI\?\.setDarkMode\?\./);
 assert.doesNotMatch(app,/ASTRA_CHART_EXPORT|data-export-chart|exportNatalGraphic/);
 assert.match(tokens,/--astra-safe-top:var\(--astra-native-inset-top,env\(safe-area-inset-top,0px\)\)/);
 assert.match(tokens,/--astra-safe-bottom:var\(--astra-native-inset-bottom,env\(safe-area-inset-bottom,0px\)\)/);
 assert.match(layout,/padding-top:var\(--astra-safe-top\)/);
 assert.match(layout,/padding-bottom:calc\(11px \+ var\(--astra-safe-bottom\)\)/);
 assert.doesNotMatch(read('style.css'),/--astra-safe-top:0px/);
});

test('Mon ciel back button and birth editor have no duplicate exports',()=>{
 const app=read('app.js');
 assert.match(app,/aria-label="Retour à Mon ciel"/);
 assert.match(app,/<summary>Aperçu de la carte<\/summary>/);
 assert.doesNotMatch(app,/data-export-chart|Exporter SVG|Exporter PNG|exportNatalGraphic/);
 const navigation=postcss.parse(read('astra-p2-navigation.css'),{from:'astra-p2-navigation.css'});
 const back=[];
 navigation.walkRules(rule=>{
  if(rule.selector==='.astra-journal-back,.natal-back,.astra-back-today'){
   rule.walkDecls(d=>back.push([d.prop,d.value]));
  }
 });
 assert.ok(back.some(([k,v])=>k==='min-height'&&v==='var(--astra-control-min)'));
 for(const css of CSS_SOURCES){
  assert.doesNotMatch(read(css),/natal-downloads/,css+' contains orphaned wheel export styles');
 }
});

test('Birth city autocomplete is keyboard-operable and removes manual search',()=>{
 const app=read('app.js'),css=postcss.parse(read('astra-components.css'),{from:'astra-components.css'});
 for(const id of ['birthCity']){
  assert.ok(app.includes('id="'+id+'"'),'Missing city input '+id);
  assert.ok(app.includes('id="'+id+'Options" role="listbox"'),'Missing listbox for '+id);
  assert.ok(app.includes('aria-controls="'+id+'Options"'),'Missing combobox relationship');
  assert.ok(app.includes('role="combobox" aria-autocomplete="list"'),'Missing autocomplete semantics');
 }
 for(const text of [
  'function queueCityLookup(kind,immediate=false)',
  'function runCityLookup(kind,query,requestId)',
  'function chooseCity(kind,place)',
  'function chooseCityPreset(kind,name)',
  'function moveCityActive(kind,delta)',
  'data-city-preset="',
  'data-city-choice="',
  'event.key===\'ArrowDown\'',
  'event.key===\'Escape\''
 ])assert.ok(app.includes(text),'City picker lost behavior '+text);
 for(const legacy of [
  'data-search-place="1"','data-search-composite-place="1"',
  'class="city-results"','data-place="','data-composite-place="'
 ])assert.ok(!app.includes(legacy),'Obsolete manual city UI: '+legacy);
 const selectors=[];
 css.walkRules(rule=>selectors.push(rule.selector));
 for(const selector of [
  '.astra-city-picker','.astra-city-menu','.astra-city-menu[hidden]',
  '.astra-city-option','.astra-city-status'
 ])assert.ok(selectors.includes(selector),'Missing shared city style: '+selector);
 for(const filename of CSS_SOURCES.filter(f=>f!=='astra-components.css')){
  postcss.parse(read(filename),{from:filename}).walkRules(rule=>{
   assert.ok(!rule.selector.includes('.astra-city-menu'),
    filename+' duplicates the shared city menu geometry');
  });
 }
});

test('Wheel remains interactive and legible without any degree annotations',()=>{
 const app=read('app.js'),wheelCss=read('astra-p4-wheel.css');
 const detail=app.slice(app.indexOf('  function wheelSvg(chart,quiet=false)'),
   app.indexOf('  function natalDetail(chart)'));
 assert.match(app,/function wheelPlanetLabel\(body,lng,asc,/);
 assert.match(app,/wheelZodiacGlyph=index=>zodiacSymbols\[index\]\+'\\uFE0E'/);
 assert.match(detail,/\.slice\(0,6\)/);
 assert.match(detail,/wheelLabels\(chart\.positions,asc\)/);
 assert.doesNotMatch(app,/groupWheelPlanets|wheelClusterLabel|wheelGroupedLabels/);
 assert.match(app,/E\.layoutPlanetLabels\(positions\)/);
 assert.doesNotMatch(app,/E\.layoutPlanetLabels\(positions,/);
 assert.match(app,/polarPoint\(lng,markerRadius\)/);
 assert.match(app,/data-wheel-radius=/);
 assert.match(app,/data-true-longitude=/);
 assert.match(app,/data-label-longitude=/);
 assert.match(app,/isOverview\?\(h\?wheelSvg\(chart,state\.natalView!=='complete'\)/);

 assert.match(wheelCss,/\.zodiac-symbol\{[\s\S]*?font-family:"Noto Sans Symbols 2"/);
 assert.doesNotMatch(app,/wheelDegreeText|wheelDegreeTicks|wheel-planet-degree|wheel-degree-tick/);
 for(const file of CSS_SOURCES){
  assert.doesNotMatch(read(file),/wheel-planet-degree|wheel-degree-tick|wheel-transit-degree|wheel-natal-degree/,
    file+' must not contain defunct wheel annotations');
 }
});

test('Advanced astrological tools are absent from natal navigation and renderer',()=>{
 const app=read('app.js');
 assert.doesNotMatch(app,/Outils astrologiques avancés|natal-extras|secondaryProgressions|compositeMidpoints|progressionDay|compositeForm/);
 assert.match(app,/Comparer deux dates/);
 assert.match(app,/Explorer les positions/);
 for(const file of CSS_SOURCES)assert.doesNotMatch(read(file),/natal-extras|natal-progressions|natal-composite/);
});

test('Natal planet rows use a shared column layout and a saved degree preference',()=>{
 const app=read('app.js'),css=read('astra-natal.css');
 for(const token of ['showNatalDegrees:false','showNatalDegrees:raw.showNatalDegrees===true','data-natal-degrees','position-retrograde','chart.retrogrades','roman[houseNumber]'])assert.ok(app.includes(token),token);
 assert.ok(css.includes('grid-template-columns:var(--position-columns)'));
 assert.ok(css.includes('.natal-position-table.has-degrees.has-houses'));
 for(const file of CSS_SOURCES.filter(file=>file!=='astra-natal.css'))assert.ok(!read(file).includes('.natal-position-table'),file);
});

test('Calendar help and display options live exclusively in global settings',()=>{
 const app=read('app.js');
 const section=(from,to)=>app.slice(app.indexOf(from),app.indexOf(to,app.indexOf(from)));
 const calendar=section('function calendar()','function initDraft()');
 const appearance=section('function appearancePanel()','function diagnosticsPanel()');
 const help=section('function settingsHelpPanel()','function renderGlobalSettings()');
 assert.doesNotMatch(calendar,/solarCalendarExplanation|calendar-options|filters\(\)/);
 assert.match(appearance,/calendar-options astra-disclosure/);
 assert.match(appearance,/filters\(\)/);
 assert.match(help,/solarCalendarExplanation\(\)/);
 assert.equal((app.match(/Comprendre le calendrier/g)||[]).length,1);
 assert.equal((app.match(/Options d’affichage/g)||[]).length,1);
 assert.match(app,/event\.target\.id==='eventFilter'\)\{state\.filter=event\.target\.value;persist\(\);openDetail=null;render\(\)/);
});

test('P1: dialog and personal form have a canonical shared owner',()=>{
 const shared=read('astra-components.css');
 const ast=postcss.parse(shared);
 for(const selector of ['.astra-personal-dialog','.astra-personal-form','.astra-personal-field','.astra-personal-close','.astra-table-scroll','.natal-context-bar']){
  let found=false;ast.walkRules(r=>{if(r.selector===selector)found=true;});
  assert.ok(found,selector+' missing from shared components');
 }
 for(const file of ['personal-calendar.css','astra-p2-navigation.css','astra-p3-accessibility.css']){
  const parsed=postcss.parse(read(file));
  parsed.walkRules(r=>{
   assert.notEqual(r.selector,'.astra-personal-dialog',file+' redeclares dialog shell');
   assert.notEqual(r.selector,'.astra-personal-form',file+' redeclares form shell');
  });
 }
 assert.match(read('app.js'),/class="natal-positions astra-table-scroll natal-position-table/);
 assert.match(read('app.js'),/class="astra-performance-scroll astra-table-scroll"/);
});

test('Shared native dialogs retain motion preference and landscape geometry',()=>{
 const ast=postcss.parse(read('astra-components.css'));
 const dialogs='.astra-personal-dialog[open],.astra-settings-dialog[open]';
 function declaration(media,selector,property){
  const values=[];
  ast.walkAtRules('media',rule=>{
   if(rule.params!==media)return;
   rule.walkRules(selectorRule=>{
    if(selectorRule.selector!==selector)return;
    selectorRule.walkDecls(property,d=>values.push(d.value));
   });
  });
  assert.equal(values.length,1,media+' '+selector+' '+property);
  return values[0];
 }
 assert.match(declaration('(prefers-reduced-motion:no-preference)',dialogs,'animation'),/^astra-dialog-in /);
 assert.equal(declaration('(prefers-reduced-motion:reduce)',dialogs,'animation'),'none');
 assert.equal(declaration('(orientation:landscape) and (max-height:500px)',
   '.astra-personal-dialog,.astra-settings-dialog','max-height'),
   'min(95dvh,calc(100dvh - var(--astra-safe-top)))');
});

test('P2: daily, calendar, comparison and journal keep the primary task first',()=>{
 const app=read('app.js');
 const today=app.slice(app.indexOf('function today()'),app.indexOf('function monthOverview()'));
 assert.ok(today.indexOf('id="todayEvents"')<today.indexOf('class="astra-day-journal-link"'));
 assert.doesNotMatch(today,/day\.active\.slice\(0,8\)/);
 const month=app.slice(app.indexOf('function monthOverview()'),app.indexOf('function personalCalendarWeek('));
 assert.ok(month.indexOf('id="monthMoonTitle"')<month.indexOf('id="monthEventsTitle"'));
 assert.ok(month.indexOf('id="monthEventsTitle"')<month.indexOf('class="astra-month-hero"'));
 assert.match(app,/shownContacts\.map\(/);
 assert.match(app,/function returnFromJournal\(/);
 assert.match(app,/results\.innerHTML=journalHistory\(\)/);
 assert.match(app,/header\(profileScreen==='explore'\?'Explorer les positions'/);
 const profile=app.slice(app.indexOf('function profile()'),app.indexOf('function render()'));
 assert.ok(profile.indexOf('id="birthForm"')<profile.lastIndexOf('renderNatalChart(chart)'));
});

import {CSS_SOURCES} from '../scripts/css-sources.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../app/src/main/assets/',import.meta.url);
const read=n=>readFileSync(new URL(n,root),'utf8');
test('Navigation is owned by the global layout, not natal routes',()=>{
 const html=read('index.html'),layout=read('astra-layout.css'),natal=read('astra-natal.css');
 assert.match(html,/href="astra\.bundle\.css"/);
 for(const name of ['astra-layout.css','astra-natal.css'])
   assert.ok(CSS_SOURCES.includes(name),name);
 for(const dead of ['astra-p5-explore-responsive.css','astra-p6-home-spacing.css'])
   assert.ok(!html.includes(dead));
 assert.match(layout,/\.bottom-nav\s*\{[^}]*position:fixed/s);
 assert.ok(!natal.includes('.bottom-nav'));
 assert.ok(!natal.includes('body:has('));
 assert.ok(!natal.includes('#app:has('));
});
test('Birth and settings cards share the global reading-column gutters',()=>{
 const app=read('app.js'),layout=read('astra-layout.css'),navigation=read('astra-p2-navigation.css');
 for(const component of ['astra-birth-settings','astra-privacy-settings',
   'astra-preferences astra-settings-section','astra-performance astra-settings-section']){
   assert.ok(app.includes('class="card astra-reading-card '+component+'"'),component);
 }
 assert.match(layout,/\.main\s*\{[^}]*max-width:\s*calc\(var\(--astra-reading-width\)\s*\+\s*var\(--astra-card-gutter\)\s*\+\s*var\(--astra-card-gutter\)\)/s);
 assert.doesNotMatch(layout,/\.card\.astra-reading-card\s*\{[^}]*max-width:/s);
 assert.doesNotMatch(navigation,/\.astra-settings-section,.astra-birth-settings,.astra-privacy-settings\s*\{[^}]*\b(?:max-width|margin)\s*:/s);
});
test('Reading surfaces and disclosures reuse global component classes',()=>{
 const app=read('app.js');
 assert.match(app,/astra-reading-card natal-home/);
 assert.match(app,/astra-reading-card natal-explore/);
 assert.match(app,/calendar-options astra-disclosure/);
 assert.match(app,/calendarOptionsOpen\?' open':'/);
 assert.match(read('astra-components.css'),/\.astra-disclosure\{/);
});

test('Welcome onboarding reuses reading geometry and a compact visual',()=>{
 const app=read('app.js'),css=read('atlas-ui.css');
 assert.match(app,/class="card astra-reading-card welcome-card"/);
 assert.match(css,/\.welcome-illustration\s*\{[^}]*height:64px/s);
 assert.match(css,/\.welcome-card>\.ghost\.full\s*\{[^}]*width:100%/s);
});

test('Every route uses the same main width and gutters, without page-specific caps',()=>{
 const layout=read('astra-layout.css');
 const p1=read('astra-p1-screens.css');
 const natal=read('astra-natal.css');
 const solar=read('solar-ribbon.css');
 const atlas=read('atlas-ui.css');
 const accessibility=read('astra-p3-accessibility.css');
 const legacy=read('style.css');
 assert.match(layout,/\.main\s*\{[^}]*max-width:calc\(var\(--astra-reading-width\)[^}]*padding-inline:var\(--astra-card-gutter\)/s);
 assert.doesNotMatch(layout,/\.main>\.screen-intro\s*\{[^}]*max-width:/s);
 assert.doesNotMatch(layout,/\.card\.astra-reading-card\s*\{[^}]*max-width:/s);
 assert.doesNotMatch(natal,/\.natal-home>\s*:is\([^)]*\)\s*\{[^}]*max-width:/);
 assert.doesNotMatch(natal,/\.natal-explore :is\([^)]*\)\s*\{[^}]*max-width:/);
 assert.doesNotMatch(natal,/\.natal-home \.natal-home-header\s*\{[^}]*max-width:/);
 assert.doesNotMatch(natal,/\.natal-home \.natal-primary-cards\s*\{[^}]*max-width:/);
 assert.doesNotMatch(p1,/max-width:840px/);
 assert.doesNotMatch(solar,/\.astra-calendar-month-head,\.calendar-options,\.calendar\s*\{\s*max-width:/);
 assert.doesNotMatch(atlas,/\.main\s*\{[^}]*\b(?:max-width|padding-left|padding-right|padding):/);
 assert.doesNotMatch(accessibility,/@media\(max-width:480px\)\{\s*\.main\s*\{/);
 assert.doesNotMatch(legacy,/\.main\s*\{[^}]*\bpadding:/);
 assert.doesNotMatch(legacy,/\.natal-home \.natal-primary-cards\s*\{[^}]*max-width:/);
 assert.doesNotMatch(legacy,/\.natal-explore \.natal-explore-tabs\s*\{[^}]*max-width:/);
});


test('Calendar explanation uses shared inner padding and clipped-safe keyboard focus',()=>{
 const app=read('app.js'),components=read('astra-components.css');
 const accessibility=read('astra-p3-accessibility.css'),calendar=read('astra-p4-calendar.css');
 assert.match(app,/class="calendar-help-body astra-disclosure-body"/);
 assert.match(components,/\.astra-disclosure-body\s*\{[^}]*padding:var\(--astra-disclosure-body-top\) var\(--astra-component-inset\) var\(--astra-disclosure-body-bottom\)/s);
 assert.match(accessibility,/\.astra-disclosure>summary:focus-visible\s*\{[^}]*outline-offset:-3px!important/s);
 assert.doesNotMatch(calendar,/\.calendar\.astra-calendar-board \.calendar-help-body\s*\{[^}]*padding:/s);
});
test('Calendar disclosures reuse global title and body padding',()=>{
 const css=read('astra-p4-calendar.css'),app=read('app.js');
 const components=read('astra-components.css');
 assert.match(components,/\.astra-disclosure>summary\s*\{[^}]*padding:var\(--astra-disclosure-block-inset\) var\(--astra-component-inset\)/s);
 assert.match(app,/class="calendar-help-body astra-disclosure-body"/);
 assert.match(app,/class="astra-disclosure-body">'\+switcher\(\)\+filters\(\)/);
 assert.doesNotMatch(css,/\.calendar-options\s*\{[^}]*padding:/s);
 assert.doesNotMatch(css,/\.calendar\.astra-calendar-board \.calendar-help>summary\s*\{[^}]*padding:/s);
 assert.doesNotMatch(css,/\.calendar-options\s*\{[^}]*max-width:/s);
});

test('AppShell, BottomNavigation and natal reading surfaces have one owner',()=>{
 const layout=read('astra-layout.css'),components=read('astra-components.css');
 for(const name of ['style.css','atlas-ui.css','theme.css','astra-p2-navigation.css','astra-p3-accessibility.css']){
   const css=read(name);
   assert.doesNotMatch(css,/\.app-shell\s*\{/);
   assert.doesNotMatch(css,/\.bottom-nav\s+\.nav(?:\.active|\s*\{|\s+\.nav-label)/);
 }
 assert.match(layout,/\.bottom-nav\s*\{[^}]*position:fixed/s);
 assert.match(components,/\.bottom-nav \.nav\{/);
 assert.doesNotMatch(components,/\.bottom-nav\s*\{/);
 assert.doesNotMatch(read('astra-natal.css'),/\.natal-home\.card\s*\{/);
 assert.doesNotMatch(read('astra-natal.css'),/\.natal-explore\.card,\.natal-compare\.card,\.natal-settings\.card/);
});
test('Shared card geometry spans Journal, natal and event details',()=>{
 const app=read('app.js'),layout=read('astra-layout.css'),tokens=read('astra-tokens.css');
 const components=read('astra-components.css');
 for(const name of ['astra-journal-editor','astra-journal-summary','astra-journal-history'])
   assert.ok(app.includes('card astra-reading-card '+name),name);
 assert.match(app,/class="card astra-reading-card detail astra-event-detail/);
 assert.match(tokens,/--astra-card-padding:var\(--astra-card-gutter\)/);
 assert.match(components,/\.card\{[^}]*padding:var\(--astra-card-padding\)/s);
 assert.match(layout,/\.main>\*\{min-width:0;max-width:100%/);
 assert.doesNotMatch(read('style.css'),/\.natal-home\{\s*padding:/);
 assert.doesNotMatch(read('atlas-ui.css'),/\.natal-settings\.card,\.natal-explore\.card,\.natal-compare\.card\{/);
});
test('Four-element palette has one source and no duplicates in feature CSS',()=>{
 const tokens=read('astra-tokens.css'),wheel=read('astra-p4-wheel.css');
 for(const [element,hue] of Object.entries({
   fire:'#FF3D14',air:'#F7FC35',water:'#159BF2',earth:'#46CD17'
 })){
   assert.ok(tokens.includes('--astra-elements-vivid-'+element+':'+hue),element+' vivid source');
   assert.ok(tokens.includes('--astra-zodiac-'+element+':var(--astra-elements-vivid-'+element+')'),element+' wheel token');
   assert.ok(tokens.includes('--solar-'+element+'-bg:var(--astra-zodiac-'+element+')'),element+' ribbon');
   assert.ok(tokens.includes('--element-'+element+':var(--astra-zodiac-'+element+')'),element+' alias');
 }
 assert.match(tokens,/--solar-water-muted:#A4D6F5/);
 assert.match(tokens,/--solar-earth-muted:#B9E5AF/);
 assert.match(wheel,/zodiac-element-water\{fill:var\(--astra-zodiac-water\)\}/);
 assert.match(read('app.js'),/zodiacFill\('water'\)/);
 assert.doesNotMatch(read('solar-ribbon.css'),/:root\s*\{[^}]*--solar-water-bg/s);
});

test('Responsive widths use only the shared breakpoint contract',()=>{
 const html=read('index.html');
 const styles=[...CSS_SOURCES];
 const allowed=new Set([360,400,480,799,800,1100]);
 for(const file of styles){
   const css=read(file);
   for(const media of css.matchAll(/@media\s*\([^)]*\)(?:\s+and\s+\([^)]*\))?/g)){
     const widths=[...media[0].matchAll(/(?:min|max)-width\s*:\s*(\d+)px/g)].map(m=>Number(m[1]));
     for(const width of widths){
       const shortViewport=width===600&&media[0].includes('max-height:650px');
       assert.ok(allowed.has(width)||shortViewport,file+' '+media[0]);
     }
   }
 }
});

test('Calendar board owns its geometry without touching the solar ribbon',()=>{
 const calendar=read('astra-p4-calendar.css');
 assert.match(calendar,/\.calendar\.astra-calendar-board\s*\{[^}]*padding:16px 12px 18px/s);
 assert.match(calendar,/@media\(max-width:360px\)\{\s*\.calendar\.astra-calendar-board\{padding-inline:3px\}/s);
 for(const file of ['style.css','atlas-ui.css','solar-ribbon.css','astra-p1-screens.css']){
   assert.doesNotMatch(read(file),/\.calendar(?:\.astra-calendar-board)?\s*\{/,
    'Calendar geometry duplicated in '+file);
 }
 assert.match(read('solar-ribbon.css'),/\.astra-solar-ribbon-segment\.is-outside-month/);
});

test('Feature styles do not repaint generic Journal and detail card surfaces',()=>{
 const css=read('astra-p2-navigation.css'),components=read('astra-components.css');
 assert.doesNotMatch(css,/\.astra-journal-editor,\.astra-journal-summary,\.astra-journal-history\s*\{/);
 assert.doesNotMatch(css,/\.astra-event-detail--compact\s*\{/);
 assert.match(components,/\.card\.astra-card--emphasis\{border-width:2px\}/);
 assert.doesNotMatch(css,/\.card\.astra-reading-card\.astra-journal-editor\{/);
 assert.match(components,/\.card\s*\{[^}]*background:var\(--astra-surface\)/s);
});

test('Cascade layers cover every linked stylesheet in a stable order',()=>{
 const html=read('index.html');
 const styles=[...CSS_SOURCES];
 const legacy=new Set(['style.css','atlas-ui.css','theme.css','wheel-ui.css',
   'solar-ribbon.css','calendar-p0.css','personal-calendar.css']);
 const features=new Set(['astra-p1-screens.css','astra-p2-navigation.css',
   'astra-p3-accessibility.css','astra-p4-calendar.css','astra-p4-wheel.css','astra-natal.css']);
 const expected=style=>legacy.has(style)?'legacy':features.has(style)?'features':
   style==='astra-tokens.css'?'tokens':style==='astra-components.css'?'components':'layout';
 assert.match(read('style.css'),/@layer legacy, tokens, components, features, layout;/);
 for(const file of styles)assert.match(read(file),
   new RegExp('^@layer '+expected(file)+'\\s*\\{|@layer '+expected(file)+'\\s*\\{'),
   file);
});
test('Calendar phase fills, category inks and focus colours come from semantic tokens',()=>{
 const tokens=read('astra-tokens.css'),calendar=read('astra-p4-calendar.css');
 const accessibility=read('astra-p3-accessibility.css');
 for(const role of ['--astra-calendar-ink','--astra-calendar-focus',
   '--astra-phase-new-bg','--astra-phase-new-border',
   '--astra-phase-full-bg','--astra-phase-full-border','--astra-phase-halo'])
   assert.ok(tokens.includes(role+':'),role);
 for(const hex of ['#DDD6F4','#927CB0','#F5DBA2','#AD742B',
   '#C7B9E5','#F1DDFE','#EEC983','#FFF1CB'])
   assert.ok(!calendar.includes(hex),'unscoped phase colour '+hex);
 assert.match(calendar,/background:var\(--astra-phase-new-bg\)/);
 assert.match(calendar,/background:var\(--astra-phase-full-bg\)/);
 assert.doesNotMatch(accessibility,/:root\s*\{\s*--astra-calendar-ink:/);
 const styles=[...CSS_SOURCES];
 const count=styles.reduce((sum,file)=>sum+(read(file).match(/!important/g)||[]).length,0);
 assert.ok(count<=55,'important budget exceeded: '+count);
});

test('Daily and monthly lunar colors are semantic roles, not view-level literals',()=>{
 const tokens=read('astra-tokens.css'),screens=read('astra-p1-screens.css');
 for(const role of ['--astra-day-hero-bg','--astra-day-hero-rule',
   '--astra-lunar-full-bg','--astra-lunar-full-border',
   '--astra-lunar-new-bg','--astra-lunar-new-border',
   '--astra-lunar-quarter-bg','--astra-lunar-quarter-border',
   '--astra-month-new-bg','--astra-month-full-bg']){
   assert.ok(tokens.includes(role+':'),role);
   assert.ok(screens.includes('var('+role+')'),role);
 }
 for(const color of ['#FFF4D7','#B36C32','#EEE5F5','#745394','#75452E'])
   assert.ok(!screens.includes(color),'hardcoded lunar palette in page: '+color);
});

test('The token layer exclusively declares the global theme variables',()=>{
 const tokens=read('astra-tokens.css');
 for(const css of ['style.css','atlas-ui.css','theme.css']){
   assert.doesNotMatch(read(css),/:root(?:\[data-astra-theme="dark"\])?\s*\{\s*--(?:astra-|ink|secondary|violet|deep|pale|border|plum|shadow|atlas-)/,
     css+' must not recreate the theme source');
 }
 for(const role of ['--pink','--salmon','--astra-safe-top','--astra-safe-bottom','--atlas-radius']){
   assert.ok(tokens.includes(role+':'),role);
 }
});

test('Event disclosures use shared padding, not zero-inset feature overrides',()=>{
 const app=read('app.js'),components=read('astra-components.css');
 const features=read('astra-p2-navigation.css');
 assert.equal((app.match(/astra-event-disclosure-body astra-disclosure-body/g)||[]).length,2);
 assert.match(components,/\.astra-disclosure>summary\s*\{[^}]*padding:var\(--astra-disclosure-block-inset\) var\(--astra-component-inset\)/s);
 assert.match(components,/\.astra-disclosure-body\s*\{[^}]*padding:var\(--astra-disclosure-body-top\) var\(--astra-component-inset\) var\(--astra-disclosure-body-bottom\)/s);
 assert.doesNotMatch(features,/\.astra-event-detail--compact \.astra-event-disclosure>summary\s*\{[^}]*\bpadding\s*:/s);
 assert.doesNotMatch(features,/\.astra-event-detail--compact \.astra-event-disclosure-body\s*\{[^}]*\bpadding\s*:/s);
});

test('Reference palettes are selectable without route-specific colours',()=>{
 const tokens=read('astra-tokens.css'),app=read('app.js'),
   bootstrap=read('theme-bootstrap.js'),components=read('astra-components.css');
 for(const [name,color] of Object.entries({
  fire:'#FAB617',air:'#E7F6FD',water:'#00ADEF',earth:'#896B49'
 }))assert.ok(tokens.includes('--astra-elements-classic-'+name+':'+color),name);
 assert.match(tokens,/:root\[data-astra-palette="classic"\]\{/);
 assert.match(tokens,/:root\[data-astra-theme="dark"\]\[data-astra-palette="classic"\]\{/);
 assert.match(app,/elementPalette:'vivid'/);
 assert.match(app,/data-element-palette=/);
 assert.match(app,/applyElementPalette\(\);/);
 assert.match(bootstrap,/dataset\.astraPalette=/);
 for(const label of ['Palette 1 · Classique','Palette 2 · Vive'])assert.ok(app.includes(label));
 assert.match(components,/\.astra-palette-options\{/);
 assert.match(components,/\.astra-palette-choice\{/);
 for(const css of ['style.css','atlas-ui.css','solar-ribbon.css','astra-p4-wheel.css'])
   assert.doesNotMatch(read(css),/data-astra-palette=/);
});

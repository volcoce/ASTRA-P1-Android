import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../app/src/main/assets/',import.meta.url);
const read=n=>readFileSync(new URL(n,root),'utf8');
test('Navigation is owned by the global layout, not natal routes',()=>{
 const html=read('index.html'),layout=read('astra-layout.css'),natal=read('astra-natal.css');
 for(const name of ['astra-layout.css','astra-natal.css'])
   assert.match(html,new RegExp(name.replaceAll('.','\\.')));
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
 assert.match(components,/\.astra-disclosure-body\s*\{[^}]*padding:14px 16px 18px/s);
 assert.match(accessibility,/\.astra-disclosure>summary:focus-visible\s*\{[^}]*outline-offset:-3px!important/s);
 assert.doesNotMatch(calendar,/\.calendar\.astra-calendar-board \.calendar-help-body\s*\{[^}]*padding:/s);
});
test('Calendar disclosures preserve equal horizontal inset for labels and icons',()=>{
 const css=read('astra-p4-calendar.css');
 assert.match(css,/\.calendar\.astra-calendar-board \.calendar-help>summary\s*\{[^}]*padding:11px 14px/s);
 assert.match(css,/\.calendar-options\s*\{[^}]*padding:0 14px/s);
 assert.doesNotMatch(css,/\.calendar\.astra-calendar-board \.calendar-help>summary\s*\{[^}]*padding:11px 0/s);
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
test('Water palette has one source and no duplicates in feature CSS',()=>{
 const tokens=read('astra-tokens.css'),wheel=read('astra-p4-wheel.css');
 assert.match(tokens,/--astra-zodiac-water:#5B9BC7/);
 assert.match(tokens,/--solar-water-muted:#BDD7E3/);
 assert.match(tokens,/--solar-earth-muted:#D9D6B8/);
 assert.match(wheel,/zodiac-element-water\{fill:var\(--astra-zodiac-water\)\}/);
 assert.match(read('app.js'),/zodiacFill\('water'\)/);
 assert.doesNotMatch(read('solar-ribbon.css'),/:root\s*\{[^}]*--solar-water-bg/s);
});

test('Responsive widths use only the shared breakpoint contract',()=>{
 const html=read('index.html');
 const styles=[...html.matchAll(/href="([^"]+\.css)"/g)].map(m=>m[1]);
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

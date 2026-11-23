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


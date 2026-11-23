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
 assert.match(layout,/\.card\.astra-reading-card\s*\{[^}]*max-width:/s);
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

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../app/src/main/assets/'+name,import.meta.url),'utf8');
const html=read('index.html'),app=read('app.js'),css=read('astra-p3-accessibility.css'),tokens=read('astra-tokens.css');
function luminance(hex){
  const linear=hex.slice(1).match(/.{2}/g).map(n=>parseInt(n,16)/255).map(v=>
    v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4));
  return 0.2126*linear[0]+0.7152*linear[1]+0.0722*linear[2];
}
function contrast(a,b){
  const x=luminance(a),y=luminance(b);
  return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);
}
test('P3 last CSS layer loads after P0/P1/P2',()=>{
  const files=['astra-tokens.css','astra-components.css','astra-p1-screens.css','astra-p2-navigation.css','astra-p3-accessibility.css'];
  const positions=files.map(f=>html.indexOf('href="'+f+'"'));
  assert.ok(positions.every(x=>x>=0));
  assert.deepEqual(positions,[...positions].sort((a,b)=>a-b));
});
test('P3 light and dark text plus solar element ribbon pairings reach AA',()=>{
  for(const [ink,bg] of [
    ['#1E404F','#F8EFD5'],['#1E404F','#FFF9EA'],
    ['#1E404F','#F0BE57'],['#F8EFD5','#101F2A'],
    ['#BBCBD1','#243E4D'],
    ['#1E404F','#F4C78F'],['#1E404F','#C8C36A'],
    ['#1E404F','#8FB9D6'],['#102A34','#5B9BC7'],
    ['#F8EFD5','#8C5A37'],['#F8EFD5','#6E6A33'],
    ['#F8EFD5','#3E6E90'],['#F8EFD5','#315E85'],
  ]) assert.ok(contrast(ink,bg)>=4.5,ink+' on '+bg+' = '+contrast(ink,bg).toFixed(2));
  assert.match(tokens,/--astra-calendar-ink/);
  assert.match(css,/color:var\(--astra-calendar-ink\)/);
  for(const n of ['fire','earth','air','water'])assert.match(tokens,new RegExp('--solar-'+n+'-bg'));
  assert.ok(tokens.includes('--astra-zodiac-earth:#C8C36A'));
  assert.ok(tokens.includes('--solar-earth-bg:var(--astra-zodiac-earth)'));
  assert.ok(tokens.includes('--astra-zodiac-water:#5B9BC7'));
  assert.ok(tokens.includes('--solar-water-bg:var(--astra-zodiac-water)'));
  assert.match(tokens,/--astra-calendar-ink:#102A34/);
  for(const n of ['fire','earth','air','water'])assert.ok(tokens.includes('--solar-'+n+'-muted:'));

});
test('P3 preserves full weekday names and readable navigation labels',()=>{
  assert.match(app,/Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche/);
  assert.match(app,/class="astra-sr-only"/);
  assert.match(app,/aria-hidden="true"/);
  assert.match(css,/\.astra-sr-only/);
  for(const name of ['Ce jour','Ce mois','Calendrier','Mon ciel'])assert.ok(html.includes('aria-label="'+name+'"'));
  assert.match(app,/role="group" aria-label="Évaluer son humeur/);
});
test('P3 supports focus, reduced motion, high contrast and small layouts',()=>{
  assert.match(css,/:focus-visible/);
  assert.match(css,/prefers-contrast:more/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/@media\(max-width:360px\)/);
  assert.match(css,/@media\(orientation:landscape\)/);
  assert.match(css,/aria-invalid="true"/);
  assert.match(app,/addEventListener\('keydown'/);
  assert.match(app,/addEventListener\('cancel'/);
});
test('P3 does not replace solar ribbon with separately painted day cards',()=>{
  assert.match(read('solar-ribbon.css'),/\.astra-solar-ribbon-segment\.ends-at-ingress/);
  assert.match(read('solar-ribbon.css'),/\.astra-solar-ribbon-segment\.starts-at-ingress/);
  assert.match(css,/\.astra-calendar-date-week \.day/);
  assert.ok(!css.includes('grid-template-columns:repeat(14'));
  assert.match(read('astra-p4-wheel.css'),/zodiac-element-fire/);
  assert.match(read('astra-p4-wheel.css'),/zodiac-element-water/);
});

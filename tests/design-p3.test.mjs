import {CSS_SOURCES} from '../scripts/css-sources.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../app/src/main/assets/'+name,import.meta.url),'utf8');
const html=read('index.html'),app=read('app.js'),css=read('astra-p3-accessibility.css'),tokens=read('astra-tokens.css'),components=read('astra-components.css');
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
  const positions=files.map(f=>CSS_SOURCES.indexOf(f));
  assert.ok(positions.every(x=>x>=0));
  assert.deepEqual(positions,[...positions].sort((a,b)=>a-b));
});
test('P3 light and dark text plus solar element ribbon pairings reach AA',()=>{
  for(const [ink,bg] of [
    ['#1E404F','#F8EFD5'],['#1E404F','#FFF9EA'],
    ['#1E404F','#F0BE57'],['#F8EFD5','#101F2A'],
    ['#BBCBD1','#243E4D'],
    ['#101F2A','#FF3D14'],['#102A34','#46CD17'],
    ['#102A34','#F7FC35'],['#102A34','#159BF2'],
    ['#FFF9EA','#96331D'],['#FFF9EA','#326B1A'],
    ['#FFF9EA','#776A0D'],['#FFF9EA','#185E9E'],
    // Reference 1, classically coloured elements and night equivalents.
    ['#102A34','#FAB617'],['#102A34','#E7F6FD'],
    ['#102A34','#00ADEF'],['#FFF9EA','#896B49'],
    ['#FFF9EA','#7C5217'],['#FFF9EA','#395665'],
    ['#FFF9EA','#105D87'],['#FFF9EA','#6D5136'],
  ]) assert.ok(contrast(ink,bg)>=4.5,ink+' on '+bg+' = '+contrast(ink,bg).toFixed(2));
  assert.match(tokens,/--astra-calendar-ink/);
  assert.match(css,/color:var\(--astra-calendar-ink\)/);
  for(const n of ['fire','earth','air','water'])assert.match(tokens,new RegExp('--solar-'+n+'-bg'));
  assert.ok(tokens.includes('--astra-elements-vivid-earth:#46CD17'));
  assert.ok(tokens.includes('--solar-earth-bg:var(--astra-zodiac-earth)'));
  assert.ok(tokens.includes('--astra-elements-vivid-water:#159BF2'));
  assert.ok(tokens.includes('--solar-water-bg:var(--astra-zodiac-water)'));
  assert.match(tokens,/--astra-calendar-ink:#102A34/);
  for(const n of ['fire','earth','air','water'])assert.ok(tokens.includes('--solar-'+n+'-muted:'));

});
test('P3 preserves full weekday names and readable navigation labels',()=>{
  assert.match(app,/Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche/);
  assert.match(app,/class="astra-sr-only"/);
  assert.match(app,/aria-hidden="true"/);
  assert.match(css,/\.astra-sr-only/);
  for(const name of ['Ce jour','Calendrier','Mon ciel'])assert.ok(html.includes('aria-label="'+name+'"'));
  assert.match(app,/role="group" aria-label="Évaluer son humeur/);
});
test('P3 supports focus, reduced motion, high contrast and small layouts',()=>{
  assert.match(css,/:focus-visible/);
  assert.match(css,/prefers-contrast:more/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/@media\(max-width:360px\)/);
  assert.match(components,/@media\(orientation:landscape\) and \(max-height:500px\)\s*\{\s*\.astra-personal-dialog,\.astra-settings-dialog\s*\{[^}]*max-height:min\(95dvh,calc\(100dvh - var\(--astra-safe-top\)\)\)/);
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

test('Shared touch direction and minimum displacement reject accidental gestures',()=>{
 const source=app.slice(app.indexOf('  function swipeAxis('),app.indexOf('  function bindSwipe('));
 const {axis,step}=new Function(source+'return {axis:swipeAxis,step:swipeStep};')();
 for(const [dx,dy,expected,direction] of [
  [5,5,null,0],[-25,0,'horizontal',0],[-110,5,'horizontal',1],
  [110,5,'horizontal',-1],[80,80,'ambiguous',0],
  [5,110,'vertical',1],[5,-110,'vertical',0],[63,0,'horizontal',0],
 ]){assert.equal(axis(dx,dy),expected);assert.equal(step(expected,dx,dy),direction);}
 assert.match(app,/bindSwipe\(globalSettingsDialog/);
 assert.match(app,/bindSwipe\(\$\('app'\)/);
 assert.match(app,/touchcancel/);
 assert.match(app,/\.natal-wheel-viewport/);
 assert.match(app,/previous\.kind==='contact'\?'data-transit-contact'/);
});

test('Shared touch handler cancels interrupted, diagonal and protected interactions',()=>{
 const source=app.slice(app.indexOf('  function swipeAxis('),app.indexOf('  function dismissSwipe('));
 const bind=new Function(source+'return bindSwipe;')();
 const handlers={},calls=[];
 let valid=true,protectedTarget=false,expected='horizontal',prevented=0;
 const root={addEventListener:(name,handler)=>{handlers[name]=handler;}};
 bind(root,()=>({expected,valid:()=>valid,run:step=>calls.push(step)}));
 const target={closest:()=>protectedTarget?{}:null};
 const point=(x,y,identifier=7)=>({clientX:x,clientY:y,identifier});
 function fire(name,touches,changedTouches=touches){
   handlers[name]({target,touches,changedTouches,cancelable:true,preventDefault(){prevented++;}});
 }
 const start=()=>fire('touchstart',[point(0,0)]);
 const move=(x,y)=>fire('touchmove',[point(x,y)]);
 const end=(x,y)=>fire('touchend',[],[point(x,y)]);
 start();move(-100,0);end(-100,0);
 assert.deepEqual(calls,[1]);assert.equal(prevented,2);
 start();move(0,100);end(-120,0);assert.deepEqual(calls,[1]);
 start();move(80,80);end(-100,0);assert.deepEqual(calls,[1]);
 start();move(-100,0);fire('touchcancel',[]);end(-100,0);assert.deepEqual(calls,[1]);
 start();fire('touchmove',[point(-100,0),point(0,50,8)]);end(-100,0);assert.deepEqual(calls,[1]);
 start();valid=false;end(-100,0);valid=true;assert.deepEqual(calls,[1]);
 protectedTarget=true;start();move(-100,0);end(-100,0);protectedTarget=false;assert.deepEqual(calls,[1]);
 expected='vertical';start();move(0,-100);end(0,-100);assert.deepEqual(calls,[1]);
 start();move(0,100);end(0,100);assert.deepEqual(calls,[1,1]);
});

test('Main page swipe follows bottom navigation order and preserves secondary routes',()=>{
 const source=app.slice(app.indexOf('  function adjacentPage('),app.indexOf("  bindSwipe($('app')"));
 const pages=['today','calendar','profile'];
 let activeTab='today',profileScreen='overview',globalSettingsDialog={open:false},
     calendarSheet=false,personalEditor=null,natalSelection=null,openDetail=null;
 const calls=[];
 const document={querySelectorAll:()=>pages.map(tab=>({dataset:{tab}}))};
 const go=tab=>{calls.push(tab);activeTab=tab;};
 const get=new Function('ctx','with(ctx){'+source+'return {adjacentPage,mainPageSwipe};}');
 const context=()=>({pages,activeTab,profileScreen,globalSettingsDialog,calendarSheet,personalEditor,natalSelection,openDetail,document,go});
 const adjacent=get(context()).adjacentPage;
 assert.equal(adjacent(pages,'today',-1),null);
 assert.equal(adjacent(pages,'today',1),'calendar');
 assert.equal(adjacent(pages,'calendar',1),'profile');
 assert.equal(adjacent(pages,'profile',1),null);
 assert.equal(adjacent(pages,'profile',-1),'calendar');
 assert.equal(adjacent(pages,'calendar',-1),'today');
 assert.equal(adjacent(pages,'journal',1),null);
 get(context()).mainPageSwipe('today').run(1);
 assert.deepEqual(calls,['calendar']);
 get(context()).mainPageSwipe('calendar').run(1);
 assert.deepEqual(calls,['calendar','profile']);
 get(context()).mainPageSwipe('profile').run(1);
 assert.deepEqual(calls,['calendar','profile']);
 assert.equal(get(context()).mainPageSwipe('journal'),null);
 profileScreen='compare';
 assert.equal(get(context()).mainPageSwipe('profile'),null);
 profileScreen='overview';natalSelection={kind:'planet',id:'Sun'};
 assert.equal(get(context()).mainPageSwipe('profile').valid(),false);
 const local=app.slice(app.indexOf("  bindSwipe($('app')"),app.indexOf("  document.querySelectorAll('[data-tab]')",app.indexOf("  bindSwipe($('app')")));
 for(const selector of ['.astra-calendar-board','.astra-week','#journalEditorTitle']){
   assert.ok(local.indexOf(selector)>=0&&local.indexOf(selector)<local.indexOf('return mainPageSwipe(tab)'));
 }
});

test('Daily swipes navigate one civil day, including week and month boundaries',()=>{
 const source=app.slice(app.indexOf('  const shiftDay='),app.indexOf('  function weekStrip()'));
 const shift=new Function(source+'return shiftDay;')();
 for(const [day,step,expected] of [
  ['2026-11-22',1,'2026-11-23'],['2026-11-23',-1,'2026-11-22'],
  ['2026-11-30',1,'2026-12-01'],['2026-12-01',-1,'2026-11-30'],
  ['2026-12-31',1,'2027-01-01'],['2028-02-28',1,'2028-02-29']
 ])assert.equal(shift(day,step),expected);
 const local=app.slice(app.indexOf("    if(tab==='today'&&target.closest('.astra-week,.astra-day-hero'))"),app.indexOf("    if(tab==='journal'&&target.closest('#journalEditorTitle'))"));
 assert.match(local,/run:step=>selectDay\(shiftDay\(day,step\)\)/);
 assert.doesNotMatch(local,/step\*7|data-week-shift/);
 assert.match(app,/data-week-shift="-7"/);
 assert.match(app,/data-week-shift="7"/);
});

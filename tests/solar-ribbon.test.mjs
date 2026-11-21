import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../app/src/main/assets/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../app/src/main/assets/solar-ribbon.css',import.meta.url),'utf8');
const runtime=readFileSync(new URL('../astro/runtime.mjs',import.meta.url),'utf8');
const names=['Bélier','Taureau','Gémeaux','Cancer','Lion','Vierge','Balance','Scorpion','Sagittaire','Capricorne','Verseau','Poissons'];
const days={};
for(let d=1;d<=30;d++){
  days['2026-11-'+String(d).padStart(2,'0')]={
    sunLongitudeAtNoon:d<=21?235:250,
    sunIngress:d===22?{at:'2026-11-22T06:24:00.000Z',fromIndex:7,toIndex:8,
      fromSign:'Scorpion',toSign:'Sagittaire'}:null
  };
}
const ctx={result:{days},state:{profile:{timezone:'Europe/Paris'}},zodiacNames:names,
  selected:'2026-11-21',detectedZone:'Europe/Paris',
  pad:n=>String(n).padStart(2,'0'),safe:x=>String(x)};
function solarModule(){
  const a=app.indexOf('  const solarSignIndex='),b=app.indexOf('  function eventTitle(',a);
  assert.ok(a>0&&b>a);
  return new Function('ctx','with(ctx){'+app.slice(a,b)+
    ';return {solarSignIndex,solarMonthPeriods,solarMonthSummary,solarDayBand};}')(ctx);
}
test('Solar sign follows local-noon longitude, including missing data',()=>{
  const {solarSignIndex}=solarModule();
  assert.equal(solarSignIndex(235),7);
  assert.equal(solarSignIndex(250),8);
  assert.equal(solarSignIndex(-1),11);
  assert.equal(solarSignIndex(null),null);
});
test('Ingress preserves half-day convention for monthly summary',()=>{
  const {solarMonthPeriods,solarMonthSummary}=solarModule();
  const model=solarMonthPeriods(2026,10,30);
  assert.equal(model.totals[7],21.5);
  assert.equal(model.totals[8],8.5);
  assert.equal(model.ingresses[0].day,'2026-11-22');
  assert.match(solarMonthSummary(model),/Jour du passage partagé 50\/50/);
});
test('Calendar directly colors day cells instead of rendering an extra solar row',()=>{
  const start=app.indexOf('  function calendar() {'),end=app.indexOf('  function initDraft()',start);
  const code=app.slice(start,end);
  assert.match(code,/astra-solar-cell solar-split solar-sign-/);
  assert.match(code,/--solar-split-bg:var\(--solar-sign-/);
  assert.match(code,/sunIngress\.fromIndex/);
  assert.match(code,/sunIngress\.toIndex/);
  assert.ok(!code.includes('solarCalendarWeek('));
  assert.ok(!app.includes('astra-calendar-range-event'));
  assert.ok(!app.includes('data-calendar-range-start'));
  assert.match(css,/\.calendar \.day\.astra-solar-cell/);
  assert.match(css,/linear-gradient\(90deg/);
  assert.match(css,/var\(--solar-split-bg,var\(--solar-bg\)\)/);
  assert.ok(!css.includes('.astra-calendar-week-events'));
});
test('Other sky data stays available and daily Sun banner remains separate',()=>{
  const {solarDayBand}=solarModule();
  assert.match(solarDayBand(250),/Soleil en Sagittaire/);
  assert.match(runtime,/sunLongitudeAtNoon:Number\.isFinite\(sunLongitudeAtNoon\)/);
  assert.match(app,/solarMonthPeriods\(year,m,count\)/);
  assert.match(css,/\.solar-sign-8/);
});

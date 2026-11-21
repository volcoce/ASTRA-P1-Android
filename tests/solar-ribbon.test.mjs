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
  zodiacSymbols:['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'],
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
test('Solar band spans weekly half-columns, with two element colors at ingress',()=>{
  const {solarMonthPeriods,solarCalendarWeek}=solarModule();
  const periods=solarMonthPeriods(2026,10,30);
  const weekday=(new Date(2026,10,1).getDay()+6)%7;
  const firstWeek=solarCalendarWeek(2026,10,weekday,0,periods);
  assert.match(firstWeek,/astra-solar-calendar-week/);
  assert.match(firstWeek,/solar-element-water/);
  assert.match(firstWeek,/grid-column:13 \/ span 2/);
  const ingressWeek=solarCalendarWeek(2026,10,weekday,3,periods);
  assert.match(ingressWeek,/solar-element-water/);
  assert.match(ingressWeek,/solar-element-fire/);
  assert.match(ingressWeek,/grid-column:1 \/ span 13/);
  assert.match(ingressWeek,/grid-column:14 \/ span 1/);
  assert.match(ingressWeek,/Soleil en Scorpion/);
  assert.match(ingressWeek,/Soleil en Sagittaire/);
});
test('Calendar uses solar rows instead of coloring individual day backgrounds',()=>{
  const start=app.indexOf('  function calendar() {'),end=app.indexOf('  function initDraft()',start);
  const code=app.slice(start,end);
  assert.match(code,/solarCalendarWeek\(year,m,weekday,week,periods\)/);
  assert.ok(!app.includes('astra-solar-cell'));
  assert.match(css,/\.astra-solar-calendar-week/);
  assert.match(css,/grid-template-columns:repeat\(14/);
  for(const element of ['fire','earth','air','water'])
    assert.match(css,new RegExp('solar-element-'+element));
  assert.ok(!css.includes('solar-split-bg'));
});
test('Other sky data stays available and daily Sun banner remains separate',()=>{
  const {solarDayBand}=solarModule();
  assert.match(solarDayBand(250),/Soleil en Sagittaire/);
  assert.match(runtime,/sunLongitudeAtNoon:Number\.isFinite\(sunLongitudeAtNoon\)/);
  assert.match(app,/solarMonthPeriods\(year,m,count\)/);
  assert.match(css,/\.solar-sign-8/);
});

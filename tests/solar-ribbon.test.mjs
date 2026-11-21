import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../app/src/main/assets/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../app/src/main/assets/solar-ribbon.css',import.meta.url),'utf8');
const names=['Bélier','Taureau','Gémeaux','Cancer','Lion','Vierge','Balance','Scorpion','Sagittaire','Capricorne','Verseau','Poissons'];
const days={};
for(let d=1;d<=30;d++)days['2026-11-'+String(d).padStart(2,'0')]={
  sunLongitudeAtNoon:d<=21?235:250,
  sunIngress:d===22?{fromIndex:7,toIndex:8,fromSign:'Scorpion',toSign:'Sagittaire'}:null
};
const ctx={result:{days},state:{profile:{timezone:'Europe/Paris'}},zodiacNames:names,
  pad:n=>String(n).padStart(2,'0'),safe:x=>String(x)};
function solarModule(){
  const a=app.indexOf('  const solarSignIndex='),b=app.indexOf('  function eventTitle(',a);
  return new Function('ctx','with(ctx){'+app.slice(a,b)+
    ';return {solarSignIndex,solarMonthPeriods,solarMonthSummary,solarDayBand,solarCalendarBackdropWeek};}')(ctx);
}
test('solar month preserves real sign intervals and 50/50 ingress',()=>{
  const {solarMonthPeriods,solarMonthSummary}=solarModule();
  const p=solarMonthPeriods(2026,10,30);
  assert.equal(p.totals[7],21.5);
  assert.equal(p.totals[8],8.5);
  assert.match(solarMonthSummary(p),/50\/50/);
});
test('solar ribbon is a single background per week, not per-day cards',()=>{
  const {solarMonthPeriods,solarCalendarBackdropWeek}=solarModule();
  const periods=solarMonthPeriods(2026,10,30);
  const wd=(new Date(2026,10,1).getDay()+6)%7;
  const week=solarCalendarBackdropWeek(2026,10,wd,3,periods);
  assert.match(week,/astra-solar-ribbon-backdrop/);
  assert.match(week,/solar-element-water/);
  assert.match(week,/solar-element-fire/);
  assert.match(week,/grid-column:1 \/ span 13/);
  assert.match(week,/grid-column:14 \/ span 1/);
  assert.equal((week.match(/astra-solar-ribbon-segment/g)||[]).length,2);
  assert.equal((week.match(/ends-at-ingress/g)||[]).length,1);
  assert.equal((week.match(/starts-at-ingress/g)||[]).length,1);
  assert.match(css,/\.astra-solar-ribbon-segment\.ends-at-ingress/);
  assert.match(css,/\.astra-solar-ribbon-segment\.starts-at-ingress/);
  // Week boundaries must not add a false zodiac-sign transition.
  const firstWeek=solarCalendarBackdropWeek(2026,10,wd,0,periods);
  assert.ok(!firstWeek.includes('starts-at-ingress'));
  assert.ok(!firstWeek.includes('ends-at-ingress'));
  const render=app.slice(app.indexOf('  function calendar() {'),app.indexOf('  function initDraft()'));
  assert.match(render,/astra-calendar-date-week/);
  assert.match(render,/solarCalendarBackdropWeek/);
  assert.ok(!render.includes('solarClass'));
  assert.match(css,/\.astra-solar-ribbon-backdrop/);
  assert.match(css,/\.astra-solar-ribbon-segment/);
  assert.match(css,/background:transparent!important/);
  assert.match(css,/--solar-fire-bg/);
  assert.match(css,/--solar-water-bg/);
});
test('daily solar label and unknown position remain supported',()=>{
  const {solarDayBand,solarSignIndex}=solarModule();
  assert.match(solarDayBand(250),/Soleil en Sagittaire/);
  assert.equal(solarSignIndex(null),null);
});

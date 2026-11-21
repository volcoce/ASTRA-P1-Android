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
    ';return {solarSignIndex,solarMonthPeriods,solarMonthSummary,solarDayBand};}')(ctx);
}
test('solar month preserves real sign intervals and 50/50 ingress',()=>{
  const {solarMonthPeriods,solarMonthSummary}=solarModule();
  const p=solarMonthPeriods(2026,10,30);
  assert.equal(p.totals[7],21.5);
  assert.equal(p.totals[8],8.5);
  assert.match(solarMonthSummary(p),/50\/50/);
});
test('calendar paints continuous element backgrounds without extra solar row',()=>{
  const start=app.indexOf('  function calendar() {'),end=app.indexOf('  function initDraft()',start);
  const code=app.slice(start,end);
  assert.ok(start>=0&&end>start);
  assert.match(code,/solar-continues-before/);
  assert.match(code,/solar-continues-after/);
  assert.match(code,/solar-element-/);
  assert.match(code,/solar-split-bg/);
  assert.ok(!code.includes('solarCalendarWeek('));
  assert.match(css,/\.calendar \.day\.astra-solar-cell/);
  assert.match(css,/--solar-fire-bg/);
  assert.match(css,/--solar-earth-bg/);
  assert.match(css,/--solar-air-bg/);
  assert.match(css,/--solar-water-bg/);
  assert.match(css,/column-gap:0/);
  assert.ok(!css.includes('.astra-solar-calendar-week'));
});
test('daily solar label and unknown position remain supported',()=>{
  const {solarDayBand,solarSignIndex}=solarModule();
  assert.match(solarDayBand(250),/Soleil en Sagittaire/);
  assert.equal(solarSignIndex(null),null);
});

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
const ctx={
  result:{days},state:{profile:{timezone:'Europe/Paris'},mode:'tropical'},
  E:{
    dailySky(day){return {sunLongitude:day.startsWith('2026-10-')?235:250,moonPhase:100}},
    sunSignIngress(){return null}
  },
  zodiacNames:names,pad:n=>String(n).padStart(2,'0'),
  isoDay:date=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),
    String(date.getDate()).padStart(2,'0')].join('-'),
  safe:x=>String(x)
};
function solarModule(){
  const a=app.indexOf('  const solarSignIndex='),b=app.indexOf('  function eventTitle(',a);
  return new Function('ctx','with(ctx){'+app.slice(a,b)+
    ';return {solarSignIndex,solarMonthPeriods,solarMonthSummary,solarCalendarExplanation,solarDayBand,solarVisiblePeriods,solarCalendarBackdropWeek,solarVisibleMajorPhases};}')(ctx);
}
test('solar month preserves real sign intervals and 50/50 ingress',()=>{
  const {solarMonthPeriods,solarMonthSummary,solarCalendarExplanation}=solarModule();
  const p=solarMonthPeriods(2026,10,30);
  assert.equal(p.totals[7],21.5);
  assert.equal(p.totals[8],8.5);
  assert.match(solarMonthSummary(p),/Soleil dominant/);
  assert.doesNotMatch(solarMonthSummary(p),new RegExp('50/50'));
  assert.match(solarCalendarExplanation(p),new RegExp('50/50'));
  assert.match(solarCalendarExplanation(p),/21,5 jours/);
});
test('solar ribbon remains full-width across adjacent months and has true ingress corners',()=>{
  const {solarVisiblePeriods,solarCalendarBackdropWeek}=solarModule();
  const wd=(new Date(2026,10,1).getDay()+6)%7;
  const periods=solarVisiblePeriods(2026,10,wd,6);
  assert.equal(periods.days.length,42);
  assert.equal(periods.days[0].day,'2026-10-26');
  assert.equal(periods.days[41].day,'2026-12-06');
  assert.equal(periods.segments.reduce((n,s)=>n+s.endHalf-s.startHalf+1,0),84);
  const first=solarCalendarBackdropWeek(2026,10,wd,0,periods);
  assert.match(first,/solar-element-water/);
  assert.match(first,/is-outside-month/);
  assert.match(first,/grid-column:1 \/ span 12/);
  assert.match(first,/grid-column:13 \/ span 2/);
  assert.ok(!first.includes('starts-at-ingress'));
  assert.ok(!first.includes('ends-at-ingress'));
  const ingress=solarCalendarBackdropWeek(2026,10,wd,3,periods);
  assert.match(ingress,/solar-element-water/);
  assert.match(ingress,/solar-element-fire/);
  assert.match(ingress,/grid-column:1 \/ span 13/);
  assert.match(ingress,/grid-column:14 \/ span 1/);
  assert.equal((ingress.match(/ends-at-ingress/g)||[]).length,1);
  assert.equal((ingress.match(/starts-at-ingress/g)||[]).length,1);
  const last=solarCalendarBackdropWeek(2026,10,wd,5,periods);
  assert.match(last,/grid-column:1 \/ span 2/);
  assert.match(last,/grid-column:3 \/ span 12/);
  assert.match(last,/is-outside-month/);
  assert.ok(!last.includes('starts-at-ingress'));
  assert.ok(!last.includes('ends-at-ingress'));
  assert.match(css,/\.astra-solar-ribbon-segment\.is-outside-month/);
  const render=app.slice(app.indexOf('  function calendar() {'),app.indexOf('  function initDraft()'));
  assert.match(render,/solarVisiblePeriods/);
  assert.match(render,/solarCalendarBackdropWeek/);
  assert.ok(!render.includes('astra-solar-cell'));
  assert.ok(!render.includes('class="astra-personal-create"'));
});
test('outside-month exact lunations remain marked but do not shift zodiac segments',()=>{
  let calls=0;
  ctx.E.upcomingMoonPhases=()=>{
    calls++;
    return [
      {name:'Nouvelle Lune',day:'2026-10-30',at:'2026-10-30T12:00:00Z'},
      {name:'Premier quartier',day:'2026-11-07',at:'2026-11-07T12:00:00Z'},
      {name:'Pleine Lune',day:'2026-12-02',at:'2026-12-02T12:00:00Z'},
      {name:'Dernier quartier',day:'2026-12-08',at:'2026-12-08T12:00:00Z'}
    ];
  };
  const {solarVisiblePeriods}=solarModule();
  const p=solarVisiblePeriods(2026,10,6,6);
  assert.equal(p.majorPhases.get('2026-10-30'),'new');
  assert.equal(p.majorPhases.get('2026-12-02'),'full');
  assert.equal(calls,1);
  const repeat=solarVisiblePeriods(2026,10,6,6);
  assert.equal(repeat.majorPhases.get('2026-12-02'),'full');
  assert.equal(calls,1,'Lunar quarter lookup must remain cached across calendar renders');
  delete ctx.E.upcomingMoonPhases;
});
test('daily solar label and unknown position remain supported',()=>{
  const {solarDayBand,solarSignIndex}=solarModule();
  assert.match(solarDayBand(250),/Soleil en Sagittaire/);
  assert.equal(solarSignIndex(null),null);
});

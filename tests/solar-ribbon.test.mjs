import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../app/src/main/assets/app.js',import.meta.url),'utf8');
const runtime=readFileSync(new URL('../astro/runtime.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('../app/src/main/assets/solar-ribbon.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../app/src/main/assets/index.html',import.meta.url),'utf8');
const smoke=readFileSync(new URL('./ui-smoke.py',import.meta.url),'utf8');

function solarModule(ctx){
  const start=app.indexOf('  const solarSignIndex=');
  const stop=app.indexOf('  function eventTitle(',start);
  assert.ok(start>0&&stop>start);
  const functions=app.slice(start,stop);
  return new Function('ctx','with(ctx){'+functions+
    ';return {solarSignIndex,solarMonthPeriods,solarCalendarWeek,solarMonthSummary,solarDayBand};}')(ctx);
}
const zodiacNames=['Bélier','Taureau','Gémeaux','Cancer','Lion','Vierge',
  'Balance','Scorpion','Sagittaire','Capricorne','Verseau','Poissons'];
const zodiacSymbols=['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const days={};
for(let d=1;d<=30;d++){
  const key='2026-11-'+String(d).padStart(2,'0');
  days[key]={sunLongitudeAtNoon:d<=21?235:250};
}
const context={
  result:{days},state:{profile:{timezone:'Europe/Paris'},mode:'tropical'},
  selected:'2026-11-21',detectedZone:'Europe/Paris',zodiacNames,zodiacSymbols,
  safe:s=>String(s),pad:n=>String(n).padStart(2,'0')
};

test('Solar band: sign from calculated longitude, independent of natal profile',()=>{
  const {solarSignIndex}=solarModule(context);
  assert.equal(solarSignIndex(359.999),11);
  assert.equal(solarSignIndex(0),0);
  assert.equal(solarSignIndex(235),7);
  assert.equal(solarSignIndex(250),8);
  assert.equal(solarSignIndex(-1),11);
  assert.equal(solarSignIndex(null),null);
});

test('Solar intervals: monthly data groups consecutive days per solar sign',()=>{
  const {solarMonthPeriods}=solarModule(context);
  const model=solarMonthPeriods(2026,10,30);
  assert.deepEqual(model.segments,[
    {start:1,end:21,index:7},
    {start:22,end:30,index:8}
  ]);
  assert.equal(model.totals[7],21);
  assert.equal(model.totals[8],9);
  assert.deepEqual(model.mostPresent,[7]);
});

test('Solar intervals: date ranges render WITHIN calendar weeks as contiguous bars',()=>{
  const {solarMonthPeriods,solarCalendarWeek}=solarModule(context);
  const model=solarMonthPeriods(2026,10,30);
  const weekday=(new Date(2026,10,1).getDay()+6)%7;
  const firstWeek=solarCalendarWeek(2026,10,weekday,0,model);
  assert.match(firstWeek,/class="astra-calendar-week-events"/);
  assert.match(firstWeek,/grid-column:7 \/ span 1/);
  assert.match(firstWeek,/class="astra-calendar-range-event solar-sign-7 is-narrow/);
  const changingWeek=solarCalendarWeek(2026,10,weekday,3,model);
  assert.equal((changingWeek.match(/class="astra-calendar-range-event /g)||[]).length,2);
  assert.match(changingWeek,/grid-column:1 \/ span 6/);
  assert.match(changingWeek,/grid-column:7 \/ span 1/);
  assert.match(changingWeek,/Soleil en Scorpion/);
  assert.match(changingWeek,/Soleil en Sagittaire/);
  assert.match(changingWeek,/21 jours à midi \(70 % du mois\)/);
  assert.match(changingWeek,/data-calendar-range-start="22" data-calendar-range-end="30"/);
  assert.ok(!changingWeek.includes('astra-solar-ribbon'));
});

test('Solar intervals: month leader stays a compact caption under the same grid',()=>{
  const {solarMonthPeriods,solarMonthSummary}=solarModule(context);
  const summary=solarMonthSummary(solarMonthPeriods(2026,10,30));
  assert.match(summary,/astra-calendar-solar-note/);
  assert.match(summary,/Signe le plus présent/);
  assert.match(summary,/Scorpion/);
  assert.match(summary,/21 j \(70 %\)/);
  assert.match(summary,/Selon la position du Soleil à midi/);
  assert.ok(!summary.includes('<section'));
});

test('Solar intervals: missing days remain unassigned and ties are announced',()=>{
  const previousDays=context.result.days;
  const incomplete={};
  for(let d=1;d<=30;d++){
    const key='2026-11-'+String(d).padStart(2,'0');
    incomplete[key]={sunLongitudeAtNoon:d<=12?235:d<=24?250:null};
  }
  context.result={days:incomplete};
  try{
    const {solarMonthPeriods,solarCalendarWeek,solarMonthSummary}=solarModule(context);
    const model=solarMonthPeriods(2026,10,30);
    assert.deepEqual(model.mostPresent,[7,8]);
    assert.equal(model.totals.reduce((a,b)=>a+b,0),24);
    assert.match(solarMonthSummary(model),/Signes les plus présents/);
    assert.match(solarMonthSummary(model),/Scorpion et Sagittaire/);
    assert.match(solarMonthSummary(model),/12 j \(40 %\)/);
    assert.match(solarMonthSummary(model),/données partielles/);
    const weekday=(new Date(2026,10,1).getDay()+6)%7;
    assert.match(solarCalendarWeek(2026,10,weekday,5,model),/is-unknown/);
  }finally{context.result={days:previousDays};}
});

test('Solar band: daily banner conveys sign and degree without a natal wheel',()=>{
  const {solarDayBand}=solarModule(context);
  const html=solarDayBand(250);
  assert.match(html,/solar-sign-8/);
  assert.match(html,/Soleil en Sagittaire/);
  assert.match(html,/10°/);
  assert.match(solarDayBand(null),/Position solaire indisponible/);
});

test('Solar band: sources, accessible labels and styles remain in sync',()=>{
  assert.match(runtime,/sunLongitudeAtNoon:Number\.isFinite\(sunLongitudeAtNoon\)/);
  assert.match(app,/solarMonthPeriods\(year,m,count\)/);
  assert.match(app,/solarDayBand\(sky\?\.sunLongitude\)/);
  assert.match(html,/href="solar-ribbon.css"/);
  assert.ok(smoke.includes("ROOT/'solar-ribbon.css'"));
  assert.match(css,/\.astra-calendar-range-event\{/);
  assert.match(css,/\.astra-calendar-week-events\{/);
  assert.match(app,/solarCalendarWeek\(year,m,weekday,week,periods\)/);
  assert.ok(!app.includes('solarRibbon(year,m,count)'));
  assert.ok(!app.includes('astra-solar-ribbon-heading'));
  assert.match(css,/\.calendar \.day \.sun-aspect-line\{/);
  assert.match(app,/Aspect solaire exact/);
});

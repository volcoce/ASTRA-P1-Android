import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../app/src/main/assets/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../app/src/main/assets/calendar-p0.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../app/src/main/assets/index.html',import.meta.url),'utf8');
const browser=readFileSync(new URL('./ui-smoke.py',import.meta.url),'utf8');

const sampleEvent={
  type:'moon',name:'Pleine Lune',at:'2026-11-20T14:00:00Z',moonLongitude:61
};
const fixtureDay={active:[],sky:[sampleEvent],exact:[
  {type:'exact',body:'Sun',natal:'Moon',aspect:'Trigone',at:'2026-11-20T11:30:00Z'}
]};
const dateString=day=>new Intl.DateTimeFormat('fr-FR',{
  weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'
}).format(new Date(day+'T12:00:00Z'));
const context={
  calendarView:'month',
  selected:'2026-11-20',
  month:new Date(2026,10,1),
  state:{profile:{timezone:'Europe/Paris'},mode:'tropical',journal:{}},
  result:{days:{'2026-11-20':fixtureDay}},
  Date:class FixedDate extends Date{
    constructor(...args){super(...(args.length?args:['2026-11-20T12:00:00Z']));}
  },
  isoDay:d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),
    String(d.getDate()).padStart(2,'0')].join('-'),
  pad:n=>String(n).padStart(2,'0'),
  safe:x=>String(x),
  displayDate:dateString,
  classify:day=>day||{active:[],exact:[],sky:[]},
  currentDay:()=>fixtureDay,
  dayEvents:day=>[...day.exact,...day.sky].sort((a,b)=>a.at.localeCompare(b.at)),
  header:()=>'',birthTimeWarning:()=>'',status:()=>'',lunarTimeline:()=>'',detailView:()=>'',switcher:()=>'',filters:()=>'',row:e=>'<button data-mock-event="'+e.type+'"></button>',
  lunarLabel:()=> 'Pleine lune',moonPhaseIcon:()=>'<svg></svg>',solarRibbon:()=>'<div class="astra-solar-ribbon"></div>',
  solarSignIndex:n=>Number.isFinite(n)?Math.floor(n/30):null,
  zodiacNames:['Bélier','Taureau','Gémeaux','Cancer','Lion','Vierge','Balance','Scorpion','Sagittaire','Capricorne','Verseau','Poissons'],
  solarDayBand:()=>'<div class="astra-solar-daily-band"></div>',
  zodiacSignAt:()=> 'Gémeaux',
  E:{dailySky:()=>({sunLongitude:242,moonLongitude:61,moonPhase:180})},
  detectedZone:'Europe/Paris'
};
function calendar(view){
  const begin=app.indexOf('  function calendar() {'),end=app.indexOf('  function initDraft()',begin);
  assert.ok(begin>=0&&end>begin);
  const snippet=app.slice(begin,end);
  return new Function('ctx','with(ctx){'+snippet+'return calendar();}')({...context,calendarView:view});
}
function count(html,pattern){return (html.match(pattern)||[]).length;}

test('P0 calendar: switches between month and day without adding a main tab',()=>{
  const monthly=calendar('month'),daily=calendar('day');
  assert.match(monthly,/data-calendar-view="month" aria-pressed="true"/);
  assert.match(monthly,/data-calendar-view="day" aria-pressed="false"/);
  assert.match(daily,/data-calendar-view="day" aria-pressed="true"/);
  assert.match(daily,/data-calendar-view="month" aria-pressed="false"/);
  assert.equal(count(monthly,/class="day /g),30);
  assert.equal(count(daily,/class="day /g),0);
  assert.match(monthly,/astra-solar-ribbon/);
  assert.ok(!daily.includes('class="cal-grid"'));
  assert.match(daily,/astra-calendar-day-sky/);
});

test('P0 calendar: day navigation, selected date, and today shortcut',()=>{
  const daily=calendar('day');
  assert.match(daily,/data-calendar-day-offset="-1"/);
  assert.match(daily,/data-calendar-day-offset="1"/);
  assert.match(daily,/data-calendar-today="1"/);
  assert.match(daily,/vendredi 20 novembre 2026/);
  assert.match(daily,/astra-solar-daily-band/);
  assert.match(app,/if\(a\.calendarDayOffset\)/);
  assert.match(app,/selectDay\(shiftDay\(selected,direction\)\)/);
  assert.match(app,/if\(a\.calendarToday\)/);
});

test('P0 calendar: chronological exact events and separate active aspects',()=>{
  const daily=calendar('day');
  assert.equal(count(daily,/data-mock-event="/g),2);
  assert.match(daily,/2<\/b> événements exacts/);
  assert.ok(!daily.includes('astra-calendar-active'));
  assert.match(daily,/data-mock-event="exact"[\s\S]*data-mock-event="moon"/);
});

test('P0 event rows: consistent explicit category coding for lunar, solar and stations',()=>{
  assert.match(app,/function eventCategory\(event\)/);
  for(const token of ['moon-new','moon-full','moon-quarter','station','solar-aspect','exact-aspect','active'])
    assert.ok(app.includes(token)&&css.includes('event-kind-'+token),token);
  assert.match(css,/\.event-category-label/);
  assert.match(app,/astra-event-facts/);
  assert.match(app,/id="detailTitle"/);
  assert.match(app,/Fiche de l’événement/);
});

test('P0 calendar: styling and browser tests include the new interactive view',()=>{
  assert.match(html,/href="calendar-p0.css"/);
  assert.ok(browser.includes("ROOT/'calendar-p0.css'"));
  assert.match(browser,/calendar-day-320/);
  assert.match(css,/\.astra-calendar-view-switch/);
  assert.match(css,/\.astra-calendar-day-heading/);
  assert.match(css,/\.astra-calendar-day-sky/);
});

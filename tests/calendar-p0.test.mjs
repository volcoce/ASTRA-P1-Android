import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../app/src/main/assets/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../app/src/main/assets/calendar-p0.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../app/src/main/assets/index.html',import.meta.url),'utf8');
const browser=readFileSync(new URL('./ui-smoke.py',import.meta.url),'utf8');

const moon={type:'moon',name:'Pleine Lune',at:'2026-11-20T14:00:00Z',moonLongitude:61};
const exact={type:'exact',body:'Sun',natal:'Moon',aspect:'Trigone',
  at:'2026-11-20T11:30:00Z'};
const fixtureDay={active:[],sky:[moon],exact:[exact]};
const dateString=day=>new Intl.DateTimeFormat('fr-FR',{
  weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'
}).format(new Date(day+'T12:00:00Z'));
const context={
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
  currentDay:()=>context.result.days['2026-11-20'],
  dayEvents:day=>[...day.exact,...day.sky].sort((a,b)=>a.at.localeCompare(b.at)),
  header:()=>'',birthTimeWarning:()=>'',status:()=>'',detailView:()=>'',
  switcher:()=>'',filters:()=>'',row:e=>'<button data-mock-event="'+e.type+'"></button>',
  lunarLabel:()=> 'Pleine lune',moonPhaseIcon:()=>'<svg></svg>',
  solarMonthPeriods:()=>({segments:[],indices:[],totals:[],mostPresent:[],dayCount:30,max:0}),
  solarCalendarWeek:()=>'<div class="astra-calendar-week-events"></div>',
  solarMonthSummary:()=>'<p class="astra-calendar-solar-note"></p>',
  solarSignIndex:n=>Number.isFinite(n)?Math.floor(n/30):null,
  zodiacNames:['Bélier','Taureau','Gémeaux','Cancer','Lion','Vierge',
    'Balance','Scorpion','Sagittaire','Capricorne','Verseau','Poissons']
};
function calendar(){
  const begin=app.indexOf('  function calendar() {'),end=app.indexOf('  function initDraft()',begin);
  assert.ok(begin>=0&&end>begin);
  return new Function('ctx','with(ctx){'+app.slice(begin,end)+'return calendar();}')(context);
}
const count=(s,re)=>(s.match(re)||[]).length;

test('P0: Calendar is only a month grid with one compact selected-day preview',()=>{
  const markup=calendar();
  assert.equal(count(markup,/class="day /g),30);
  assert.equal(count(markup,/class="card astra-calendar-day-summary"/g),1);
  assert.equal(count(markup,/data-mock-event=/g),2);
  assert.match(markup,/astra-solar-ribbon/);
  assert.match(markup,/data-calendar-open-day="1"/);
  assert.match(markup,/vendredi 20 novembre 2026/);
  for(const duplicate of ['data-calendar-view','astra-calendar-day-sky',
    'astra-calendar-view-switch','astra-lunar-timeline','data-calendar-day-offset'])
    assert.ok(!markup.includes(duplicate),duplicate);
});

test('P0: Preview caps event rows at three and provides an explicit drilldown',()=>{
  const old=context.result.days['2026-11-20'];
  const six={
    active:[],sky:[moon],exact:Array.from({length:5},(_,i)=>({
      ...exact,at:'2026-11-20T'+String(i+8).padStart(2,'0')+':00:00Z'
    }))
  };
  context.result.days['2026-11-20']=six;
  try{
    const markup=calendar();
    assert.equal(count(markup,/data-mock-event=/g),3);
    assert.match(markup,/\+3 autres événements/);
    assert.match(markup,/6 événements/);
    assert.match(markup,/Voir le ciel de cette journée/);
  }finally{context.result.days['2026-11-20']=old;}
});

test('P0: Full daily destination reuses Ce jour and preserves calendar selection',()=>{
  assert.match(app,/if\(a\.calendarOpenDay\)/);
  assert.match(app,/activeTab='today';openDetail=null/);
  assert.match(app,/writeBrowserRoute\('push'\)/);
  assert.ok(!app.includes('calendarView='));
  assert.ok(!app.includes('if(a.calendarDayOffset)'));
  assert.ok(!app.includes('if(a.calendarToday)'));
  assert.ok(!app.includes('lunarTimeline()'));
});

test('P0: Solar and lunar information are not duplicated in the daily home',()=>{
  const begin=app.indexOf('  function today() {'),end=app.indexOf('  function monthOverview()',begin);
  const today=app.slice(begin,end);
  assert.ok(begin>=0&&end>begin);
  assert.match(today,/solarDayBand\(sky\?\.sunLongitude\)/);
  assert.match(today,/class="astra-day-journal-link"/);
  assert.ok(!today.includes('astra-today-insights'));
  assert.ok(!today.includes('astra-hero-orbit'));
  assert.ok(!today.includes('astra-insight-tile as-sun'));
});

test('P0: event rows do not repeat lunar labels or instructions',()=>{
  const begin=app.indexOf('  function eventCategory(event){');
  const end=app.indexOf('  function detailView()',begin);
  assert.ok(begin>=0&&end>begin);
  const context={
    safe:x=>String(x),dateTime:()=>'20/11/2026 15:00',
    eventTitle:e=>e.type==='moon'?'Pleine Lune en Gémeaux':'Soleil et Lune · angle de 120°',
    renderedEvents:[],aspects:{Trigone:'△'},planets:{Sun:'Soleil',Moon:'Lune'}
  };
  const render=new Function('ctx','event','with(ctx){'+app.slice(begin,end)+'return row(event);}');
  const moonRow=render(context,moon);
  const visibleMoonRow=moonRow.replace(/ aria-label="[^"]*"/g,'');
  assert.equal((visibleMoonRow.match(/Pleine Lune/g)||[]).length,1);
  assert.ok(!moonRow.includes('event-category-label'));
  assert.ok(!moonRow.includes('Voir la fiche'));
  assert.match(moonRow,/event-arrow/);
  const solarRow=render(context,exact);
  assert.equal((solarRow.match(/Aspect solaire exact/g)||[]).length,1);
  assert.match(solarRow,/event-category-label/);
  assert.match(css,/\.event-button \.event-body \.event-category-label\{/);
});

test('P0: Category coding and event detail facts remain available',()=>{
  assert.match(app,/function eventCategory\(event\)/);
  for(const type of ['moon-new','moon-full','moon-quarter','station',
    'solar-aspect','exact-aspect','active'])
    assert.ok(app.includes(type)&&css.includes('event-kind-'+type),type);
  assert.match(css,/\.event-category-label/);
  assert.match(app,/astra-event-facts/);
  assert.match(app,/id="detailTitle"/);
});

test('P0: Compact styles and mobile browser regression are wired',()=>{
  assert.match(html,/href="calendar-p0.css"/);
  assert.ok(browser.includes("ROOT/'calendar-p0.css'"));
  assert.ok(browser.includes('calendar-compact-320'));
  assert.match(css,/\.astra-calendar-day-summary/);
  assert.match(css,/\.astra-day-journal-link/);
  assert.ok(!css.includes('.astra-calendar-view-switch'));
});

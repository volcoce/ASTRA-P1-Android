import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../app/src/main/assets/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../app/src/main/assets/calendar-p0.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../app/src/main/assets/index.html',import.meta.url),'utf8');
const browser=readFileSync(new URL('./ui-smoke.py',import.meta.url),'utf8');

const moon={type:'moon',name:'Pleine Lune',at:'2026-11-20T14:00:00Z',moonLongitude:61};
const exact={type:'exact',body:'Mars',natal:'Moon',aspect:'Trigone',at:'2026-11-20T11:30:00Z'};
const dateString=day=>new Intl.DateTimeFormat('fr-FR',{
  weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'
}).format(new Date(day+'T12:00:00Z'));
const context={
  selected:'2026-11-20',calendarInterval:null,
  month:new Date(2026,10,1),
  state:{profile:{timezone:'Europe/Paris'},mode:'tropical',journal:{},calendarEvents:[]},
  result:{days:{'2026-11-20':{active:[],sky:[moon],exact:[exact]}}},
  Date:class FixedDate extends Date{
    constructor(...args){super(...(args.length?args:['2026-11-20T12:00:00Z']));}
  },
  isoDay:d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),
    String(d.getDate()).padStart(2,'0')].join('-'),
  pad:n=>String(n).padStart(2,'0'),safe:x=>String(x),displayDate:dateString,
  classify:day=>day||{active:[],exact:[],sky:[]},
  header:()=>'',birthTimeWarning:()=>'',status:()=>'',detailView:()=>'',
  switcher:()=>'',filters:()=>'',moonPhaseIcon:()=>'<svg></svg>',lunarLabel:()=> 'Pleine lune',
  solarMonthPeriods:()=>({segments:[],indices:[],totals:[],mostPresent:[],dayCount:30,max:0}),
  solarMonthSummary:()=>'<p class="astra-calendar-solar-note"></p>',
  solarVisiblePeriods:()=>({days:[]}),
  solarCalendarBackdropWeek:()=>'<div class="astra-solar-ribbon-backdrop"></div>',
  personalCalendarWeek:()=>'',calendarDayInspector:()=>'',personalEventEditor:()=>'',
  solarSignIndex:n=>Number.isFinite(n)?Math.floor(n/30):null,
  zodiacNames:['Bélier','Taureau','Gémeaux','Cancer','Lion','Vierge',
    'Balance','Scorpion','Sagittaire','Capricorne','Verseau','Poissons'],
  zodiacSymbols:['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓']
};
function calendar(){
  const begin=app.indexOf('  function calendar() {'),end=app.indexOf('  function initDraft()',begin);
  assert.ok(begin>=0&&end>begin);
  return new Function('ctx','with(ctx){'+app.slice(begin,end)+'return calendar();}')(context);
}
const count=(s,re)=>(s.match(re)||[]).length;

test('Calendar: one month grid; personal events rendered in calendar, no duplicated list',()=>{
  const markup=calendar();
  assert.equal(count(markup,/class="day /g),30);
  assert.equal(count(markup,/class="astra-adjacent-day"/g),12);
  assert.match(markup,/data-day="2026-10-26"/);
  assert.match(markup,/data-day="2026-12-06"/);
  assert.equal(count(markup,/class="astra-solar-calendar-week"/g),0);
  assert.match(markup,/astra-calendar-solar-note/);
  assert.ok(!markup.includes('class="astra-personal-create"'));
  assert.ok(!markup.includes('data-personal-new="1"'));
  assert.ok(!markup.includes('astra-calendar-day-summary'));
  assert.ok(!markup.includes('astra-calendar-day-events'));
  assert.ok(!markup.includes('data-calendar-view'));
  assert.ok(!markup.includes('astra-solar-calendar-event'));
  assert.equal(count(markup,/class="astra-calendar-date-week"/g),6);
  assert.equal(count(markup,/class="astra-solar-ribbon-backdrop"/g),6);
  assert.ok(!markup.includes('astra-solar-cell'));
  assert.match(markup,/data-day="2026-11-20" aria-pressed="true"/);
});

test('Calendar: date buttons announce exact astronomical and personal counts',()=>{
  const markup=calendar();
  assert.match(markup,/aria-current="date" aria-label="vendredi 20 novembre 2026/);
  assert.match(markup,/événement\(s\) personnel\(s\)/);
  assert.match(markup,/Position solaire indisponible/);
});

test('Calendar: date inspector and personal editor use modal dialogs',()=>{
  assert.match(app,/function calendarDayInspector\(\)/);
  assert.match(app,/function personalEventEditor\(\)/);
  assert.match(app,/id="calendarDayDialog"/);
  assert.match(app,/id="personalEventDialog"/);
  assert.match(app,/showModal\(\)/);
  assert.match(app,/if\(a\.calendarOpenDay\)/);
  assert.match(app,/activeTab='today';openDetail=null/);
  assert.ok(!app.includes('calendarView='));
});

test('Calendar: no redundant solar and lunar cards in Ce jour',()=>{
  const a=app.indexOf('  function today() {'),b=app.indexOf('  function monthOverview()',a);
  const today=app.slice(a,b);
  assert.match(today,/solarDayBand\(sky\?\.sunLongitude\)/);
  assert.match(today,/class="astra-day-journal-link"/);
  assert.ok(!today.includes('astra-today-insights'));
  assert.ok(!today.includes('astra-hero-orbit'));
});

test('Event rows keep explicit semantics without repeating lunar text',()=>{
  const start=app.indexOf('  function eventCategory(event){');
  const end=app.indexOf('  function detailView()',start);
  const ctx={
    safe:x=>String(x),dateTime:()=>'20/11/2026 15:00',
    eventTitle:e=>e.type==='moon'?'Pleine Lune en Gémeaux':'Soleil et Lune · angle de 120°',
    renderedEvents:[],aspects:{Trigone:'△'},planets:{Sun:'Soleil',Moon:'Lune'}
  };
  const render=new Function('ctx','event','with(ctx){'+app.slice(start,end)+'return row(event);}');
  const lunar=render(ctx,moon).replace(/ aria-label="[^"]*"/g,'');
  assert.equal(count(lunar,/Pleine Lune/g),1);
  assert.ok(!lunar.includes('Voir la fiche'));
  const solar=render(ctx,exact);
  assert.equal(count(solar,/Aspect solaire exact/g),0);
  assert.match(solar,/event-category-label/);
});

test('Calendar: category styles, astronomical detail and responsive assets remain',()=>{
  for(const type of ['moon-new','moon-full','moon-quarter','station',
    'exact-aspect','active'])
    assert.ok(app.includes(type)&&css.includes('event-kind-'+type),type);
  assert.match(app,/astra-event-facts/);
  assert.match(html,/href="calendar-p0.css"/);
  assert.match(html,/href="personal-calendar.css"/);
  assert.ok(browser.includes("ROOT/'personal-calendar.css'"));
});

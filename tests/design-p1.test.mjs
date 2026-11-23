import {CSS_SOURCES} from '../scripts/css-sources.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../app/src/main/assets/'+name,import.meta.url),'utf8');
const app=read('app.js'),html=read('index.html'),p1=read('astra-p1-screens.css');
const solar=read('solar-ribbon.css');
const slice=(start,end)=>app.slice(app.indexOf(start),app.indexOf(end,app.indexOf(start)));
test('P1 theme layer loads last after P0 semantic tokens and components',()=>{
  const order=['astra-tokens.css','astra-components.css','astra-p1-screens.css'];
  const indices=order.map(n=>CSS_SOURCES.indexOf(n));
  assert.ok(indices.every(n=>n>=0));
  assert.ok(indices[0]<indices[1]&&indices[1]<indices[2]);
});
test('P1 daily Moon transition and exact phase share one hero',()=>{
  const today=slice('  function today() {','  function monthOverview() {');
  assert.match(today,/solarDayBand\(sky\?\.sunLongitude\)/);
  assert.match(today,/firstIngress\?\s*safe\(firstIngress.fromSign\)/);
  assert.match(today,/safe\(firstIngress.toSign\)/);
  assert.match(today,/Changement à <time/);
  assert.match(today,/moonPhaseIcon\(sky\?\.moonPhase,'hero'\)/);
  assert.match(today,/astra-lunar-highlight/);
  assert.match(today,/moonPhaseIcon\(lunarPhaseAngles\[event.name\],'cell'\)/);
  assert.match(today,/eventTitle\(event\)/);
  assert.match(today,/phaseHighlights\+\s*solarDayBand/);
  assert.match(today,/astra-hero-link/);
  assert.match(today,/astra-day-journal-link/);
  assert.doesNotMatch(today,/dailyLunarMoments|astra-day-moon-moments|Évolution de la Lune dans la journée/);
  assert.match(p1,/\.astra-day-hero/);
  assert.match(p1,/\.astra-lunar-highlight\.is-full/);
  assert.match(p1,/\.astra-lunar-highlight\.is-new/);
});
test('P1 monthly phases lead before secondary metrics and events',()=>{
  const month=slice('  function monthOverview() {','  function personalCalendarWeek(');
  const order=['monthMoonTitle','astra-month-metrics','monthEventsTitle'].map(s=>month.indexOf(s));
  assert.ok(order.every(n=>n>=0));
  assert.ok(order[0]<order[1]&&order[1]<order[2]);
  assert.match(p1,/\.astra-month-phases/);
});
test('P1 calendar keeps weekly solar backdrop and separate personal events',()=>{
  const cal=slice('  function calendar() {','  function initDraft() {');
  assert.match(cal,/astra-calendar-board/);
  assert.match(cal,/solarCalendarBackdropWeek/);
  assert.match(cal,/personalCalendarWeek/);
  assert.ok(!cal.includes('astra-solar-cell'));
  assert.match(solar,/\.astra-solar-ribbon-backdrop/);
  assert.match(solar,/\.astra-solar-ribbon-segment\.ends-at-ingress/);
  assert.match(solar,/\.astra-solar-ribbon-segment\.starts-at-ingress/);
});
test('P1 natal summary, progressive navigation and wheel remain available',()=>{
  const profile=slice('  function profile() {','  function render() {');
  const code=app.slice(app.indexOf('  function renderNatalChart('),app.indexOf('  function profile() {'));
  assert.match(code,/natal-primary-cards/);
  assert.match(code,/natal-overview-panel/);
  assert.match(code,/natal-wheel-viewport/);
  assert.match(code,/data-profile-screen="explore"/);
  assert.match(read('astra-natal.css'),/\.natal-home/);
  assert.match(profile,/renderNatalChart\(chart\)/);
});
test('P1 handles compact screens and both themes',()=>{
  assert.match(p1,/@media\(max-width:480px\)/);
  assert.match(p1,/:root\[data-astra-theme="dark"\]/);
  assert.ok(!p1.includes('position:fixed'));
});


test('P1 month overview groups future days and preserves major lunar phase cards',()=>{
 const month=slice('  function monthOverview() {','  function personalCalendarWeek(');
 assert.match(month,/const eventDays=records\.map/);
 assert.match(month,/const daysWithEvents=eventDays\.length/);
 assert.match(month,/featuredDays=upcomingDays\.slice\(0,5\)/);
 assert.match(month,/isCurrentMonth\?'Prochains jours avec événements':'Journées du mois'/);
 assert.match(month,/featuredDays\.map\(\(\{day,events\}\)=>/);
 assert.match(month,/majorMoon\(events\)/);
 assert.match(month,/class="astra-month-phase /);
 assert.match(month,/data-month-open-day/);
 assert.match(month,/class="astra-event-day-list"/);
 assert.doesNotMatch(month,/Premiers événements du mois/);
});

test('Merged calendar lunar phases show the exact sign and local time, including accessibility labels',()=>{
  const source=slice('  function monthOverview() {','  function personalCalendarWeek(');
  const event={type:'moon',name:'Pleine Lune',at:'2026-11-24T14:53:00Z',moonLongitude:62};
  const ctx={
    state:{profile:{timezone:'Europe/Paris'},journal:{}},
    result:{days:{'2026-11-24':{sky:[event],exact:[]}}},
    month:new Date(2026,10,1),pad:n=>String(n).padStart(2,'0'),
    safe:String,displayDate:d=>d,eventTitle:e=>e.name+' en Gémeaux',
    moonPhaseIcon:angle=>'<svg data-angle="'+angle+'"></svg>'
  };
  const markup=new Function('ctx','with(ctx){'+source+'return monthOverview();}')(ctx);
  assert.match(markup,/Pleine Lune en Gémeaux, le 2026-11-24 à 15 h 53/);
  assert.match(markup,/<time datetime="2026-11-24T14:53:00Z">15 h 53<\/time>/);
  assert.match(markup,/<svg data-angle="180">/);
});

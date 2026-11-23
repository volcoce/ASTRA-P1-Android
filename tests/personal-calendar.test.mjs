import {CSS_SOURCES} from '../scripts/css-sources.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../app/src/main/assets/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../app/src/main/assets/personal-calendar.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../app/src/main/assets/index.html',import.meta.url),'utf8');
const safe=value=>String(value??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[c]);
const pad=n=>String(n).padStart(2,'0');
const dateLabel=d=>new Intl.DateTimeFormat('fr-FR',{
  weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'
}).format(new Date(d+'T12:00:00Z'));
const fixture={
  id:'visit_1',title:'Voyage de fin de mois',start:'2026-11-27',end:'2026-12-04',
  allDay:true,startTime:'',endTime:'',color:'purple',note:''
};
const state={calendarEvents:[fixture]};
const ctx={state,pad,safe,displayDate:dateLabel,result:{days:{}},detectedZone:'Europe/Paris',
  selected:'2026-11-24',personalEditor:null,calendarSheet:false,
  calendarColors:['blue','purple','green','orange','rose','slate'],
  dayEvents:()=>[],currentDay:()=>({exact:[],sky:[],active:[]}),
  calendarInterval:null,month:new Date(2026,10,1),row:()=>'',zodiacNames:[]};
// The extracted renderer also needs its real draft-key helper and session store.
ctx.personalDrafts=new Map();
const draftKeyStart=app.indexOf('  const personalDraftKey=');
const draftKeyEnd=app.indexOf('\n',draftKeyStart);
assert.ok(draftKeyStart>=0&&draftKeyEnd>draftKeyStart);
const start=app.indexOf('  function personalCalendarWeek(');
const stop=app.indexOf('  function calendar() {',start);
assert.ok(start>=0&&stop>start);
const factory=new Function('ctx','with(ctx){'+app.slice(draftKeyStart,draftKeyEnd)+'\n'+app.slice(start,stop)+
  ';return {personalCalendarWeek,personalEventEditor,calendarDayInspector};}');
const personal=factory(ctx);
const mondayOffset=(year,m)=>((new Date(year,m,1).getDay()+6)%7);
const week=(year,m,index)=>personal.personalCalendarWeek(year,m,mondayOffset(year,m),index,
  new Date(year,m+1,0).getDate());

test('personal calendar: long event is an actual contiguous grid span each visible week',()=>{
  const week27=week(2026,10,4);
  assert.match(week27,/class="astra-personal-calendar-week"/);
  assert.match(week27,/grid-column:5 \/ span 3/);
  assert.match(week27,/continues-after/);
  const week30=week(2026,10,5);
  assert.match(week30,/grid-column:1 \/ span 1/);
  assert.match(week30,/continues-before/);
  assert.match(week30,/continues-after/);
  const december=week(2026,11,0);
  assert.match(december,/grid-column:2 \/ span 4/);
  assert.match(december,/continues-before/);
  assert.ok(!december.includes('continues-after'));
  assert.match(december,/data-personal-edit="visit_1"/);
  assert.ok(!week(2026,10,0).includes('astra-personal-calendar-week'));
});

test('personal calendar: overlapping events receive separate lanes and reuse gaps',()=>{
  const original=state.calendarEvents;
  state.calendarEvents=[
    {...fixture,id:'one',title:'A',start:'2026-11-23',end:'2026-11-25'},
    {...fixture,id:'two',title:'B',start:'2026-11-24',end:'2026-11-26'},
    {...fixture,id:'three',title:'C',start:'2026-11-26',end:'2026-11-27'}
  ];
  try{
    const markup=week(2026,10,4);
    assert.match(markup,/grid-template-rows:repeat\(2,minmax\(27px,auto\)\)/);
    assert.match(markup,/data-personal-edit="one"/);
    assert.match(markup,/data-personal-edit="two"/);
    assert.match(markup,/data-personal-edit="three"/);
    assert.equal((markup.match(/grid-row:2/g)||[]).length,1);
    assert.equal((markup.match(/grid-row:1/g)||[]).length,2);
  }finally{state.calendarEvents=original;}
});

test('personal calendar: a timed appointment is represented inside its date cell lane',()=>{
  const original=state.calendarEvents;
  state.calendarEvents=[{...fixture,id:'appointment',title:'Dentiste',
    start:'2026-11-24',end:'2026-11-24',
    allDay:false,startTime:'13:30',endTime:'14:00',color:'green'}];
  try{
    const markup=week(2026,10,4);
    assert.match(markup,/grid-column:2 \/ span 1/);
    assert.match(markup,/13:30 · Dentiste/);
    assert.match(markup,/13:30–14:00/);
    assert.match(markup,/event-color-green/);
    assert.match(markup,/is-single-day/);
  }finally{state.calendarEvents=original;}
});

test('personal calendar: sanitize imported data, inclusive end dates and invalid inputs',()=>{
  const from=app.indexOf('  const calendarColors=');
  const until=app.indexOf('  function cleanState(raw) {',from);
  assert.ok(from>0&&until>from);
  const validRouteDay=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&
    !Number.isNaN(Date.parse(d+'T12:00:00Z')) &&
    new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;
  const sanitize=new Function('input','validRouteDay',app.slice(from,until)+'\nreturn sanitizeCalendarEvents(input);');
  const list=sanitize([fixture,fixture,{...fixture,id:'invalid',end:'2026-11-20'},
    {...fixture,id:'timed',allDay:false,start:'2026-11-24',end:'2026-11-24',
      startTime:'15:00',endTime:'14:00'},
    {...fixture,id:'good',allDay:false,start:'2026-11-24',end:'2026-11-25',
      startTime:'15:00',endTime:'14:00'},
    {...fixture,id:'unsafe',color:'not-approved',title:'<b>Nom</b>'}],validRouteDay);
  assert.equal(list.length,3);
  assert.equal(list[1].allDay,false);
  assert.equal(list[1].end,'2026-11-25');
  assert.equal(list[2].color,'blue');
  assert.match(safe(list[2].title),/&lt;b&gt;/);
});

test('personal calendar: editor has accessible date, time, color and delete controls',()=>{
  ctx.personalEditor='new';
  assert.match(personal.personalEventEditor(),/id="personalTitle"/);
  assert.match(personal.personalEventEditor(),/Au \(inclus\)/);
  assert.match(personal.personalEventEditor(),/id="personalAllDay" checked/);
  assert.match(personal.personalEventEditor(),/id="personalTimeFields" hidden/);
  assert.match(personal.personalEventEditor(),/id="personalColor"/);
  ctx.personalEditor='visit_1';
  assert.match(personal.personalEventEditor(),/data-personal-delete="visit_1"/);
  assert.match(personal.personalEventEditor(),/Voyage de fin de mois/);
  ctx.personalEditor=null;
});

test('personal calendar: unsaved editor content is isolated by date and event ID',()=>{
  const originalDay=ctx.selected;
  try{
    ctx.personalEditor='new';
    ctx.personalDrafts.set('new:'+originalDay,{title:'Brouillon <privé>',note:'Note provisoire',allDay:false});
    const markup=personal.personalEventEditor();
    assert.match(markup,/Brouillon &lt;privé&gt;/);
    assert.match(markup,/Note provisoire/);
    assert.doesNotMatch(markup,/id="personalAllDay" checked/);
    ctx.selected='2026-11-25';
    assert.doesNotMatch(personal.personalEventEditor(),/Brouillon/);
    ctx.personalEditor='visit_1';
    assert.match(personal.personalEventEditor(),/Voyage de fin de mois/);
    ctx.personalDrafts.set('visit_1',{title:'Modification non enregistrée'});
    assert.match(personal.personalEventEditor(),/Modification non enregistrée/);
    assert.equal(state.calendarEvents[0].title,fixture.title);
  }finally{
    ctx.selected=originalDay;ctx.personalEditor=null;ctx.personalDrafts.clear();
  }
});

test('personal calendar: date inspector is a modal, not a second event list under grid',()=>{
  ctx.calendarSheet=true;
  ctx.selected='2026-11-29';
  const modal=personal.calendarDayInspector();
  assert.match(modal,/id="calendarDayDialog"/);
  assert.match(modal,/Voyage de fin de mois/);
  assert.match(modal,/data-personal-edit="visit_1"/);
  assert.match(modal,/data-personal-new="1"/);
  assert.match(modal,/data-calendar-open-day="1"/);
  ctx.calendarSheet=false;ctx.selected='2026-11-24';
});

test('personal calendar: resources and interaction contracts are wired',()=>{
  assert.ok(CSS_SOURCES.includes('personal-calendar.css'));
  assert.match(html,/href="astra\.bundle\.css"/);
  assert.match(css,/\.astra-personal-calendar-week/);
  assert.match(css,/\.astra-personal-calendar-event/);
  assert.match(css,/\.astra-personal-dialog::backdrop/);
  assert.match(app,/if\(event\.target\.id==='personalEventForm'\)/);
  assert.match(app,/if\(a\.personalDelete\)/);
  assert.match(app,/calendarEvents:sanitizeCalendarEvents\(raw\.calendarEvents\)/);
  assert.match(app,/persist\(\);personalEditor=null;calendarSheet=false/);
});

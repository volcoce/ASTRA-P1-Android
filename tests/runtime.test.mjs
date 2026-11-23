import test from 'node:test';import assert from 'node:assert/strict';
import {natalChart,transitSnapshot,calculateMonth,moonPhase,automaticTransitOrb,upcomingMoonPhases,transitContactWindow,secondaryProgressions,compositeMidpoints,dailySky,sunSignIngress,moonSignChanges,longitude,tropicalLongitude} from '../astro/runtime.mjs';
import {isoDay} from '../astro/core.mjs';
const p={date:'1994-05-12',time:'18:40',timezone:'Europe/Paris',latitude:48.85,longitude:2.35,fold:null};
test('dynamic natal uses input rather than static ephemeris',()=>{const a=natalChart(p,'tropical');const b=natalChart({...p,date:'1985-05-12'},'tropical');assert.notEqual(a.positions.Moon,b.positions.Moon);assert.equal(Object.keys(a.positions).length,10);assert.equal(a.houses.system,'Placidus');assert.equal(a.houses.cusps.length,12);});
test('lunar phase is calculated at runtime',()=>assert.ok(moonPhase(new Date('2026-11-19T12:00:00Z'))>=0));

test('daily sky uses real local noon, both zodiac modes and no natal-data dependence',()=>{
  const paris=dailySky('2026-11-20','Europe/Paris','tropical');
  assert.equal(paris.at,'2026-11-20T11:00:00.000Z');
  assert.equal(paris.day,'2026-11-20');
  assert.equal(paris.timezone,'Europe/Paris');
  assert.equal(paris.mode,'tropical');
  assert.ok(paris.sunLongitude>=0&&paris.sunLongitude<360);
  assert.ok(paris.moonLongitude>=0&&paris.moonLongitude<360);
  assert.ok(paris.moonPhase>=0&&paris.moonPhase<360);
  assert.ok(Math.abs(paris.moonLongitude-tropicalLongitude('Moon',new Date(paris.at)))<1e-9);
  assert.ok(Math.abs(paris.sunLongitude-tropicalLongitude('Sun',new Date(paris.at)))<1e-9);
  const ny=dailySky('2026-11-20','America/New_York','tropical');
  assert.notEqual(paris.at,ny.at);
  const sidereal=dailySky('2026-11-20','Europe/Paris','sidereal');
  assert.equal(sidereal.at,paris.at);
  assert.notEqual(sidereal.moonLongitude,paris.moonLongitude);
  assert.equal(sidereal.moonPhase,paris.moonPhase);
  assert.throws(()=>dailySky('2026/11/20','Europe/Paris'));
  assert.throws(()=>dailySky('2026-11-20','Europe/Paris','not-a-zodiac'));
});

test('dynamic month for user date, both zodiac modes',()=>{const t=calculateMonth(p,2026,11,'tropical','auto');const s=calculateMonth(p,2026,11,'sidereal','auto');assert.equal(Object.keys(t.days).length,30);assert.equal(Object.keys(s.days).length,30);assert.ok(t.phases>=4);assert.ok(t.days['2026-11-19'].active.length>=0);assert.notEqual(t.chart.positions.Sun,s.chart.positions.Sun);});

test('solar ingress is timed astronomically on the actual local day, even when noon differs',()=>{
  const month=calculateMonth(p,2026,11,'tropical');
  const entries=Object.entries(month.days).filter(([,value])=>value.sunIngress);
  assert.equal(entries.length,1);
  const [day,record]=entries[0],change=record.sunIngress;
  assert.equal(change.fromIndex,7); // Scorpion
  assert.equal(change.toIndex,8);   // Sagittaire
  assert.equal(change.fromSign,'Scorpion');
  assert.equal(change.toSign,'Sagittaire');
  assert.equal(change.mode,'tropical');
  assert.deepEqual(change,sunSignIngress(day,'Europe/Paris','tropical'));
  const instant=new Date(change.at),before=new Date(instant.getTime()-60000);
  const after=new Date(instant.getTime()+60000);
  assert.equal(Math.floor(longitude('Sun',before,'tropical')/30),7);
  assert.equal(Math.floor(longitude('Sun',after,'tropical')/30),8);
  assert.equal(isoDay(instant,'Europe/Paris'),day);
  assert.equal(sunSignIngress('2026-11-10','Europe/Paris','tropical'),null);
  assert.equal(sunSignIngress('2026-03-29','Europe/Paris','tropical'),null);
  assert.throws(()=>sunSignIngress('2026/11/22','Europe/Paris','tropical'));
  assert.throws(()=>sunSignIngress(day,'Europe/Paris','unsupported'));
});

test('automatic transit orbs depend on body and aspect',()=>{
  assert.equal(automaticTransitOrb('Moon',0),1);
  assert.equal(automaticTransitOrb('Saturn',90),1.8);
  assert.equal(automaticTransitOrb('Mercury',60),1.05);
  assert.notEqual(automaticTransitOrb('Moon',0),automaticTransitOrb('Saturn',0));
  assert.throws(()=>automaticTransitOrb('Invalid',90));
});
test('the dynamically evaluated active contacts carry their automatic thresholds',()=>{
  const month=calculateMonth(p,2026,11,'tropical');
  assert.equal(month.orb,'auto');
  const active=Object.values(month.days).flatMap(d=>d.active);
  assert.ok(active.length>0);
  for(const event of active){
    assert.equal(event.orb,automaticTransitOrb(event.body,event.angle));
    assert.ok(event.delta<=event.orb);
  }
  assert.ok(month.exact>0,'exact transit timings remain independently computed');
});

test('sidereal natal houses use shifted cusps and keep their geometry',()=>{
  const tropical=natalChart(p,'tropical');
  const sidereal=natalChart(p,'sidereal');
  assert.equal(sidereal.houses.cusps.length,12);
  assert.equal(sidereal.houses.system,tropical.houses.system);
  assert.equal(sidereal.houses.approximateSidereal,true);
  const norm=x=>(x+360)%360;
  const delta=norm(tropical.houses.cusps[0]-sidereal.houses.cusps[0]);
  assert.ok(delta>20 && delta<27);
  for(let i=1;i<12;i++){
    assert.ok(Math.abs(norm(tropical.houses.cusps[i]-sidereal.houses.cusps[i])-delta)<1e-6);
  }
});


test('date-only birth uses local noon without inventing houses or lunar aspects',()=>{
  const pUnknown={...p,time:null,timeKnown:false,fold:null};
  const c=natalChart(pUnknown,'tropical');
  assert.equal(c.timeKnown,false);
  assert.equal(c.approximateNoon,true);
  assert.equal(c.houses,null);
  assert.ok(c.uncertainBodies.includes('Moon'));
  assert.equal(Object.keys(c.positions).length,10);
  assert.ok(c.aspects.every(a=>a.a!=='Moon'&&a.b!=='Moon'));
  assert.equal(c.birth,'1994-05-12T10:00:00.000Z');
  const s=natalChart(pUnknown,'sidereal');
  assert.equal(s.houses,null);
});
test('unknown birth time never creates fake exact personal transits',()=>{
  const pUnknown={...p,time:null,timeKnown:false};
  const m=calculateMonth(pUnknown,2026,11,'tropical','auto');
  assert.equal(m.approximateNatal,true);
  assert.equal(m.exact,0);
  assert.ok(m.phases>=4);
  assert.ok(Object.values(m.days).every(d=>d.active.every(a=>a.natal!=='Moon'&&a.approximateNatal)));
  assert.ok(Object.values(m.days).every(d=>d.exact.length===0));
});

test('a real transit instant changes positions; view settings never change ecliptic longitudes',()=>{
  const date='2026-11-20T12:00:00.000Z';
  const first=transitSnapshot(p,date,'tropical','placidus');
  const second=transitSnapshot(p,'2026-11-21T12:00:00.000Z','tropical','whole');
  assert.equal(first.at,date);
  assert.equal(first.mode,'tropical');
  assert.equal(Object.keys(first.positions).length,10);
  assert.notEqual(first.positions.Moon,second.positions.Moon);
  assert.equal(first.positions.Sun,transitSnapshot(p,date,'tropical','equal').positions.Sun);
  assert.equal(first.chart.positions.Sun,transitSnapshot(p,date,'tropical','whole').chart.positions.Sun);
  assert.equal(second.chart.houses.system,'Signes entiers');
  assert.ok(first.contacts.every(c=>c.delta<=c.orb && c.delta>=0));
  assert.throws(()=>transitSnapshot(p,'invalid'));
});
test('sidereal Whole Sign houses start at a sign boundary after ayanamsa shift',()=>{
  const t=natalChart(p,'tropical','whole'),s=natalChart(p,'sidereal','whole');
  assert.equal(s.houses.cusps[0]%30,0);
  assert.equal(t.houses.cusps[0]%30,0);
  assert.ok(s.houses.approximateSidereal);
});
test('unknown birth hour removes uncertain natal Moon contacts from double wheel',()=>{
  const t=transitSnapshot({...p,time:null,timeKnown:false},'2026-11-20T12:00:00Z');
  assert.equal(t.chart.houses,null);
  assert.ok(t.contacts.every(c=>c.natal!=='Moon'));
  assert.equal(t.approximateNatal,true);
});

test('four exact upcoming lunar quarters have ordered instants and correct local dates',()=>{
  const a=upcomingMoonPhases(new Date('2026-11-20T00:00:00Z'),'Europe/Paris');
  assert.equal(a.length,4);
  for(let i=0;i<a.length;i++){
    assert.ok(Number.isFinite(a[i].moonLongitude));
    assert.match(a[i].day,/^\d{4}-\d{2}-\d{2}$/);
    if(i)assert.ok(new Date(a[i].at)>new Date(a[i-1].at));
  }
  assert.deepEqual(a.map(x=>x.quarter).sort(),[0,1,2,3]);
  assert.throws(()=>upcomingMoonPhases('invalid'));
});

test('transit applying/separating labels follow local angular change',()=>{
  const snap=transitSnapshot(p,'2026-11-20T12:00:00Z');
  for(const contact of snap.contacts){
    assert.ok(['applying','separating','exact','stable'].includes(contact.trend));
    assert.ok(contact.delta<=contact.orb);
  }
});

test('automatic-orb boundaries include the selected contact instant',()=>{
  // At the birth instant the transiting Moon is necessarily conjunct
  // its own natal position: deterministic and fast for regression tests.
  const snap=transitSnapshot(p,natalChart(p).birth);
  const candidate=snap.contacts.find(c=>c.body==='Moon'&&c.natal==='Moon'&&c.angle===0);
  assert.ok(candidate);
  const w=transitContactWindow(p,snap.at,candidate.body,candidate.natal,candidate.angle);
  assert.ok(w.start&&w.end,'Fast-planet contact has finite entry/exit');
  assert.ok(new Date(w.start).getTime()<=new Date(snap.at).getTime());
  assert.ok(new Date(w.end).getTime()>=new Date(snap.at).getTime());
  assert.ok(new Date(w.start)<new Date(w.end));
  assert.throws(()=>transitContactWindow(p,snap.at,'Invalid',candidate.natal,candidate.angle));
});

test('progressed positions follow day-for-year without inventing houses',()=>{
  const target='2026-11-20T12:00:00Z';
  const p1=secondaryProgressions(p,target);
  assert.equal(Object.keys(p1.positions).length,10);
  assert.equal(p1.moonUncertain,false);
  const progressed=new Date(p1.progressedAt);
  const birth=new Date(natalChart(p).birth);
  const ageDays=(new Date(target).getTime()-birth.getTime())/86400000;
  assert.ok(Math.abs((progressed.getTime()-birth.getTime())/86400000-ageDays/365.2422)<1e-8);
  const p2=secondaryProgressions({...p,timeKnown:false,time:null},target);
  assert.equal(p2.positions.Moon,undefined);
  assert.equal(p2.moonUncertain,true);
  assert.throws(()=>secondaryProgressions(p,'1980-01-01T12:00:00Z'));
});

test('composite midpoints use shortest zodiacal arc and exclude uncertain Moon',()=>{
  const other={...p,date:'1996-07-19',time:'06:30'};
  const composite=compositeMidpoints(p,other,'tropical');
  const first=natalChart(p),second=natalChart(other);
  const angular=x=>((x%360)+360)%360;
  const signed=x=>angular(x+180)-180;
  const expected=angular(first.positions.Sun+signed(second.positions.Sun-first.positions.Sun)/2);
  assert.ok(Math.abs(composite.positions.Sun-expected)<1e-9);
  assert.equal(composite.houses,null);
  assert.equal(Object.keys(composite.positions).length,10);
  const unknown=compositeMidpoints(p,{...other,timeKnown:false,time:null});
  assert.equal(unknown.positions.Moon,undefined);
  assert.equal(unknown.moonUncertain,true);
  assert.throws(()=>compositeMidpoints(p,other,'invalid'));
});

test('Moon sign ingress and Full Moon have distinct exact instants and zodiac signs',()=>{
  const zone='Europe/Paris',day='2026-11-24',mode='tropical';
  const sky=dailySky(day,zone,mode);
  assert.ok(sky.moonLongitude>=30&&sky.moonLongitude<60,
    'Moon is in Taurus at noon local time');
  const changes=moonSignChanges(day,zone,mode);
  const ingress=changes.find(e=>e.fromSign==='Taureau'&&e.toSign==='Gémeaux');
  assert.ok(ingress,'Moon enters Gemini later that civil day');
  const time=new Date(ingress.at).getTime();
  assert.ok(time>new Date(sky.at).getTime());
  const before=longitude('Moon',new Date(time-120000),mode);
  const after=longitude('Moon',new Date(time+120000),mode);
  assert.ok(before<60&&before>58.5,{before,at:ingress.at});
  assert.ok(after>=60&&after<61.5,{after,at:ingress.at});
  const full=calculateMonth(p,2026,11,mode).days[day].sky
    .find(e=>e.type==='moon'&&e.name==='Pleine Lune');
  assert.ok(full);
  assert.ok(Number.isFinite(full.moonLongitude));
  assert.ok(full.moonLongitude>=60&&full.moonLongitude<90,
    'Full Moon occurs in Gemini, regardless of the noon sign');
  assert.ok(new Date(full.at)>new Date(ingress.at));
  assert.ok(new Date(full.at).getTime()-time<8*3600000);
});

test('Moon ingress uses actual civil-day bounds in timezone and handles DST',()=>{
  for(const day of ['2026-03-29','2026-10-25','2026-11-24']){
    const changes=moonSignChanges(day,'Europe/Paris');
    assert.ok(changes.length<=2);
    for(const change of changes){
      const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',
        year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(change.at))
        .map(x=>[x.type,x.value]));
      assert.equal([parts.year,parts.month,parts.day].join('-'),day);
      assert.ok(change.fromSign!==change.toSign);
    }
  }
  const sidereal=moonSignChanges('2026-11-24','Europe/Paris','sidereal');
  assert.ok(Array.isArray(sidereal));
  assert.throws(()=>moonSignChanges('2026-02-30','Europe/Paris'));
  assert.throws(()=>moonSignChanges('2026-11-24','Europe/Paris','unrecognized'));
});

test('calendar preserves physical lunar phase at local noon for each civil day',()=>{
  const out=calculateMonth(p,2026,11,'tropical');
  const dates=Object.keys(out.days);
  assert.equal(dates.length,30);
  const indices=new Set();
  for(const day of dates){
    const val=out.days[day].moonPhaseAtNoon;
    const expected=dailySky(day,p.timezone,'tropical').moonPhase;
    assert.ok(Number.isFinite(val)&&val>=0&&val<360);
    assert.ok(Math.abs(val-expected)<=0.0000051,`Moon at local noon: ${day}`);
    indices.add(Math.floor((val+22.5)/45)%8);
  }
  assert.ok(indices.size>=7,'Month actually moves through nearly all eight phases');
  const other=calculateMonth(p,2026,11,'sidereal');
  assert.ok(Math.abs(other.days['2026-11-20'].moonPhaseAtNoon-
    out.days['2026-11-20'].moonPhaseAtNoon)<0.00001,
    'Physical Moon illumination is independent of zodiac choice');
  assert.ok(dates.every(day=>out.days[day].exact.every(e=>e.body!=='Sun')),
    'The removed exact solar aspect feature must not generate calendar events');
});

 test('Natal retrograde flags describe geocentric motion at birth',()=>{
 const chart=natalChart(p),birth=Date.parse(chart.birth);
 assert.equal(Object.keys(chart.retrogrades).length,10);
 assert.equal(chart.retrogrades.Sun,false);
 assert.equal(chart.retrogrades.Moon,false);
 for(const body of Object.keys(chart.positions)){
   const delta=tropicalLongitude(body,new Date(birth+3600000))-tropicalLongitude(body,new Date(birth-3600000));
   assert.equal(chart.retrogrades[body],((delta+540)%360)-180<0);
 }
 assert.deepEqual(natalChart(p,'sidereal').retrogrades,chart.retrogrades);
});

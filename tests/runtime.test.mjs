import test from 'node:test';import assert from 'node:assert/strict';
import {natalChart,transitSnapshot,calculateMonth,moonPhase,automaticTransitOrb} from '../astro/runtime.mjs';
const p={date:'1994-05-12',time:'18:40',timezone:'Europe/Paris',latitude:48.85,longitude:2.35,fold:null};
test('dynamic natal uses input rather than static ephemeris',()=>{const a=natalChart(p,'tropical');const b=natalChart({...p,date:'1985-05-12'},'tropical');assert.notEqual(a.positions.Moon,b.positions.Moon);assert.equal(Object.keys(a.positions).length,10);assert.equal(a.houses.system,'Placidus');assert.equal(a.houses.cusps.length,12);});
test('lunar phase is calculated at runtime',()=>assert.ok(moonPhase(new Date('2026-11-19T12:00:00Z'))>=0));
test('dynamic month for user date, both zodiac modes',()=>{const t=calculateMonth(p,2026,11,'tropical','auto');const s=calculateMonth(p,2026,11,'sidereal','auto');assert.equal(Object.keys(t.days).length,30);assert.equal(Object.keys(s.days).length,30);assert.ok(t.phases>=4);assert.ok(t.days['2026-11-19'].active.length>=0);assert.notEqual(t.chart.positions.Sun,s.chart.positions.Sun);});

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

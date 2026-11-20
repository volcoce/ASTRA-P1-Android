import test from 'node:test';import assert from 'node:assert/strict';
import {natalChart,calculateMonth,moonPhase,automaticTransitOrb} from '../astro/runtime.mjs';
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

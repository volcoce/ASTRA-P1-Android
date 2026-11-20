import test from 'node:test';
import assert from 'node:assert/strict';
import {layoutPlanetLabels, MIN_LABEL_SPACING_DEGREES} from '../astro/chart-layout.mjs';

const BODIES=['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
const circ=(a,b)=>(b-a+360)%360;

function assertSpaced(positions) {
  const actual=layoutPlanetLabels(positions);
  assert.equal(Object.keys(actual).length,Object.keys(positions).length);
  const longitude=Object.values(actual).map(x=>x.labelLongitude).sort((a,b)=>a-b);
  for(let i=0;i<longitude.length;i++){
    const span=circ(longitude[i],longitude[(i+1)%longitude.length]);
    assert.ok(span >= MIN_LABEL_SPACING_DEGREES-1e-6,
      'Collision between labels: '+span+' degrees');
  }
  for(const [body,original] of Object.entries(positions)){
    assert.ok(Math.abs(actual[body].longitude-((original%360+360)%360)) < 1e-8,
      'True astronomical marker moved: '+body);
  }
}

test('widely spaced glyphs stay at their exact longitudes',()=>{
  const placements={Sun:10,Moon:48,Mercury:86,Venus:124,Mars:162,
    Jupiter:200,Saturn:238,Uranus:276,Neptune:314,Pluto:352};
  const positioned=layoutPlanetLabels(placements);
  assertSpaced(placements);
  for(const v of Object.values(positioned))assert.ok(Math.abs(v.shiftDegrees)<1e-6);
});

test('conjunction and zodiac boundary do not overlap glyphs',()=>{
  const positions={Sun:359.9,Moon:0.03,Mercury:0.2,Venus:0.3,
    Mars:0.4,Jupiter:0.5,Saturn:0.8,Uranus:1.1,Neptune:1.2,Pluto:1.3};
  assertSpaced(positions);
  const layout=layoutPlanetLabels(positions);
  assert.ok(Object.values(layout).some(p=>Math.abs(p.shiftDegrees)>5),
    'Crowded symbols should move while markers stay exact');
});

test('deterministic layout for randomized profiles',()=>{
  let seed=0x1a2b3c4d;
  function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;}
  for(let i=0;i<3000;i++){
    const positions=Object.fromEntries(BODIES.map(body=>[body,360*random()]));
    assertSpaced(positions);
    assert.deepEqual(layoutPlanetLabels(positions),layoutPlanetLabels(positions));
  }
});

test('invalid geometries and inputs are rejected',()=>{
  assert.deepEqual(layoutPlanetLabels({}),{});
  assert.throws(()=>layoutPlanetLabels(null));
  assert.throws(()=>layoutPlanetLabels({Sun:5},0));
  assert.throws(()=>layoutPlanetLabels({Sun:5},31));
});

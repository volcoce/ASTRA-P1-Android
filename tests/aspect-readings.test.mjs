import test from 'node:test';
import assert from 'node:assert/strict';
import {ASPECT_BODIES,ASPECT_NAMES,ASPECT_MODES,PLANET_ROLES,describeAspectPair} from '../astro/aspect-readings.mjs';
import {describeEvent} from '../astro/interpretations.mjs';
import {describeNatalAspect} from '../astro/natal-learning.mjs';

test('225 aspects natals non ordonnés : lecture propre à chaque paire et angle',()=>{
  const readings=new Set();
  let count=0;
  for(let i=0;i<ASPECT_BODIES.length;i++)for(let j=i+1;j<ASPECT_BODIES.length;j++){
    const a=ASPECT_BODIES[i],b=ASPECT_BODIES[j];
    for(const type of ASPECT_NAMES){
      const value=describeAspectPair(a,b,type,{context:'natal'});
      const reversed=describeAspectPair(b,a,type,{context:'natal'});
      assert.equal(value.axis,reversed.axis);
      assert.equal(value.angle,ASPECT_MODES[type].angle);
      assert.match(value.summary,/tradition astrologique/);
      assert.ok(value.summary.includes(value.axis));
      assert.ok(value.interaction.includes(PLANET_ROLES[a].name));
      assert.ok(value.interaction.includes(PLANET_ROLES[b].name));
      const natal=describeNatalAspect({a,b,aspect:type,orb:1.2});
      assert.equal(natal.convention,value.summary);
      assert.equal(natal.question,value.question);
      readings.add(value.axis+'|'+type);
      count++;
    }
  }
  assert.equal(count,225);
  assert.equal(readings.size,225);
});

test('500 transits orientés : aucune lecture vide ou permutation accidentelle',()=>{
  const readings=new Set();
  let count=0;
  for(const body of ASPECT_BODIES)for(const natal of ASPECT_BODIES)for(const type of ASPECT_NAMES){
    const reading=describeAspectPair(body,natal,type,{context:'transit'});
    assert.ok(reading.title.includes(PLANET_ROLES[body].name));
    assert.ok(reading.summary.length>100);
    assert.ok(reading.interaction.includes('en transit'));
    assert.ok(reading.interaction.includes('natal'));
    assert.ok(reading.question.includes('?'));
    assert.equal(reading.angle,ASPECT_MODES[type].angle);
    const event=describeEvent({type:'active',body,natal,aspect:type,delta:0.3});
    assert.equal(event.interpretation,reading.summary);
    assert.equal(event.question,reading.question);
    readings.add(reading.summary+'|'+reading.interaction);
    count++;
  }
  assert.equal(count,500);
  assert.equal(readings.size,500);
  const forward=describeAspectPair('Venus','Mars','Carré',{context:'transit'});
  const backward=describeAspectPair('Mars','Venus','Carré',{context:'transit'});
  assert.equal(forward.axis,backward.axis);
  assert.notEqual(forward.interaction,backward.interaction);
});

test('interprétations conditionnées par le contexte et pas par un destin inventé',()=>{
  const samePlanet=describeAspectPair('Saturn','Saturn','Opposition',{context:'transit'});
  assert.match(samePlanet.axis,/deux moments différents/);
  assert.throws(()=>describeAspectPair('Saturn','Saturn','Conjonction',{context:'natal'}),RangeError);
  assert.throws(()=>describeAspectPair('X','Mars','Carré',{context:'transit'}),RangeError);
  assert.throws(()=>describeAspectPair('Sun','Moon','Quinconce',{context:'natal'}),RangeError);
  assert.throws(()=>describeAspectPair('Sun','Moon','Carré',{context:'progression'}),RangeError);
  assert.throws(()=>describeAspectPair('__proto__','Mars','Carré',{context:'transit'}),RangeError);
  const sample=describeAspectPair('Mars','Saturn','Carré',{context:'transit'});
  assert.doesNotMatch(sample.summary,/va arriver|certainement|inévitable/);
});

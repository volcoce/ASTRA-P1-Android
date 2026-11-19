import test from 'node:test';
import assert from 'node:assert/strict';
import {describeEvent,PLANET_THEMES,ASPECT_THEMES,DISCLAIMER} from '../astro/interpretations.mjs';

test('tous les aspects entre les dix planètes possèdent une lecture',()=>{
  for(const body of Object.keys(PLANET_THEMES))for(const natal of Object.keys(PLANET_THEMES))for(const aspect of Object.keys(ASPECT_THEMES)){
    const event={type:'exact',body,natal,aspect,at:'2026-11-19T12:00:00Z'};
    const text=describeEvent(event);
    assert.ok(text.title.includes(PLANET_THEMES[body].name));
    assert.ok(text.interpretation.length>30);
    assert.ok(text.question.includes('?'));
    assert.equal(text.disclaimer,DISCLAIMER);
  }
});
test('toutes les lunaisons ont des fiches complètes',()=>{
  for(const name of ['Nouvelle Lune','Premier quartier','Pleine Lune','Dernier quartier']){
    const d=describeEvent({type:'moon',name,at:'2026-11-19T12:00:00Z'});
    assert.equal(d.title,name);assert.ok(d.astronomy.includes('calculé'));assert.ok(d.question);
  }
});
test('station et aspect actif ont une interprétation distincte du calcul',()=>{
  const station=describeEvent({type:'station',body:'Saturn',direction:'rétrograde'});
  assert.match(station.astronomy,/Station géocentrique/);
  assert.ok(station.interpretation.includes('symboliquement'));
  const active=describeEvent({type:'active',body:'Moon',natal:'Sun',aspect:'Carré',delta:0.7});
  assert.match(active.astronomy,/midi local/);
  assert.match(active.interpretation,/tradition/);
});
test('événements invalides refusés sans interprétation fantaisiste',()=>{
  assert.throws(()=>describeEvent(null),/invalide/);
  assert.throws(()=>describeEvent({type:'exact',body:'Saturn',natal:'Sun',aspect:'Carré inventé'}),/inconnue/);
  assert.throws(()=>describeEvent({type:'moon',name:'Lune verte'}),/inconnue/);
});

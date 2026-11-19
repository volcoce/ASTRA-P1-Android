import test from 'node:test';
import assert from 'node:assert/strict';
import {searchCities,normalizePlace} from '../astro/places.mjs';
import {localToUtc} from '../astro/core.mjs';

const Paris={id:2988507,name:'Paris',admin1:'Île-de-France',country:'France',country_code:'FR',latitude:48.8534,longitude:2.3488,timezone:'Europe/Paris'};
test('geocoding converts a candidate to coordinates and IANA timezone',()=>{
  const p=normalizePlace(Paris);assert.equal(p.timezone,'Europe/Paris');
  assert.equal(p.latitude,48.8534);assert.match(p.label,/France/);
});
test('city searches transmit only city query to provider, not natal data',async()=>{
  let called;
  const f=async(url,init)=>{called={url,init};return {ok:true,json:async()=>({results:[Paris]})}};
  const locations=await searchCities('Paris',{fetchImpl:f});
  assert.equal(locations.length,1);assert.match(called.url,/name=Paris/);
  assert.equal(new URL(called.url).hostname,'geocoding-api.open-meteo.com');
  assert.ok(!called.url.includes('2004')&&!called.url.includes('birth')&&!called.url.includes('latitude'));
  assert.equal(called.init.credentials,'omit');
});
test('no result; reject invalid zone and coordinate; reject very short search',async()=>{
  const f=async()=>({ok:true,json:async()=>({results:[]})});
  assert.deepEqual(await searchCities('Roma',{fetchImpl:f}),[]);
  assert.throws(()=>normalizePlace({...Paris,timezone:'XXX/YYY'}),/Fuseau/);
  assert.throws(()=>normalizePlace({...Paris,latitude:92}),/Coordonnées/);
  await assert.rejects(searchCities('Pa',{fetchImpl:f}),/3 caractères/);
});
test('summer/winter resolved from historical IANA rules without DST toggle',()=>{
  assert.equal(localToUtc('2026-07-15','09:00',Paris.timezone).toISOString(),'2026-07-15T07:00:00.000Z');
  assert.equal(localToUtc('2026-01-15','09:00',Paris.timezone).toISOString(),'2026-01-15T08:00:00.000Z');
  assert.equal(localToUtc('1942-07-15','09:00',Paris.timezone).toISOString(),'1942-07-15T07:00:00.000Z');
});
test('DST impossible time is rejected and overlap cannot be silently inferred',()=>{
  assert.throws(()=>localToUtc('2026-03-29','02:30','Europe/Paris'),/inexistante/);
  assert.throws(()=>localToUtc('2026-10-25','02:30','Europe/Paris'),/ambiguë/);
  assert.notEqual(localToUtc('2026-10-25','02:30','Europe/Paris',0).toISOString(),localToUtc('2026-10-25','02:30','Europe/Paris',1).toISOString());
});
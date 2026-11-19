import test from 'node:test';
import assert from 'node:assert/strict';
import {tropicalHouses,houseOf,natalAspects} from '../astro/natal.mjs';
const angularError=(a,b)=>Math.abs(((a-b+540)%360)-180);
const fixtures=[
  // Reference tropical Placidus cusps from Swiss Ephemeris 2.10, rounded.
  {date:'2006-08-22T07:23:00Z',lat:43.6045,lon:1.444,gast:5.4144312391291,
    cusps:[174.3394,199.3089,229.2715,263.2604,297.5949,328.3247,354.3394,19.3089,49.2715,83.2604,117.5949,148.3247]},
  {date:'1994-05-12T16:40:00Z',lat:48.85,lon:2.35,gast:8.014798919353073,
    cusps:[203.6669,230.56,263.34,300.3757,334.53,2.11,23.6669,50.56,83.34,120.3757,154.53,182.11]},
  {date:'2026-01-01T12:00:00Z',lat:40.7,lon:-74,gast:18.743671574307402,
    cusps:[274.9215,314.95,356.46,29.2082,53.88,74.53,94.9215,134.95,176.46,209.2082,233.88,254.53]},
  {date:'2000-06-01T00:00:00Z',lat:-35,lon:149,gast:16.65213287099461,
    cusps:[110.8032,151.6,190.62,221.2106,245.44,267.26,290.8032,331.6,10.62,41.2106,65.44,87.26]}
];
for(const f of fixtures)test('Placidus tropical: '+f.date+' / '+f.lat,()=>{
  const h=tropicalHouses(new Date(f.date),f.lat,f.lon,f.gast);
  assert.equal(h.system,'Placidus');assert.equal(h.cusps.length,12);
  f.cusps.forEach((expected,i)=>assert.ok(angularError(h.cusps[i],expected)<0.05,`cusp ${i+1}: ${h.cusps[i]} ≠ ${expected}`));
  for(let i=0;i<12;i++)assert.equal(houseOf(h.cusps[i],h.cusps),i+1);
});
test('High latitude does not pretend Placidus is defined',()=>{
  const h=tropicalHouses(new Date('2026-01-01T12:00:00Z'),78,15,18.7436715743);
  assert.equal(h.system,'Maisons égales');assert.equal(h.polarFallback,true);
  assert.equal(houseOf(h.ascendant,h.cusps),1);
});
test('Natal aspects are computed from actual individual planetary longitudes',()=>{
  const p={Sun:10,Moon:70,Venus:100,Mars:311,Mercury:17};
  const aspects=natalAspects(p,5);
  assert.ok(aspects.some(a=>a.a==='Sun'&&a.b==='Moon'&&a.aspect==='Sextile'&&a.orb===0));
  assert.ok(aspects.some(a=>a.a==='Sun'&&a.b==='Venus'&&a.aspect==='Carré'&&a.orb===0));
  assert.ok(!aspects.some(a=>a.a==='Sun'&&a.b==='Mercury'));
});

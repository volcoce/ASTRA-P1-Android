import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatSignExact,formatOrbExact,filterNatalAspects,
  describeNatalPlanet,describeNatalHouse,describeNatalAspect
} from '../astro/natal-learning.mjs';

test('zodiac DMS formatting handles boundaries, wrap and rounding',()=>{
  assert.equal(formatSignExact(0),'00°00′00″ Bélier');
  assert.equal(formatSignExact(30),'00°00′00″ Taureau');
  assert.equal(formatSignExact(29.999999),'00°00′00″ Taureau');
  assert.equal(formatSignExact(359.999999),'00°00′00″ Bélier');
  assert.equal(formatSignExact(-1),'29°00′00″ Poissons');
  assert.equal(formatSignExact(23+7/60+42/3600),'23°07′42″ Bélier');
  assert.equal(formatOrbExact(1+5/60+23/3600),'1°05′23″');
  assert.throws(()=>formatSignExact(NaN));
  assert.throws(()=>formatOrbExact(-1));
});

test('aspect filters preserve input and reject unsupported options',()=>{
  const list=[{aspect:'Carré',a:'Sun',b:'Mars',orb:1},{aspect:'Trigone',a:'Venus',b:'Mars',orb:2}];
  assert.equal(filterNatalAspects(list,'all').length,2);
  assert.deepEqual(filterNatalAspects(list,'Carré'),[list[0]]);
  assert.deepEqual(filterNatalAspects(list,'Sextile'),[]);
  assert.throws(()=>filterNatalAspects(list,'illusion'));
  assert.equal(list.length,2);
});

test('planet, house and aspect cards keep measurements distinct from symbols',()=>{
  const planet=describeNatalPlanet('Sun',43.5,8,false);
  assert.match(planet.astronomy,/13°30′00″ Taureau/);
  assert.match(planet.astronomy,/maison 8/);
  assert.match(planet.convention,/astrologique/);
  assert.ok(planet.question.length>10);
  const approximate=describeNatalPlanet('Moon',43.5,null,true);
  assert.match(approximate.astronomy,/indicative/);
  assert.doesNotMatch(approximate.astronomy,/maison 8/);
  const house=describeNatalHouse(1,161.25,['Sun']);
  assert.match(house.astronomy,/11°15′00″ Vierge/);
  const aspect=describeNatalAspect({a:'Sun',b:'Mars',aspect:'Carré',orb:1.5});
  assert.match(aspect.astronomy,/1°30′00″/);
  assert.ok(aspect.convention.length>20);
  assert.throws(()=>describeNatalHouse(13,20));
});

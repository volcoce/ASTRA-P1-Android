import test from 'node:test';import assert from 'node:assert/strict';
import {angularDistance,mod,signed,localToUtc,validateProfile,lahiriApprox,zodiacLongitude} from '../astro/core.mjs';
test('wrap and retrograde signed values',()=>{assert.equal(mod(-1),359);assert.equal(signed(359),-1);assert.equal(angularDistance(359,1),2);});
test('timezone summer vs winter',()=>{assert.equal(localToUtc('2026-07-01','12:00','Europe/Paris').toISOString(),'2026-07-01T10:00:00.000Z');assert.equal(localToUtc('2026-01-01','12:00','Europe/Paris').toISOString(),'2026-01-01T11:00:00.000Z');});
test('DST gap throws, fold requires selection',()=>{assert.throws(()=>localToUtc('2026-03-29','02:30','Europe/Paris'),/inexistante/);assert.throws(()=>localToUtc('2026-10-25','02:30','Europe/Paris'),/ambiguë/);assert.equal(localToUtc('2026-10-25','02:30','Europe/Paris',0).toISOString(),'2026-10-25T00:30:00.000Z');assert.equal(localToUtc('2026-10-25','02:30','Europe/Paris',1).toISOString(),'2026-10-25T01:30:00.000Z');});
test('Lahiri interpolation near Swiss Ephemeris benchmarks',()=>{const known=[['1900-01-01T12:00:00Z',22.460549706],['2000-01-01T12:00:00Z',23.857092354],['2050-01-01T12:00:00Z',24.555632229]];for(const [date,value] of known)assert.ok(Math.abs(lahiriApprox(new Date(date))-value)<0.0005);});
test('tropical and sidereal differ',()=>{const d=new Date('2026-01-01T12:00:00Z');assert.ok(Math.abs(zodiacLongitude(45,d,'sidereal')-45)>24);});
test('profile validation rejects incomplete birth, no hardcoded profile',()=>{assert.throws(()=>validateProfile({}),/Date/);});

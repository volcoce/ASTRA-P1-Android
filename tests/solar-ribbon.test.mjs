import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../app/src/main/assets/app.js',import.meta.url),'utf8');
const runtime=readFileSync(new URL('../astro/runtime.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('../app/src/main/assets/solar-ribbon.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../app/src/main/assets/index.html',import.meta.url),'utf8');
const smoke=readFileSync(new URL('./ui-smoke.py',import.meta.url),'utf8');

function solarModule(ctx){
  const start=app.indexOf('  const solarSignIndex=');
  const stop=app.indexOf('  function eventTitle(',start);
  assert.ok(start>0&&stop>start);
  const functions=app.slice(start,stop);
  return new Function('ctx','with(ctx){'+functions+
    ';return {solarSignIndex,solarRibbon,solarDayBand};}')(ctx);
}
const zodiacNames=['Bélier','Taureau','Gémeaux','Cancer','Lion','Vierge',
  'Balance','Scorpion','Sagittaire','Capricorne','Verseau','Poissons'];
const zodiacSymbols=['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const days={};
for(let d=1;d<=30;d++){
  const key='2026-11-'+String(d).padStart(2,'0');
  days[key]={sunLongitudeAtNoon:d<=21?235:250};
}
const context={
  result:{days},state:{profile:{timezone:'Europe/Paris'},mode:'tropical'},
  selected:'2026-11-21',detectedZone:'Europe/Paris',zodiacNames,zodiacSymbols,
  safe:s=>String(s),pad:n=>String(n).padStart(2,'0')
};

test('Solar band: sign from calculated longitude, independent of natal profile',()=>{
  const {solarSignIndex}=solarModule(context);
  assert.equal(solarSignIndex(359.999),11);
  assert.equal(solarSignIndex(0),0);
  assert.equal(solarSignIndex(235),7);
  assert.equal(solarSignIndex(250),8);
  assert.equal(solarSignIndex(-1),11);
  assert.equal(solarSignIndex(null),null);
});

test('Solar band: calendar has two proportional segments with an exact selected-day pin',()=>{
  const {solarRibbon}=solarModule(context);
  const ribbon=solarRibbon(2026,10,30);
  assert.equal((ribbon.match(/class="astra-solar-track-piece /g)||[]).length,2);
  assert.match(ribbon,/Scorpion/);
  assert.match(ribbon,/Sagittaire/);
  assert.match(ribbon,/flex-grow:21/);
  assert.match(ribbon,/flex-grow:9/);
  assert.match(ribbon,/astra-solar-track-pin/);
  assert.match(ribbon,/Date sélectionnée · Soleil en Scorpion/);
  assert.match(ribbon,/À midi · Europe\/Paris · tropical/);
  assert.match(ribbon,/Le signe peut changer dans la journée/);
});

test('Solar band: selected date and zodiac convention are reflected in the ribbon',()=>{
  context.selected='2026-11-22';
  context.state.mode='sidereal';
  try{
    const ribbon=solarModule(context).solarRibbon(2026,10,30);
    assert.match(ribbon,/Date sélectionnée · Soleil en Sagittaire/);
    assert.match(ribbon,/sidéral/);
  }finally{context.selected='2026-11-21';context.state.mode='tropical';}
});

test('Solar band: daily banner conveys sign and degree without a natal wheel',()=>{
  const {solarDayBand}=solarModule(context);
  const html=solarDayBand(250);
  assert.match(html,/solar-sign-8/);
  assert.match(html,/Soleil en Sagittaire/);
  assert.match(html,/10°/);
  assert.match(solarDayBand(null),/Position solaire indisponible/);
});

test('Solar band: sources, accessible labels and styles remain in sync',()=>{
  assert.match(runtime,/sunLongitudeAtNoon:Number\.isFinite\(sunLongitudeAtNoon\)/);
  assert.match(app,/solarRibbon\(year,m,count\)/);
  assert.match(app,/solarDayBand\(sky\?\.sunLongitude\)/);
  assert.match(html,/href="solar-ribbon.css"/);
  assert.ok(smoke.includes("ROOT/'solar-ribbon.css'"));
  assert.match(css,/\.astra-solar-track-piece\{/);
  assert.match(css,/\.calendar \.day \.sun-aspect-line\{/);
  assert.match(app,/Aspect solaire exact/);
});

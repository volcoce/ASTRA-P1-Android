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
  assert.match(ribbon,/21 j · 70 %/);
  assert.match(ribbon,/9 j · 30 %/);
  assert.match(ribbon,/Signe le plus présent : Scorpion/);
  assert.match(ribbon,/21 j sur 30 \(70 %\)/);
  assert.match(ribbon,/Jour sélectionné : 21 novembre 2026 · Soleil en Scorpion à midi/);
  assert.match(ribbon,/À midi · Europe\/Paris · tropical/);
  assert.match(ribbon,/un changement de signe peut survenir dans la journée/);
});

test('Solar band: selected date and zodiac convention are reflected in the ribbon',()=>{
  context.selected='2026-11-22';
  context.state.mode='sidereal';
  try{
    const ribbon=solarModule(context).solarRibbon(2026,10,30);
    assert.match(ribbon,/Jour sélectionné : 22 novembre 2026 · Soleil en Sagittaire à midi/);
    assert.match(ribbon,/sidéral/);
  }finally{context.selected='2026-11-21';context.state.mode='tropical';}
});

test('Solar band: handles tied signs and incomplete month positions without inventing data',()=>{
  const previousDays=context.result.days,previousSelected=context.selected;
  const incomplete={};
  for(let d=1;d<=30;d++){
    const key='2026-11-'+String(d).padStart(2,'0');
    incomplete[key]={sunLongitudeAtNoon:d<=12?235:d<=24?250:null};
  }
  context.result={days:incomplete};
  context.selected='2026-11-30';
  try{
    const ribbon=solarModule(context).solarRibbon(2026,10,30);
    assert.match(ribbon,/Signes à égalité : Scorpion et Sagittaire/);
    assert.match(ribbon,/12 j sur 30 \(40 %\)/);
    assert.match(ribbon,/données manquantes certains jours/);
    assert.match(ribbon,/Jour sélectionné : 30 novembre 2026 · signe inconnu/);
  }finally{context.result={days:previousDays};context.selected=previousSelected;}
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
  assert.match(css,/\.astra-solar-track-share\{/);
  assert.match(app,/Proportion de jours par signe solaire/);
  assert.match(css,/\.calendar \.day \.sun-aspect-line\{/);
  assert.match(app,/Aspect solaire exact/);
});

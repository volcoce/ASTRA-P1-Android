import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../app/src/main/assets/app.js',import.meta.url),'utf8');
const wheelCss=readFileSync(new URL('../app/src/main/assets/wheel-ui.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../app/src/main/assets/index.html',import.meta.url),'utf8');
const smoke=readFileSync(new URL('./ui-smoke.py',import.meta.url),'utf8');

const chart={
  positions:{Sun:7,Moon:23,Mercury:32,Venus:55,Mars:91,Jupiter:123,
    Saturn:141,Uranus:175,Neptune:203,Pluto:270},
  houses:{ascendant:0,midheaven:90,cusps:Array.from({length:12},(_,i)=>i*30)},
  aspects:[
    {a:'Sun',b:'Moon',aspect:'Conjonction',orb:3},
    {a:'Sun',b:'Mars',aspect:'Carré',orb:1},
    {a:'Moon',b:'Jupiter',aspect:'Trigone',orb:2},
    {a:'Venus',b:'Mars',aspect:'Sextile',orb:6}
  ]
};
const sample={
  E:{
    layoutPlanetLabels:pos=>Object.fromEntries(Object.entries(pos)
      .map(([body,lng])=>[body,{labelLongitude:lng}])),
    filterNatalAspects:items=>items,
    houseOf:lng=>Math.floor(lng/30)+1,
    formatSign:lng=>String(lng)
  },
  state:{natalView:'essential',natalZodiac:'tropical',natalAspectFilter:'all'},
  natalSelection:null,
  zodiacSymbols:['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'],
  natalGlyphs:{Sun:'☉',Moon:'☾',Mercury:'☿',Venus:'♀',Mars:'♂',Jupiter:'♃',
    Saturn:'♄',Uranus:'♅',Neptune:'♆',Pluto:'♇'},
  aspectColors:{Conjonction:'#ad789f',Carré:'#c16e89',Trigone:'#6496c7',Sextile:'#599b98'},
  planets:{Sun:'Soleil',Moon:'Lune',Mercury:'Mercure',Venus:'Vénus',Mars:'Mars',
    Jupiter:'Jupiter',Saturn:'Saturne',Uranus:'Uranus',Neptune:'Neptune',Pluto:'Pluton'},
  safe:s=>String(s),
  polar:(lng,r,asc)=>{
    const a=(180-(lng-asc))*Math.PI/180;
    return [210+r*Math.cos(a),210+r*Math.sin(a)];
  }
};
function renderers(){
  const beginning=app.indexOf('  function wheelDegreeTicks(');
  const next=app.indexOf('  function natalDetail(',beginning);
  const dob=app.indexOf('  function doubleWheelSvg(');
  const dobEnd=app.indexOf('  const transitWindowCache=',dob);
  assert.ok(beginning>0&&next>beginning&&dob>next&&dobEnd>dob);
  const code=app.slice(beginning,next)+app.slice(dob,dobEnd);
  return new Function('ctx','with(ctx){'+code+
    ';return {wheelSvg,wheelSvgDateOnly,doubleWheelSvg,wheelDegreeTicks};}')(sample);
}
const count=(html,pattern)=>(html.match(pattern)||[]).length;

test('Chart UI: natal wheel shows 12 zodiac sectors, 12 house sectors and 72 graduated degrees',()=>{
  const {wheelSvg}=renderers();
  const svg=wheelSvg(chart,true);
  assert.match(svg,/class="natal-wheel wheel-modern"/);
  assert.equal(count(svg,/class="wheel-zodiac-sector /g),12);
  assert.equal(count(svg,/class="wheel-house-sector /g),12);
  assert.equal(count(svg,/class="wheel-degree-tick /g),72);
  assert.equal(count(svg,/class="wheel-planet-disc"/g),10);
  assert.equal(count(svg,/data-true-longitude="/g),10);
  assert.equal(count(svg,/class="wheel-aspect-line/g),3);
  assert.match(svg,/class="angle-label"[^>]*>ASC<\/text>/);
});

test('Chart UI: selected natal planet highlights its actual zodiac sign',()=>{
  sample.natalSelection={kind:'planet',id:'Sun'};
  try{
    const svg=renderers().wheelSvg(chart,true);
    assert.equal(count(svg,/is-sign-active/g),1);
    assert.match(svg,/natal-planet-hit is-sun is-active/);
    assert.match(svg,/aria-pressed="true"/);
  }finally{sample.natalSelection=null;}
});

test('Chart UI: unknown birth time has no fictional houses or ascendant',()=>{
  const svg=renderers().wheelSvgDateOnly({...chart,houses:null},true);
  assert.match(svg,/wheel-modern wheel-date-only/);
  assert.equal(count(svg,/class="wheel-house-sector /g),0);
  assert.equal(count(svg,/class="wheel-degree-tick /g),72);
  assert.equal(count(svg,/class="wheel-planet-disc"/g),10);
  assert.equal(count(svg,/class="wheel-aspect-line/g),3);
  assert.ok(!svg.includes('class="angle-label"'));
});

test('Chart UI: double wheel preserves distinct natal and transit interactions',()=>{
  const snapshot={chart,positions:chart.positions,contacts:[]};
  const svg=renderers().doubleWheelSvg(snapshot);
  assert.match(svg,/natal-double-wheel wheel-modern/);
  assert.equal(count(svg,/class="wheel-zodiac-sector /g),12);
  assert.equal(count(svg,/class="wheel-degree-tick /g),72);
  assert.equal(count(svg,/class="wheel-planet-disc"/g),20);
  assert.equal(count(svg,/data-natal-body="/g),10);
  assert.equal(count(svg,/data-transit-body="/g),10);
});

test('Chart UI: five-degree tick markers stay inside SVG viewBoxes',()=>{
  const {wheelDegreeTicks}=renderers();
  for(const [center,radius,size] of [[210,206,420],[270,227,540]]){
    const svg=wheelDegreeTicks(center,radius,0);
    assert.equal(count(svg,/class="wheel-degree-tick /g),72);
    assert.equal(count(svg,/is-major/g),12);
    const nums=[...svg.matchAll(/(?:x1|y1|x2|y2)="([\d.]+)"/g)]
      .map(matches=>Number(matches[1]));
    assert.equal(nums.length,288);
    assert.ok(nums.every(n=>Number.isFinite(n)&&n>=0&&n<=size));
  }
});

test('Chart UI: all visual layers load in app and Chromium; exports embed wheel styling',()=>{
  assert.match(html,/href="wheel-ui.css"/);
  assert.ok(smoke.includes("ROOT/'wheel-ui.css'"));
  assert.match(wheelCss,/\.wheel-degree-tick\.is-major/);
  assert.match(wheelCss,/\.natal-transit-hit \.wheel-planet-disc/);
  assert.match(app,/\.wheel-modern \.wheel-zodiac-sector\.is-even/);
  assert.match(app,/\.wheel-modern\.natal-double-wheel \.natal-transit-hit/);
});

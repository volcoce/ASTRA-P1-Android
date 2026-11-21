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
  zodiacNames:['Bélier','Taureau','Gémeaux','Cancer','Lion','Vierge',
    'Balance','Scorpion','Sagittaire','Capricorne','Verseau','Poissons'],
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

test('Chart UI: selected planet highlights only its glyph, not the zodiac band',()=>{
  sample.natalSelection={kind:'planet',id:'Sun'};
  try{
    const svg=renderers().wheelSvg(chart,true);
    assert.equal(count(svg,/is-sign-active/g),0);
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

test('P4: Retro Pop element ring preserves zodiac geometry across all wheel modes',()=>{
  const skins=readFileSync(new URL('../app/src/main/assets/astra-p4-wheel.css',import.meta.url),'utf8');
  const expected=['fire','earth','air','water'];
  for(const [name,svg] of [
    ['natal',renderers().wheelSvg(chart,true)],
    ['date-only',renderers().wheelSvgDateOnly({...chart,houses:null},true)],
    ['double',renderers().doubleWheelSvg({chart,positions:chart.positions,contacts:[]})]
  ]){
    for(const element of expected){
      assert.equal(count(svg,new RegExp('zodiac-element-'+element,'g')),3,name+' '+element);
      assert.ok(skins.includes('.zodiac-element-'+element));
    }
    assert.equal(count(svg,/class="wheel-zodiac-sector /g),12,name);
  }
  assert.match(skins,/natal-transit-hit/);
  assert.ok(skins.includes(':root[data-astra-theme="dark"]'));
  assert.match(app,/\.wheel-modern \.wheel-zodiac-sector\.zodiac-element-fire/);
  assert.match(app,/#F6D5B3/);
  assert.ok(skins.includes('zodiac-element-earth{fill:#D9D6B8}'));
  assert.ok(skins.includes('zodiac-element-water{fill:#BDD7E3}'));
  assert.ok(app.includes('zodiac-element-earth{fill:#D9D6B8}'));
  assert.ok(app.includes('zodiac-element-water{fill:#BDD7E3}'));

});
test('Chart UI: all visual layers load in app and Chromium; exports embed wheel styling',()=>{
  assert.match(html,/href="wheel-ui.css"/);
  assert.ok(smoke.includes("ROOT/'wheel-ui.css'"));
  assert.match(wheelCss,/\.wheel-degree-tick\.is-major/);
  assert.match(wheelCss,/\.natal-transit-hit \.wheel-planet-disc/);
  assert.match(app,/\.wheel-modern \.wheel-zodiac-sector\.is-even/);
  assert.match(app,/\.wheel-modern\.natal-double-wheel \.natal-transit-hit/);
});


test('Chart UI: solar zodiac band is not drawn on any natal or transit wheel',()=>{
  const {wheelSvg,wheelSvgDateOnly,doubleWheelSvg}=renderers();
  const variants=[
    wheelSvg(chart,true),
    wheelSvgDateOnly({...chart,houses:null},true),
    doubleWheelSvg({chart,positions:{...chart.positions,Sun:227},contacts:[]})
  ];
  for(const svg of variants){
    assert.equal(count(svg,/is-sign-active/g),0);
    assert.ok(!svg.includes('data-highlighted-sign'));
    assert.ok(!svg.includes('Bande ambrée'));
  }
  assert.ok(!wheelCss.includes('is-sign-active'));
  assert.ok(!app.includes('wheelHighlightedSign'));
  assert.ok(!app.includes('.wheel-modern .wheel-zodiac-sector.is-sign-active'));
});

test('Chart UI: all wheel centers are clean of branding and covering discs',()=>{
  const {wheelSvg,wheelSvgDateOnly,doubleWheelSvg}=renderers();
  for(const svg of [
    wheelSvg(chart,true),
    wheelSvgDateOnly({...chart,houses:null},true),
    doubleWheelSvg({chart,positions:chart.positions,contacts:[]})
  ]){
    for(const legacy of ['wheel-core-disc','wheel-core-star','wheel-core-title','wheel-core-sub',
      '>ASTRA</text>','>TROPICAL</text>','>SIDÉRAL</text>','>NATAL / TRANSITS</text>'])
      assert.ok(!svg.includes(legacy),legacy);
  }
  assert.ok(!wheelCss.includes('.wheel-core-'));
  assert.ok(!app.includes('".wheel-modern .wheel-core-'));
});

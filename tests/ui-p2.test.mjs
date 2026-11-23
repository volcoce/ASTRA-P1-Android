import {CSS_SOURCES} from '../scripts/css-sources.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const app=readFileSync(new URL('../app/src/main/assets/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../app/src/main/assets/theme.css',import.meta.url),'utf8');
const tokens=readFileSync(new URL('../app/src/main/assets/astra-tokens.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../app/src/main/assets/index.html',import.meta.url),'utf8');
const bootstrap=readFileSync(new URL('../app/src/main/assets/theme-bootstrap.js',import.meta.url),'utf8');

function initialTheme(appearance,prefersDark){
  const root={dataset:{},style:{}};
  const meta={color:'',setAttribute(key,value){if(key==='content')this.color=value;}};
  const localStorage={getItem(){return JSON.stringify({appearance,profile:{date:'2000-01-01'}});}};
  const document={documentElement:root,querySelector(){return meta;}};
  const window={matchMedia(){return {matches:prefersDark};}};
  vm.runInNewContext(bootstrap,{document,window,localStorage});
  return {root,meta};
}

test('P2: saved light/dark/system themes apply before the main stylesheet',()=>{
  assert.match(html,/<script src="theme-bootstrap.js"><\/script>/);
  assert.match(html,/<link rel="stylesheet" href="astra\.bundle\.css">/);
  assert.ok(CSS_SOURCES.includes('theme.css'));
  assert.ok(html.indexOf('theme-bootstrap.js')<html.indexOf('astra.bundle.css'));
  assert.equal(initialTheme('dark',false).root.dataset.astraTheme,'dark');
  assert.equal(initialTheme('light',true).root.dataset.astraTheme,'light');
  assert.equal(initialTheme('system',true).root.dataset.astraTheme,'dark');
  assert.equal(initialTheme('system',false).root.dataset.astraTheme,'light');
  assert.equal(initialTheme('invalid',false).root.dataset.astraTheme,'light');
  assert.equal(initialTheme('dark',false).meta.color,'#101F2A');
});

test('P2: theme preference is validated, saved and re-applied after import',()=>{
  assert.match(app,/appearance:'system'/);
  assert.match(app,/\['system','light','dark'\]\.includes\(raw\.appearance\)/);
  assert.match(app,/state\.appearance=a\.appearance;persist\(\);applyAppearance\(\);render\(\)/);
  assert.match(app,/state=cleanState\(backup\);applyAppearance\(\)/);
  assert.match(app,/colorSchemeQuery\?\.addEventListener\?\.\('change'/);
  assert.match(tokens,/:root\[data-astra-theme="dark"\]\{/);
  assert.match(css,/\.astra-appearance-options button\[aria-pressed="true"\]/);
});

test('P2: local measurements are opt-in and retain only the last 60 timings',()=>{
  const block=app.match(/  let diagnosticsEnabled=false;([\s\S]*?)  let activeTab = 'today';/);
  assert.ok(block,'performance measurement block');
  const init=new Function('window',block[0].replace("  let activeTab = 'today';",'')+
    '\nreturn {enable:()=>{diagnosticsEnabled=true;},recordPerformance,performanceReport};');
  const perf=init({performance:{now:()=>5}});
  perf.recordPerformance('Calcul natal',100);
  assert.deepEqual(perf.performanceReport(),[]);
  perf.enable();
  perf.recordPerformance('Calcul natal',Number.NaN);
  perf.recordPerformance('Calcul natal',-1);
  for(let n=0;n<65;n++)perf.recordPerformance('Calcul natal',n);
  const [record]=perf.performanceReport();
  assert.equal(record.label,'Calcul natal');
  assert.equal(record.count,60);
  assert.equal(record.mean,34.5);
  assert.equal(record.p95,61);
  assert.equal(record.max,64);
});

test('P2: diagnostics cover cold/cache monthly work, natal calculation and rendering',()=>{
  assert.match(app,/recordPerformance\(cached\?'Mois · cache':'Mois · calcul'/);
  assert.match(app,/recordPerformance\(natalCached\?'Natal · cache':'Natal · calcul'/);
  assert.match(app,/recordPerformance\('Rendu JS · '\+activeTab/);
  assert.match(app,/recordPerformance\('Interaction · prochaine frame'/);
  assert.match(app,/diagnosticsEnabled=!diagnosticsEnabled/);
  assert.match(app,/performanceSamples\.clear\(\)/);
});

test('P2: diagnostic export contains timing-only report fields',()=>{
  assert.match(app,/format:'astra-performance-v1',units:'ms',sampleLimit:60,metrics:performanceReport\(\)/);
  assert.match(app,/link\.download='ASTRA-performances.json'/);
  assert.match(app,/conservées uniquement pendant cette session/);
  assert.match(app,/Aucune donnée personnelle transmise/);
});

test('P2: dark palette has accessible baseline text contrast',()=>{
  const luminance=hex=>{
    const rgb=[1,3,5].map(i=>{
      const v=parseInt(hex.slice(i,i+2),16)/255;
      return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4;
    });
    return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
  };
  const ratio=(a,b)=>{
    const x=luminance(a),y=luminance(b);
    return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
  };
  for(const [textColor,surface] of [
    ['#e5eef5','#192b3b'],['#b9cbd8','#192b3b'],
    ['#ffffff','#215573'],['#ffffff','#315c75'],
    ['#b5c9d8','#142637']
  ])assert.ok(ratio(textColor,surface)>=4.5,textColor+' on '+surface);
  assert.match(css,/\.natal-wheel-viewport\{/);
  assert.match(css,/background:#f7f9fb/);
});

test('P2: user-facing theme controls and diagnostic results are keyboard-accessible',()=>{
  assert.match(app,/role="group" aria-label="Thème visuel"/);
  assert.match(app,/aria-pressed="\'\+\(mode===id\)/);
  assert.match(app,/role="region" tabindex="0" aria-label="Mesures de performance"/);
  assert.match(css,/\.astra-performance-scroll:focus-visible/);
});

test('P2: natal chart calculation is memoized without changing its inputs',()=>{
  const from=app.indexOf('    let chart=null;\n    const natalStart=');
  const to=app.indexOf('    const foldPicker=',from);
  assert.ok(from>0&&to>from,'profile natal calculation section');
  const section=app.slice(from,to);
  const compute=new Function('state','E','natalCache','diagnosticsEnabled','perfClock','recordPerformance',
    section+'\nreturn chart;');
  const cache=new Map();
  const state={profile:{date:'2000-01-01',time:'12:00'},natalZodiac:'tropical',houseSystem:'placidus'};
  let count=0;
  const E={natalChart(){count++;return {sample:count};}};
  const args=[state,E,cache,false,()=>0,()=>{}];
  const first=compute(...args);
  assert.equal(count,1);
  assert.equal(compute(...args),first);
  assert.equal(count,1);
  state.houseSystem='equal';
  assert.equal(compute(...args).sample,2);
  assert.equal(count,2);
  assert.match(app,/natalCache\.size>4/);
  assert.match(app,/natalCache\.clear\(\)/);
  assert.match(app,/state\.profile=profile;state\.orb='auto';cache\.clear\(\);natalCache\.clear\(\)/);
});

test('P2: initial startup no longer renders twice before calculating',()=>{
  assert.match(app,/else\{\s*refresh\(\);\s*writeBrowserRoute\('replace'\);\s*\}/);
});

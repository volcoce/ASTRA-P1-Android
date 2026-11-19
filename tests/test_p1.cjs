const fs=require('fs');const path=require('path');const vm=require('vm');const assert=require('assert');
const assets=path.resolve(__dirname,'../app/src/main/assets');
const sandbox={window:{}};
for(const name of ['data.js','p1-data.js'])vm.runInNewContext(fs.readFileSync(path.join(assets,name),'utf8'),sandbox,{timeout:15000});
const base=sandbox.window.ASTRA_FORECASTS,p1=sandbox.window.ASTRA_P1;
assert.strictEqual(p1.meta.orb,2);
assert.strictEqual(p1.meta.start,'2026-01-01');
assert.strictEqual(p1.meta.end_exclusive,'2029-01-01');
assert.strictEqual(p1.sky.filter(e=>e.kind==='moon').length,149);
assert.strictEqual(p1.sky.filter(e=>e.kind==='station').length,52);
const o={tropical:0,sidereal:0};
for (const mode of ['tropical','sidereal']) {
  const windows=p1.windows[mode];
  assert.ok(windows.length>=4000);
  for (const w of windows){
    assert.ok(w.s<w.e);
    for(const pt of w.p){
      assert.ok(pt[0]>=0 && pt[0]<1096*86400);
      o[mode]++;
    }
  }
  assert.ok(windows.some(w=>w.gn>=2),'Repeating retro loops absent');
  const d=base[mode]['2026-11'].days.find(x=>x.date==='2026-11-24');
  assert.ok(d.active.every(x=>['exact','stationnaire','appliquant','séparant'].includes(x.phase)));
}
assert.strictEqual(o.tropical,4208);
assert.strictEqual(o.sidereal,4205);
const full=p1.sky.find(e=>e.kind==='moon'&&e.label==='Pleine Lune'&&e.at.startsWith('2026-11-24'));
const newmoon=p1.sky.find(e=>e.kind==='moon'&&e.label==='Nouvelle Lune'&&e.at.startsWith('2026-11-09'));
const deltaMin=(a,b)=>Math.abs((new Date(a)-new Date(b))/60000);
assert.ok(deltaMin(full.at,'2026-11-24T14:53:00Z')<2,full.at);
assert.ok(deltaMin(newmoon.at,'2026-11-09T07:02:00Z')<2,newmoon.at);
const html=fs.readFileSync(path.join(assets,'index.html'),'utf8');
assert.ok(html.indexOf('p1-data.js')<html.indexOf('app.js')&&html.includes('p1-data.js'));
console.log(`OK — ${p1.windows.tropical.length+p1.windows.sidereal.length} fenêtres, ${o.tropical+o.sidereal} passages, 149 lunaisons, 52 stations, 2 zodiaques`);

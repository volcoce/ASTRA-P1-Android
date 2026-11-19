// Additional independent consistency audit, no Android SDK required.
const fs=require('fs'), vm=require('vm'), path=require('path'), assert=require('node:assert/strict');
const root=path.join(__dirname,'../app/src/main/assets');
const sandbox={window:{}};
for (const name of ['data.js','p1-data.js'])vm.runInNewContext(fs.readFileSync(path.join(root,name),'utf8'),sandbox,{timeout:30000});
const {ASTRA_FORECASTS:f,ASTRA_P1:p}=sandbox.window;
const start=Date.parse('2026-01-01T00:00:00Z');
const end=Date.parse('2029-01-01T00:00:00Z');
const failures=[]; let totalExact=0, totalPasses=0, activeErrors=0;
function fail(message){ failures.push(message); }
for(const mode of ['tropical','sidereal']){
 const ws=p.windows[mode];
 const points=new Map();
 for (const [id,w] of ws.entries()){
  const s=Date.parse(w.s),e=Date.parse(w.e);
  if (!(Number.isFinite(s)&&Number.isFinite(e)&&s<e&&s>=start&&e<=end)) fail(`${mode} window ${id}: bad dates`);
  const k=`${w.t}|${w.n}|${w.a}`;
  if(!points.has(k)) points.set(k,[]);
  for(const [secs] of w.p){
   const t=start+secs*1000;
   totalPasses++;
   if (t<s-1100||t>e+1100)fail(`${mode} window ${id}: contact beyond start/end by > 1,100 ms`);
   points.get(k).push(t);
  }
 }
 for(const [month, data] of Object.entries(f[mode])){
  for(const day of data.days){
   if(day.date.slice(0,7)!==month)fail(`${mode} day ${day.date} wrong month`);
   for(const event of day.events){
    totalExact++;
    const k=`${event.transiting}|${event.natal}|${event.aspect}`;
    const ts=Date.parse(event.time_utc);
    if(!Number.isFinite(ts))fail(`${mode} bad UTC ${day.date}`);
    const matches=(points.get(k)||[]).filter(v=>Math.abs(v-ts)<=1100);
    if(matches.length!==1)fail(`${mode} ${day.date} ${k} event matches ${matches.length} windows`);
    const local=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ts));
    // Date formatting varies across runtimes; compare using formatToParts.
    const pp=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(ts));
    const read=x=>pp.find(q=>q.type===x)?.value;
    const key=`${read('year')}-${read('month')}-${read('day')}`;
    if(day.date!==key)fail(`${mode} ${day.date} event timezone date=${key}`);
   }
   const ref=new Date(day.date+'T11:00:00Z');
   const zonePart=new Intl.DateTimeFormat('en-US',{timeZone:'Europe/Paris',timeZoneName:'shortOffset'}).formatToParts(ref).find(x=>x.type==='timeZoneName')?.value||'GMT+1';
   const offset=Number((zonePart.match(/GMT\+(\d+)/)||[])[1]||1);
   const t=Date.parse(day.date+'T12:00:00Z')-offset*3600000;
   for(const a of day.active){
    const k=`${a.transiting}|${a.natal}|${a.aspect}`;
    const match=ws.some(w=>w.t===a.transiting&&w.n===a.natal&&w.a===a.aspect&&Date.parse(w.s)<=t&&Date.parse(w.e)>=t);
    if(!match)activeErrors++;
   }
  }
 }
}
if(totalExact!==totalPasses)fail(`exact ${totalExact} vs passes ${totalPasses}`);
let prev=0;const phases=['Nouvelle Lune','Premier quartier','Pleine Lune','Dernier quartier'];
let stationBodies=new Map();let moonCount=0,stationCount=0;
for(const s of p.sky){
 const t=Date.parse(s.at);
 if(!(t>prev&&t>=start&&t<end))fail(`Sky not chronologically sorted or out-of-range ${s.at}`);
 prev=t;
 if(s.kind==='moon'){
  moonCount++;
  if(!phases.includes(s.label))fail(`Moon phase ${s.label}`);
 } else if(s.kind==='station'){
  stationCount++;
  if(!['retrograde','direct'].includes(s.direction))fail(`Direction ${s.direction}`);
  if(stationBodies.get(s.body)===s.direction)fail(`Consecutive same station direction ${s.body} ${s.at}`);
  stationBodies.set(s.body,s.direction);
 }
}
if(activeErrors) fail(`${activeErrors} active noon transits lack a corresponding P1 window (Europe/Paris noon)`);
if(failures.length){console.error('FAIL',failures.length,failures.slice(0,30));process.exitCode=1}
else console.log(`OK — integrity ${totalExact} exact events ↔ ${totalPasses} window contacts, ${moonCount} moon events, ${stationCount} stations, active-window coverage`);

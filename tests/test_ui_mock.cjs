// Smoke-test UI routing, HTML rendering and filters without browser access.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'../app/src/main/assets');
const appElement={innerHTML:'',callbacks:{},addEventListener(k,v){this.callbacks[k]=v}};
const tabs=Object.fromEntries(['today','calendar','journal','profile'].map(k=>[k,{dataset:{tab:k},classList:{toggle(){}},setAttribute(){},addEventListener(){}}]));
const home={callbacks:{},addEventListener(k,v){this.callbacks[k]=v}};
const toast={textContent:'',hidden:true};
const session=new Map();
const dom={
 querySelector(s){return s==='#app'?appElement:s==='#homeButton'?home:s==='#toast'?toast:null},
 querySelectorAll(s){return s==='[data-tab]'?Object.values(tabs):[]}
};
const context={window:{scrollTo(){}},document:dom,navigator:{},location:{protocol:'https:',hostname:'appassets.androidplatform.net'},
 localStorage:{getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)},
 console,Date,Intl,JSON,Set,Map,String,Number,Object,Array,Math,Boolean,Error,Blob,setTimeout,clearTimeout};
vm.createContext(context);
for(const f of ['data.js','p1-data.js','app.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),context,{filename:f,timeout:30000});
const html=()=>appElement.innerHTML;
assert.ok(html().includes('Moments exacts'));
assert.ok(html().includes('Périodes en cours'));
assert.ok(html().includes('eventFilter'));
assert.ok(html().includes('Filtrer les événements'));
appElement.callbacks.click({target:{closest:()=>({dataset:{nav:'calendar'}})}});
assert.ok(html().includes('Fenêtres d’activité'));
assert.ok(html().includes('day'));
appElement.callbacks.click({target:{closest:()=>({dataset:{date:'2026-11-24'}})}});
assert.ok(html().includes('Pleine Lune'));
assert.ok(html().includes('15:53'));
const firstId=Number((html().match(/data-window="(\d+)"/)||[])[1]);
assert.ok(Number.isInteger(firstId));
appElement.callbacks.click({target:{closest:()=>({dataset:{window:String(firstId)}})}});
assert.ok(html().includes('Entrée dans l’orbe de 2°')); 
appElement.callbacks.change({target:{id:'eventFilter',value:'moon'}});
assert.ok(html().includes('Fenêtres d’activité'));
assert.ok(html().includes('Aucune période active pour ce filtre.'));
assert.ok(html().includes('value="moon" selected'));
appElement.callbacks.change({target:{id:'eventFilter',value:'slow'}});
assert.ok(html().includes('Périodes en cours')===false);
assert.ok(html().includes('Fenêtres d’activité'));
appElement.callbacks.click({target:{closest:()=>({dataset:{month:'1'}})}});
assert.ok(html().includes('Calendrier'));
console.log('OK — Rendu initial, navigation calendrier, filtres phases/lents, changement de mois');

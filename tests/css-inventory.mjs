import postcss from 'postcss';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {CSS_SOURCES} from '../scripts/css-sources.mjs';

const root=resolve('app/src/main/assets');
const bundle=readFileSync(resolve(root,'astra.bundle.css'),'utf8');
function inventory(css,file){
  const rules=[];
  postcss.parse(css,{from:file}).walkRules(r=>{
    const context=[];
    for(let p=r.parent;p&&p.type!=='root';p=p.parent)
      if(p.type==='atrule')context.unshift('@'+p.name+' '+p.params);
    const technical=context.some(x=>/^@(?:-\w+-)?keyframes\b/.test(x));
    rules.push({selector:r.selector,start:r.source.start.offset,end:r.source.end.offset,
      line:r.source.start.line,context,technical});
  });
  return rules;
}
const sources=CSS_SOURCES.map(file=>({file,rules:inventory(readFileSync(resolve(root,file),'utf8'),file)}));
// Normalize selector spelling for approximate attribution.
// This is candidate attribution, not exact source mapping: minification can merge rules.
const index=new Map();
for(const {file,rules} of sources)for(const r of rules){
  if(r.technical)continue;
  const key=r.selector.replace(/\s+/g,'').replace(/["']/g,'');
  const arr=index.get(key)||[];
  arr.push({file,line:r.line,selector:r.selector});index.set(key,arr);
}
const rules=inventory(bundle,'astra.bundle.css');
for(const r of rules){
  const key=r.selector.replace(/\s+/g,'').replace(/["']/g,'');
  r.source_candidates=index.get(key)||[];
  r.attribution=r.source_candidates.length===1?'unique-selector-candidate':r.source_candidates.length?'ambiguous-selector':'unmapped';
}
console.log(JSON.stringify({rules,sources:sources.map(s=>({file:s.file,source_rules:s.rules.length})),offset_unit:'UTF-16 code units; end exclusive'}));

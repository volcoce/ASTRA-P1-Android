import {build} from 'esbuild';
import {readFileSync, readdirSync} from 'node:fs';
import {resolve, dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {CSS_SOURCES} from './css-sources.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../app/src/main/assets');
const out=join(root,'astra.bundle.css');
const html=readFileSync(join(root,'index.html'),'utf8');
const existing=readdirSync(root).filter(n=>n.endsWith('.css')&&n!=='astra.bundle.css').sort();
const configured=[...CSS_SOURCES].sort();
if(JSON.stringify(existing)!==JSON.stringify(configured)){
  throw new Error('CSS source manifest is out of date: '+JSON.stringify({
    unlisted:existing.filter(n=>!configured.includes(n)),
    missing:configured.filter(n=>!existing.includes(n))
  }));
}
if(!html.includes('href="astra.bundle.css"')||/<link\s+rel="stylesheet"\s+href="(?!astra\.bundle\.css)[^"]+\.css"/.test(html)){
  throw new Error('The shipped HTML must load exactly one compiled CSS stylesheet');
}
const imports=CSS_SOURCES.map(name=>`@import "./${name}";`).join('\n');
const result=await build({
  stdin:{contents:imports,resolveDir:root,sourcefile:'astra.entry.css',loader:'css'},
  outfile:out,bundle:true,minify:true,target:['chrome110','safari16.4'],
  charset:'utf8',legalComments:'none',logLevel:'warning',write:true,
});
if(result.errors.length)throw new Error('CSS compilation failed');
const compiled=readFileSync(out,'utf8');
for(const rule of ['--astra-zodiac-water','.bottom-nav','.astra-solar-ribbon-backdrop','@layer']){
  if(!compiled.includes(rule))throw new Error('Compiled CSS lacks '+rule);
}
if(compiled.length<15000)throw new Error('Compiled CSS unexpectedly small: '+compiled.length);
console.log(`ASTRA CSS: ${CSS_SOURCES.length} sources → ${compiled.length} bytes → ${out}`);

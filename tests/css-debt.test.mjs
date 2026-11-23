import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import postcss from 'postcss';
import {CSS_SOURCES} from '../scripts/css-sources.mjs';
const read=name=>readFileSync(new URL('../app/src/main/assets/'+name,import.meta.url),'utf8');
const baseline=JSON.parse(readFileSync(new URL('./css-debt-baseline.json',import.meta.url),'utf8'));
function scan(source){
  const clean=source.replace(/\/\*[\s\S]*?\*\//g,'');
  const colors={};
  for(const m of clean.matchAll(/#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})\b|(?:rgba?|hsla?)\([^)]*\)/gi)){
    const value=m[0].toLowerCase().replace(/\s+/g,'');
    colors[value]=(colors[value]||0)+1;
  }
  return {important:(clean.match(/!\s*important\b/gi)||[]).length,colors};
}
test('P1: CSS debt cannot grow per source or raw color literal',()=>{
  for(const name of CSS_SOURCES){
    const css=read(name),actual=scan(css),limit=baseline[name]||{important:0,colors:{}};
    assert.ok(actual.important<=limit.important,name+' !important '+actual.important+' > '+limit.important);
    if(name!=='astra-tokens.css'){
      for(const [color,count] of Object.entries(actual.colors))
        assert.ok(count<=(limit.colors?.[color]||0),name+' new raw color '+color+' ('+count+')');
    }
    const ast=postcss.parse(css,{from:name});
    for(const node of ast.nodes){
      assert.ok(node.type==='comment'||(node.type==='atrule'&&['layer','charset'].includes(node.name)),name+' has unlayered top-level CSS: '+node.toString().slice(0,120));
    }
  }
});
test('P1: baseline remains aligned with the CSS manifest',()=>{
  assert.deepEqual(Object.keys(baseline).sort(),[...CSS_SOURCES].sort());
});

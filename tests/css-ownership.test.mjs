import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import postcss from 'postcss';
import {CSS_SOURCES} from '../scripts/css-sources.mjs';

const read=file=>readFileSync(new URL('../app/src/main/assets/'+file,import.meta.url),'utf8');
const disclosureClasses=[
 'astra-event-disclosure','calendar-help','calendar-options','natal-glossary',
 'natal-extras','natal-more-options','calculation-details','natal-preview-disclosure',
 'natal-matrix-disclosure','natal-explore-wheel','city-technical'
];
const gutterProperties=new Set(['padding','padding-left','padding-right',
 'padding-inline','padding-inline-start','padding-inline-end','padding-top',
 'padding-bottom','min-height']);
const owner='astra-components.css';

test('All 16 stylesheets parse and the global disclosure contract has one owner',()=>{
 assert.equal(CSS_SOURCES.length,16);
 const source=postcss.parse(read(owner),{from:owner});
 for(const [selector,property] of [
  ['.astra-disclosure','padding'],
  ['.astra-disclosure>summary','padding'],
  ['.astra-disclosure-body','padding']
 ]){
  const matches=[];
  source.walkRules(rule=>{
   if(rule.selector===selector)rule.walkDecls(property,d=>matches.push(d));
  });
  assert.equal(matches.length,1,selector+' must have exactly one '+property);
 }
 for(const file of CSS_SOURCES){
  const parsed=postcss.parse(read(file),{from:file});
  if(file===owner)continue;
  parsed.walkRules(rule=>{
   const selector=rule.selector;
   const known=disclosureClasses.some(name=>selector.includes('.'+name));
   const heading=known&&selector.includes('summary');
   const body=selector.includes('.astra-disclosure-body');
   const root=disclosureClasses.some(name=>{
    const parts=selector.split(',').map(s=>s.trim());
    return parts.includes('.'+name);
   });
   rule.walkDecls(decl=>{
    if((heading||body)&&gutterProperties.has(decl.prop)){
     assert.fail(file+' : '+selector+' overrides global disclosure '+decl.prop);
    }
    if(root&&decl.prop.startsWith('padding')){
     assert.fail(file+' : '+selector+' overrides global disclosure shell '+decl.prop);
    }
   });
  });
 }
});

test('Every interactive disclosure is assembled with shared component classes',()=>{
 const app=read('app.js');
 for(const type of disclosureClasses){
  assert.ok(app.includes(type+' astra-disclosure'),type+' is not componentized');
 }
 assert.equal((app.match(/astra-event-disclosure-body astra-disclosure-body/g)||[]).length,2);
 assert.match(app,/astra-disclosure-body astra-disclosure-actions/);
 assert.match(app,/calendar-help-body astra-disclosure-body/);
 const tokens=read('astra-tokens.css'),components=read(owner);
 for(const role of ['--astra-component-inset','--astra-disclosure-block-inset',
   '--astra-disclosure-body-top','--astra-disclosure-body-bottom']){
  assert.ok(tokens.includes(role+':'),role);
  assert.ok(components.includes('var('+role+')'),role);
 }
});

test('Shared AppShell, reading column, card surface and navigation have one owner',()=>{
 const expected=new Map([
  ['.main','astra-layout.css'],['.app-shell','astra-layout.css'],
  ['.bottom-nav','astra-layout.css'],['.card','astra-components.css']
 ]);
 for(const [selector,ownerFile] of expected){
  let found=0;
  for(const file of CSS_SOURCES){
   postcss.parse(read(file),{from:file}).walkRules(rule=>{
    if(rule.selector!==selector)return;
    assert.equal(file,ownerFile,selector+' was redeclared by '+file);
    found++;
   });
  }
  assert.equal(found,1,selector+' has '+found+' owners');
 }
});

test('Only the global component paints shared cards and card modifiers',()=>{
 const components=postcss.parse(read('astra-components.css'),{from:'astra-components.css'});
 const layout=postcss.parse(read('astra-layout.css'),{from:'astra-layout.css'});
 let ordinary=0,emphasis=0,reading=0;
 components.walkRules(rule=>{
  if(rule.selector==='.card')ordinary++;
  if(rule.selector==='.card.astra-card--emphasis')emphasis++;
 });
 assert.equal(ordinary,1);assert.equal(emphasis,1);
 layout.walkRules(rule=>{
  if(rule.selector!=='.card.astra-reading-card')return;
  reading++;
  rule.walkDecls(d=>{
   assert.ok(['width','min-width','box-sizing'].includes(d.prop),
     'Layout must not paint cards: '+d.prop);
  });
 });
 assert.equal(reading,1);
 for(const file of CSS_SOURCES.filter(f=>!['astra-components.css','astra-layout.css'].includes(f))){
  postcss.parse(read(file),{from:file}).walkRules(rule=>{
   if(!rule.selector.includes('.card.astra-reading-card'))return;
   rule.walkDecls(d=>{
    assert.doesNotMatch(d.prop,/^(?:padding|background|border|box-shadow)/,
     file+' paints shared card from '+rule.selector);
   });
  });
 }
});

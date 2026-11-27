import postcss from 'postcss';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {CSS_SOURCES} from '../scripts/css-sources.mjs';
const before='1f3790dc760322d7bf8b90e8b7822e5bf91a00bd';
const after='8191a4ba01ca6c9ff8897d4d273adfa626d43f62';
const dead=new Set((
'astra-calendar-day-summary astra-calendar-selected-head astra-calendar-selected-count astra-calendar-day-events astra-calendar-more astra-calendar-open-day '+
'natal-highlights natal-disclaimer natal-stage natal-stage-wheel natal-stage-side natal-settings-link natal-home-hint natal-home-selection natal-section-lead natal-summary-approx natal-glyph-separator natal-explore-wheel natal-overview-tabs natal-overview-panel natal-panel-lead natal-more-link natal-focus natal-focus-legend natal-focus-warning natal-focus-launch natal-focus-close natal-focus-header natal-focus-footer natal-focus-kicker natal-focus-moment natal-leader natal-explore-intro '+
'astra-today-insights astra-insight-track astra-insight-tile astra-tile-kicker astra-tile-arrow astra-count as-sun as-journal as-chart astra-lunar-timeline astra-lunar-track astra-lunar-milestone astra-lunar-symbol astra-day-moon-moments astra-day-moon-moment-list astra-day-moon-moment astra-day-moon-explanation moon-phase-legend-mini astra-hero-orbit moon-symbol date-head selected-heading pill-row info-grid full-button period-row period-trigger period-title period-meta period-line period-chevron period-detail period-dot event-more astra-more-events detail-tone eyebrow mini-cap section-title section-row astra-section-help astra-week-caption astra-week-strip astra-disclosure-actions astra-phase-variant-orbit '+
'wheel-core-title wheel-core-sub wheel-caption sign-swatch house-swatch '+
'lead metric empty cal-legend sr-only astra-month-navigation astra-month-kicker astra-month-calendar-link astra-month-events astra-month-event astra-month-event-text astra-month-event-day city-results city-choice astra-calendar-blank-day astra-calendar-interval-info astra-personal-create astra-privacy-settings astra-angle-help astra-angle-note astra-event-data-note').split(' '));
assert.equal(dead.size,104);
const anchor=':not(*).astra-specificity-anchor[data-astra-specificity-a][data-astra-specificity-b]';
const has=s=>[...s.matchAll(/\.([\w-]+)/g)].some(m=>dead.has(m[1]));
const split=s=>postcss.list.comma(s);
const normalize=s=>s.trim().replace(/\s+/g,' ');
function spec(s){
  let a=0,b=0,c=0;
  s=s.replace(/:not\(\*\)/g,'').replace(/\[[^\]]*\]/g,()=>{b++;return ''})
    .replace(/#[\w-]+/g,()=>{a++;return ''}).replace(/\.[\w-]+/g,()=>{b++;return ''})
    .replace(/::[\w-]+/g,()=>{c++;return ''}).replace(/:[\w-]+/g,()=>{b++;return ''});
  assert.ok(!/[():]/.test(s),'Unsupported specificity: '+s);
  c+=(s.match(/[\w-]+/g)||[]).length;
  assert.ok(!s.replace(/[\w-]+|[\s>+~*]/g,''),'Unsupported selector: '+s);
  return [a,b,c];
}
const cmp=(a,b)=>a[0]-b[0]||a[1]-b[1]||a[2]-b[2];
const max=xs=>xs.map(spec).sort(cmp).at(-1);
function expectedSelector(selector){
  const keep=[];
  for(let part of split(selector)){
    if(!has(part)){keep.push(normalize(part));continue;}
    let empty=false;
    part=part.replace(/:(is|where)\(([^()]*)\)/g,(whole,fn,args)=>{
      if(!has(args))return whole;
      const original=split(args),rest=original.filter(s=>!has(s));
      if(!rest.length){empty=true;return whole;}
      if(fn==='is'&&cmp(max(original),max(rest))){
        assert.ok(original.includes('.astra-insight-tile.as-sun .astra-tile-kicker') &&
          rest.includes('.astra-month-phase-copy strong'),'Unexpected specificity loss: '+whole);
        rest.push(anchor);
        assert.deepEqual(max(original),max(rest));
      }
      return ':'+fn+'('+rest.join(',')+')';
    });
    if(empty||has(part)){
      assert.ok(!/:(?:not|has|nth-child|nth-last-child)\([^)]*\.[\w-]+/.test(part),
        'Unsupported negative/relational selector: '+part);
      continue;
    }
    keep.push(normalize(part));
  }
  return keep.join(',');
}
function canonicalSelector(s){
  // Normalize comma whitespace only, not descendant combinators.
  return normalize(s).replace(/\s*,\s*/g,',');
}
function tree(css, baseline){
  const root=postcss.parse(css);
  function visit(node){
    if(node.type==='comment')return null;
    if(node.type==='decl')return ['decl',node.prop,node.value,Boolean(node.important)];
    if(node.type==='rule'){
      const s=baseline?expectedSelector(node.selector):node.selector;
      if(!s)return null;
      if(!baseline)assert.ok(!has(s),'Remaining obsolete class: '+s);
      return ['rule',canonicalSelector(s),node.nodes.map(visit).filter(Boolean)];
    }
    if(node.type==='atrule'){
      const children=node.nodes?.map(visit).filter(Boolean);
      if(node.nodes&&!children.length){
        assert.ok(baseline,'Empty final at-rule: '+node.name);
        return null;
      }
      return ['at',node.name,node.params,children??null];
    }
    if(node.type==='root')return node.nodes.map(visit).filter(Boolean);
    throw Error('Unsupported node '+node.type);
  }
  return visit(root);
}
let failures=0;
for(const file of CSS_SOURCES){
  const read=ref=>execFileSync('git',['show',ref+':app/src/main/assets/'+file],{encoding:'utf8'});
  try{assert.deepEqual(tree(read(before),true),tree(read(after),false));console.log('PASS',file);}
  catch(e){failures++;console.error('FAIL',file,e.message.slice(0,5000));}
}
if(failures)process.exitCode=1;
else console.log('All source AST cascade invariants passed.');

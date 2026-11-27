import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('P4 final matrix is mandatory and publishes diagnostics even on failure',()=>{
 const matrix=read('tests/ui-final-matrix.py'),ci=read('.github/workflows/android.yml');
 assert.match(matrix,/WIDTHS = \(\(320,730\),\(360,780\),\(393,844\),\(768,1024\),\(1280,800\)\)/);
 assert.match(matrix,/THEMES = \('light','dark'\)/);
 const rows=matrix.slice(matrix.indexOf('SCREENS = ('),matrix.indexOf('EXPECTED ='));
 assert.equal((rows.match(/^    \('/gm)||[]).length,11);
 assert.match(matrix,/set\(actual\)!=expected or len\(actual\)!=EXPECTED/);
 assert.match(matrix,/if report\['failures'\]:/);
 assert.match(ci,/run: python tests\/ui-final-matrix\.py/);
 assert.match(ci,/if: always\(\)[\s\S]*name: ASTRA-P4-final-validation/);
 assert.match(matrix,/axe\.run/);
 assert.match(matrix,/astra\.bundle\.css/);
});

test('P4: planet and zodiac tints retain AA contrast on every table surface',()=>{
 const tokens=read('app/src/main/assets/astra-tokens.css');
 const css=read('app/src/main/assets/astra-natal.css');
 const value=(s,n)=>{const m=s.match(new RegExp('--'+n+':(#(?:[0-9a-f]{6}))\\b','i'));assert.ok(m,n);return m[1]};
 const dark=tokens.slice(tokens.indexOf(':root[data-astra-theme="dark"]'));
 const rgb=h=>h.slice(1).match(/../g).map(x=>parseInt(x,16));
 const lum=a=>a.reduce((s,n,i)=>{const x=n/255;return s+[.2126,.7152,.0722][i]*(x<=.04045?x/12.92:((x+.055)/1.055)**2.4)},0);
 const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
 const mix=(a,b,p)=>a.map((n,i)=>Math.round(n*p+b[i]*(1-p)));
 const percent=name=>{const m=css.match(new RegExp('var\\(--'+name+'\\) (\\d+)%,var\\(--astra-ink\\)'));assert.ok(m,name);return +m[1]/100};
 for(const theme of [tokens,dark]){
   const ink=rgb(value(theme,'astra-ink'));
   const backgrounds=['astra-surface','astra-secondary-surface','astra-selected'].map(n=>rgb(value(theme,n)));
   const colors=['color-dandelion','color-cornflower','astra-danger'].map(n=>mix(rgb(value(n==='astra-danger'?theme:tokens,n)),ink,percent(n)));
   for(const palette of ['classic','vivid'])for(const element of ['fire','air','water','earth'])
     colors.push(mix(rgb(value(tokens,'astra-elements-'+palette+'-'+element)),ink,percent('sign-color')));
   for(const color of colors)for(const bg of backgrounds)assert.ok(ratio(color,bg)>=4.5,JSON.stringify({color,bg,contrast:ratio(color,bg)}));
 }
});
test('P4: labels use the semantic foreground of their actual surface',()=>{
 const style=read('app/src/main/assets/style.css'),atlas=read('app/src/main/assets/atlas-ui.css');
 const journal=read('app/src/main/assets/astra-p2-navigation.css'),theme=read('app/src/main/assets/theme.css');
 assert.match(journal,/\.mood span:last-child\{[^}]*color:inherit/);
 assert.doesNotMatch(theme,/\.mood span:last-child/);
 assert.match(style,/\.position-planet>span\{[^}]*color:inherit/);
 assert.match(style,/\.wheel-ring-legend\{[^}]*color:var\(--astra-muted\)/);
 assert.match(style,/\.unknown-time-toggle\{[^}]*color:var\(--astra-ink\)/);
 assert.match(style,/\.natal-compare-zone\{[^}]*color:var\(--astra-muted\)/);
 assert.doesNotMatch(atlas,/\.natal-compare-zone\{[^}]*color:/);
 assert.doesNotMatch(atlas,/\.unknown-time-toggle\{[^}]*color:/);
});

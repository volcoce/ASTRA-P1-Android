import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ASPECTS} from '../astro/core.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const app=read('app/src/main/assets/app.js');
test('Astrological glyphs preserve the canonical Unicode mapping and runtime aspect meanings',()=>{
 const extract=name=>new Function('return '+app.match(new RegExp('const '+name+'\\s*=\\s*([^;]+);'))[1])();
 assert.deepEqual(extract('natalGlyphs'),{Sun:'☉',Moon:'☾',Mercury:'☿',Venus:'♀',Mars:'♂',Jupiter:'♃',Saturn:'♄',Uranus:'♅',Neptune:'♆',Pluto:'♇'});
 assert.deepEqual(extract('zodiacSymbols'),Array.from({length:12},(_,i)=>String.fromCodePoint(0x2648+i)));
 assert.deepEqual(extract('aspects'),Object.fromEntries(ASPECTS.map(a=>[a.name,a.glyph])));
 assert.match(app,/const glyph=isAngle\?'↑':natalGlyphs\[key\]/);
});
test('Glyph typography has a single token and calendar help is a shared disclosure in Settings',()=>{
 const tokens=read('app/src/main/assets/astra-tokens.css');
 assert.match(tokens,/--astra-font-glyph:/);
 for(const name of ['astra-natal.css','astra-p4-wheel.css','wheel-ui.css','astra-components.css'])assert.match(read('app/src/main/assets/'+name),/var\(--astra-font-glyph\)/);
 const help=app.slice(app.indexOf('function settingsHelpPanel()'),app.indexOf('function renderGlobalSettings()'));
 assert.ok(help.indexOf('solarCalendarExplanation()')<help.indexOf('natal-glossary'));
 assert.equal((app.match(/solarCalendarExplanation\(\)/g)||[]).length,2);
 assert.match(app,/calendar-help astra-disclosure/);
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

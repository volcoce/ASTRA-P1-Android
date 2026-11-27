import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('P0 responsive matrix covers breakpoint edges and runs in CI',()=>{
 const matrix=read('tests/ui-responsive.py'),ci=read('.github/workflows/android.yml');
 const sizes=matrix.slice(matrix.indexOf('WIDTHS = ('),matrix.indexOf('THEMES ='));
 const widths=[...sizes.matchAll(/\((\d+),(\d+)\)/g)].map(m=>Number(m[1]));
 assert.equal(widths.length,29);
 assert.equal(new Set(widths).size,widths.length);
 for(const n of [320,359,360,361,393,399,400,401,479,480,481,599,600,601,768,798,799,800,801,1024,1099,1100,1101,1280,1440,1600,1920])assert.ok(widths.includes(n),String(n));
 const screens=matrix.slice(matrix.indexOf('SCREENS = ('),matrix.indexOf('EXPECTED ='));
 assert.equal((screens.match(/^    \('/gm)||[]).length,11);
 assert.match(matrix,/THEMES = \('light','dark'\)/);
 assert.match(matrix,/g\['overflow'\]==0 and g\['bodyOverflow'\]==0/);
 assert.match(matrix,/set\(actual\)!=expected or len\(actual\)!=EXPECTED/);
 assert.match(ci,/run: python tests\/ui-responsive\.py/);
 assert.match(ci,/if: always\(\)[\s\S]*name: ASTRA-P0-responsive-320-1920/);
});

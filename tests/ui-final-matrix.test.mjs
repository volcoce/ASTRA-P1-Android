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

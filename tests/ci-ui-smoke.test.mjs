import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const smoke=readFileSync(new URL('./ui-smoke.py',import.meta.url),'utf8');
const app=readFileSync(new URL('../app/src/main/assets/app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../app/src/main/assets/index.html',import.meta.url),'utf8');

test('CI: synthetic-browser smoke loads every active theme asset',()=>{
  for(const asset of ['style.css','atlas-ui.css','theme.css','wheel-ui.css','solar-ribbon.css','calendar-p0.css']){
    assert.match(html,new RegExp('href="'+asset.replace('.','\\.')+'"'));
    assert.ok(smoke.includes("ROOT/'"+asset+"'"),asset);
  }
  assert.match(html,/<script src="theme-bootstrap.js"><\/script>/);
  assert.ok(smoke.includes("ROOT/'theme-bootstrap.js'"));
  assert.ok(smoke.includes("html=html.replace('<script src=\"theme-bootstrap.js\"></script>','')"));
});

test('CI: native modal assertion matches the current dialog implementation',()=>{
  assert.ok(app.includes("'<dialog class=\"natal-focus\" id=\"natalChart\" aria-modal=\"true\""));
  assert.ok(smoke.includes("page.locator('dialog.natal-focus[open][aria-modal=\"true\"]')"));
});

test('CI: navigation smoke permits wrapping at large text sizes',()=>{
  assert.ok(smoke.includes("calendar_label['height']<=calendar_label['line']*2.2"));
});

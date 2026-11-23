import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const smoke=readFileSync(new URL('./ui-smoke.py',import.meta.url),'utf8');
const app=readFileSync(new URL('../app/src/main/assets/app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../app/src/main/assets/index.html',import.meta.url),'utf8');
import {CSS_SOURCES} from '../scripts/css-sources.mjs';

test('CI: the smoke test uses the same compiled CSS shipped to Android',()=>{
  for(const asset of ['style.css','atlas-ui.css','theme.css','wheel-ui.css','solar-ribbon.css','calendar-p0.css','personal-calendar.css'])
    assert.ok(CSS_SOURCES.includes(asset),asset);
  assert.match(html,/<link rel="stylesheet" href="astra.bundle.css">/);
  assert.ok(smoke.includes("ROOT/'astra.bundle.css'"));
  assert.ok(html.includes('<script src="theme-bootstrap.js"></script>'));
  assert.ok(smoke.includes("ROOT/'theme-bootstrap.js'"));
  assert.ok(smoke.includes('html=html.replace('));
});

test('CI: chart uses an inline contextual sheet rather than obsolete fullscreen modal',()=>{
  assert.match(app,/id="natalSelectionInfo"[^>]*role="dialog" aria-modal="false"/);
  assert.ok(smoke.includes("page.locator('dialog.natal-focus').count()==0"));
  assert.ok(smoke.includes("page.locator('[data-close-natal-detail]').click()"));
});
test('CI: navigation smoke permits wrapping at large text sizes',()=>{
  assert.ok(smoke.includes("calendar_label['height']<=calendar_label['line']*2.2"));
});

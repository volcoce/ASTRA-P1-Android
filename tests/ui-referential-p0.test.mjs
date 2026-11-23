import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../app/src/main/assets/'+name,import.meta.url),'utf8');
test('P0: compact calendar keeps a full-size alternative and preserves the ribbon',()=>{
  const app=read('app.js'),css=read('astra-p4-calendar.css');
  assert.match(app,/id="astraCalendarDatePicker" aria-label="Date du calendrier"/);
  assert.match(app,/event.target.id==='astraCalendarDatePicker'/);
  assert.ok(css.includes('@container astra-calendar (max-width:335.99px)'));
  assert.ok(css.includes('min-height:var(--astra-control-min)'));
});
test('P0: low-contrast calendar labels have a shared opaque backing',()=>{
  const tokens=read('astra-tokens.css'),css=read('astra-p4-calendar.css');
  assert.ok(tokens.includes('--astra-calendar-label-bg:var(--astra-plate-cream)'));
  for(const attr of ['data-solar-element="fire"','data-solar-element="earth"','data-solar-ingress="true"'])assert.ok(css.includes(attr));
  assert.ok(css.includes('background:var(--astra-calendar-label-bg);color:var(--astra-calendar-ink)'));
});

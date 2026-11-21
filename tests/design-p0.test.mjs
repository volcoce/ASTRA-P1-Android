import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const asset=name=>readFileSync(new URL('../app/src/main/assets/'+name,import.meta.url),'utf8');
const tokens=asset('astra-tokens.css');
const components=asset('astra-components.css');
const html=asset('index.html');
const solar=asset('solar-ribbon.css');
test('P0 CSS layers are loaded after feature styles, tokens before components',()=>{
  const order=['style.css','atlas-ui.css','theme.css','wheel-ui.css','solar-ribbon.css',
    'calendar-p0.css','personal-calendar.css','astra-tokens.css','astra-components.css'];
  const indices=order.map(name=>html.indexOf('href="'+name+'"'));
  assert.ok(indices.every(i=>i>=0),'Missing stylesheet');
  assert.deepEqual([...indices].sort((a,b)=>a-b),indices,'Stylesheet order');
});
test('P0 has every shared light/dark semantic token and legacy bridge',()=>{
  const keys=['--astra-bg','--astra-surface','--astra-ink','--astra-muted','--astra-border',
    '--astra-primary','--astra-primary-ink','--astra-secondary','--astra-focus',
    '--astra-selected','--astra-radius-md','--astra-font-body','--astra-font-display',
    '--solar-fire-bg','--solar-earth-bg','--solar-air-bg','--solar-water-bg'];
  for(const key of keys)assert.ok(tokens.includes(key+':'),key);
  assert.match(tokens,/:root\[data-astra-theme="dark"\]/);
  for(const key of ['--ink:var(--astra-ink)','--secondary:var(--astra-muted)',
    '--border:var(--astra-border)'])assert.ok(tokens.includes(key),key);
});
test('P0 common components expose accessible visual states',()=>{
  assert.match(components,/:focus-visible/);
  assert.match(components,/prefers-reduced-motion:reduce/);
  assert.match(components,/aria-invalid="true"/);
  assert.match(components,/\.bottom-nav \.nav.active/);
  assert.match(components,/\.field input/);
  assert.match(components,/\.primary/);
  assert.match(components,/\.calendar \.astra-solar-ribbon-segment/);
  assert.match(solar,/\.astra-solar-ribbon-segment\.ends-at-ingress/);
  assert.match(solar,/\.astra-solar-ribbon-segment\.starts-at-ingress/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createPreviewServer } from '../scripts/dev-server.mjs';

test('local preview serves HTML, JS, CSS and rejects invalid methods', async () => {
  const server = createPreviewServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = 'http://127.0.0.1:' + server.address().port;
  try {
    const home = await fetch(url);
    assert.equal(home.status, 200);
    assert.match(home.headers.get('content-type'), /text\/html/);
    assert.equal(home.headers.get('cache-control'), 'no-store');
    assert.match(await home.text(), /ASTRA/);
    const js = await fetch(url + '/app.js');
    assert.equal(js.status, 200);
    assert.match(js.headers.get('content-type'), /javascript/);
    assert.ok((await js.text()).length > 1000);
    const css = await fetch(url + '/style.css');
    assert.equal(css.status, 200);
    assert.equal((await fetch(url + '/missing-file')).status, 404);
    const catalog=await fetch(url+'/ui-catalog/');
    assert.equal(catalog.status,200);
    assert.match(await catalog.text(),/href="\/astra\.bundle\.css"/);
    assert.equal((await fetch(url+'/ui-catalog/catalog.js')).status,200);
    assert.equal((await fetch(url+'/ui-catalog/catalog.css')).status,200);
    assert.equal((await fetch(url+'/ui-catalog/private.txt')).status,404);
    assert.equal((await fetch(url, { method: 'POST' })).status, 405);
  } finally {
    server.close();
    await once(server, 'close');
  }
});

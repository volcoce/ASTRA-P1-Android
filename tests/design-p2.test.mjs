import {CSS_SOURCES} from '../scripts/css-sources.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const asset=name=>readFileSync(new URL('../app/src/main/assets/'+name,import.meta.url),'utf8');
const app=asset('app.js'),html=asset('index.html');
const p2=asset('astra-p2-navigation.css'),p1=asset('astra-p1-screens.css');
const components=asset('astra-components.css'),solar=asset('solar-ribbon.css');
test('P2 sub-screen stylesheet is loaded after P0 and P1',()=>{
  const links=['astra-tokens.css','astra-components.css','astra-p1-screens.css','astra-p2-navigation.css'];
  const positions=links.map(n=>CSS_SOURCES.indexOf(n));
  assert.ok(positions.every(n=>n>=0));
  assert.deepEqual(positions,[...positions].sort((a,b)=>a-b));
});
test('Journal has accessible editable panel, independent history and summary',()=>{
  const journal=app.slice(app.indexOf('  function journal() {'),app.indexOf('  const zodiacSymbols=',app.indexOf('  function journal() {')));
  for(const name of ['astra-journal-editor','astra-journal-summary','astra-journal-history'])
    assert.match(journal,new RegExp(name));
  for(const id of ['journalEditorTitle','journalSummaryTitle','journalHistoryTitle'])
    assert.ok(journal.includes(id));
  assert.match(journal,/data-save="1"/);
  assert.match(journal,/data-delete-note="1"/);
  assert.match(p2,/\.astra-journal-editor/);
});
test('Event details preserve inline article, data and journal action',()=>{
  const detail=app.slice(app.indexOf('  function detailView() {'),app.indexOf('  function birthTimeWarning()',app.indexOf('  function detailView() {')));
  assert.match(detail,/id="detailPanel"/);
  assert.match(detail,/data-close="1"/);
  assert.match(detail,/data-prompt=/);
  assert.match(detail,/Voir les données astronomiques/);
  assert.match(detail,/astra-event-technical/);
  assert.match(detail,/astra-event-role-list/);
  assert.match(detail,/Lecture astrologique/);
  assert.match(p2,/\.astra-event-detail/);
});
test('Personal calendar dialogs remain accessible, closable and multi-day',()=>{
  const dialog=app.slice(app.indexOf('  function personalEventEditor(){'),app.indexOf('  function calendarDayInspector()',app.indexOf('  function personalEventEditor(){')));
  assert.match(dialog,/<dialog id="personalEventDialog"/);
  assert.match(dialog,/aria-labelledby="personalEventDialogTitle"/);
  assert.match(dialog,/personalStart/);
  assert.match(dialog,/personalEnd/);
  assert.match(dialog,/personalAllDay/);
  assert.match(dialog,/data-personal-close=/);
  assert.match(app,/addEventListener\('cancel'/);
  assert.match(app,/event\.key==='Escape'/);
  assert.match(p2,/\.astra-personal-dialog\[open\]/);
});
test('P2 keeps 3 page tabs plus settings; journal is a secondary route',()=>{
  const tabs=(html.match(/data-tab="/g)||[]).length;
  assert.equal(tabs,3);
  assert.ok(!html.includes('data-tab="month"'));
  assert.ok(!html.includes('data-tab="journal"'));
  assert.match(app,/data-goto="journal"/);
  assert.match(components,/\.bottom-nav \.nav.active/);
});
test('P2 includes dark, focus, invalid and reduced motion states',()=>{
  assert.match(p2,/data-astra-theme="dark"/);
  assert.match(p2,/:focus-visible/);
  assert.match(p2,/prefers-reduced-motion:reduce/);
  assert.match(p2,/\.astra-personal-error/);
  assert.match(solar,/\.astra-solar-ribbon-backdrop/);
  assert.ok(!p2.includes('astro\/runtime'));
});

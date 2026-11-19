const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const base = path.resolve(__dirname, '..', 'app/src/main/assets');
const js = fs.readFileSync(path.join(base, 'data.js'), 'utf8');
const sandbox = {window: {}};
vm.runInNewContext(js, sandbox, {timeout:10000});
const forecasts = sandbox.window.ASTRA_FORECASTS;
assert.ok(forecasts && forecasts.tropical && forecasts.sidereal);
const keys = [];
for (let year=2026; year<=2028; year++) for (let month=1; month<=12; month++) keys.push(`${year}-${String(month).padStart(2,'0')}`);
let contacts = 0;
for (const z of ['tropical','sidereal']) {
  assert.equal(Object.keys(forecasts[z]).length, 36, `36 mois attendus en ${z}`);
  for (const key of keys) {
    const month = forecasts[z][key];
    assert.ok(month && Array.isArray(month.days), `${key}/${z} absent`);
    const daysInMonth = new Date(Number(key.slice(0,4)),Number(key.slice(5,7)),0).getDate();
    assert.equal(month.days.length, daysInMonth, `Nombre de jours incorrect : ${key}/${z}`);
    assert.ok(month.natal && month.natal.positions, `Thème natal absent : ${key}/${z}`);
    for (const day of month.days) {
      assert.ok(Array.isArray(day.events), `Transits non présents : ${key}/${z}`);
      contacts += day.events.length;
    }
  }
}
console.log(`OK — 2 zodiaques, 72 mois calculés, ${contacts} contacts exacts, 2192 jours calendaires cumulés`);

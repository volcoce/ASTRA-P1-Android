import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app = readFileSync(new URL('../app/src/main/assets/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app/src/main/assets/style.css', import.meta.url), 'utf8');

test('P0: browser script remains syntactically valid', () => {
  assert.doesNotThrow(() => new Function(app));
});

test('P0: calendar announces the selected date and current date', () => {
  const match = app.match(/  function calendar\(\) \{([\s\S]*?)\n  \}\n  function initDraft/);
  assert.ok(match, 'calendar function should be present');
  const run = new Function('context', 'with(context){function calendar(){' + match[1] + '}return calendar();}');
  const format = day => new Intl.DateTimeFormat('fr-FR', {
    weekday:'long', day:'numeric', month:'long', year:'numeric', timeZone:'UTC'
  }).format(new Date(day + 'T12:00:00Z'));
  const context = {
    // Stabilise l'horloge : aria-current="date" doit pointer sur le jour actuel,
    // pas sur une date historique aléatoire lors de l'exécution de la CI.
    Date: class FixedCalendarDate extends Date {
      constructor(...args){super(...(args.length?args:['2026-11-20T12:00:00Z']));}
    },
    state: {profile:{timezone:'Europe/Paris'},journal:{},calendarEvents:[]},
    month: new Date(2026,10,1),
    selected: '2026-11-20',
    calendarInterval: null,
    calendarOptionsOpen: false,
    calendarView: 'month',
    classify: () => ({exact:[],sky:[],active:[]}),
    result: null,
    currentDay: () => ({exact:[],sky:[],active:[]}),
    dayEvents: () => [],
    header: () => '', birthTimeWarning: () => '', status: () => '',
    detailView: () => '', lunarTimeline: () => '', switcher: () => '',
    filters: () => '', row: () => '', moonPhaseIcon: () => '',
    lunarLabel: () => '', safe: value => value,
    solarSignIndex: () => null, solarMonthPeriods:()=>({segments:[],dayCount:30}),
    solarVisiblePeriods:()=>({days:[]}),
    solarCalendarBackdropWeek: () => '<div class="astra-solar-ribbon-backdrop"></div>', solarMonthSummary: () => '',
    solarCalendarExplanation: () => '<details class="calendar-help"><summary>Comprendre le calendrier</summary></details>',
    personalCalendarWeek: () => '',monthOverview: () => '',calendarDayInspector: () => '',personalEventEditor: () => '',
    solarDayBand: () => '',
    isoDay: date => [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-'),
    pad: number => String(number).padStart(2,'0'),
    displayDate: format
  };
  const html = run(context);
  assert.match(html,/data-day="2026-11-20" aria-pressed="true" aria-current="date" aria-label="vendredi 20 novembre 2026/);
  assert.match(html,/data-day="2026-11-19" aria-pressed="false"/);
  assert.match(html,/<button type="button" class="day/);
  assert.match(html,/class="astra-adjacent-day"/);
});

test('P0: chart uses native modal semantics and restores keyboard access', () => {
  assert.ok(app.includes("'<dialog class=\"natal-focus\" id=\"natalChart\""));
  assert.ok(app.includes("focusDialog.showModal()"));
  assert.ok(app.includes("event.target.matches('dialog.natal-focus')"));
  assert.ok(app.includes("pendingDayFocus=calendarSheet?null:a.day"));
  assert.ok(css.includes('dialog.natal-focus::backdrop'));
});

test('P0: birth and composite form errors are associated with their fields', () => {
  for (const [field, state] of [
    ['birthDate','birthValidation'],
    ['birthTime','birthValidation'],
    ['birthCity','birthCityError'],
    ['fold','birthValidation'],
    ['secondDate','compositeValidation'],
    ['secondTime','compositeValidation'],
    ['secondCity','compositeCityError']
  ]) {
    assert.ok(app.includes("validationAttrs('"+field+"',"+state+")"), field);
    assert.ok(app.includes("validationMessage('"+field+"',"+state+")"), field);
  }
  assert.ok(app.includes('aria-invalid="true"'));
  assert.ok(app.includes('aria-describedby'));
  assert.ok(app.includes('class="form-field-error" role="alert"'));
  assert.ok(css.includes('.form-field-error'));
});

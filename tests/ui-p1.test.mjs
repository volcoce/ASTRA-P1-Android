import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app = readFileSync(new URL('../app/src/main/assets/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app/src/main/assets/atlas-ui.css', import.meta.url), 'utf8');

function routeHarness(hash, native = false) {
  const found = app.match(/  const webRouting = [\s\S]*?\n  \}\n  \/\/ The home feed/);
  assert.ok(found, 'browser route helpers must be present');
  const routeSource = found[0].replace(/\n  \/\/ The home feed$/, '');
  const calls = [];
  const context = {
    window: {
      ASTRA_CHART_EXPORT: native ? {} : null,
      location:{protocol:'https:',hash},
      history:{
        pushState(_state,_title,route){context.window.location.hash=route;calls.push('push:'+route);},
        replaceState(_state,_title,route){context.window.location.hash=route;calls.push('replace:'+route);}
      },
      scrollTo() {}
    },
    activeTab:'today',profileScreen:'overview',
    selected:'2026-11-20',month:new Date(2026,10,1),
    state:{profile:{timezone:'Europe/Paris'}},
    result:{},natalSelection:null,openDetail:null,
    pendingDayFocus:null,pendingPageFocus:false,focusReturnScreen:'overview',
    captureBirthForm(){},render(){calls.push('render');},
    refresh(){calls.push('refresh');},
    $(id){return {querySelector(){return {focus(){calls.push('focus:'+id);}}}};},
    isoDay(date){return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');},
    pad(n){return String(n).padStart(2,'0');}
  };
  const routes = new Function('context','with(context){'+routeSource+
    ';return {readBrowserRoute,currentBrowserHash,writeBrowserRoute,applyBrowserRoute};}')(context);
  return {routes,context,calls};
}

test('P1: browser routes accept known views and valid ISO dates', () => {
  for(const [hash,tab] of [
    ['#/today','today'],['#/today/2024-02-29','today'],
    ['#/month/2026-11','month'],['#/calendar/2026-11-20','calendar'],
    ['#/journal/2026-11-19','journal'],['#/profile/compare','profile'],
    ['#/profile/focus','profile']
  ]){
    assert.equal(routeHarness(hash).routes.readBrowserRoute()?.tab,tab,hash);
  }
});

test('P1: invalid and out-of-range routes are rejected', () => {
  for(const hash of [
    '#/calendar/2026-02-30','#/calendar/1899-12-31',
    '#/month/2026-13','#/month/2200-01',
    '#/profile/not-a-page','#/calendar/2026-10-01/extra'
  ])assert.equal(routeHarness(hash).routes.readBrowserRoute(),null,hash);
});

test('P1: date navigation updates the month and canonical URL', () => {
  const {routes,context,calls} = routeHarness('#/calendar/2026-11-20');
  routes.applyBrowserRoute({tab:'calendar',day:'2026-12-07'},{focus:false});
  assert.equal(context.activeTab,'calendar');
  assert.equal(context.selected,'2026-12-07');
  assert.equal(context.month.getMonth(),11);
  assert.ok(calls.includes('refresh'));
  assert.equal(context.window.location.hash,'#/calendar/2026-12-07');
  assert.ok(calls.includes('replace:#/calendar/2026-12-07'));
});

test('P1: native Android mode leaves URL history untouched', () => {
  const {routes,context,calls} = routeHarness('#/profile/compare',true);
  assert.equal(routes.readBrowserRoute(),null);
  routes.writeBrowserRoute();
  assert.equal(context.window.location.hash,'#/profile/compare');
  assert.deepEqual(calls,[]);
});

test('P1: dynamic titles, deferred heading focus and reduced motion are implemented', () => {
  assert.match(app,/document\.title=heading\.textContent\+' · ASTRA'/);
  assert.match(app,/pendingPageFocus=true/);
  assert.match(app,/if\(pendingPageFocus\)/);
  assert.match(app,/prefers-reduced-motion: reduce/);
  assert.match(app,/window\.addEventListener\('popstate'/);
});

test('P1: responsive CSS includes compact, tablet and desktop breakpoints', () => {
  assert.match(css,/@media\(max-width:380px\)/);
  assert.match(css,/@media\(min-width:700px\)/);
  assert.match(css,/@media\(min-width:1100px\)/);
  assert.match(css,/font-size:\.875rem/);
  assert.match(css,/\.bottom-nav \.nav-label\{white-space:normal/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test('P1: secondary headings maintain at least WCAG AA text contrast', () => {
  const contrast = (a,b) => {
    const luminance = hex => {
      const rgb = [1,3,5].map(i => {
        const x = parseInt(hex.slice(i,i+2),16)/255;
        return x<=0.04045 ? x/12.92 : ((x+.055)/1.055)**2.4;
      });
      return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
    };
    const x=luminance(a),y=luminance(b);
    return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
  };
  assert.match(css,/\.astra-section-head>span\{color:#536879\}/);
  assert.ok(contrast('#536879','#f6f7f7')>=4.5);
});

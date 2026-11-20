(() => {
  'use strict';
  // Apply the saved preference before CSS is parsed to avoid a light-theme flash.
  try {
    const raw=JSON.parse(localStorage.getItem('astra-public-v1')||'{}');
    const choice=['system','light','dark'].includes(raw.appearance)?raw.appearance:'system';
    const dark=choice==='dark'||(choice==='system'&&window.matchMedia?.('(prefers-color-scheme: dark)').matches);
    const theme=dark?'dark':'light';
    document.documentElement.dataset.astraTheme=theme;
    document.documentElement.style.colorScheme=theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#101d2a':'#172b3e');
  } catch {
    document.documentElement.dataset.astraTheme='light';
  }
})();

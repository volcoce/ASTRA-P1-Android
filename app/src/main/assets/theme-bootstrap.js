(() => {
  'use strict';
  // Apply the saved preference before CSS is parsed to avoid a light-theme flash.
  try {
    const raw=JSON.parse(localStorage.getItem('astra-public-v1')||'{}');
    const choice=['system','light','dark'].includes(raw.appearance)?raw.appearance:'system';
    const dark=choice==='dark'||(choice==='system'&&window.matchMedia?.('(prefers-color-scheme: dark)').matches);
    const theme=dark?'dark':'light';
    document.documentElement.dataset.astraTheme=theme;
    document.documentElement.dataset.astraPalette=['classic','vivid'].includes(raw.elementPalette)?raw.elementPalette:'vivid';
    document.documentElement.style.colorScheme=theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#101F2A':'#F8EFD5');
  } catch {
    document.documentElement.dataset.astraTheme='light';
    document.documentElement.dataset.astraPalette='vivid';
  }
  // Initial bar contrast before the main application boots.
  window.ASTRA_NATIVE_UI?.setDarkMode?.(document.documentElement.dataset.astraTheme==='dark');
})();

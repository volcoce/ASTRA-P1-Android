#!/usr/bin/env python3
"""P2 catalogue test: exercise the real loopback preview and production CSS."""
import json
import socket
import subprocess
import time
from pathlib import Path
from shutil import which
from urllib.request import urlopen
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'tests/artifacts/ui-catalog'

def run():
    OUT.mkdir(parents=True,exist_ok=True)
    report=[]
    with socket.socket() as s:
        s.bind(('127.0.0.1',0))
        port=s.getsockname()[1]
    import os
    server=subprocess.Popen(['node','scripts/dev-server.mjs'],cwd=ROOT,env={**os.environ,'PORT':str(port)})
    url=f'http://127.0.0.1:{port}/ui-catalog/'
    try:
        for i in range(50):
            try:
                with urlopen(url,timeout=1) as r:
                    if r.status==200: break
            except OSError: time.sleep(.1)
        else: raise RuntimeError('Preview server did not start')
        with sync_playwright() as pw:
            browser=pw.chromium.launch(headless=True,args=['--no-sandbox'])
            page=browser.new_page(viewport={'width':393,'height':844})
            errors=[]
            page.on('pageerror',lambda error: errors.append(str(error)))
            page.goto(url)
            page.locator('.bottom-nav').wait_for()
            assert page.locator('.catalog-swatch').count()==15
            assert page.locator('button.primary[disabled]').is_disabled()
            page.get_by_role('button',name='Action principale').click()
            assert page.locator('#demo-status').inner_text()=='Action principale'
            page.locator('[data-demo-mode="sidereal"]').click()
            assert page.locator('[data-demo-mode="sidereal"]').get_attribute('aria-pressed')=='true'
            disclosure=page.locator('details.astra-disclosure').first
            disclosure.locator('summary').focus()
            page.keyboard.press('Enter')
            assert disclosure.get_attribute('open') is not None
            disclosure.locator('summary').click()
            page.locator('#open-dialog').click()
            assert page.locator('#catalog-dialog').evaluate('e=>e.open')
            page.keyboard.press('Escape')
            expect(page.locator('#catalog-dialog')).not_to_be_visible()
            expect(page.locator('#open-dialog')).to_be_focused()
            for theme in ('light','dark'):
                page.locator('#theme').select_option(theme)
                for palette in ('classic','vivid'):
                    page.locator('#palette').select_option(palette)
                    assert page.locator('html').get_attribute('data-astra-palette')==palette
                    assert page.locator('[data-element-palette="'+palette+'"]').get_attribute('aria-pressed')=='true'
                    for width in (320,393,768,1440):
                        page.set_viewport_size({'width':width,'height':844})
                        page.evaluate('window.scrollTo(0,0)')
                        geometry=page.evaluate("""() => ({
                          overflow:document.documentElement.scrollWidth-innerWidth,
                          arrows:[...document.querySelectorAll('.arrow')].map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})),
                          nav:document.querySelector('.bottom-nav').getBoundingClientRect().bottom-innerHeight
                        })""")
                        assert geometry['overflow']<=1,(theme,palette,width,geometry)
                        assert abs(geometry['nav'])<=1,geometry
                        assert all(a['w']>=48 and a['h']>=48 for a in geometry['arrows']),geometry
                        picker=page.locator('#catalog-date-picker')
                        if width==320:
                            assert picker.is_visible() and picker.bounding_box()['height']>=48
                            picker.select_option('2026-11-04')
                            assert page.locator('.day[data-day="2026-11-04"]').get_attribute('aria-pressed')=='true'
                        if width==1440: assert not picker.is_visible()
                        name=f'{theme}-{palette}-{width}'
                        page.evaluate('window.scrollTo(0,0)')
                        page.screenshot(path=str(OUT/(name+'.png')),full_page=True,animations='disabled')
                        report.append({'case':name,**geometry})
            page.set_viewport_size({'width':393,'height':844})
            page.locator('#safe-area').select_option('portrait')
            assert page.locator('.app-shell').evaluate('e=>parseFloat(getComputedStyle(e).paddingTop)')==32
            assert page.locator('.bottom-nav').evaluate('e=>parseFloat(getComputedStyle(e).paddingBottom)')==41
            page.locator('#safe-area').select_option('none')
            page.locator('#text-scale').select_option('150')
            assert page.locator('html').evaluate('e=>parseFloat(getComputedStyle(e).fontSize)')>=24
            assert not errors,errors
            assert page.locator('html').get_attribute('data-catalog-error') is None
            browser.close()
    finally:
        server.terminate()
        server.wait(timeout=10)
        (OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print('P2 catalogue: 16 visual combinations and interaction tests passed')

if __name__=='__main__':
    run()

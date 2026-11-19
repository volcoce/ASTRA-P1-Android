#!/usr/bin/env python3
"""Tests UI Chromium mobiles sans serveur HTTP. Requiert playwright et un Chromium local.

La page est assemblée avec JS/CSS inline : cela teste le moteur Web (pas Android/WebView).
L'API localStorage est simulée car about:blank est une origine opaque.
"""
from __future__ import annotations
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'app/src/main/assets'

def html_bundle() -> str:
    html = (ASSETS / 'index.html').read_text(encoding='utf-8')
    html = html.replace('<link rel="manifest" href="manifest.webmanifest">', '')
    html = html.replace('<link rel="icon" href="icon.svg" type="image/svg+xml">', '')
    html = html.replace('<link rel="stylesheet" href="style.css">', '<style>' + (ASSETS/'style.css').read_text(encoding='utf-8') + '</style>')
    # Stockage simulé, testé pour ses interactions en mémoire. Les sauvegardes sont
    # également vérifiées par les tests d'export/restauration.
    polyfill = """<script>window.__saved={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__saved[k]??null,setItem:(k,v)=>window.__saved[k]=v,removeItem:k=>delete window.__saved[k]}});</script>"""
    html = html.replace('<body>', '<body>' + polyfill)
    for name in ('data.js','p1-data.js','app.js'):
        src=f'<script src="{name}" defer></script>' if name=='app.js' else f'<script src="{name}"></script>'
        html=html.replace(src, '<script>'+(ASSETS/name).read_text(encoding='utf-8')+'</script>')
    return html


def run(chromium: str, image_dir: Path | None) -> None:
    html=html_bundle()
    with sync_playwright() as playwright:
        browser=playwright.chromium.launch(executable_path=chromium, headless=True, args=['--no-sandbox','--disable-dev-shm-usage'])
        ctx=browser.new_context(viewport={'width':393,'height':852}, device_scale_factor=2, is_mobile=True, has_touch=True,locale='fr-FR',timezone_id='Europe/Paris')
        page=ctx.new_page()
        errors=[];checks=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
        page.on('dialog',lambda d:d.accept())
        page.set_content(html,wait_until='load',timeout=60000)
        def check(label: str, condition: bool):
            print(('OK   ' if condition else 'FAIL ')+label)
            checks.append((label,condition))
        check('Chargement accueil',page.locator('h1').inner_text().startswith('Mon ciel'))
        check('Lune calculée',page.locator('.metric h2').count()==1)
        check('Aucun débordement horizontal 393px',page.evaluate('document.documentElement.scrollWidth<=window.innerWidth'))
        if image_dir: image_dir.mkdir(parents=True,exist_ok=True);page.screenshot(path=str(image_dir/'ASTRA-P1-accueil.png'),full_page=True)
        page.locator('button[data-mode="sidereal"]').click()
        check('Changement sidéral',page.locator('button[data-mode="sidereal"]').get_attribute('aria-pressed')=='true')
        page.locator('button[data-tab="calendar"]').click()
        check('Calendrier ouvert',page.locator('h1').inner_text()=='Calendrier')
        # Fixer le test sur novembre 2026 indépendamment de l'horloge système.
        months=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre']
        for _ in range(40):
            value=page.locator('.month-head h2').inner_text().lower()
            year=int(value.split()[-1]);mm=months.index(value.split()[0]);
            if (year,mm)==(2026,10):break
            step=1 if (year,mm)<(2026,10) else -1
            page.locator(f'button[data-month="{step}"]').click()
        check('Date novembre 2026',page.locator('.month-head h2').inner_text().lower()=='novembre 2026')
        page.locator('button[data-date="2026-11-24"]').click()
        check('Pleine lune 24 novembre',page.get_by_text('Pleine Lune',exact=False).count()>0)
        check('Fenêtres de transits',page.locator('.period-trigger').count()>0)
        page.locator('.period-trigger').first.click()
        check('Ouverture détail période',page.locator('.period-detail').count()==1)
        page.locator('#eventFilter').select_option('moon')
        check('Filtre lunaire',page.locator('#eventFilter').input_value()=='moon')
        if image_dir:page.screenshot(path=str(image_dir/'ASTRA-P1-calendrier.png'),full_page=True)
        page.locator('button[data-tab="journal"]').click()
        page.locator('#journalNote').fill('Test P1 sauvegarde et restauration.');page.locator('button[data-mood="4"]').click();page.locator('button[data-save-journal]').click()
        check('Note enregistrée',page.get_by_text('Test P1 sauvegarde et restauration.').count()>0)
        page.locator('button[data-tab="profile"]').click()
        check('Profil natal affiché',page.get_by_text('Thème natal',exact=False).count()>0)
        check('Données de naissance non éditables',page.locator('#date').is_disabled())
        backup=page.locator('#backupText').input_value()
        check('Sauvegarde contient la note','Test P1 sauvegarde et restauration.' in backup)
        page.locator('button[data-clear]').click()
        check('Effacement local', 'Test P1 sauvegarde et restauration.' not in page.locator('#backupText').input_value())
        page.locator('#backupText').fill(backup);page.locator('button[data-backup-save]').click()
        check('Restauration note','Test P1 sauvegarde et restauration.' in page.locator('#backupText').input_value())
        check('Aucune erreur JavaScript',not errors)
        print('TOTAL',sum(x for _,x in checks),'/',len(checks), 'error messages:', errors)
        browser.close()
        if not all(x for _,x in checks):raise SystemExit(1)

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--chromium',default='/usr/bin/chromium')
    p.add_argument('--screenshots',type=Path,default=None)
    args=p.parse_args()
    run(args.chromium,args.screenshots)

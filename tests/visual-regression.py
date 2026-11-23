#!/usr/bin/env python3
"""ASTRA screenshot regression: exact width, nonblank rendering, real palette pixels.

This deliberately checks stable *visual invariants*, not pixel-perfect golden
images: font rasterization, Android WebView and OS fonts can vary. Screenshots
are captured by ui-smoke.py with deterministic fixtures and uploaded as CI
artifacts for review alongside the machine-readable report.
"""
import json
import os
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFont

SCREENSHOTS=Path(os.environ.get('ASTRA_SCREENSHOT_DIR','tests/artifacts/screenshots'))
REPORT=Path('tests/artifacts/visual-report.json')
# Anchors from the approved Retro Pop Celestial tokens. Each colour must
# occupy a visible region, not just an anti-aliased border pixel.
CASES={
    'today-flo-layout-320.png':(320,{'daily_moon_hero':'#82AAC7'}),
    'month-320.png':(320,{'monthly_hero':'#F0BE57'}),
    'calendar-320.png':(320,{'calendar_surface':'#FFF9EA'}),
    'journal-320.png':(320,{'journal_surface':'#FFF9EA'}),
    'natal-heading-aligned-desktop-1280.png':(1280,{'reading_surface':'#FFF9EA'}),
    'today-dark-readable-events-393.png':(393,{'daily_dark_hero':'#31566D'}),
    'calendar-dark-393.png':(393,{'calendar_dark_surface':'#1E3543'}),
    'natal-reading-dark-393.png':(393,{'natal_dark_surface':'#1E3543'}),
}

def swatch(hexcode):
    return tuple(int(hexcode[index:index+2],16) for index in (1,3,5))

def sample_image(file):
    with Image.open(file) as source:
        image=source.convert('RGB')
        width,height=image.size
        # Downsample using nearest neighbour so tests inspect true CSS pixels,
        # not resampled colours or anti-aliased interpolation.
        small=image.resize((max(1,width//3),max(1,height//3)),
                           Image.Resampling.NEAREST)
        pixels=list(small.getdata())
    return width,height,pixels

def create_palette_comparisons():
    # Both palettes are captured from the same Chromium fixture and geometry.
    # Export real screenshots, not reconstructed marketing mock-ups.
    outcomes={}
    issues=[]
    for view in ('wheel','calendar'):
        for theme in ('light','dark'):
            a=SCREENSHOTS/f'palette-classic-{view}-{theme}-393.png'
            b=SCREENSHOTS/f'palette-vivid-{view}-{theme}-393.png'
            if not (a.is_file() and b.is_file()):
                issues.append(f'Palette comparison missing: {a.name if not a.is_file() else b.name}')
                continue
            with Image.open(a) as src:
                classic=src.convert('RGB')
            with Image.open(b) as src:
                vivid=src.convert('RGB')
            if classic.size!=vivid.size:
                issues.append(f'{view} {theme}: palette screenshots differ in geometry: {classic.size} != {vivid.size}')
                continue
            changed=sum(any(value!=0 for value in pixel)
                       for pixel in ImageChops.difference(classic,vivid).getdata())
            fraction=changed/(classic.width*classic.height)
            if fraction<.015:
                issues.append(f'{view} {theme}: only {fraction:.2%} pixels differ, palette may not be applied')
            pad,heading=20,50
            w,h=classic.size
            bg=(248,239,213) if theme=='light' else (16,31,42)
            ink=(30,64,79) if theme=='light' else (248,239,213)
            image=Image.new('RGB',(w*2+pad*3,h+heading+pad*2),bg)
            image.paste(classic,(pad,heading+pad))
            image.paste(vivid,(w+pad*2,heading+pad))
            draw=ImageDraw.Draw(image)
            try:
                font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',16)
            except OSError:
                font=ImageFont.load_default()
            draw.text((pad,15),'Palette 1 - Classique',fill=ink,font=font)
            draw.text((w+pad*2,15),'Palette 2 - Vive',fill=ink,font=font)
            output=SCREENSHOTS/f'comparaison-palettes-{view}-{theme}.png'
            image.save(output,optimize=True)
            outcomes[output.name]={'width':image.width,'height':image.height,
                                   'changed_fraction':round(fraction,4)}
    return outcomes,issues

def check():
    failures=[]
    report={}
    for filename,(width,anchors) in CASES.items():
        file=SCREENSHOTS/filename
        if not file.is_file():
            failures.append(f'{filename}: screenshot missing')
            continue
        got_width,height,pixels=sample_image(file)
        summary={'width':got_width,'height':height,'sampled_pixels':len(pixels),
                 'distinct_colors':len(set(pixels)),'anchors':{}}
        report[filename]=summary
        if got_width!=width:
            failures.append(f'{filename}: width {got_width} != {width}, possible horizontal overflow')
        if height<380 or len(set(pixels))<20:
            failures.append(f'{filename}: image seems empty or truncated')
        for role,value in anchors.items():
            rgb=swatch(value)
            hits=sum(all(abs(actual-target)<=6 for actual,target in zip(pixel,rgb))
                     for pixel in pixels)
            minimum=max(25,int(len(pixels)*.0008))
            summary['anchors'][role]={'hex':value,'pixels':hits,'minimum':minimum}
            if hits<minimum:
                failures.append(f'{filename}: {role} {value} has {hits} pixels, needs {minimum}')
    if ('calendar-dark-393.png' in report and 'calendar-320.png' in report):
        pass  # Both light/dark checked independently by their theme swatches.
    comparisons,issues=create_palette_comparisons()
    failures.extend(issues)
    REPORT.parent.mkdir(parents=True,exist_ok=True)
    REPORT.write_text(json.dumps({'cases':report,'comparisons':comparisons,'failures':failures},
                     ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Visual regression: {len(report)}/{len(CASES)} captures validated')
    print(f'Palette side-by-side comparisons: {len(comparisons)}/4')
    for filename,entry in report.items():
        print(f"  {filename} ({entry['width']}×{entry['height']}) "
              +', '.join(f"{k}={v['pixels']}" for k,v in entry['anchors'].items()))
    if failures:
        raise AssertionError('\n'.join(failures))

if __name__=='__main__':
    check()

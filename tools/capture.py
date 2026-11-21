#!/usr/bin/env python3
"""capture.py: save frames of the demo as PNGs, one per step of its fixed clock.

    python tools/capture.py OUT_DIR [--scale 1] [--step 2] [--query "&char=robot"]
    python tools/capture.py OUT_DIR --page docs/steps/04.html --size 480x300 --step 2

Needs Playwright (pip install playwright; playwright install chromium). The page is opened from the files in this
folder in headless Chromium. Nothing is timed: each frame is asked for by number (demo.seek) and then photographed,
so the result is the same on any machine and never drops a frame. scale 1 gives 640x360, scale 3 gives 1920x1080.
"""
import argparse, asyncio, os, pathlib
from playwright.async_api import async_playwright


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('out')
    ap.add_argument('--scale', type=float, default=1)
    ap.add_argument('--step', type=int, default=1)
    ap.add_argument('--first', type=int, default=0)
    ap.add_argument('--last', type=int, default=-1)
    ap.add_argument('--query', default='')
    ap.add_argument('--page', default='index.html')
    ap.add_argument('--size', default='640x360')
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    page_url = (pathlib.Path(__file__).resolve().parent.parent / a.page).as_uri() + '?bare&hold' + a.query
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width': int(a.size.split('x')[0]), 'height': int(a.size.split('x')[1])}, device_scale_factor=a.scale)
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        await page.goto(page_url)
        await page.wait_for_function('window.demo && window.demo.ready')
        info = await page.evaluate('demo.ready')
        last = info['frames'] if a.last < 0 else a.last
        clip = {'x': 0, 'y': 0, 'width': int(a.size.split('x')[0]), 'height': int(a.size.split('x')[1])}
        n = 0
        for f in range(a.first, last, a.step):
            await page.evaluate('(f) => demo.seek(f)', f)
            await page.screenshot(path=os.path.join(a.out, '%04d.png' % n), clip=clip)
            n += 1
        print('frames', n, 'info', info, 'errors', errors)
        await browser.close()

asyncio.run(main())

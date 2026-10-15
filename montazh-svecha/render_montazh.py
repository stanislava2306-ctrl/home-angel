#!/usr/bin/env python3
"""Покадровый рендер прозрачного наложения и сведение с исходным видео.

  python3 render_montazh.py --shots 1,5,19,27,43,58,70,78      → kadry_proverka/*.jpg (сводка кадров)
  python3 render_montazh.py --video --out ГОТОВО.mp4            → весь ролик со звуком
  python3 render_montazh.py --video --start 0 --end 10 --out проба.mp4
"""
import argparse, asyncio, os, subprocess, sys
from pathlib import Path

HTML = Path(__file__).parent / 'grafika' / 'montazh.html'
SRC = Path(__file__).parent / 'src' / 'ishodnik.mp4'


async def page(p, scale):
    br = await p.chromium.launch()
    pg = await br.new_page(viewport={'width': 1080, 'height': 1920}, device_scale_factor=scale)
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' else None)
    await pg.goto(HTML.resolve().as_uri() + '?render=1')
    await pg.evaluate('document.fonts.ready')
    await pg.wait_for_timeout(400)
    return br, pg, errs


async def shots(a):
    from playwright.async_api import async_playwright
    out = Path('kadry_proverka'); out.mkdir(exist_ok=True)
    async with async_playwright() as p:
        br, pg, errs = await page(p, 1)
        for t in a.shots:
            await pg.evaluate(f'render({t})')
            png = out / f'ov_{t}.png'
            png.write_bytes(await pg.screenshot(omit_background=True))
            subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-ss', str(t), '-i', str(SRC),
                            '-i', str(png), '-frames:v', '1',
                            '-filter_complex', '[0:v][1:v]overlay=0:0,scale=540:-1',
                            '-q:v', '4', str(out / f'kadr_{t}.jpg')], check=True)
            png.unlink()
        await br.close()
        if errs:
            print('⚠ JS:', *dict.fromkeys(errs[:6]), sep='\n  ')
    # контакт-лист
    files = sorted((out / f'kadr_{t}.jpg' for t in a.shots), key=lambda p: a.shots.index(float(p.stem.split('_')[1])))
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', *sum([['-i', str(f)] for f in files], []),
                    '-filter_complex', f'{"".join(f"[{i}:v]" for i in range(len(files)))}hstack=inputs={len(files)}',
                    '-q:v', '3', str(out / 'svodka.jpg')], check=True)
    print('✓', out / 'svodka.jpg')


async def video(a):
    from playwright.async_api import async_playwright
    dur = a.end if a.end is not None else None
    async with async_playwright() as p:
        br, pg, errs = await page(p, a.scale)
        D = await pg.evaluate('window.DURATION')
        end = min(dur, D) if dur else D
        n = int(round((end - a.start) * a.fps))
        print(f'{n} кадров, {a.start:.2f}–{end:.2f} с, fps {a.fps}')
        ff = subprocess.Popen(
            ['ffmpeg', '-nostdin', '-y', '-v', 'error',
             '-ss', str(a.start), '-i', str(SRC),
             '-f', 'image2pipe', '-framerate', str(a.fps), '-i', '-',
             '-filter_complex', f'[0:v]fps={a.fps},trim=duration={end - a.start},setpts=PTS-STARTPTS[v];'
                                f'[1:v]setpts=PTS-STARTPTS[o];[v][o]overlay=0:0:format=auto,noise=alls=6:allf=t+u,format=yuv420p[vo]',
             '-map', '[vo]', '-map', '0:a',
             '-c:v', 'libx264', '-preset', 'medium', '-crf', str(a.crf),
             '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
             '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart',
             '-t', str(end - a.start), a.out], stdin=subprocess.PIPE)
        for i in range(n):
            await pg.evaluate(f'render({a.start + i / a.fps})')
            ff.stdin.write(await pg.screenshot(omit_background=True))
            if i % 250 == 0:
                print(f'  {i}/{n}', flush=True)
        await br.close()
        ff.stdin.close()
        ff.wait()
        if errs:
            print('⚠ JS:', *dict.fromkeys(errs[:6]), sep='\n  ')
    print('✓', a.out)


ap = argparse.ArgumentParser()
ap.add_argument('--shots', type=lambda s: [float(x) for x in s.split(',')])
ap.add_argument('--video', action='store_true')
ap.add_argument('--start', type=float, default=0)
ap.add_argument('--end', type=float)
ap.add_argument('--fps', type=int, default=25)
ap.add_argument('--scale', type=float, default=1)
ap.add_argument('--crf', type=int, default=18)
ap.add_argument('--out', default='ГОТОВО.mp4')
a = ap.parse_args()
asyncio.run(shots(a) if a.shots else video(a))

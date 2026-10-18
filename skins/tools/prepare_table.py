#!/usr/bin/env python3
"""v84: a table skin (the table top itself — surface, rim, shape) from a Gemini picture on a plain black (or green) background
-> skins/<file>.webp (1024 px, transparent around the table), <file>-thumb.webp (360 px), and the geometry for the catalog.

usage: python3 skins/tools/prepare_table.py <file> <picture.jpg|png> [black|green]

- the background is keyed out (black: how far the pixel is from black; green: how green it is); the table is the largest blob,
  pin-holes inside it are closed, the soft edge is un-premultiplied so the rim does not darken;
- the picture is cropped to a square around the table's box with a 2 % margin (the rim's glow stays), centred on the box;
- printed: the box (the table's width = 2 × the apothem for an octagon, the diameter for a circle), `fit` — the picture's width
  against the table's width (TABLES[].fit in src/12-skins.js), `ar` — the box's height / width (1 for a round or octagonal table),
  and the table's radius at a few angles (to tell the shape: equal everywhere — a circle; bigger at 22.5° — an octagon with flat sides)."""
import math, os, sys
import numpy as np
from PIL import Image, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.dirname(HERE)

def key(a, bg):
    x = a.astype(np.float32)
    if bg == 'green':
        r, g, b = x[..., 0], x[..., 1], x[..., 2]; k = g - np.maximum(r, b)  # how much greener than anything else
        return np.clip(1 - (k - 40) / 60, 0, 1)
    lum = x.max(axis=2); return np.clip((lum - 3) / 10, 0, 1)

def main(name, src, bg='black'):
    im = Image.open(src).convert('RGB'); a = np.asarray(im); H, W = a.shape[:2]
    al = key(a, bg)
    try:
        import cv2
        hard = (al > 0.5).astype(np.uint8); n, lab, st, _ = cv2.connectedComponentsWithStats(hard, 8)
        if n > 1: big = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA])); al = al * (lab == big)  # the table only: no specks, no stray glow
        inv = (al < 0.5).astype(np.uint8); n2, lab2, st2, _ = cv2.connectedComponentsWithStats(inv, 4)
        for k in range(1, n2):  # holes inside the table (dark leather, deep shadow) are the table
            xk, yk, wk, hk, ak = st2[k]
            if xk > 0 and yk > 0 and xk + wk < W and yk + hk < H: al[lab2 == k] = 1.0
    except ImportError: pass
    ys, xs = np.where(al > 0.5); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    bw, bh = x1 - x0, y1 - y0; cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    half = int(round(max(bw, bh) / 2 * 1.02)); side = half * 2
    print('box', (x0, y0, x1, y1), 'width', bw, 'height', bh, 'centre', (cx, cy))
    print('catalog: fit %.3f, ar %.3f' % (side / bw, bh / bw))
    m = al > 0.5
    for deg in (0, 22.5, 45, 67.5, 90):
        t = math.radians(deg); r = 0
        for rr in range(0, int(half * 1.2)):
            x, y = int(round(cx + rr * math.cos(t))), int(round(cy - rr * math.sin(t)))
            if 0 <= x < W and 0 <= y < H and m[y, x]: r = rr
        print('  radius at %5.1f° = %.4f of the table\'s half-width' % (deg, r / (bw / 2)))
    # colour at the soft edge was seen over the background: divide by alpha so the edge keeps the rim's own colour
    col = a.astype(np.float32); edge = (al > 0.02) & (al < 0.98)
    if bg == 'black': un = np.clip(col / np.maximum(al, 0.2)[..., None], 0, 255); col = np.where(edge[..., None], un, col)
    rgba = np.dstack([col, al * 255]).astype(np.uint8)
    pic = Image.fromarray(rgba, 'RGBA'); canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.paste(pic, (int(round(half - cx)), int(round(half - cy))))
    big = canvas.resize((1024, 1024), Image.LANCZOS); big.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=86, method=6)
    canvas.resize((360, 360), Image.LANCZOS).save(os.path.join(OUT, name + '-thumb.webp'), 'WEBP', quality=80, method=6)
    os.makedirs(os.path.join(OUT, 'src'), exist_ok=True); im.save(os.path.join(OUT, 'src', name + '.jpg'), quality=92)
    for f in ('.webp', '-thumb.webp'): p = os.path.join(OUT, name + f); print(p, os.path.getsize(p))

if __name__ == '__main__':
    if len(sys.argv) < 3: print(__doc__); sys.exit(1)
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else 'black')

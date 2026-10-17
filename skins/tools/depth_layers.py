#!/usr/bin/env python3
"""A depth map drawn by layers — for flat, symmetrical art where Depth Anything guesses wrong (v79: the mythic card back).

usage: python3 skins/tools/depth_layers.py <face 800×1200> <layers.json> <out-depth.png>

Depth Anything read the «Untouchable» back (a flat emblem on lacquer) as the frame far away and the medallion flat: in 3D the frame
wobbled and nothing stood out. Here the layers are named in the 800×1200 face's pixels, painted in order (later = on top), then
softened; the frame is the app's reference plane (230 — it never moves, as in prepare_skin.py), above 230 stands in front of it.
Shapes: circle {c, r}, diamond {c, h}, poly {pts}, line {a, b, w}, rect {box}; «dark» {within: <shape>, vmax} — only the pixels of
the face darker than vmax inside the shape (a silhouette); «halo» {c, r0, r1, v0} — a soft rise of the background around an emblem.
Writes 400×600 (white = near), like the other depth maps.
"""
import json, sys
import numpy as np, cv2

FRAME = 230


def shape_mask(sh, H, W):
    m = np.zeros((H, W), np.uint8); t = sh['type']
    if t == 'circle': cv2.circle(m, tuple(map(int, sh['c'])), int(sh['r']), 1, -1)
    elif t == 'diamond': x, y = sh['c']; h = sh['h']; cv2.fillPoly(m, [np.array([[x, y - h], [x + h, y], [x, y + h], [x - h, y]], np.int32)], 1)
    elif t == 'poly': cv2.fillPoly(m, [np.array(sh['pts'], np.int32)], 1)
    elif t == 'line': cv2.line(m, tuple(map(int, sh['a'])), tuple(map(int, sh['b'])), 1, int(sh['w']))
    elif t == 'rect': x0, y0, x1, y1 = sh['box']; m[y0:y1, x0:x1] = 1
    else: raise SystemExit('unknown shape ' + t)
    return m > 0


def main():
    face_p, layers_p, out_p = sys.argv[1:4]
    face = cv2.imread(face_p); H, W = face.shape[:2]; V = face.max(axis=2).astype(np.float32)
    L = json.load(open(layers_p)); d = np.full((H, W), float(L.get('base', 110)), np.float32)
    yy, xx = np.mgrid[0:H, 0:W]
    for sh in L['shapes']:
        t = sh['type']
        if t == 'halo':
            r = np.hypot(xx - sh['c'][0], yy - sh['c'][1]); k = np.clip(1 - (r - sh['r0']) / (sh['r1'] - sh['r0']), 0, 1)
            d = np.maximum(d, L.get('base', 110) + (sh['v0'] - L.get('base', 110)) * k)
        elif t == 'dark': d[shape_mask(sh['within'], H, W) & (V < sh['vmax'])] = sh['v']
        else: d[shape_mask(sh, H, W)] = sh['v']
    d = cv2.GaussianBlur(d, (0, 0), L.get('soft', 3.0))  # soft steps: the parallax shader stretches hard ones
    # the frame band and the corner plates: exactly the reference plane, with a soft inner edge
    x0, y0, x1, y1 = L['frame']['inner']; c = L['frame'].get('corners', 0)
    fm = np.ones((H, W), np.float32); fm[y0:y1, x0:x1] = 0
    for (cx, cy) in [(0, 0), (W - c, 0), (0, H - c), (W - c, H - c)]: fm[cy:cy + c, cx:cx + c] = 1
    fm = cv2.GaussianBlur(fm, (0, 0), 2.0)
    d = fm * FRAME + (1 - fm) * d
    out = cv2.resize(np.clip(d, 0, 255).astype(np.uint8), (W // 2, H // 2), interpolation=cv2.INTER_AREA)
    cv2.imwrite(out_p, out); print(out_p, out.shape, 'min/max', int(out.min()), int(out.max()))


if __name__ == '__main__':
    main()

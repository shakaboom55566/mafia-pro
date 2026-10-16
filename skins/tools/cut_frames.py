#!/usr/bin/env python3
"""v74: avatar frames from a Gemini sheet — 3×3 frames on a flat pure blue background (#0000FF) → one transparent 320 px PNG per frame
and its hole (the ring's inner circle / the frame's size — the app scales the frame so the hole fits the avatar).
usage: python3 skins/tools/cut_frames.py <sheet.jpg> <out dir> name1 … name9 > meta.json   (then save each PNG as skins/frame-<id>.webp)
- alpha from «blueness» (B − max(R, G)): the flat blue → transparent, glows → half, the frames → solid; the blue left in soft edges is removed;
- the hole: rays from the frame's middle to the first solid pixel, rays that hit an intruder (a cauldron, a pumpkin) much sooner are ignored,
  a circle is fitted to the rest; the crop is a square around the hole that holds the whole frame. A frame with no hole gets hole ≈ 0 — skip it."""
import numpy as np, cv2, json, sys
im = cv2.imread(sys.argv[1]).astype(np.float32); H, W = im.shape[:2]
B, G, R = im[..., 0], im[..., 1], im[..., 2]
blue = B - np.maximum(R, G)
alpha = np.clip((205 - blue) / 85, 0, 1)            # the flat blue → 0, the frames → 1, glows in between
# despill: the blue that shows through soft edges goes
mx = np.maximum(R, G); soft = alpha < 0.985
B2 = np.where(soft, np.minimum(B, mx + 25 * alpha), B)
rgb = np.dstack([B2, G, R])
names = sys.argv[3:12]; OUT = sys.argv[2]
cell = W / 3; out = {}
for i, name in enumerate(names):
    cx0, cy0 = int((i % 3) * cell), int((i // 3) * cell); cx1, cy1 = int(cx0 + cell), int(cy0 + cell)
    a = alpha[cy0:cy1, cx0:cx1]; solid = (a > 0.5).astype(np.uint8)
    ys, xs = np.nonzero(solid); bx0, bx1, by0, by1 = xs.min(), xs.max(), ys.min(), ys.max(); bcx, bcy = (bx0 + bx1) / 2, (by0 + by1) / 2
    bg = (1 - solid).astype(np.uint8); dist = cv2.distanceTransform(bg, cv2.DIST_L2, 5)
    # the hole: the widest free circle near the frame's middle
    yy, xx = np.mgrid[0:solid.shape[0], 0:solid.shape[1]]
    # the hole: the ring's inner circle — rays from the middle to the first solid pixel; rays that hit an intruder
    # (a cauldron, a pumpkin) much sooner than the rest are ignored, the circle is fitted to the others
    cx, cy = bcx, bcy
    for it in range(6):
        pts = []
        for t in np.linspace(0, 2 * np.pi, 240, endpoint=False):
            dx, dy = np.cos(t), np.sin(t); hit = None
            for rr in range(4, int(max(bx1 - bx0, by1 - by0))):
                x, y = int(cx + dx * rr), int(cy + dy * rr)
                if x < 0 or y < 0 or x >= solid.shape[1] or y >= solid.shape[0]: break
                if solid[y, x]: hit = (rr, x, y); break
            if hit: pts.append(hit)
        rs = np.array([p[0] for p in pts], float); med = np.median(rs); keep = [p for p in pts if p[0] > 0.82 * med]
        X = np.array([[p[1], p[2], 1.0] for p in keep]); Y = np.array([-(p[1] ** 2 + p[2] ** 2) for p in keep])
        a_, b_, c_ = np.linalg.lstsq(X, Y, rcond=None)[0]; ncx, ncy = -a_ / 2, -b_ / 2
        if abs(ncx - cx) < 0.5 and abs(ncy - cy) < 0.5: break
        cx, cy = ncx, ncy
    rr_in = np.array([np.hypot(p[1] - cx, p[2] - cy) for p in keep]); rh = float(np.percentile(rr_in, 35)); hx, hy = int(round(cx)), int(round(cy))
    intr = 1 - len(keep) / max(1, len(pts))
    # the crop: a square around the hole that holds the whole frame
    half = max(np.hypot(xs - hx, ys - hy).max() * 0.0 + max(hx - bx0, bx1 - hx, hy - by0, by1 - hy), rh) + 8
    out[name] = { 'hole': round(rh / half, 4), 'rh': round(rh, 1), 'half': round(float(half), 1), 'center': [int(cx0 + hx), int(cy0 + hy)], 'intruded': round(float(intr), 2), 'fillsHole': bool(rh < 0.25 * max(bx1 - bx0, by1 - by0) / 2) }
    x0, y0 = int(cx0 + hx - half), int(cy0 + hy - half); S = int(2 * half)
    pad = 700; big = np.zeros((H + 2 * pad, W + 2 * pad, 4), np.float32); big[pad:pad + H, pad:pad + W, :3] = rgb; big[pad:pad + H, pad:pad + W, 3] = alpha * 255
    crop = big[y0 + pad:y0 + pad + S, x0 + pad:x0 + pad + S]
    # only this frame: drop pixels of neighbours (outside this cell)
    m = np.zeros((S, S), np.float32); cy_off, cx_off = cy0 - y0, cx0 - x0
    m[max(0, cy_off):min(S, cy_off + int(cell)), max(0, cx_off):min(S, cx_off + int(cell))] = 1; crop[..., 3] *= m
    small = cv2.resize(crop, (320, 320), interpolation=cv2.INTER_AREA)
    cv2.imwrite(f'{OUT}/{name}.png', np.clip(small, 0, 255).astype(np.uint8))
print(json.dumps(out, indent=0))

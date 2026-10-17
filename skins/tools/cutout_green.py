#!/usr/bin/env python3
"""The heroine alone out of a Gemini video made on a GREEN screen (#00FF00) → a «stacked alpha» video for the living card.

usage: python3 skins/tools/cutout_green.py <in.mp4> <out.mp4> <out.json> [height=900] [first_sec] [last_sec]

A chroma key measured against a CLEAN PLATE: for every pixel, the greenest it ever gets in the clip (she and her shadow only
lower it) — Gemini's screen is not one green (the wall is ~90 greener than red/blue, the lit floor only ~60), so a fixed
threshold leaves the floor half-opaque. alpha = 1 − how much of the plate's greenness this frame still shows, with a soft ramp
so hair and motion blur keep real transparency. The floor shadow (the plate, only darker, far from her solid body) is screen.
Despill removes the green cast at the edge. Only the silhouette connected to her body is kept.
NO "static frame" mask: a per-pixel minimum over the clip mixes her colours with the screen's wherever she ever passed and
erased her feet, hands and ponytail in those places (the owner's marks on v70, 17.10.2026).
The output: top half her colour (edge filled with her own colour), bottom half the alpha; cropped to the union box.
"""
import json, os, subprocess, sys, tempfile
import numpy as np, cv2


def main():
    src, out_mp4, out_json = sys.argv[1:4]; target_h = int(sys.argv[4]) if len(sys.argv) > 4 else 900
    t0 = float(sys.argv[5]) if len(sys.argv) > 5 else 0; t1 = float(sys.argv[6]) if len(sys.argv) > 6 else 1e9
    # pass 0: which frames, and the clean plate — per pixel the greenest moment of the clip and its colour (one frame in memory at a time)
    cap = cv2.VideoCapture(src); fps = cap.get(cv2.CAP_PROP_FPS) or 24; idx = []; gmax = None; col = None; i = 0
    while True:
        ok, f = cap.read()
        if not ok: break
        t = i / fps
        if t0 <= t <= t1:
            idx.append(i); fi = f.astype(np.int16); g = fi[..., 1] - np.maximum(fi[..., 0], fi[..., 2])
            if gmax is None: gmax = g.copy(); col = f.copy()
            else: up = g > gmax; gmax[up] = g[up]; col[up] = f[up]
        i += 1
    H, W = gmax.shape; print('frames', len(idx), W, H, 'fps', fps, flush=True)
    gp = cv2.GaussianBlur(cv2.medianBlur(np.clip(gmax, 0, 255).astype(np.uint8), 5).astype(np.float32), (0, 0), 3)
    cp = cv2.GaussianBlur(cv2.medianBlur(col, 5).astype(np.float32), (0, 0), 3); cp /= np.linalg.norm(cp, axis=2, keepdims=True) + 1e-3
    hi = np.minimum(gp * 0.8, 55.0); lo = np.minimum(15.0, hi * 0.35)  # g ≤ lo → hers (dark hair with a green bounce stays hers), g ≥ hi → screen
    floor = (gp < 72) & (np.arange(H)[:, None] > H * 0.55)  # the lit floor: the plate there is paler than the wall
    print('plate greenness p1/p50/p99', np.percentile(gp, [1, 50, 99]).round(1), 'floor px', int(floor.sum()), flush=True)
    del gmax, col
    # pass 1: the alpha of every frame (uint8) and the union box
    def key(f):
        x = f.astype(np.float32); R, G, B = x[..., 2], x[..., 1], x[..., 0]  # BGR in
        g = G - np.maximum(R, B)
        a = 1 - np.clip((g - lo) / (hi - lo), 0, 1)
        core = cv2.morphologyEx((a > 0.9).astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        dist = cv2.distanceTransform(1 - core, cv2.DIST_L2, 5)
        cos = (x * cp).sum(2) / (np.linalg.norm(x, axis=2) + 1e-3)  # same colour direction as the plate = a shadow on it
        a[floor & (cos > 0.985) & (dist > 8) & (a < 0.95)] = 0
        hard = (a > 0.5).astype(np.uint8); n, lab, st, _ = cv2.connectedComponentsWithStats(hard, 8)
        if n > 1:
            areas = st[1:, cv2.CC_STAT_AREA]; big = 1 + int(np.argmax(areas)); keep = lab == big
            near = cv2.dilate(keep.astype(np.uint8), np.ones((25, 25), np.uint8)) > 0
            for k in range(1, n):
                if k != big and areas[k - 1] > areas[big - 1] * 0.01 and (near & (lab == k)).any(): keep |= lab == k
            a = a * (cv2.dilate(keep.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0)
        hard = (a > 0.5).astype(np.uint8); inv = (1 - hard).astype(np.uint8); n2, lab2, st2, _ = cv2.connectedComponentsWithStats(inv, 4)
        for k in range(1, n2):
            xk, yk, wk, hk, ak = st2[k]
            if ak < 40 and xk > 0 and yk > 0 and xk + wk < W and yk + hk < H: a[lab2 == k] = 1.0
        a = cv2.GaussianBlur(a, (0, 0), 0.6)
        G2 = np.minimum(G, np.maximum(R, B) * 1.02 + 4); c = np.dstack([R, G2, B])  # despill, RGB out
        return np.clip(a, 0, 1), c
    cap = cv2.VideoCapture(src); alphas = []; uni = np.zeros((H, W), bool); j = 0; want = set(idx)
    while True:
        ok, f = cap.read()
        if not ok: break
        if j in want:
            a, _ = key(f); a8 = (a * 255).astype(np.uint8); alphas.append(a8); uni |= a8 > 20
        j += 1
    ys, xs = np.where(uni)
    pad = 14; x0, x1 = max(0, xs.min() - pad), min(W, xs.max() + pad + 1); y0, y1 = max(0, ys.min() - pad), min(H, ys.max() + pad + 1)
    cw, ch = x1 - x0, y1 - y0; s = target_h / ch; ow = int(round(cw * s / 2) * 2); oh = int(round(target_h / 2) * 2)
    print('crop', (x0, y0, x1, y1), '→', ow, 'x', oh, flush=True)
    # pass 2: the stacked frames
    tmp = tempfile.mkdtemp(prefix='cutgrn'); track = []; cap = cv2.VideoCapture(src); j = 0; k = 0
    while True:
        ok, f = cap.read()
        if not ok: break
        if j in want:
            a = alphas[k].astype(np.float32)[y0:y1, x0:x1] / 255; _, c = key(f); c = c[y0:y1, x0:x1]
            kk = cv2.GaussianBlur(a, (0, 0), 8) + 1e-4; fill = cv2.GaussianBlur(c * a[..., None], (0, 0), 8) / kk[..., None]
            c = c * a[..., None] + fill * (1 - a[..., None])
            c = cv2.resize(c, (ow, oh), interpolation=cv2.INTER_AREA); a2 = cv2.resize(a, (ow, oh), interpolation=cv2.INTER_AREA)
            stack = np.vstack([np.clip(c, 0, 255), np.repeat(a2[..., None] * 255, 3, axis=2)]).astype(np.uint8)
            cv2.imwrite(os.path.join(tmp, 'f%04d.png' % k), cv2.cvtColor(stack, cv2.COLOR_RGB2BGR))
            yy, xx = np.where(a2 > 0.3)
            track.append([round(float((xx * a2[yy, xx]).sum() / a2[yy, xx].sum()) / ow, 4), round(float((yy * a2[yy, xx]).sum() / a2[yy, xx].sum()) / oh, 4), round(yy.min() / oh, 4), round((yy.max() + 1) / oh, 4)] if len(xx) else None)
            k += 1
        j += 1
    for ext, args in [('mp4', ['-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'slow', '-movflags', '+faststart']), ('webm', ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '32', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', '-pix_fmt', 'yuv420p'])]:
        o = out_mp4[:-4] + '.' + ext
        subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-framerate', str(fps), '-i', os.path.join(tmp, 'f%04d.png')] + args + ['-an', o]); print(ext, os.path.getsize(o), flush=True)
    json.dump({'src': [W, H], 'crop': [round(x0 / W, 4), round(y0 / H, 4), round(x1 / W, 4), round(y1 / H, 4)], 'size': [ow, oh], 'fps': fps, 'frames': len(idx), 'dur': round(len(idx) / fps, 3), 'track': track}, open(out_json, 'w'), separators=(',', ':'))
    print('first', track[0], 'last', track[-1])


if __name__ == '__main__':
    main()

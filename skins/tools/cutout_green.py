#!/usr/bin/env python3
"""The heroine alone out of a Gemini video made on a GREEN screen (#00FF00) → a «stacked alpha» video for the living card.

usage: python3 skins/tools/cutout_green.py <in.mp4> <out.mp4> <out.json> [height=900] [first_sec] [last_sec]

A chroma key: alpha = 1 − how green the pixel is beyond its red/blue (G − max(R, B)), with a soft ramp so hair and the
scarf's edge keep real transparency; despill removes the green cast at the edge; the static card frame Gemini may leave is
removed as the per-pixel minimum over the clip (it never moves, she does). Only the silhouette connected to her body is kept.
The output: top half her colour (edge filled with her own colour), bottom half the alpha; cropped to the union box.
"""
import json, os, subprocess, sys, tempfile
import numpy as np, cv2


def main():
    src, out_mp4, out_json = sys.argv[1:4]; target_h = int(sys.argv[4]) if len(sys.argv) > 4 else 900
    t0 = float(sys.argv[5]) if len(sys.argv) > 5 else 0; t1 = float(sys.argv[6]) if len(sys.argv) > 6 else 1e9
    # pass 0: which frames, and the static non-green minimum (the card frame if Gemini drew one) — uint8, one frame in memory at a time
    cap = cv2.VideoCapture(src); fps = cap.get(cv2.CAP_PROP_FPS) or 24; idx = []; mn = None; i = 0
    while True:
        ok, f = cap.read()
        if not ok: break
        t = i / fps
        if t0 <= t <= t1:
            idx.append(i); mn = f.copy() if mn is None else np.minimum(mn, f)
        i += 1
    H, W = mn.shape[:2]; print('frames', len(idx), W, H, 'fps', fps, flush=True)
    mnf = mn.astype(np.float32); static_non_green = ((mnf.max(axis=2) > 40) & ((mnf[..., 1] - np.maximum(mnf[..., 0], mnf[..., 2])) < 60)).astype(np.uint8)
    static_non_green = cv2.dilate(static_non_green, np.ones((7, 7), np.uint8)); print('static frame pixels:', int(static_non_green.sum()), flush=True)
    del mnf
    # pass 1: the alpha of every frame (uint8) and the union box
    def key(f):
        x = f.astype(np.float32); R, G, B = x[..., 2], x[..., 1], x[..., 0]  # BGR in
        g = G - np.maximum(R, B)
        a = 1 - np.clip((g - 15) / 40.0, 0, 1)  # g ≤ 15 → hers, g ≥ 55 → screen (Gemini's screen is ~82–94, her colours never go green)
        a[static_non_green > 0] = 0
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

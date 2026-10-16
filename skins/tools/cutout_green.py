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
    cap = cv2.VideoCapture(src); fps = cap.get(cv2.CAP_PROP_FPS) or 24; frames = []; i = 0
    while True:
        ok, f = cap.read()
        if not ok: break
        t = i / fps; i += 1
        if t0 <= t <= t1: frames.append(cv2.cvtColor(f, cv2.COLOR_BGR2RGB).astype(np.float32))
    H, W = frames[0].shape[:2]; print('frames', len(frames), W, H, 'fps', fps)
    # what never moves = the card frame (if Gemini drew one) → never her. Green itself is "static" too but is removed by the key anyway
    mn = np.min(np.stack(frames[::3]), axis=0); static_non_green = ((mn.max(axis=2) > 40) & ((mn[..., 1] - np.maximum(mn[..., 0], mn[..., 2])) < 60)).astype(np.uint8)
    static_non_green = cv2.dilate(static_non_green, np.ones((7, 7), np.uint8))
    print('static frame pixels:', int(static_non_green.sum()))
    alphas, colors = [], []
    for x in frames:
        R, G, B = x[..., 0], x[..., 1], x[..., 2]
        g = G - np.maximum(R, B)  # how green beyond her own colours (her red/black/gold never has G as the top channel)
        a = 1 - np.clip((g - 20) / 70.0, 0, 1)  # g ≤ 20 → hers, g ≥ 90 → screen
        a[static_non_green > 0] = 0
        # only the silhouette connected to her body (sparks, specks, frame glow are separate)
        hard = (a > 0.5).astype(np.uint8); n, lab, st, _ = cv2.connectedComponentsWithStats(hard, 8)
        if n > 1:
            areas = st[1:, cv2.CC_STAT_AREA]; big = 1 + int(np.argmax(areas)); keep = lab == big
            near = cv2.dilate(keep.astype(np.uint8), np.ones((25, 25), np.uint8)) > 0
            for k in range(1, n):
                if k != big and areas[k - 1] > areas[big - 1] * 0.01 and (near & (lab == k)).any(): keep |= lab == k
            a = a * (cv2.dilate(keep.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0)
        # pin-holes inside her (< 40 px²) → closed; real pockets stay
        hard = (a > 0.5).astype(np.uint8); inv = (1 - hard).astype(np.uint8); n2, lab2, st2, _ = cv2.connectedComponentsWithStats(inv, 4)
        for k in range(1, n2):
            xk, yk, wk, hk, ak = st2[k]
            if ak < 40 and xk > 0 and yk > 0 and xk + wk < W and yk + hk < H: a[lab2 == k] = 1.0
        a = cv2.GaussianBlur(a, (0, 0), 0.6)
        # despill: green never exceeds the larger of red / blue on her
        G2 = np.minimum(G, np.maximum(R, B) * 1.02 + 4); c = np.dstack([R, G2, B])
        alphas.append(np.clip(a, 0, 1).astype(np.float32)); colors.append(c)
    uni = np.max(np.stack([a > 0.08 for a in alphas]), axis=0); ys, xs = np.where(uni)
    pad = 14; x0, x1 = max(0, xs.min() - pad), min(W, xs.max() + pad + 1); y0, y1 = max(0, ys.min() - pad), min(H, ys.max() + pad + 1)
    cw, ch = x1 - x0, y1 - y0; s = target_h / ch; ow = int(round(cw * s / 2) * 2); oh = int(round(target_h / 2) * 2)
    print('crop', (x0, y0, x1, y1), '→', ow, 'x', oh)
    tmp = tempfile.mkdtemp(prefix='cutgrn'); track = []
    for i, (c, a) in enumerate(zip(colors, alphas)):
        a = a[y0:y1, x0:x1]; c = c[y0:y1, x0:x1]
        k = cv2.GaussianBlur(a, (0, 0), 8) + 1e-4; fill = cv2.GaussianBlur(c * a[..., None], (0, 0), 8) / k[..., None]
        c = c * a[..., None] + fill * (1 - a[..., None])
        c = cv2.resize(c, (ow, oh), interpolation=cv2.INTER_AREA); a2 = cv2.resize(a, (ow, oh), interpolation=cv2.INTER_AREA)
        stack = np.vstack([np.clip(c, 0, 255), np.repeat(a2[..., None] * 255, 3, axis=2)]).astype(np.uint8)
        cv2.imwrite(os.path.join(tmp, 'f%04d.png' % i), cv2.cvtColor(stack, cv2.COLOR_RGB2BGR))
        yy, xx = np.where(a2 > 0.3)
        track.append([round(float((xx * a2[yy, xx]).sum() / a2[yy, xx].sum()) / ow, 4), round(float((yy * a2[yy, xx]).sum() / a2[yy, xx].sum()) / oh, 4), round(yy.min() / oh, 4), round((yy.max() + 1) / oh, 4)] if len(xx) else None)
    for ext, args in [('mp4', ['-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'slow', '-movflags', '+faststart']), ('webm', ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '32', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', '-pix_fmt', 'yuv420p'])]:
        o = out_mp4[:-4] + '.' + ext
        subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-framerate', str(fps), '-i', os.path.join(tmp, 'f%04d.png')] + args + ['-an', o]); print(ext, os.path.getsize(o))
    json.dump({'src': [W, H], 'crop': [round(x0 / W, 4), round(y0 / H, 4), round(x1 / W, 4), round(y1 / H, 4)], 'size': [ow, oh], 'fps': fps, 'frames': len(frames), 'dur': round(len(frames) / fps, 3), 'track': track}, open(out_json, 'w'), separators=(',', ':'))
    print('first', track[0], 'last', track[-1])


if __name__ == '__main__':
    main()

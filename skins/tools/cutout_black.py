#!/usr/bin/env python3
"""The heroine out of a Gemini video made on a PURE BLACK background → a «stacked alpha» video for the living card.

usage: python3 skins/tools/cutout_black.py <in.mp4> <out.mp4> <out.json> [height=900] [first_sec] [last_sec]

Black is the easiest key: alpha = how far the pixel is from black, with her dark armour kept by a small morphological
fill (a pixel surrounded by her is hers even when it is nearly black). The edge is estimated as real transparency
(hair, the scarf's edge, embers), colour is un-premultiplied (divided by alpha) so the edge does not darken.
The output video: the top half is her colour (edge filled with her own colour), the bottom half the alpha in grey;
every frame is cropped to one box (the union of where she ever is). The JSON: size, fps, length and per frame her centre
and vertical bounds (fractions of the crop).
"""
import json, os, subprocess, sys, tempfile
import numpy as np, cv2


def main():
    src, out_mp4, out_json = sys.argv[1:4]; target_h = int(sys.argv[4]) if len(sys.argv) > 4 else 900
    t0 = float(sys.argv[5]) if len(sys.argv) > 5 else 0; t1 = float(sys.argv[6]) if len(sys.argv) > 6 else 1e9
    cap = cv2.VideoCapture(src); fps = cap.get(cv2.CAP_PROP_FPS) or 24; frames = []
    i = 0
    while True:
        ok, f = cap.read()
        if not ok: break
        t = i / fps; i += 1
        if t0 <= t <= t1: frames.append(cv2.cvtColor(f, cv2.COLOR_BGR2RGB))
    H, W = frames[0].shape[:2]; print('frames', len(frames), W, H, 'fps', fps)
    alphas, colors = [], []
    for f in frames:
        x = f.astype(np.float32)
        lum = x.max(axis=2)  # the brightest channel: dark red cloth still counts
        a = np.clip((lum - 10) / 42.0, 0, 1)  # 10 → 0, 52+ → 1
        # her body: a filled, closed silhouette — nearly-black folds inside her stay hers
        hard = (a > 0.6).astype(np.uint8)
        n, lab, st, _ = cv2.connectedComponentsWithStats(hard, 8)
        if n > 1:
            areas = st[1:, cv2.CC_STAT_AREA]; big = 1 + int(np.argmax(areas)); keep = lab == big
            for k in range(1, n):
                if k != big and areas[k - 1] > areas[big - 1] * 0.01: keep |= lab == k
            hard = keep.astype(np.uint8)
        body = cv2.morphologyEx(hard, cv2.MORPH_CLOSE, np.ones((21, 21), np.uint8))
        inv = (1 - body).astype(np.uint8); n2, lab2, st2, _ = cv2.connectedComponentsWithStats(inv, 4)
        for k in range(1, n2):  # holes fully inside her → hers
            xk, yk, wk, hk, ak = st2[k]
            if xk > 0 and yk > 0 and xk + wk < W and yk + hk < H and ak < 0.02 * W * H: body[lab2 == k] = 1
        near = cv2.dilate(body, np.ones((9, 9), np.uint8)) > 0
        a = np.where(body > 0, np.maximum(a, 0.92), a); a = a * near  # soft edge only right at the body; stray glow far away goes
        a = cv2.GaussianBlur(a, (0, 0), 0.6)
        alphas.append(np.clip(a, 0, 1).astype(np.float32)); colors.append(x)
    uni = np.max(np.stack([a > 0.08 for a in alphas]), axis=0); ys, xs = np.where(uni)
    pad = 14; x0, x1 = max(0, xs.min() - pad), min(W, xs.max() + pad + 1); y0, y1 = max(0, ys.min() - pad), min(H, ys.max() + pad + 1)
    cw, ch = x1 - x0, y1 - y0; s = target_h / ch; ow = int(round(cw * s / 2) * 2); oh = int(round(target_h / 2) * 2)
    print('crop', (x0, y0, x1, y1), '→', ow, 'x', oh)
    tmp = tempfile.mkdtemp(prefix='cutblk'); track = []
    for i, (c, a) in enumerate(zip(colors, alphas)):
        a = a[y0:y1, x0:x1]; c = c[y0:y1, x0:x1]
        # un-premultiply at the soft edge: the camera saw her colour × alpha over black
        un = np.clip(c / np.maximum(a, 0.15)[..., None], 0, 255); c = np.where((a > 0.02)[..., None] & (a < 0.98)[..., None], un, c)
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

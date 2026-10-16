#!/usr/bin/env python3
"""The heroine alone, without her background, out of the Gemini cinematic → a «stacked alpha» video for the living card.

usage: python3 skins/tools/cutout_video.py <frames dir with %04d.png> <first> <last> <models dir> <out.mp4> <out.json> [height=720]

The person is separated from the background by U²-Net (human segmentation, ONNX; models dir holds u2net_human_seg.onnx),
the matte is smoothed in time (3 frames) so the edge does not flicker. The output video is twice as tall as the picture:
the top half is her colour (the edge filled with her own colour, so compression does not bleed the background in),
the bottom half is the alpha matte in grey. The app draws it with a small WebGL shader (src/17-mythic.js).
Every frame is cropped to one box (the union of where she ever is); the JSON holds the box (fractions of the source
frame), the size, fps, the length and per frame her centre and bounds (fractions of the crop).
"""
import json, os, subprocess, sys, tempfile
import numpy as np, cv2, onnxruntime as ort


def main():
    src, first, last, models, out_mp4, out_json = sys.argv[1:7]; first, last = int(first), int(last)
    target_h = int(sys.argv[7]) if len(sys.argv) > 7 else 720
    sess = ort.InferenceSession(os.path.join(models, 'u2net_human_seg.onnx'), providers=['CPUExecutionProvider']); inp = sess.get_inputs()[0].name
    mean, std = np.array([0.485, 0.456, 0.406], np.float32), np.array([0.229, 0.224, 0.225], np.float32)
    frames = [cv2.cvtColor(cv2.imread(os.path.join(src, '%04d.png' % f)), cv2.COLOR_BGR2RGB) for f in range(first, last + 1)]
    H, W = frames[0].shape[:2]
    mattes = []
    for i, img in enumerate(frames):
        x = cv2.resize(img, (320, 320), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0
        x = ((x - mean) / std).transpose(2, 0, 1)[None]
        m = sess.run(None, {inp: x})[0][0, 0]; m = (m - m.min()) / (m.max() - m.min() + 1e-6)
        m = cv2.resize(m, (W, H), interpolation=cv2.INTER_LINEAR)
        mattes.append(m)
        if i % 20 == 0: print('matte', i, '/', len(frames), flush=True)
    # time smoothing + the largest blob(s) only (petals and sparks are not her)
    sm = []
    for i in range(len(mattes)):
        m = np.median(np.stack([mattes[max(0, i - 1)], mattes[i], mattes[min(len(mattes) - 1, i + 1)]]), axis=0)
        a = np.clip((m - 0.25) / 0.5, 0, 1)
        lab_n, lab, st, _ = cv2.connectedComponentsWithStats((a > 0.5).astype(np.uint8), 8)
        if lab_n > 1:
            areas = st[1:, cv2.CC_STAT_AREA]; big = 1 + int(np.argmax(areas)); keep = (lab == big)
            for k in range(1, lab_n):
                if k != big and areas[k - 1] > areas[big - 1] * 0.08: keep |= (lab == k)
            a = a * (cv2.dilate(keep.astype(np.uint8), np.ones((15, 15), np.uint8)) > 0)
        sm.append(cv2.GaussianBlur(a, (0, 0), 1.2))
    uni = np.max(np.stack([a > 0.1 for a in sm]), axis=0); ys, xs = np.where(uni)
    pad = 16; x0, x1 = max(0, xs.min() - pad), min(W, xs.max() + pad + 1); y0, y1 = max(0, ys.min() - pad), min(H, ys.max() + pad + 1)
    cw, ch = x1 - x0, y1 - y0; s = target_h / ch; ow = int(round(cw * s / 2) * 2); oh = int(round(target_h / 2) * 2)
    print('crop', (x0, y0, x1, y1), '→', ow, 'x', oh)
    tmp = tempfile.mkdtemp(prefix='cutout'); track = []
    for i, (img, a) in enumerate(zip(frames, sm)):
        a = a[y0:y1, x0:x1]; c = img[y0:y1, x0:x1].astype(np.float32)
        k = cv2.GaussianBlur(a, (0, 0), 8) + 1e-4; fill = cv2.GaussianBlur(c * a[..., None], (0, 0), 8) / k[..., None]
        c = c * a[..., None] + fill * (1 - a[..., None])
        c = cv2.resize(c, (ow, oh), interpolation=cv2.INTER_AREA); a2 = cv2.resize(a, (ow, oh), interpolation=cv2.INTER_AREA)
        stack = np.vstack([np.clip(c, 0, 255), np.repeat(a2[..., None] * 255, 3, axis=2)]).astype(np.uint8)
        cv2.imwrite(os.path.join(tmp, 'f%04d.png' % i), cv2.cvtColor(stack, cv2.COLOR_RGB2BGR))
        yy, xx = np.where(a2 > 0.3)
        track.append([round(float((xx * a2[yy, xx]).sum() / a2[yy, xx].sum()) / ow, 4), round(float((yy * a2[yy, xx]).sum() / a2[yy, xx].sum()) / oh, 4), round(xs.min() / ow, 4), round(ys.min() / oh, 4)] if len(xx) else None)
    fps = 24
    for ext, args in [('mp4', ['-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '22', '-preset', 'slow', '-movflags', '+faststart']), ('webm', ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '34', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', '-pix_fmt', 'yuv420p'])]:
        o = out_mp4[:-4] + '.' + ext
        subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-framerate', str(fps), '-i', os.path.join(tmp, 'f%04d.png')] + args + ['-an', o]); print(ext, os.path.getsize(o))
    json.dump({'src': [W, H], 'crop': [round(x0 / W, 4), round(y0 / H, 4), round(x1 / W, 4), round(y1 / H, 4)], 'size': [ow, oh], 'fps': fps, 'frames': len(frames), 'dur': round(len(frames) / fps, 3), 'track': track}, open(out_json, 'w'), separators=(',', ':'))


if __name__ == '__main__':
    main()

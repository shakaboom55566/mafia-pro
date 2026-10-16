#!/usr/bin/env python3
"""The heroine alone, without her background, out of the Gemini cinematic → a «stacked alpha» video for the living card.

usage: python3 skins/tools/cutout_video.py <frames dir with %04d.png> <first> <last> <models dir> <out.mp4> <out.json> [height=720]

How the matte is made (v70.2 — the first version lost arms, legs and the ponytail on fast poses):
 1. U²-Net human segmentation (ONNX, models dir: u2net_human_seg.onnx) on the whole frame — the coarse matte: the body,
    never the moon, but thin fast parts fall off;
 2. the same model on a tight square crop around her at full resolution, and on its mirror (averaged) — the fine matte: the
    tail, the arms, the blades come back, but sometimes the moon or a lantern leaks in;
 3. the fine matte is kept only where it touches the coarse body (connected to it) and is not moon-coloured (bright and
    pale) — the moon is the one thing out there that the model mistakes for skin;
 4. in time: every frame's matte is pushed forward and backward along the optical flow from its neighbours (Farneback),
    and a pixel that two of the three (own / from the previous / from the next) call hers is hers — a limb that flickers
    out for one frame is filled from the neighbours; the edge is then softened by a small guided blur;
 5. the colour under the transparent edge is filled with her own nearby colour, so compression never bleeds the background.
The output video is twice as tall as the picture: the top half is her colour, the bottom half the alpha in grey; the app
draws it with a WebGL shader (src/17-mythic.js). Every frame is cropped to one box (the union of where she ever is).
"""
import json, os, subprocess, sys, tempfile
import numpy as np, cv2, onnxruntime as ort

MEAN, STD = np.array([0.485, 0.456, 0.406], np.float32), np.array([0.229, 0.224, 0.225], np.float32)


class Matter:
    def __init__(self, models):
        so = ort.SessionOptions(); so.intra_op_num_threads = 8
        self.s = ort.InferenceSession(os.path.join(models, 'u2net_human_seg.onnx'), so, providers=['CPUExecutionProvider']); self.inp = self.s.get_inputs()[0].name

    def run(self, img):
        x = cv2.resize(img, (320, 320), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0
        x = ((x - MEAN) / STD).transpose(2, 0, 1)[None]; m = self.s.run(None, {self.inp: x})[0][0, 0]; m = (m - m.min()) / (m.max() - m.min() + 1e-6)
        return cv2.resize(m, (img.shape[1], img.shape[0]), interpolation=cv2.INTER_LINEAR)

    def coarse_fine(self, img):
        H, W = img.shape[:2]; coarse = self.run(img)
        ys, xs = np.where(coarse > 0.4)
        if len(xs) < 50: return coarse, coarse
        x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max(); side = int(max(x1 - x0, y1 - y0) * 1.35) + 40; cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
        X0, Y0 = max(0, cx - side // 2), max(0, cy - side // 2); X1, Y1 = min(W, X0 + side), min(H, Y0 + side); X0, Y0 = max(0, X1 - side), max(0, Y1 - side)
        crop = img[Y0:Y1, X0:X1]; ch, cw = crop.shape[:2]; S = max(ch, cw)
        pad = np.zeros((S, S, 3), np.uint8); pad[...] = np.median(crop.reshape(-1, 3), axis=0); pad[:ch, :cw] = crop
        acc = (self.run(pad) + self.run(pad[:, ::-1])[:, ::-1]) / 2
        fine = np.zeros((H, W), np.float32); fine[Y0:Y1, X0:X1] = acc[:ch, :cw]
        return coarse, fine


def combine(img, coarse, fine):
    """the fine matte where it is connected to the coarse body and not moon-coloured; else the coarse one"""
    body = (coarse > 0.5).astype(np.uint8)
    hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV).astype(np.float32)
    moon = (hsv[..., 2] > 150) & (hsv[..., 1] < 110)  # pale and bright: the moon, lantern glass, fog highlights — not her (dark armour, red cloth)
    # the fire trail and the petals are saturated red-orange and bright; her red cloth is darker — treat bright saturated pixels
    # that the coarse pass did not claim as effects, not her
    fire = (hsv[..., 2] > 190) & (hsv[..., 1] > 150) & (coarse < 0.3)
    moon = moon | fire
    cand = ((fine > 0.45) & ~moon).astype(np.uint8) | body
    n, lab = cv2.connectedComponents(cand, connectivity=8)
    keep = np.zeros_like(cand)
    for k in range(1, n):
        comp = lab == k
        if (body[comp] > 0).any(): keep[comp] = 1  # touches the body
    soft = np.where(keep > 0, np.maximum(coarse, fine), coarse * 0.0)
    soft = np.where(keep > 0, np.clip((soft - 0.3) / 0.5, 0, 1), 0)
    return soft.astype(np.float32)


def temporal(mattes, frames):
    """push each neighbour's matte along the flow onto this frame; majority of the three"""
    gray = [cv2.cvtColor(f, cv2.COLOR_RGB2GRAY) for f in frames]
    out = []
    for i in range(len(mattes)):
        votes = [mattes[i]]
        for j in (i - 1, i + 1):
            if j < 0 or j >= len(mattes): continue
            flow = cv2.calcOpticalFlowFarneback(gray[j], gray[i], None, 0.5, 4, 25, 3, 7, 1.5, 0)  # j → i
            h, w = gray[i].shape; yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
            # where does pixel (x, y) of frame i come from in frame j: inverse mapping ≈ subtract the flow
            mapx, mapy = xx - flow[..., 0], yy - flow[..., 1]
            votes.append(cv2.remap(mattes[j], mapx, mapy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0))
        v = np.stack(votes); hard = (v > 0.5).sum(0) >= (2 if len(votes) == 3 else 1)
        m = np.where(hard, np.maximum(mattes[i], v.max(0) * 0.9), mattes[i] * (1 - 0.5 * (len(votes) == 3)))
        m = np.clip(m, 0, 1)
        # a soft edge that follows the picture
        m = cv2.bilateralFilter(m.astype(np.float32), 7, 0.25, 5)  # a soft edge that still follows the silhouette
        out.append(np.clip(m.astype(np.float32), 0, 1))
    return out


def main():
    src, first, last, models, out_mp4, out_json = sys.argv[1:7]; first, last = int(first), int(last)
    target_h = int(sys.argv[7]) if len(sys.argv) > 7 else 720
    mt = Matter(models)
    frames = [cv2.cvtColor(cv2.imread(os.path.join(src, '%04d.png' % f)), cv2.COLOR_BGR2RGB) for f in range(first, last + 1)]
    H, W = frames[0].shape[:2]
    cache = os.path.join(src, 'mattes_%d_%d.npz' % (first, last)); mattes = []
    if os.path.exists(cache): mattes = [m.astype(np.float32) for m in np.load(cache)['m']]; print('mattes from cache', flush=True)
    else:
        for i, img in enumerate(frames):
            c, f = mt.coarse_fine(img); mattes.append(combine(img, c, f))
            if i % 10 == 0: print('matte', i, '/', len(frames), flush=True)
        np.savez_compressed(cache, m=np.stack(mattes).astype(np.float16))
    print('temporal…', flush=True); mattes = temporal(mattes, frames)
    # the largest blob(s) only — stray petals are not her
    sm = []
    for a in mattes:
        n, lab, st, _ = cv2.connectedComponentsWithStats((a > 0.5).astype(np.uint8), 8)
        if n > 1:
            areas = st[1:, cv2.CC_STAT_AREA]; big = 1 + int(np.argmax(areas)); keep = lab == big
            for k in range(1, n):
                if k != big and areas[k - 1] > areas[big - 1] * 0.05: keep |= lab == k
            a = a * (cv2.dilate(keep.astype(np.uint8), np.ones((9, 9), np.uint8)) > 0)
        sm.append(a)
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
        track.append([round(float((xx * a2[yy, xx]).sum() / a2[yy, xx].sum()) / ow, 4), round(float((yy * a2[yy, xx]).sum() / a2[yy, xx].sum()) / oh, 4), round(yy.min() / oh, 4), round((yy.max() + 1) / oh, 4)] if len(xx) else None)
    fps = 24
    for ext, args in [('mp4', ['-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'slow', '-movflags', '+faststart']), ('webm', ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '32', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', '-pix_fmt', 'yuv420p'])]:
        o = out_mp4[:-4] + '.' + ext
        subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-framerate', str(fps), '-i', os.path.join(tmp, 'f%04d.png')] + args + ['-an', o]); print(ext, os.path.getsize(o))
    json.dump({'src': [W, H], 'crop': [round(x0 / W, 4), round(y0 / H, 4), round(x1 / W, 4), round(y1 / H, 4)], 'size': [ow, oh], 'fps': fps, 'frames': len(frames), 'dur': round(len(frames) / fps, 3), 'track': track}, open(out_json, 'w'), separators=(',', ':'))
    print('first', track[0], 'last', track[-1])


if __name__ == '__main__':
    main()

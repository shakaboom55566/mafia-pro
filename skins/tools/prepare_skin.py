#!/usr/bin/env python3
"""Turn a Gemini skin (full card picture + its depth map) into the app's skin files.

usage: python3 skins/tools/prepare_skin.py <id> <card.jpg|png> <depth.jpg|png> [seal cx cy size]

Writes into skins/:
  <id>.webp        the card face cropped to the frame, 800×1200 (the app's card is 2:3)
  <id>-depth.png   the depth map cropped the same way, smoothed, 400×600 (white = near)
  <id>-seal.webp   a 256×256 portrait for the round seals (centre and size in source pixels)
  src/<id>.jpg, src/<id>-depth.jpg  the sources, for later edits
The frame is found on the depth map: the rows / columns where most pixels are near (the frame is the nearest thing).
In the depth file the frame, the name banner and the rarity plaque are set to one level (FRAME = 230, the app's reference plane),
so in 3D they stay put and only the scene inside the window moves (blur alone made the plaque and the frame drift apart).
"""
import sys, os
from PIL import Image, ImageFilter
import numpy as np

def main():
    sid, card_p, depth_p = sys.argv[1:4]
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
    card = Image.open(card_p).convert('RGB'); depth = Image.open(depth_p).convert('L')
    if depth.size != card.size: depth = depth.resize(card.size, Image.LANCZOS)
    d = np.asarray(depth).astype(float)
    cols = np.where((d > 170).mean(axis=0) > 0.6)[0]; rows = np.where((d > 170).mean(axis=1) > 0.6)[0]
    pad = 6
    box = (max(0, cols.min() - pad), max(0, rows.min() - pad), min(card.width, cols.max() + pad), min(card.height, rows.max() + pad))
    print('frame', box)
    card.crop(box).resize((800, 1200), Image.LANCZOS).save(os.path.join(out, sid + '.webp'), quality=88, method=6)
    dep = depth.crop(box).filter(ImageFilter.MedianFilter(5)).resize((400, 600), Image.LANCZOS)
    a = np.asarray(dep).astype(float); h, w = a.shape; yy, xx = np.mgrid[0:h, 0:w]
    # the frame zone: side bands, the banner at the top, the plaque at the bottom; in it, near pixels are the frame
    zone = (xx < w * .09) | (xx > w * .91) | (yy < h * .11) | (yy > h * .91)
    edge = (xx < w * .02) | (xx > w * .98) | (yy < h * .015) | (yy > h * .985)
    mask = ((zone & (a > 170)) | edge).astype(float) * 255
    m = np.asarray(Image.fromarray(mask.astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5))).astype(float) / 255
    inner = np.asarray(dep.filter(ImageFilter.GaussianBlur(4))).astype(float)
    FRAME = 230
    Image.fromarray(np.clip(m * FRAME + (1 - m) * inner, 0, 255).astype(np.uint8)).save(os.path.join(out, sid + '-depth.png'), optimize=True)
    if len(sys.argv) >= 7:
        cx, cy, s = map(int, sys.argv[4:7])
        card.crop((cx - s // 2, cy - s // 2, cx + s // 2, cy + s // 2)).resize((256, 256), Image.LANCZOS).save(os.path.join(out, sid + '-seal.webp'), quality=88, method=6)
    os.makedirs(os.path.join(out, 'src'), exist_ok=True)
    card.save(os.path.join(out, 'src', sid + '.jpg'), quality=92); depth.save(os.path.join(out, 'src', sid + '-depth.jpg'), quality=92)
    for f in sorted(os.listdir(out)):
        if f.startswith(sid): print(f, os.path.getsize(os.path.join(out, f)))

if __name__ == '__main__': main()

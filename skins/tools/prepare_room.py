#!/usr/bin/env python3
"""v71: a table background (a room) from a square picture -> skins/<file>.webp, <file>-thumb.webp, <file>-depth.png
usage: python3 skins/tools/prepare_room.py <file> <picture.jpg|png> [depth.png]
- the picture is cropped to a square (centre) and saved at 1280 px (WebP q84) — it fills the table's square;
- the thumbnail is 360 px (the Skins tab, the admin's sheet, the host's picker);
- the depth map (white = near the camera, black = the floor) is Depth Anything (tools/depth.py) unless given, blurred a little so the
  parallax bends smoothly, and saved at 640 px — the shader only needs its shape."""
import sys, os
from PIL import Image, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.dirname(HERE)

def square(im):
    w, h = im.size; s = min(w, h); return im.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s))

def main(name, src, dep=None):
    im = square(Image.open(src).convert('RGB'))
    big = im.resize((1280, 1280), Image.LANCZOS); big.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=84, method=6)
    im.resize((360, 360), Image.LANCZOS).save(os.path.join(OUT, name + '-thumb.webp'), 'WEBP', quality=80, method=6)
    if dep: d = square(Image.open(dep).convert('L'))
    else:
        sys.path.insert(0, HERE); from depth import depth
        tmp = os.path.join(OUT, name + '-src.png'); big.save(tmp)
        try: d = depth(tmp, os.environ.get('DEPTH_MODEL') or os.path.join(HERE, 'depth_anything_vits14.onnx'))
        finally: os.remove(tmp)
    d = d.resize((640, 640), Image.LANCZOS).filter(ImageFilter.GaussianBlur(2.2))
    d.save(os.path.join(OUT, name + '-depth.png'), optimize=True)
    for f in ('.webp', '-thumb.webp', '-depth.png'): p = os.path.join(OUT, name + f); print(p, os.path.getsize(p))

if __name__ == '__main__':
    if len(sys.argv) < 3: print(__doc__); sys.exit(1)
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)

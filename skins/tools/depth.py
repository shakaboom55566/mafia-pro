#!/usr/bin/env python3
"""Depth map for a skin card picture with Depth Anything (small, ONNX): white = near, black = far.
usage: python3 skins/tools/depth.py <card.jpg|png> <out-depth.png> [model.onnx]
The model (depth_anything_vits14.onnx, ~100 MB) is not in the repository:
  https://github.com/fabio-sim/Depth-Anything-ONNX/releases/download/v1.0.0/depth_anything_vits14.onnx
default path: $DEPTH_MODEL or skins/tools/depth_anything_vits14.onnx"""
import sys, os
import numpy as np
from PIL import Image

def depth(card_path, model_path):
    import onnxruntime as ort
    im = Image.open(card_path).convert('RGB'); W, H = im.size
    w = 518; h = int(round(H / W * w / 14)) * 14  # sides divisible by 14 (the ViT patch)
    x = np.asarray(im.resize((w, h), Image.BICUBIC)).astype(np.float32) / 255
    x = (x - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]
    x = x.transpose(2, 0, 1)[None].astype(np.float32)
    s = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'])
    d = s.run(None, {s.get_inputs()[0].name: x})[0].reshape(h, w)
    lo, hi = np.percentile(d, 1), np.percentile(d, 99.5)
    d = np.clip((d - lo) / max(1e-6, hi - lo), 0, 1)
    return Image.fromarray((d * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)

if __name__ == '__main__':
    model = sys.argv[3] if len(sys.argv) > 3 else os.environ.get('DEPTH_MODEL') or os.path.join(os.path.dirname(os.path.abspath(__file__)), 'depth_anything_vits14.onnx')
    depth(sys.argv[1], model).save(sys.argv[2]); print(sys.argv[2])

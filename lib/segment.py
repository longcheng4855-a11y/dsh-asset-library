#!/usr/bin/env python3
"""Segment an image into object boxes for the asset library.

Usage:
    python segment.py <image> [--max N]

Prints one JSON object to stdout:
    {"width": W, "height": H, "engine": "opencv"|"grid"|"flood", "boxes": [[x, y, w, h], ...]}

Boxes are in the original image pixel coordinates. OpenCV is used when
available (contours); otherwise a numpy/Pillow grid split or flood fill keeps
the script working on a bare Python install.
"""
import json
import sys

import numpy as np
from PIL import Image

MAX_SIDE = 3200
MIN_BOX = 3


def fail(message):
    sys.stderr.write(str(message) + "\n")
    sys.exit(1)


def load_image(path):
    image = Image.open(path)
    image = image.convert("RGBA")
    width, height = image.size
    scale = min(1.0, MAX_SIDE / float(max(width, height)))
    if scale < 1.0:
        image = image.resize((max(1, int(round(width * scale))), max(1, int(round(height * scale)))), Image.LANCZOS)
    return np.asarray(image), width, height, scale


def build_mask(rgba):
    """Foreground mask: transparent pixels are background; otherwise compare
    each pixel with the median border colour."""
    alpha = rgba[..., 3].astype(np.int32)
    rgb = rgba[..., :3].astype(np.int32)
    opaque = alpha > 20
    border_pixels = np.concatenate(
        [
            rgb[0, :, :][opaque[0, :]],
            rgb[-1, :, :][opaque[-1, :]],
            rgb[:, 0, :][opaque[:, 0]],
            rgb[:, -1, :][opaque[:, -1]],
        ]
    )
    transparent_border = border_pixels.shape[0] < 0.35 * max(1, 2 * (rgba.shape[0] + rgba.shape[1]))
    if border_pixels.shape[0] == 0 or transparent_border:
        return (alpha > 40).astype(np.uint8)
    background = np.median(border_pixels, axis=0)
    deviation = np.abs(border_pixels - background)
    spread = float(np.percentile(deviation, 95)) if deviation.size else 0.0
    threshold = float(min(70.0, max(26.0, spread * 2.6)))
    distance = np.sqrt(((rgb - background) ** 2).sum(axis=2))
    mask = (distance > threshold) & opaque
    return mask.astype(np.uint8)


def boxes_from_contours(mask, max_boxes):
    import cv2

    kernel = np.ones((3, 3), np.uint8)
    closed = cv2.morphologyEx(mask * 255, cv2.MORPH_CLOSE, kernel, iterations=1)
    found = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours = found[0] if len(found) == 2 else found[1]
    height, width = mask.shape
    min_area = max(12.0, width * height * 0.00002)
    boxes = []
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        if w < MIN_BOX or h < MIN_BOX:
            continue
        if w * h < min_area:
            continue
        if w * h > width * height * 0.9:
            continue
        boxes.append([int(x), int(y), int(w), int(h)])
    boxes.sort(key=lambda box: box[2] * box[3], reverse=True)
    return boxes[:max_boxes]


def runs(flags, minimum_gap=2):
    """Split a boolean-per-index array into [start, end) runs of True."""
    spans = []
    start = None
    for index, value in enumerate(flags):
        if value and start is None:
            start = index
        elif not value and start is not None:
            if index - start >= minimum_gap:
                spans.append((start, index))
            start = None
    if start is not None and len(flags) - start >= minimum_gap:
        spans.append((start, len(flags)))
    return spans


def boxes_from_grid(mask, max_boxes):
    """Sprite sheets are usually a grid with empty gaps between cells: split on
    fully-empty rows/columns and take the tight box of each non-empty cell."""
    columns = runs(mask.any(axis=0))
    rows = runs(mask.any(axis=1))
    boxes = []
    for y0, y1 in rows:
        for x0, x1 in columns:
            cell = mask[y0:y1, x0:x1]
            if not cell.any():
                continue
            ys, xs = np.nonzero(cell)
            bx0 = int(xs.min()) + x0
            bx1 = int(xs.max()) + x0 + 1
            by0 = int(ys.min()) + y0
            by1 = int(ys.max()) + y0 + 1
            if bx1 - bx0 < MIN_BOX or by1 - by0 < MIN_BOX:
                continue
            boxes.append([bx0, by0, bx1 - bx0, by1 - by0])
    boxes.sort(key=lambda box: box[2] * box[3], reverse=True)
    return boxes[:max_boxes]


def boxes_from_flood(mask, max_boxes):
    """Plain Python fallback: connected components on a downscaled mask."""
    height, width = mask.shape
    step = max(1, int(np.ceil(max(width, height) / 900.0)))
    small = mask[::step, ::step]
    h, w = small.shape
    visited = np.zeros((h, w), dtype=bool)
    boxes = []
    for sy in range(h):
        for sx in range(w):
            if not small[sy, sx] or visited[sy, sx]:
                continue
            stack = [(sy, sx)]
            visited[sy, sx] = True
            x0 = x1 = sx
            y0 = y1 = sy
            count = 0
            while stack:
                cy, cx = stack.pop()
                count += 1
                if cx < x0:
                    x0 = cx
                if cx > x1:
                    x1 = cx
                if cy < y0:
                    y0 = cy
                if cy > y1:
                    y1 = cy
                if cx > 0 and small[cy, cx - 1] and not visited[cy, cx - 1]:
                    visited[cy, cx - 1] = True
                    stack.append((cy, cx - 1))
                if cx < w - 1 and small[cy, cx + 1] and not visited[cy, cx + 1]:
                    visited[cy, cx + 1] = True
                    stack.append((cy, cx + 1))
                if cy > 0 and small[cy - 1, cx] and not visited[cy - 1, cx]:
                    visited[cy - 1, cx] = True
                    stack.append((cy - 1, cx))
                if cy < h - 1 and small[cy + 1, cx] and not visited[cy + 1, cx]:
                    visited[cy + 1, cx] = True
                    stack.append((cy + 1, cx))
            if count < max(6, int(w * h * 0.00008)):
                continue
            bx = x0 * step
            by = y0 * step
            bx1 = min(width, (x1 + 1) * step)
            by1 = min(height, (y1 + 1) * step)
            boxes.append([bx, by, bx1 - bx, by1 - by])
    boxes.sort(key=lambda box: box[2] * box[3], reverse=True)
    return boxes[:max_boxes]


def scale_boxes(boxes, scale, width, height):
    if scale == 1.0:
        return boxes
    out = []
    for x, y, w, h in boxes:
        x0 = int(round(x / scale))
        y0 = int(round(y / scale))
        x1 = int(round((x + w) / scale))
        y1 = int(round((y + h) / scale))
        out.append([max(0, x0), max(0, y0), min(width, x1) - max(0, x0), min(height, y1) - max(0, y0)])
    return out


def order_boxes(boxes):
    """Row-major reading order, based on the box top edge."""
    if not boxes:
        return boxes
    heights = sorted(box[3] for box in boxes)
    unit = max(8.0, heights[len(heights) // 2] * 0.6)
    return sorted(boxes, key=lambda box: (int(box[1] / unit), box[0]))


def main():
    args = sys.argv[1:]
    if not args:
        fail("usage: segment.py <image> [--max N]")
    image_path = args[0]
    max_boxes = 2000
    if "--max" in args:
        try:
            max_boxes = int(args[args.index("--max") + 1])
        except Exception:
            max_boxes = 2000
    try:
        rgba, width, height, scale = load_image(image_path)
    except Exception as error:  # noqa: BLE001
        fail("cannot read image: %s" % error)
    mask = build_mask(rgba)
    if not mask.any():
        sys.stdout.write(json.dumps({"width": width, "height": height, "engine": "none", "boxes": []}))
        return
    engine = "flood"
    boxes = []
    try:
        boxes = boxes_from_contours(mask, max_boxes)
        engine = "opencv"
    except Exception:
        boxes = []
    if not boxes:
        try:
            boxes = boxes_from_grid(mask, max_boxes)
            engine = "grid"
        except Exception:
            boxes = []
    if not boxes:
        boxes = boxes_from_flood(mask, max_boxes)
        engine = "flood"
    boxes = scale_boxes(boxes, scale, width, height)
    boxes = order_boxes([box for box in boxes if box[2] >= MIN_BOX and box[3] >= MIN_BOX])
    sys.stdout.write(
        json.dumps({"width": width, "height": height, "engine": engine, "boxes": boxes}, ensure_ascii=True)
    )


if __name__ == "__main__":
    main()

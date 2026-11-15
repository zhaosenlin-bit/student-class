#!/usr/bin/env python3
"""
把小白教育那一批封面左上角的「课件制作者：小小小白」换成乐启享。

这些封面是原站课件的截图，字样是烙在像素里的，改 HTML 文本改不到。
所以这里按像素处理：先在封面顶部找出那一行字，把「小小小白」四个字的
位置量出来，用背景色盖掉，再按原来的字号和颜色写上「乐启享」。

只动最后四个字，「课件制作者：」和左边那个学科图标都原样留着 ——
图标每个课件不一样，那是课件自己的东西。

    python tools\rebrand-covers.py --dry-run
    python tools\rebrand-covers.py
"""
import argparse
import glob
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATALOG = os.path.join(ROOT, "mirror", "leqixiang", "catalog.json")
SEARCH_ROOTS = [
    os.path.join(ROOT, "mirror", "xbjiaoyu", "assets"),
    os.path.join(ROOT, "mirror", "leqixiang", "site"),
    os.path.join(ROOT, "mirror", "aifunengjiaoyu", "assets"),
]
FONT_CANDIDATES = [
    r"C:\Windows\Fonts\msyh.ttc",
    r"C:\Windows\Fonts\msyhbd.ttc",
    r"C:\Windows\Fonts\simhei.ttf",
]
TEMPLATE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cover-brand-template.png")
OLD_BRAND = "小小小白"
NEW_BRAND = "乐启享"

# 顶部这一条是课件自己的标题栏：字样按视口宽度等比缩放，所以位置
# 都用宽度做单位，而不是高度。
BAND_TOP = 0.004      # 标题栏上沿
BAND_BOTTOM = 0.042   # 标题栏下沿
TEXT_LIMIT = 0.26     # 字样只可能在左边这一段里
INK_DELTA = 45        # 比背景亮/暗多少才算笔画
MIN_BRAND_W = 0.025   # 「小小小白」至少占这么宽（占宽度）
MAX_BRAND_W = 0.085   # 也不能太宽，那多半是别的元素
SHAPE_MIN = 0.65      # 形状和「小小小白」不像的，就不是品牌字
SHAPE_W, SHAPE_H = 64, 24


def find_file(url):
    rel = url.lstrip("/")
    for base in SEARCH_ROOTS:
        path = os.path.join(base, rel)
        if os.path.exists(path):
            return path
    hits = glob.glob(os.path.join(ROOT, "mirror", "**", os.path.basename(url)), recursive=True)
    return hits[0] if hits else None


def ink_columns(lum):
    """每一列上有多少笔画。返回 (列号, 笔画数)。"""
    bg = np.median(lum, axis=1, keepdims=True)
    ink = np.abs(lum - bg) > INK_DELTA
    return ink.sum(axis=0)


def groups_of(cols, gap):
    """把有笔画的列并成一段一段。"""
    out = []
    start = None
    for i, v in enumerate(cols):
        if v and start is None:
            start = i
        elif not v and start is not None:
            out.append((start, i - 1))
            start = None
    if start is not None:
        out.append((start, len(cols) - 1))
    merged = []
    for g in out:
        if merged and g[0] - merged[-1][1] <= gap:
            merged[-1] = (merged[-1][0], g[1])
        else:
            merged.append(g)
    return merged


def locate_brand(im):
    """量出「小小小白」那四个字的框。找不到就返回 None。"""
    w, h = im.size
    y0, y1 = int(w * BAND_TOP), int(w * BAND_BOTTOM)
    if y1 > h or y1 - y0 < 4:
        return None
    band = im.crop((0, y0, w, y1)).convert("RGB")
    lum = np.asarray(band.convert("L"), dtype=np.float32)
    cols = ink_columns(lum)
    limit = int(w * TEXT_LIMIT)
    groups = [g for g in groups_of(cols, max(3, int(w * 0.004))) if g[0] < limit]
    if len(groups) < 2:
        return None
    # 图标 / 「课件制作者：」/ 品牌名 —— 取最靠右、宽度又正好是
    # 四个字那么宽的那一段。封面被裁过的时候左边会缺，所以不写死
    # 第几段，而是按宽度找。
    fits = [
        g
        for g in groups
        if w * MIN_BRAND_W <= g[1] - g[0] + 1 <= w * MAX_BRAND_W
    ]
    if not fits:
        return None
    # 光看宽度会认错字 ——「自由观察」四个字也是那么宽。所以从右往左
    # 一个个比形状：品牌字的轮廓必须和模板对得上。
    brand = None
    for cand in reversed(fits):
        if shape_score(im, cand) >= SHAPE_MIN:
            brand = cand
            break
    if brand is None:
        return None
    bg = np.median(lum, axis=1, keepdims=True)
    ink = np.abs(lum - bg) > INK_DELTA
    sub = ink[:, brand[0]:brand[1] + 1]
    rr = np.nonzero(sub.any(axis=1))[0]
    if len(rr) == 0:
        return None
    return {
        "box": (brand[0], y0 + rr.min(), brand[1] + 1, y0 + rr.max() + 1),
        "band": (0, y0, w, y1),
    }


_TEMPLATE = None


def template():
    global _TEMPLATE
    if _TEMPLATE is None:
        im = Image.open(TEMPLATE).convert("L")
        a = np.asarray(im, dtype=np.float32)
        a = np.clip(a - np.median(a), 0, None)
        n = np.linalg.norm(a)
        _TEMPLATE = a / n if n > 0 else a
    return _TEMPLATE


def shape_of(im, group):
    """把一段字取成去背景的形状。"""
    w, h = im.size
    y0, y1 = int(w * BAND_TOP), int(w * BAND_BOTTOM)
    lum = np.asarray(im.crop((0, y0, w, y1)).convert("L"), dtype=np.float32)
    bg = np.median(lum, axis=1, keepdims=True)
    ink = np.abs(lum - bg) > INK_DELTA
    sub = ink[:, group[0]:group[1] + 1]
    rr = np.nonzero(sub.any(axis=1))[0]
    if len(rr) == 0:
        return None
    crop = sub[rr.min():rr.max() + 1, :]
    small = Image.fromarray((crop * 255).astype("uint8")).resize((SHAPE_W, SHAPE_H), Image.LANCZOS)
    a = np.asarray(small, dtype=np.float32)
    a = np.clip(a - np.median(a), 0, None)
    n = np.linalg.norm(a)
    return a / n if n > 0 else None


def shape_score(im, group):
    """这一段字和「小小小白」的模板有多像。"""
    a = shape_of(im, group)
    ref = template()
    if a is None:
        return 0.0
    best = 0.0
    for dy in (-3, -1, 0, 1, 3):
        for dx in (-4, -2, 0, 2, 4):
            v = float((a * np.roll(np.roll(ref, dy, 0), dx, 1)).sum())
            if v > best:
                best = v
    return best


def sample_colors(im, box, band):
    """取背景色和字色。"""
    w, h = im.size
    x0, y0, x1, y1 = box
    arr = np.asarray(im, dtype=np.float32)
    band_arr = arr[band[1]:band[3], band[0]:band[2]]
    bg = tuple(int(v) for v in np.median(band_arr.reshape(-1, 3), axis=0))
    reg = arr[y0:y1, x0:x1]
    bg_lum = 0.299 * bg[0] + 0.587 * bg[1] + 0.114 * bg[2]
    d = np.abs(reg[:, :, 0] * 0.299 + reg[:, :, 1] * 0.587 + reg[:, :, 2] * 0.114 - bg_lum)
    flat = reg.reshape(-1, 3)
    dd = d.reshape(-1)
    keep = flat[dd >= np.percentile(dd, 92)]
    ink = tuple(int(v) for v in np.mean(keep, axis=0))
    return bg, ink


def fit_font(font_path, text, target_h):
    """挑一个字号，让这行字的墨迹正好和原来那四个字一样高。"""
    size = max(8, target_h)
    for _ in range(8):
        font = ImageFont.truetype(font_path, size)
        probe = Image.new("L", (size * len(text) + 40, size * 3), 0)
        ImageDraw.Draw(probe).text((10, 10), text, font=font, fill=255)
        arr = np.asarray(probe)
        rr = np.nonzero(arr.any(axis=1))[0]
        cc = np.nonzero(arr.any(axis=0))[0]
        if len(rr) == 0:
            size += 1
            continue
        ink_h = rr.max() - rr.min() + 1
        if ink_h == target_h:
            break
        size = max(8, int(round(size * target_h / ink_h)))
    font = ImageFont.truetype(font_path, size)
    probe = Image.new("L", (size * len(text) + 40, size * 3), 0)
    ImageDraw.Draw(probe).text((10, 10), text, font=font, fill=255)
    arr = np.asarray(probe)
    rr = np.nonzero(arr.any(axis=1))[0]
    cc = np.nonzero(arr.any(axis=0))[0]
    off_top = int(rr.min()) - 10
    off_left = int(cc.min()) - 10
    return font, off_top, off_left


def rebrand_one(path, dry=False):
    im = Image.open(path).convert("RGB")
    found = locate_brand(im)
    if not found:
        return None
    box, band = found["box"], found["band"]
    x0, y0, x1, y1 = box
    bg, ink = sample_colors(im, box, band)
    w = im.size[0]
    target_h = y1 - y0
    font_path = next((f for f in FONT_CANDIDATES if os.path.exists(f)), None)
    if font_path is None:
        return None
    font, off_top, off_left = fit_font(font_path, NEW_BRAND, target_h)
    if dry:
        return {"box": box, "bg": bg, "ink": ink, "size": font.size}
    pad = 2
    # 先把原来四个字那块抹掉，再写上新的三个字。标题栏是有渐变也有
    # 纹理的，所以背景不能拿一个死颜色去填 —— 上下两行之间做一次
    # 纵向插值，纹理和渐变就都还在。
    arr = np.asarray(im).astype(np.float32)
    fx0, fx1 = x0 - pad, x1 + pad
    src_top = arr[max(0, y0 - pad - 1), fx0:fx1 + 1]
    src_bot = arr[min(im.size[1] - 1, y1 + pad), fx0:fx1 + 1]
    span = max(1, (y1 + pad) - (y0 - pad - 1))
    for row in range(y0 - pad, y1 + pad + 1):
        t = (row - (y0 - pad - 1)) / span
        arr[row, fx0:fx1 + 1] = src_top * (1 - t) + src_bot * t
    im = Image.fromarray(np.clip(arr, 0, 255).astype("uint8"))
    draw = ImageDraw.Draw(im)
    # 新名字比旧名字少一个字，右边空出来不好看，按原来的起笔位置对齐。
    draw.text((x0 - off_left, y0 - off_top), NEW_BRAND, font=font, fill=ink)
    im.save(path, quality=95) if path.lower().endswith((".jpg", ".jpeg")) else im.save(path)
    return {"box": box, "bg": bg, "ink": ink, "size": font.size}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--sample", type=int, default=0, help="只处理前 N 个，抽检用")
    args = ap.parse_args()

    with open(CATALOG, encoding="utf-8") as fh:
        catalog = json.load(fh)
    urls = sorted({p["cover"] for p in catalog["products"] if p.get("cover") and p["cover"].startswith("/images/")})
    if args.sample:
        urls = urls[: args.sample]
    if args.limit:
        urls = urls[: args.limit]

    done, skipped, missing = 0, 0, 0
    for url in urls:
        path = find_file(url)
        if not path:
            missing += 1
            continue
        try:
            result = rebrand_one(path, dry=args.dry_run)
        except Exception as exc:  # 一张图坏掉不该拖垮整批
            print(f"  !! {os.path.basename(path)}: {exc}", file=sys.stderr)
            result = None
        if result:
            done += 1
            if done <= 12 and not args.dry_run:
                print(f"  ok {os.path.basename(path):50} box={result['box']} size={result['size']} ink={result['ink']}")
        else:
            skipped += 1
    print(f"共 {len(urls)} 张：换牌 {done}，没找到字样 {skipped}，文件找不到 {missing}")


if __name__ == "__main__":
    main()


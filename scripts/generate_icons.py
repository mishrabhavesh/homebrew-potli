"""
Generates placeholder application + tray icons for CopyClip.

This produces a clean, minimal mark (rounded square + crop-corner brackets +
a text glyph) that can easily be swapped for real brand art later — see
README "Replacing the app icon".
"""
import math
from PIL import Image, ImageDraw

OUT_ICON = "build/icon.png"
OUT_TRAY_TEMPLATE = "resources/trayIconTemplate.png"
OUT_TRAY_TEMPLATE_2X = "resources/trayIconTemplate@2x.png"
OUT_TRAY_COLOR = "resources/trayIcon.png"
OUT_TRAY_COLOR_2X = "resources/trayIcon@2x.png"


def rounded_rect(draw, box, radius, fill):
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def draw_mark(size, fg, bg=None, padding_ratio=0.24):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if bg is not None:
        rounded_rect(d, (0, 0, size - 1, size - 1), radius=size * 0.22, fill=bg)

    pad = int(size * padding_ratio)
    x0, y0, x1, y1 = pad, pad, size - pad, size - pad
    stroke = max(2, round(size * 0.052))

    # Outer rounded frame (crop/selection mark)
    d.rounded_rectangle((x0, y0, x1, y1), radius=size * 0.09, outline=fg, width=stroke)

    # Three horizontal "text lines" inside, evoking recognized text
    line_x0 = x0 + int((x1 - x0) * 0.22)
    line_x1_short = x1 - int((x1 - x0) * 0.40)
    line_x1_med = x1 - int((x1 - x0) * 0.22)
    ys = [y0 + (y1 - y0) * f for f in (0.36, 0.52, 0.68)]
    widths = [line_x1_med, line_x1_short, line_x1_med]
    for y, lx1 in zip(ys, widths):
        d.line((line_x0, y, lx1, y), fill=fg, width=stroke)

    return img


def save(img, path):
    img.save(path)
    print(f"wrote {path} ({img.size[0]}x{img.size[1]})")


if __name__ == "__main__":
    # Main app icon: 1024x1024, white mark on near-black rounded square.
    app_icon = draw_mark(1024, fg=(255, 255, 255, 255), bg=(28, 28, 30, 255), padding_ratio=0.26)
    save(app_icon, OUT_ICON)

    # macOS menu bar template icon: must be black-on-transparent; macOS tints it automatically.
    tray_template = draw_mark(22, fg=(0, 0, 0, 255), bg=None, padding_ratio=0.06)
    save(tray_template, OUT_TRAY_TEMPLATE)
    tray_template_2x = draw_mark(44, fg=(0, 0, 0, 255), bg=None, padding_ratio=0.06)
    save(tray_template_2x, OUT_TRAY_TEMPLATE_2X)

    # Windows/Linux tray icon: colored, transparent background.
    tray_color = draw_mark(32, fg=(28, 28, 30, 255), bg=None, padding_ratio=0.04)
    save(tray_color, OUT_TRAY_COLOR)
    tray_color_2x = draw_mark(64, fg=(28, 28, 30, 255), bg=None, padding_ratio=0.04)
    save(tray_color_2x, OUT_TRAY_COLOR_2X)

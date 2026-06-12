#!/usr/bin/env python3
"""Generate the SpinnerPay marketplace icon: a loading-spinner ring around a $."""
import os
from PIL import Image, ImageDraw, ImageFont

SIZE = 512
BG = (14, 21, 37)        # deep navy
GREEN = (34, 197, 94)    # money green
WHITE = (240, 245, 250)

img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# rounded-square background
d.rounded_rectangle([0, 0, SIZE, SIZE], radius=110, fill=BG)

# spinner ring: an open arc with a rounded leading cap (the "loading" motif)
pad = 96
box = [pad, pad, SIZE - pad, SIZE - pad]
d.arc(box, start=-50, end=210, fill=GREEN, width=40)
# leading dot at the arc's end
import math
cx, cy = SIZE / 2, SIZE / 2
r = (SIZE - 2 * pad) / 2
ang = math.radians(-50)
ex, ey = cx + r * math.cos(ang), cy + r * math.sin(ang)
d.ellipse([ex - 20, ey - 20, ex + 20, ey + 20], fill=GREEN)

# center "$"
font = None
for p in [
    "/System/Library/Fonts/SFNSRounded.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
]:
    if os.path.exists(p):
        try:
            font = ImageFont.truetype(p, 240)
            break
        except Exception:
            pass
if font is None:
    font = ImageFont.load_default()

text = "$"
bb = d.textbbox((0, 0), text, font=font)
tw, th = bb[2] - bb[0], bb[3] - bb[1]
d.text((cx - tw / 2 - bb[0], cy - th / 2 - bb[1]), text, font=font, fill=WHITE)

out = os.path.join(os.path.dirname(__file__), "..", "media", "icon.png")
os.makedirs(os.path.dirname(out), exist_ok=True)
img.save(out, "PNG")
print("wrote", os.path.abspath(out), img.size)

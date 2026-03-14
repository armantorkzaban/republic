from PIL import Image, ImageDraw, ImageFont, ImageFilter
import arabic_reshaper
from bidi.algorithm import get_display
import numpy as np
import os

# OG image standard dimensions
WIDTH, HEIGHT = 1200, 630

# Colors — light theme
BG_COLOR = (244, 246, 247, 255)       # --bg-primary: #F4F6F7
TEXT_PRIMARY = (30, 58, 107)          # --text-primary: #1E3A6B
TEXT_SECONDARY = (30, 58, 107, 163)   # --text-secondary ~0.64 alpha
TEXT_MUTED = (30, 58, 107, 112)       # --text-muted ~0.44 alpha
ORANGE = (245, 158, 11)              # #F59E0B — the light-mode toggle dot
BORDER = (30, 58, 107, 30)           # subtle border

# Font paths
FONT_DIR = os.path.join(os.path.dirname(__file__), 'fonts')
FONT_BOLD = os.path.join(FONT_DIR, 'Nian Bold.ttf')
FONT_SEMIBOLD = os.path.join(FONT_DIR, 'Nian SemiBold.ttf')
FONT_REGULAR = os.path.join(FONT_DIR, 'Nian.ttf')
FONT_LIGHT = os.path.join(FONT_DIR, 'Nian Light.ttf')


def rtl(text):
    """Reshape and reorder Persian text for correct PIL rendering."""
    reshaped = arabic_reshaper.reshape(text)
    return get_display(reshaped)


# Create image
img = Image.new('RGBA', (WIDTH, HEIGHT), BG_COLOR)
draw = ImageDraw.Draw(img)

# Load fonts
font_title = ImageFont.truetype(FONT_BOLD, 80)
font_subtitle = ImageFont.truetype(FONT_REGULAR, 26)
font_url = ImageFont.truetype(FONT_LIGHT, 18)

# ── Orange glowing dot — top-right (matching the site's theme toggle) ──
dot_radius = 40
dot_cx, dot_cy = WIDTH - 100, 100
glow_radius = 160  # how far the soft glow extends

# Build smooth radial gradient on a numpy array
glow = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
glow_arr = np.array(glow)

# Create distance field from dot center
y_coords, x_coords = np.ogrid[:HEIGHT, :WIDTH]
dist = np.sqrt((x_coords - dot_cx) ** 2 +
               (y_coords - dot_cy) ** 2).astype(np.float64)

# Smooth glow: alpha falls off with squared cosine beyond the solid core
mask = np.zeros((HEIGHT, WIDTH), dtype=np.float64)
# Outside core, inside glow_radius: smooth falloff
in_glow = (dist > dot_radius) & (dist <= glow_radius)
t = (dist[in_glow] - dot_radius) / (glow_radius -
                                    dot_radius)  # 0 at core edge, 1 at glow edge
mask[in_glow] = (np.cos(t * np.pi) + 1) / 2  # smooth cosine falloff 1→0
# Solid core
mask[dist <= dot_radius] = 1.0

# Apply to RGBA channels
glow_arr[:, :, 0] = ORANGE[0]
glow_arr[:, :, 1] = ORANGE[1]
glow_arr[:, :, 2] = ORANGE[2]
glow_arr[:, :, 3] = (mask * 40).astype(np.uint8)  # max glow alpha at core edge
# Overwrite core with full opacity
core_mask = dist <= dot_radius
glow_arr[core_mask, 3] = 255

glow = Image.fromarray(glow_arr, 'RGBA')
img = Image.alpha_composite(img, glow)
draw = ImageDraw.Draw(img)

# ── Title: "جمهور" — centered ──
title_fa = rtl("جمهور")
title_bbox = draw.textbbox((0, 0), title_fa, font=font_title)
title_w = title_bbox[2] - title_bbox[0]
title_h = title_bbox[3] - title_bbox[1]

title_x = (WIDTH - title_w) / 2
center_y = HEIGHT / 2 - 60
draw.text((title_x, center_y), title_fa, fill=TEXT_PRIMARY, font=font_title)

# ── Subtitle: centered below title ──
subtitle_fa = rtl("پلتفرم دموکراسی دیجیتال برای ایران")
sub_bbox = draw.textbbox((0, 0), subtitle_fa, font=font_subtitle)
sub_w = sub_bbox[2] - sub_bbox[0]
sub_x = (WIDTH - sub_w) / 2
sub_y = center_y + title_h + 104
draw.text((sub_x, sub_y), subtitle_fa, fill=TEXT_SECONDARY, font=font_subtitle)

# ── URL at bottom — centered ──
url_text = "Jomhoor.org"
url_bbox = draw.textbbox((0, 0), url_text, font=font_url)
url_w = url_bbox[2] - url_bbox[0]
url_x = (WIDTH - url_w) / 2
url_y = HEIGHT - 56
draw.text((url_x, url_y), url_text, fill=TEXT_MUTED, font=font_url)

# ── Subtle border ──
draw.rectangle([(0, 0), (WIDTH - 1, HEIGHT - 1)], outline=BORDER, width=1)

# Save
output_path = os.path.join(os.path.dirname(
    __file__), 'images', 'thumbnail-fa-a.png')
img.save(output_path, 'PNG')
print(f"Saved: {output_path} ({img.size})")

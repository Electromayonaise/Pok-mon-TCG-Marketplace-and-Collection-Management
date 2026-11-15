import base64
import os
from fontTools.ttLib import TTFont

FONTS_DIR = os.path.join(os.path.dirname(__file__), "..", "fonts")
SOLID_PATH = os.path.join(FONTS_DIR, "pokemon-solid.ttf")
HOLLOW_PATH = os.path.join(FONTS_DIR, "pokemon-hollow.ttf")

SOLID_COLOR = "#FFCB05"
OUTLINE_COLOR = "#2C63C4"

def load_metrics(path):
    f = TTFont(path)
    cmap = f.getBestCmap()
    hmtx = f["hmtx"]
    glyf_order = f.getGlyphOrder()
    upm = f["head"].unitsPerEm
    hhea = f["hhea"]
    return {
        "cmap": cmap,
        "hmtx": hmtx,
        "upm": upm,
        "ascent": hhea.ascent,
        "descent": hhea.descent,
    }

def text_width_units(text, metrics):
    total = 0
    for ch in text:
        cp = ord(ch)
        glyph_name = metrics["cmap"].get(cp)
        if glyph_name is None:
            glyph_name = metrics["cmap"].get(ord(" "))
        aw, _lsb = metrics["hmtx"][glyph_name]
        total += aw
    return total

def b64(path):
    with open(path, "rb") as fh:
        return base64.b64encode(fh.read()).decode("ascii")

SOLID_METRICS = load_metrics(SOLID_PATH)
HOLLOW_METRICS = load_metrics(HOLLOW_PATH)
SOLID_B64 = b64(SOLID_PATH)
HOLLOW_B64 = b64(HOLLOW_PATH)

TEMPLATE = """<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">
  <defs>
    <style>
      @font-face {{
        font-family: 'PokemonSolid';
        src: url(data:font/ttf;base64,{solid_b64}) format('truetype');
      }}
      .solid {{
        font-family: 'PokemonSolid';
        font-size: {font_size}px;
        fill: {solid_color};
        stroke: {outline_color};
        stroke-width: {stroke_width}px;
        stroke-linejoin: round;
        paint-order: stroke fill;
      }}
    </style>
  </defs>
  <text class="solid" x="50%" y="{baseline}" text-anchor="middle">{text}</text>
</svg>
"""

def generate(text, font_size, out_name, h_pad_ratio=0.16, v_pad_ratio=0.24):
    text_w = text_width_units(text, SOLID_METRICS) / SOLID_METRICS["upm"] * font_size

    ascent = SOLID_METRICS["ascent"] / SOLID_METRICS["upm"] * font_size
    descent = abs(SOLID_METRICS["descent"]) / SOLID_METRICS["upm"] * font_size
    text_h = ascent + descent

    h_pad = font_size * h_pad_ratio
    v_pad = font_size * v_pad_ratio

    width = round(text_w + 2 * h_pad)
    height = round(text_h + 2 * v_pad)
    baseline = round(v_pad + ascent)

    svg = TEMPLATE.format(
        width=width,
        height=height,
        solid_b64=SOLID_B64,
        font_size=font_size,
        stroke_width=round(font_size * 0.045, 2),
        outline_color=OUTLINE_COLOR,
        solid_color=SOLID_COLOR,
        baseline=baseline,
        text=text,
    )
    out_path = os.path.join(os.path.dirname(__file__), out_name)
    with open(out_path, "w", encoding="utf-8") as fh:
        fh.write(svg)
    print(f"{out_name}: {width}x{height}, font-size {font_size}")

generate("TEZG", 160, "tezg-wordmark.svg", h_pad_ratio=0.10, v_pad_ratio=0.16)
generate("What is TEZG?", 50, "title-what-is-tezg.svg")
generate("Planned Tech Stack", 50, "title-tech-stack.svg")
generate("Design Principles", 50, "title-design-principles.svg")

"""Deterministic comparison artifacts; no alignment, masking, or pass threshold.

Run after the opt-in Playwright capture. Pillow is available in the bundled
workspace Python runtime. Originals are read only and every output is new.
"""
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw

directory = Path("docs/design-v3-comparison")
for locale in ("en", "th"):
    for width in (360, 390, 768, 1440):
        reference = Image.open(directory / f"prototype-results-{locale}-{width}.png").convert("RGB")
        implementation = Image.open(directory / f"implementation-results-{locale}-{width}.png").convert("RGB")
        height = max(reference.height, implementation.height)
        left = Image.new("RGB", (width, height), "#f5f4ef")
        right = Image.new("RGB", (width, height), "#f5f4ef")
        left.paste(reference, (0, 0))
        right.paste(implementation, (0, 0))
        comparison = Image.new("RGB", (width * 2 + 1, height + 28), "white")
        comparison.paste(left, (0, 28))
        comparison.paste(right, (width + 1, 28))
        draw = ImageDraw.Draw(comparison)
        draw.text((8, 6), f"FINAL PROTOTYPE / {locale} / {width}px", fill="#142d26")
        draw.text((width + 9, 6), f"IMPLEMENTATION / {locale} / {width}px", fill="#142d26")
        draw.line((width, 0, width, height + 28), fill="#142d26")
        comparison.save(directory / f"side-by-side-results-{locale}-{width}.png")
        Image.blend(left, right, 0.5).save(directory / f"overlay-results-{locale}-{width}.png")
        ImageChops.difference(left, right).save(directory / f"difference-results-{locale}-{width}.png")
print("Produced 8 side-by-side, 8 overlay, and 8 raw difference artifacts; no similarity claim.")

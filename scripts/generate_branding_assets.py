#!/usr/bin/env python3
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


REPO_ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class Color:
    r: int
    g: int
    b: int
    a: int = 255

    def rgba(self) -> tuple[int, int, int, int]:
        return (self.r, self.g, self.b, self.a)


BG = Color(11, 15, 20)  # matches web wrapper background
ACCENT_TOP = Color(255, 179, 71)  # warm orange
ACCENT_BOTTOM = Color(255, 95, 109)  # pink-ish red
INK = Color(255, 255, 255)
SHADOW = Color(0, 0, 0, 140)


def lerp(a: int, b: int, t: float) -> int:
    return int(round(a + (b - a) * t))


def vertical_gradient(size: int, top: Color, bottom: Color) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    px = img.load()
    for y in range(size):
        t = y / max(1, size - 1)
        c = Color(
            lerp(top.r, bottom.r, t),
            lerp(top.g, bottom.g, t),
            lerp(top.b, bottom.b, t),
            255,
        )
        for x in range(size):
            px[x, y] = c.rgba()
    return img


def cover_resize(im: Image.Image, target_w: int, target_h: int) -> Image.Image:
    # Resize while preserving aspect ratio, then crop center to exact dimensions.
    src_w, src_h = im.size
    scale = max(target_w / src_w, target_h / src_h)
    new_w = int(round(src_w * scale))
    new_h = int(round(src_h * scale))
    resized = im.resize((new_w, new_h), Image.Resampling.LANCZOS)

    left = (new_w - target_w) // 2
    top = (new_h - target_h) // 2
    return resized.crop((left, top, left + target_w, top + target_h))


def draw_tank(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill: Color) -> None:
    # A simple, friendly tank silhouette using basic shapes.
    x0, y0, x1, y1 = box
    w = x1 - x0
    h = y1 - y0

    body_h = int(h * 0.42)
    turret_h = int(h * 0.26)
    barrel_h = max(1, int(h * 0.08))

    # Track / body
    body_box = (
        x0 + int(w * 0.06),
        y1 - body_h,
        x1 - int(w * 0.06),
        y1,
    )
    draw.rounded_rectangle(body_box, radius=int(h * 0.18), fill=fill.rgba())

    # Wheels
    wheel_r = int(h * 0.11)
    wheel_y = y1 - int(body_h * 0.35)
    wheel_count = 4
    for i in range(wheel_count):
        cx = x0 + int(w * 0.22) + i * int(w * 0.18)
        draw.ellipse(
            (cx - wheel_r, wheel_y - wheel_r, cx + wheel_r, wheel_y + wheel_r),
            fill=fill.rgba(),
        )

    # Turret
    turret_box = (
        x0 + int(w * 0.26),
        y1 - body_h - turret_h,
        x0 + int(w * 0.70),
        y1 - body_h + int(h * 0.02),
    )
    draw.rounded_rectangle(turret_box, radius=int(h * 0.14), fill=fill.rgba())

    # Barrel
    barrel_len = int(w * 0.34)
    barrel_x0 = turret_box[2] - int(w * 0.06)
    barrel_y0 = turret_box[1] + int(turret_h * 0.35)
    draw.rounded_rectangle(
        (barrel_x0, barrel_y0, barrel_x0 + barrel_len, barrel_y0 + barrel_h),
        radius=barrel_h // 2,
        fill=fill.rgba(),
    )


def make_icon(size: int, background: bool) -> Image.Image:
    base = Image.new("RGBA", (size, size), BG.rgba() if background else (0, 0, 0, 0))

    # Accent circle (gradient fill)
    grad = vertical_gradient(size, ACCENT_TOP, ACCENT_BOTTOM)
    mask = Image.new("L", (size, size), 0)
    mdraw = ImageDraw.Draw(mask)
    pad = int(size * 0.14)
    mdraw.ellipse((pad, pad, size - pad, size - pad), fill=255)
    base = Image.composite(grad, base, mask) if background else Image.composite(grad, base, mask)

    # Tank with soft shadow
    tank_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    tdraw = ImageDraw.Draw(tank_layer)
    tank_pad = int(size * 0.28)
    tank_box = (tank_pad, tank_pad + int(size * 0.02), size - tank_pad, size - tank_pad)

    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    draw_tank(sdraw, tank_box, SHADOW)
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=int(size * 0.012)))
    base.alpha_composite(shadow, dest=(int(size * 0.012), int(size * 0.016)))

    draw_tank(tdraw, tank_box, INK)
    base.alpha_composite(tank_layer)

    return base


def make_splash_square(size: int) -> Image.Image:
    # Dark background + subtle vignette + centered mark.
    im = Image.new("RGBA", (size, size), BG.rgba())

    vignette = Image.new("L", (size, size), 0)
    vdraw = ImageDraw.Draw(vignette)
    vpad = int(size * 0.02)
    vdraw.ellipse((vpad, vpad, size - vpad, size - vpad), fill=220)
    vignette = vignette.filter(ImageFilter.GaussianBlur(radius=int(size * 0.08)))
    im = Image.composite(im, Image.new("RGBA", (size, size), (0, 0, 0, 255)), vignette)

    mark = make_icon(size=size, background=True)
    # Make the mark larger and soften edges slightly for splash.
    mark = mark.filter(ImageFilter.GaussianBlur(radius=int(size * 0.002)))
    im.alpha_composite(mark)
    return im


def save_png(im: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, format="PNG", optimize=True)


def main() -> None:
    # Source assets (committed)
    branding_dir = REPO_ROOT / "assets" / "branding"
    icon_png = branding_dir / "icon.png"
    splash_png = branding_dir / "splash.png"

    icon_base = make_icon(1024, background=True)
    icon_fg = make_icon(1024, background=False)
    splash_base = make_splash_square(2732)

    save_png(icon_base, icon_png)
    save_png(splash_base, splash_png)

    # Windows / Electron
    desktop_icon_ico = REPO_ROOT / "apps" / "desktop" / "build" / "icon.ico"
    desktop_icon_png = REPO_ROOT / "apps" / "desktop" / "build" / "icon.png"
    desktop_icon_ico.parent.mkdir(parents=True, exist_ok=True)
    icon_base.save(
        desktop_icon_ico,
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )
    save_png(icon_base.resize((512, 512), Image.Resampling.LANCZOS), desktop_icon_png)

    # iOS (Capacitor) – replace the existing assets in-place
    ios_icon = REPO_ROOT / "ios" / "App" / "App" / "Assets.xcassets" / "AppIcon.appiconset" / "AppIcon-512@2x.png"
    save_png(icon_base, ios_icon)

    ios_splash_dir = REPO_ROOT / "ios" / "App" / "App" / "Assets.xcassets" / "Splash.imageset"
    for name in ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]:
        save_png(splash_base, ios_splash_dir / name)

    # Android icons
    android_res = REPO_ROOT / "android" / "app" / "src" / "main" / "res"
    launcher_sizes = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }
    foreground_sizes = {
        "mipmap-mdpi": 108,
        "mipmap-hdpi": 162,
        "mipmap-xhdpi": 216,
        "mipmap-xxhdpi": 324,
        "mipmap-xxxhdpi": 432,
    }

    for folder, size in launcher_sizes.items():
        target_dir = android_res / folder
        save_png(icon_base.resize((size, size), Image.Resampling.LANCZOS), target_dir / "ic_launcher.png")
        save_png(icon_base.resize((size, size), Image.Resampling.LANCZOS), target_dir / "ic_launcher_round.png")

    for folder, size in foreground_sizes.items():
        target_dir = android_res / folder
        # Foreground is typically padded to sit nicely on adaptive icon backgrounds.
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        pad = int(round(size * 0.18))
        fg = icon_fg.resize((size - pad * 2, size - pad * 2), Image.Resampling.LANCZOS)
        canvas.alpha_composite(fg, dest=(pad, pad))
        save_png(canvas, target_dir / "ic_launcher_foreground.png")

    # Android splash screens (match existing sizes/aspect ratios)
    splash_targets = {
        "drawable/splash.png": (480, 320),
        "drawable-land-mdpi/splash.png": (480, 320),
        "drawable-land-hdpi/splash.png": (800, 480),
        "drawable-land-xhdpi/splash.png": (1280, 720),
        "drawable-land-xxhdpi/splash.png": (1600, 960),
        "drawable-land-xxxhdpi/splash.png": (1920, 1280),
        "drawable-port-mdpi/splash.png": (320, 480),
        "drawable-port-hdpi/splash.png": (480, 800),
        "drawable-port-xhdpi/splash.png": (720, 1280),
        "drawable-port-xxhdpi/splash.png": (960, 1600),
        "drawable-port-xxxhdpi/splash.png": (1280, 1920),
    }
    for rel, (w, h) in splash_targets.items():
        out = cover_resize(splash_base, w, h)
        save_png(out, android_res / rel)

    print(f"Wrote icon:  {icon_png.relative_to(REPO_ROOT)}")
    print(f"Wrote splash:{splash_png.relative_to(REPO_ROOT)}")
    print("Updated Android/iOS/Electron assets in-place.")


if __name__ == "__main__":
    main()


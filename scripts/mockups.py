"""Device renders for the projects: public/projects/<slug>-real.webp and <slug>-abstract.webp.

Each project's art is a pair: the real render (a device in a lit scene with the product on its screen) and
its flat two-tone twin, which the site shows first and opens the real one over (ProjectArt.tsx). The
scenes are the device renders in the Figma file Hi-Fi (EGuNrOMhvZ2N2HhjafkEmp, Landing Page > Projects),
saved as PNGs in .data/mockups/ (not committed; export them from Figma again if they are missing):

  laptop-rock-real.png    4000x3000  a laptop on a purple rock, facing the camera
  laptop-rock-flat.png    4000x3000  its flat twin
  laptop-float-flat.png   3000x2250  a tilted laptop over a wave (flat backdrop, real laptop body)
  laptop-float-studio.png 1500x1125  the same laptop in a dark studio with window light
  phone-sand-real.png     3000x2250  a gold phone against sandstone (transparent backdrop)
  phone-sand-flat.png     3000x2250  its flat twin
  phone-rock-real.png     3000x2250  a green phone on a dark rock, with Breel on it (transparent backdrop)
  phone-rock-flat.png     3000x2250  its flat twin
  payroll-window.png      1203x946   the Payroll Formatter's own window (its Tkinter code, BPMP form), captured
                                     at 150% with PrintWindow, the NPWP fields left empty: the client's tax ID
                                     must never appear

Usage: python scripts/mockups.py [slug ...]        (no slugs: every project below)
       OUT=dir writes there instead of public/projects; PREVIEW=dir also writes JPEG previews.
       Needs numpy, opencv-python and Pillow. Prints each art's circle and focus for the content.

Every screen is a real screenshot (public/projects, or the Payroll Formatter's own window); only the scene
around it comes from Figma. The screen corners were measured on the templates by fitting a line to each
edge of the screen and intersecting them.
"""
import os, sys, json
import numpy as np
import cv2
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TPL = os.path.join(ROOT, ".data", "mockups")
PUB = os.path.join(ROOT, "public")
OUT_W, OUT_H = 2400, 1800

NAVY = np.array([1, 3, 38], np.float32) / 255  # midnight-950
LIGHT = np.array([208, 227, 255], np.float32) / 255  # midnight-100
BLACK = np.zeros(3, np.float32)


def rgb(hex_):
    return np.array([int(hex_[i : i + 2], 16) for i in (1, 3, 5)], np.float32) / 255


# ── Images ──────────────────────────────────────────────────────────────────────────────────────

def load(path, size=None):
    """RGBA float32 in 0..1, resized to `size` (w, h) with Lanczos when given."""
    im = Image.open(path).convert("RGBA")
    if size and im.size != size:
        im = im.resize(size, Image.LANCZOS)
    return np.asarray(im, np.float32) / 255


def on(rgba, color):
    """A template with a transparent backdrop, set on a flat colour."""
    a = rgba[..., 3:4]
    return rgba[..., :3] * a + np.asarray(color, np.float32) * (1 - a)


def save(img, path, quality=86):
    im = Image.fromarray(np.clip(img * 255 + 0.5, 0, 255).astype(np.uint8), "RGB")
    im.save(path, "WEBP", quality=quality, method=6)
    preview = os.environ.get("PREVIEW")
    if preview:
        os.makedirs(preview, exist_ok=True)
        small = im.copy()
        small.thumbnail((1200, 900))
        small.save(os.path.join(preview, os.path.basename(path).replace(".webp", ".jpg")), quality=88)


def duotone(img):
    """The flat twin's screen: light parts in midnight-100, ink (dark or strongly coloured) in navy."""
    lum = img @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    sat = img.max(axis=2) - img.min(axis=2)
    ink = np.clip((0.66 - lum) / 0.22, 0, 1)
    ink = np.maximum(ink, np.clip((sat - 0.28) / 0.18, 0, 1))
    return LIGHT * (1 - ink[..., None]) + NAVY * ink[..., None]


def recolor(img, src, dst, tol=0.2):
    """Swap one flat colour for another, keeping anti-aliased edges (the wave behind a laptop)."""
    d = np.linalg.norm(img - src, axis=2)
    w = np.clip(1 - d / tol, 0, 1)[..., None]
    return img + (np.asarray(dst, np.float32) - src) * w


def turn(img, degrees=0.0, sat=1.0, value=1.0):
    """Turn the scene's hue and saturation (a rock and its light); greys stay grey."""
    hsv = cv2.cvtColor(img.astype(np.float32), cv2.COLOR_RGB2HSV)
    hsv[..., 0] = (hsv[..., 0] + degrees) % 360
    hsv[..., 1] = np.clip(hsv[..., 1] * sat, 0, 1)
    hsv[..., 2] = np.clip(hsv[..., 2] * value, 0, 1)
    return cv2.cvtColor(hsv, cv2.COLOR_HSV2RGB)


def device_only(fn):
    """Apply `fn` to a flat twin's device only, leaving its two flat colours (navy, midnight-100) alone."""

    def edit(img):
        d = np.minimum(np.linalg.norm(img - NAVY, axis=2), np.linalg.norm(img - LIGHT, axis=2))
        m = np.clip((d - 0.04) / 0.08, 0, 1)[..., None]
        return img * (1 - m) + fn(img) * m

    return edit


def fill_edges(img, color=LIGHT, width=8):
    """The laptop-rock twin's bowl stops a few px short of the frame's sides; carry it to the edge."""
    out = img.copy()
    for edge, inner in ((slice(0, width), width), (slice(img.shape[1] - width, None), img.shape[1] - width - 1)):
        col = img[:, inner : inner + 1]
        near = (np.linalg.norm(col - color, axis=2) < 0.06)[..., None]
        out[:, edge] = np.where(near, col, img[:, edge])
    return out


# ── Screens ─────────────────────────────────────────────────────────────────────────────────────

def cover(img, w, h, anchor=(0.5, 0.0)):
    """Scale an image to fill w×h, cropping the overflow around `anchor` (fractions)."""
    sh, sw = img.shape[:2]
    s = max(w / sw, h / sh)
    rw, rh = max(w, round(sw * s)), max(h, round(sh * s))
    r = cv2.resize(img, (rw, rh), interpolation=cv2.INTER_AREA if s < 1 else cv2.INTER_CUBIC)
    x = round((rw - w) * anchor[0])
    y = round((rh - h) * anchor[1])
    return r[y : y + h, x : x + w]


def rounded(w, h, radii, ss=4):
    """1 inside a w×h rectangle with corner radii (tl, tr, br, bl), anti-aliased."""
    W, H = w * ss, h * ss
    m = np.full((H, W), 255, np.uint8)
    corners = [(0, 0), (W - 1, 0), (W - 1, H - 1), (0, H - 1)]
    for (cx, cy), r in zip(corners, radii):
        r = int(round(r * ss))
        if r <= 0:
            continue
        x0 = 0 if cx == 0 else W - r
        y0 = 0 if cy == 0 else H - r
        m[y0 : y0 + r, x0 : x0 + r] = 0
        cv2.circle(m, (r if cx == 0 else W - 1 - r, r if cy == 0 else H - 1 - r), r, 255, -1, cv2.LINE_AA)
    return cv2.resize(m, (w, h), interpolation=cv2.INTER_AREA).astype(np.float32) / 255


def pill(w, h, x0, y0, x1, y1, radii, ss=4):
    """1 inside a rounded box (x0, y0)–(x1, y1) of a w×h screen, anti-aliased. radii: (tl, tr, br, bl)."""
    box = rounded(max(1, round((x1 - x0) * ss)), max(1, round((y1 - y0) * ss)), [r * ss for r in radii], ss=1)
    m = np.zeros((h * ss, w * ss), np.float32)
    X0, Y0 = round(x0 * ss), round(y0 * ss)
    m[Y0 : Y0 + box.shape[0], X0 : X0 + box.shape[1]] = box[: h * ss - Y0, : w * ss - X0]
    return cv2.resize(m, (w, h), interpolation=cv2.INTER_AREA)


def paint(img, mask, color):
    return img * (1 - mask[..., None]) + np.asarray(color, np.float32) * mask[..., None]


def warp(base, screen, mask, quad):
    """Lay a flat screen (w×h) onto `quad` (tl, tr, br, bl) of the base image."""
    h, w = screen.shape[:2]
    M = cv2.getPerspectiveTransform(np.float32([[0, 0], [w, 0], [w, h], [0, h]]), np.float32(quad))
    size = (base.shape[1], base.shape[0])
    # Bring the screen near its final size first, so the warp doesn't alias fine text.
    warped = cv2.warpPerspective(screen, M, size, flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    alpha = cv2.warpPerspective(mask, M, size, flags=cv2.INTER_LINEAR, borderValue=0)[..., None]
    return base * (1 - alpha) + np.clip(warped, 0, 1) * alpha, M


def point(M, x, y):
    p = M @ np.array([x, y, 1.0])
    return p[0] / p[2], p[1] / p[2]


# ── Scenes ──────────────────────────────────────────────────────────────────────────────────────

class Scene:
    """A device scene. `quad` is the screen's corners (tl, tr, br, bl) in template px; `screen` the size
    the screen is drawn at before it is laid on (true proportions); `cut` the notch or island in screen
    px with its corner radii; `focus` the device's box in template px (x0, y0, x1, y1)."""

    def __init__(self, real, flat, size, quad, screen, radii, cut, focus, real_bg=None, flat_bg=NAVY):
        self.real, self.flat, self.size = real, flat, size
        self.quad, self.screen, self.radii, self.cut, self.focus = quad, screen, radii, cut, focus
        self.real_bg, self.flat_bg = real_bg, flat_bg


# The laptop on the rock: screen square to the camera, 2107×1360 at (947, 822), rounded top corners and
# the notch (x 1885–2116, 38 px deep). 4000×3000.
LAPTOP_ROCK = Scene(
    "laptop-rock-real.png", "laptop-rock-flat.png", (4000, 3000),
    [(947, 822), (3054, 822), (3054, 2182), (947, 2182)],
    (1580, 1020), (19, 19, 0, 0),
    ((1885 - 947) * 0.75, -2, (2116 - 947) * 0.75, 38 * 0.75, (0, 0, 6, 6)),
    (560, 780, 3440, 2580),
)

# The tilted laptop: one pose, a flat backdrop (wave) or a dark studio. 3000×2250 (the studio is half that).
LAPTOP_FLOAT = Scene(
    "laptop-float-flat.png", "laptop-float-flat.png", (3000, 2250),
    [(1271.7, 183.3), (2330.3, 813.2), (1878.5, 1503.7), (810.8, 907.6)],
    (1200, 776), (14, 14, 0, 0),
    (600 - 66, -2, 600 + 66, 22, (0, 0, 7, 7)),
    (690, 170, 2350, 2110),
)

# The phones: an iPhone-shaped screen (true proportions 590×1279 here) with its island. 3000×2250.
PHONE_SAND = Scene(
    "phone-sand-real.png", "phone-sand-flat.png", (3000, 2250),
    [(1220.8, 338.8), (1784.9, 346.8), (1799.3, 1792.2), (1237.4, 1784.4)],
    (590, 1279), (82, 82, 82, 82),
    (210, 15, 382, 63, (24, 24, 24, 24)),
    (1180, 300, 1840, 1830), real_bg=BLACK,
)
PHONE_ROCK = Scene(
    "phone-rock-real.png", "phone-rock-flat.png", (3000, 2250),
    [(1445.4, 477.8), (1961.8, 523.2), (1705.5, 1909.7), (1188.4, 1864.5)],
    (590, 1279), (82, 82, 82, 82),
    (209, 13, 382, 59, (23, 23, 23, 23)),
    (1150, 440, 2000, 1950), real_bg=BLACK,
)


def templates(scene, real_file=None):
    real = load(os.path.join(TPL, real_file or scene.real), (OUT_W, OUT_H))
    flat = load(os.path.join(TPL, scene.flat), (OUT_W, OUT_H))
    real = on(real, scene.real_bg if scene.real_bg is not None else BLACK)
    flat = on(flat, scene.flat_bg)
    return real, flat


def scaled(scene, mirror=False):
    """The screen quad and the device's box in output px (mirrored when asked)."""
    sx = OUT_W / scene.size[0]
    sy = OUT_H / scene.size[1]
    quad = [(x * sx, y * sy) for x, y in scene.quad]
    x0, y0, x1, y1 = scene.focus
    focus = [x0 * sx, y0 * sy, x1 * sx, y1 * sy]
    if mirror:
        quad = [(OUT_W - x, y) for x, y in quad]
        quad = [quad[1], quad[0], quad[3], quad[2]]  # tl ↔ tr, br ↔ bl
        focus = [OUT_W - focus[2], focus[1], OUT_W - focus[0], focus[3]]
    return quad, focus


def render(scene, screen, *, mirror=False, real_file=None, real_edit=None, flat_edit=None, keep_flat=None):
    """Lay `screen` (already sized to scene.screen, RGB) into the scene. Returns real, flat, M, focus."""
    real, flat = templates(scene, real_file)
    if mirror:
        real, flat = real[:, ::-1].copy(), flat[:, ::-1].copy()
    if real_edit:
        real = real_edit(real)
    if flat_edit:
        flat = flat_edit(flat)
    w, h = scene.screen
    x0, y0, x1, y1, radii = scene.cut
    cut = pill(w, h, max(0, x0), max(0, y0), x1, y1, radii)
    shown = paint(screen, cut, BLACK)
    mask = rounded(w, h, scene.radii)
    quad, focus = scaled(scene, mirror)
    template_flat = flat
    real, M = warp(real, shown, mask, quad)
    flat, _ = warp(flat, paint(duotone(screen), cut, BLACK), mask, quad)
    if keep_flat is not None:
        k = keep_flat(mirror)[..., None]
        flat = fill_edges(flat * (1 - k) + template_flat * k)
    return real, flat, M, focus


def bowl_keep(mirror):
    """The laptop-rock twin's bowl passes in front of the screen's lower right corner: keep it there."""
    yy, xx = np.mgrid[0:OUT_H, 0:OUT_W].astype(np.float32)
    s = OUT_W / 4000
    # A circle fitted to the bowl's edge beside that corner, in template px.
    cx, cy, r = 561.6 * s, -1217.8 * s, 4205.7 * s
    if mirror:
        cx = OUT_W - cx
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) - r
    keep = np.clip(d + 0.5, 0, 1)
    near = (xx > 2700 * s) if not mirror else (xx < OUT_W - 2700 * s)
    return keep * near


# ── Phone status bar ────────────────────────────────────────────────────────────────────────────

_glyphs = None


def status_glyphs():
    """The time and the signal, wifi and battery icons of the iOS status bar, as an alpha mask in the
    phone's screen px, lifted from the sand phone's own screen (dark glyphs on white)."""
    global _glyphs
    if _glyphs is None:
        sc = PHONE_SAND
        im = load(os.path.join(TPL, sc.real))
        img = on(im, BLACK)
        w, h = sc.screen
        M = cv2.getPerspectiveTransform(np.float32(sc.quad), np.float32([[0, 0], [w, 0], [w, h], [0, h]]))
        flat = cv2.warpPerspective(img, M, (w, h), flags=cv2.INTER_AREA)
        lum = flat @ np.array([0.2126, 0.7152, 0.0722], np.float32)
        a = np.clip((0.92 - lum) / 0.75, 0, 1)
        keep = np.zeros_like(a)
        keep[14:62, 30:200] = 1  # the time
        keep[14:62, 392:560] = 1  # the icons
        _glyphs = a * keep
    return _glyphs


def status_bar(screen, height, background, ink):
    """An iOS status bar over the top `height` px of a phone screen: `background`, glyphs in `ink`."""
    out = screen.copy()
    out[:height] = background
    g = status_glyphs()[: out.shape[0]]
    return paint(out, g, ink)


# ── Projects ────────────────────────────────────────────────────────────────────────────────────

def shot(path):
    return load(os.path.join(PUB, path.lstrip("/")))[..., :3]


def write(slug, real, flat):
    out = os.environ.get("OUT") or os.path.join(PUB, "projects")
    os.makedirs(out, exist_ok=True)
    save(real, os.path.join(out, f"{slug}-real.webp"))
    save(flat, os.path.join(out, f"{slug}-abstract.webp"))


def report(M, at, r, focus, drawn=True):
    """The content's numbers: the reveal's circle (at a point of the screen) and the device's box."""
    x, y = point(M, *at)
    return {
        "circle": {"x": round(x / OUT_W, 4), "y": round(y / OUT_H, 4), "r": r, "drawn": drawn},
        "focus": {
            "x": round(focus[0] / OUT_W, 4),
            "y": round(focus[1] / OUT_H, 4),
            "w": round((focus[2] - focus[0]) / OUT_W, 4),
            "h": round((focus[3] - focus[1]) / OUT_H, 4),
        },
    }


def laptop_screen(path, scene, anchor=(0.5, 0.0)):
    w, h = scene.screen
    return cover(shot(path), w, h, anchor)


def mortgage_review():
    sc = LAPTOP_ROCK
    real, flat, M, focus = render(sc, laptop_screen("/projects/mortgage-review/detail.webp", sc), keep_flat=bowl_keep)
    write("mortgage-review", real, flat)
    return report(M, (sc.screen[0] * 0.9, sc.screen[1] * 0.075), 0.04, focus)


def bank_sampah():
    sc = LAPTOP_FLOAT
    green = rgb("#7ee0a1")
    real, flat, M, focus = render(
        sc,
        laptop_screen("/projects/bank-sampah/overview.webp", sc),
        real_edit=lambda im: recolor(im, LIGHT, green),
    )
    write("bank-sampah", real, flat)
    return report(M, (sc.screen[0] * 0.86, sc.screen[1] * 0.2), 0.036, focus)


def seru_room():
    sc = LAPTOP_FLOAT
    real, flat, M, focus = render(sc, laptop_screen("/projects/seru-room/live-poll.webp", sc), real_file="laptop-float-studio.png")
    write("seru-room", real, flat)
    return report(M, (sc.screen[0] * 0.8, sc.screen[1] * 0.25), 0.036, focus)


def payroll_formatter():
    """The real window (captured from the tool's own code, with the client's tax ID cleared) on a desktop."""
    sc = LAPTOP_ROCK
    w, h = sc.screen
    path = os.path.join(TPL, "payroll-window.png")
    win = load(path)[..., :3]
    # Desktop: a deep teal-to-navy wash with a soft glow, like a calm wallpaper.
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    t = np.clip((xx / w * 0.5 + yy / h * 0.9) / 1.2, 0, 1)[..., None]
    desk = rgb("#1d6f8a") * (1 - t) + rgb("#06173f") * t
    glow = np.exp(-(((xx - w * 0.25) / (w * 0.35)) ** 2 + ((yy - h * 0.15) / (h * 0.45)) ** 2))[..., None]
    desk = desk + (rgb("#5fc4d6") - desk) * glow * 0.35
    # The window at the size it opens at (800×600) on a 1280-wide screen, so it reads at a glance.
    ww = round(w * 802 / 1280)
    wh = round(win.shape[0] * ww / win.shape[1])
    win = cv2.resize(win, (ww, wh), interpolation=cv2.INTER_AREA)
    x0, y0 = (w - ww) // 2, round((h - wh) * 0.45)
    # A soft shadow under it, as Windows draws one.
    shadow = np.zeros((h, w), np.float32)
    shadow[y0 + 12 : y0 + wh + 22, x0 - 6 : x0 + ww + 6] = 1
    shadow = cv2.GaussianBlur(shadow, (0, 0), 22) * 0.6
    desk = paint(desk, shadow, BLACK)
    desk[y0 : y0 + wh, x0 : x0 + ww] = win
    real, flat, M, focus = render(
        sc, desk, real_edit=lambda im: turn(im, degrees=-70, sat=0.85), keep_flat=bowl_keep
    )
    write("payroll-formatter", real, flat)
    return report(M, (x0 + ww * 0.82, y0 + wh * 0.3), 0.04, focus)


def sidaku():
    """A screen of the real app, cut out of its screenshot board, with an iOS status bar in its colour."""
    sc = PHONE_SAND
    w, h = sc.screen
    board = shot("/projects/sidaku/cover.webp")
    phone = board[95:1154, 166:643]  # the left phone's screen: the business directory with its map
    bar = phone[2:8, 60:120].reshape(-1, 3).mean(axis=0)
    phone = cover(phone, w, h)
    phone = status_bar(phone, 58, bar, np.ones(3, np.float32))
    real, flat, M, focus = render(sc, phone, mirror=True)
    write("sidaku", real, flat)
    return report(M, (w * 0.8, h * 0.55), 0.036, focus)


def jagaday():
    """The phone build's Today screen, under a white iOS status bar."""
    sc = PHONE_ROCK
    w, h = sc.screen
    top = 60
    app = shot("/projects/jagaday/phone.webp")
    app = cv2.resize(app, (w, round(app.shape[0] * w / app.shape[1])), interpolation=cv2.INTER_CUBIC)
    screen = np.ones((h, w, 3), np.float32)
    screen[top:] = app[: h - top]
    screen = status_bar(screen, top, np.ones(3, np.float32), np.zeros(3, np.float32))
    graphite = lambda im: turn(im, degrees=0, sat=0.08, value=1.05)  # noqa: E731
    real, flat, M, focus = render(sc, screen, mirror=True, real_edit=graphite, flat_edit=device_only(graphite))
    write("jagaday", real, flat)
    return report(M, (w * 0.78, h * 0.42), 0.036, focus)


def breel():
    """Breel's own mockup from the Figma file: the screen is already its app."""
    sc = PHONE_ROCK
    real, flat = templates(sc)
    write("breel", real, flat)
    quad, focus = scaled(sc)
    w, h = sc.screen
    M = cv2.getPerspectiveTransform(np.float32([[0, 0], [w, 0], [w, h], [0, h]]), np.float32(quad))
    return report(M, (w * 0.8, h * 0.3), 0.036, focus)


PROJECTS = {
    "mortgage-review": mortgage_review,
    "bank-sampah": bank_sampah,
    "seru-room": seru_room,
    "payroll-formatter": payroll_formatter,
    "sidaku": sidaku,
    "jagaday": jagaday,
    "breel": breel,
}

if __name__ == "__main__":
    wanted = sys.argv[1:] or list(PROJECTS)
    for slug in wanted:
        print(slug, json.dumps(PROJECTS[slug]()))

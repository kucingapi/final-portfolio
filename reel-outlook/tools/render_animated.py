"""Fully animated faceless reel: one animated scene per sentence, OpenRouter voiceover, captions.

Usage: render_animated.py OUT_DIR [en|id ...]
Voice clips are cached per sentence in OUT_DIR/<lang>/audio/ and reused when the text is unchanged.
"""
import hashlib
import math
import os
import random
import re
import subprocess
import sys
import wave
from multiprocessing import Pool

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from orclient import tts  # noqa: E402

W, H, FPS = 1080, 1920, 30
VOICE = "sage"
TEMPO = {"en": 0.96, "id": 1.0}
LANG_NAME = {"en": "English", "id": "Indonesian"}
LEAD_IN, GAP_SENT, GAP_BEAT, TAIL = 0.3, 0.18, 0.4, 1.4
TR = 0.4  # scene transition length (s)
STILLS = "--stills" in sys.argv

FD = "/usr/share/fonts/opentype/inter/"
F_BLACK, F_BOLD, F_SEMI = FD + "Inter-Black.otf", FD + "Inter-Bold.otf", FD + "Inter-SemiBold.otf"

# Palette
PBG = (30, 38, 62)        # stage panel
WIN = (240, 244, 252)     # windows / paper
INK = (24, 28, 40)
BLUE = (0, 120, 212)
SKY = (90, 140, 210)
RED = (232, 72, 85)
AMBER = (245, 166, 35)
GREEN = (46, 204, 113)
GOLD = (245, 190, 60)
SLATE = (86, 96, 116)
LIGHT = (205, 212, 225)
BODY = (44, 52, 72)
EDGE = (90, 100, 124)

# Stage panel geometry (logical px); scenes draw in panel coordinates 1000x760
PX, PY, PW, PH = 40, 520, 1000, 760
SS = 2  # supersampling

BEATS = {
    "en": ["THE OUTAGE", "WHAT HAPPENED", "WHAT TO DO", "SHOULD YOU SWITCH?", "NEXT TIME", "YOUR TURN"],
    "id": ["GANGGUAN", "APA YANG TERJADI", "HARUS NGAPAIN", "PERLU PINDAH?", "LAIN KALI", "GILIRAN KAMU"],
}


# ---------------------------------------------------------------- helpers
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def eo(x):
    x = clamp(x)
    return 1 - (1 - x) ** 3


def eio(x):
    x = clamp(x)
    return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


def back(x):
    x = clamp(x)
    c1 = 1.70158
    c3 = c1 + 1
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2


def seg(t, a, b):
    return clamp((t - a) / (b - a)) if b > a else float(t >= a)


def lerp(a, b, t):
    if isinstance(a, tuple):
        return tuple(int(x + (y - x) * t) for x, y in zip(a, b))
    return a + (b - a) * t


_fonts = {}


def font(path, size):
    key = (path, int(size))
    if key not in _fonts:
        _fonts[key] = ImageFont.truetype(path, max(1, int(size)))
    return _fonts[key]


class P:
    """Painter in logical panel coordinates, drawing at SS x resolution with alpha blending."""

    def __init__(self, img):
        self.d = ImageDraw.Draw(img, "RGBA")

    def rect(self, x0, y0, x1, y1, r=0, fill=None, outline=None, w=0):
        x0, x1 = min(x0, x1), max(x0, x1)
        y0, y1 = min(y0, y1), max(y0, y1)
        self.d.rounded_rectangle([x0 * SS, y0 * SS, x1 * SS, y1 * SS], radius=max(0, r * SS), fill=fill,
                                 outline=outline, width=int(w * SS))

    def ellipse(self, cx, cy, rx, ry, fill=None, outline=None, w=0):
        if rx <= 0 or ry <= 0:
            return
        self.d.ellipse([(cx - rx) * SS, (cy - ry) * SS, (cx + rx) * SS, (cy + ry) * SS], fill=fill, outline=outline,
                       width=int(w * SS))

    def circle(self, cx, cy, r, fill=None, outline=None, w=0):
        self.ellipse(cx, cy, r, r, fill, outline, w)

    def line(self, pts, fill, w=4):
        self.d.line([(x * SS, y * SS) for x, y in pts], fill=fill, width=max(1, int(w * SS)), joint="curve")
        r = w / 2
        for x, y in (pts[0], pts[-1]):
            self.circle(x, y, r, fill=fill)

    def poly(self, pts, fill):
        self.d.polygon([(x * SS, y * SS) for x, y in pts], fill=fill)

    def arc(self, cx, cy, r, a0, a1, fill, w):
        if r <= 0:
            return
        self.d.arc([(cx - r) * SS, (cy - r) * SS, (cx + r) * SS, (cy + r) * SS], a0, a1, fill=fill, width=int(w * SS))

    def text(self, x, y, s, size, fill, anchor="mm", path=F_BLACK):
        self.d.text((x * SS, y * SS), s, font=font(path, size * SS), fill=fill, anchor=anchor)


# ---------------------------------------------------------------- objects
def envelope(p, cx, cy, w, h, col=WIN, line=SLATE):
    p.rect(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2, r=h * 0.12, fill=col)
    p.line([(cx - w / 2 + w * 0.06, cy - h / 2 + h * 0.1), (cx, cy + h * 0.1), (cx + w / 2 - w * 0.06, cy - h / 2 + h * 0.1)],
           fill=line, w=max(3, h * 0.06))


def badge_x(p, cx, cy, r, col=RED):
    if r <= 1:
        return
    p.circle(cx, cy, r, fill=col)
    k = r * 0.42
    p.line([(cx - k, cy - k), (cx + k, cy + k)], (255, 255, 255), w=r * 0.28)
    p.line([(cx - k, cy + k), (cx + k, cy - k)], (255, 255, 255), w=r * 0.28)


def badge_check(p, cx, cy, r, col=GREEN):
    if r <= 1:
        return
    p.circle(cx, cy, r, fill=col)
    p.line([(cx - r * 0.45, cy + r * 0.02), (cx - r * 0.12, cy + r * 0.35), (cx + r * 0.48, cy - r * 0.35)],
           (255, 255, 255), w=r * 0.26)


def server(p, x, y, w, h, led, body=BODY, load=None, load_col=GREEN):
    p.rect(x, y, x + w, y + h, r=14, fill=body, outline=EDGE, w=3)
    for k in range(3):
        p.rect(x + 20, y + 20 + k * 24, x + w - 62, y + 30 + k * 24, r=5, fill=EDGE)
    if load is not None:
        p.rect(x + 20, y + h - 22, x + 20 + (w - 82) * clamp(load), y + h - 12, r=5, fill=load_col)
    p.circle(x + w - 32, y + h / 2, 12, fill=led)


def cloud(p, cx, cy, s, col):
    for dx, dy, r in [(-70, 10, 60), (0, -25, 80), (75, 10, 60), (0, 30, 60)]:
        p.circle(cx + dx * s, cy + dy * s, r * s, fill=col)
    p.rect(cx - 130 * s, cy + 10 * s, cx + 130 * s, cy + 90 * s, r=40 * s, fill=col)


def shield(p, cx, cy, s, col):
    right = [(0, -1.12), (1, -0.88), (1, -0.15), (0.88, 0.38), (0.58, 0.82), (0, 1.18)]
    pts = right + [(-x, y) for x, y in reversed(right[1:-1])]
    p.poly([(cx + x * s, cy + y * s) for x, y in pts], fill=col)


def coin(p, cx, cy, rx=70, ry=22):
    p.rect(cx - rx, cy, cx + rx, cy + 14, fill=(205, 150, 35))
    p.ellipse(cx, cy + 14, rx, ry, fill=(205, 150, 35))
    p.ellipse(cx, cy, rx, ry, fill=GOLD)
    p.ellipse(cx, cy, rx * 0.62, ry * 0.62, outline=(225, 170, 45), w=3)


def clockface(p, cx, cy, r, ang):
    p.circle(cx, cy, r, fill=WIN, outline=SLATE, w=max(2, r * 0.08))
    for k in range(12):
        a = k * math.pi / 6
        p.line([(cx + math.cos(a) * r * 0.72, cy + math.sin(a) * r * 0.72),
                (cx + math.cos(a) * r * 0.84, cy + math.sin(a) * r * 0.84)], SLATE, w=max(1.5, r * 0.04))
    a = math.radians(ang - 90)
    p.line([(cx, cy), (cx + math.cos(a) * r * 0.7, cy + math.sin(a) * r * 0.7)], RED, w=max(2, r * 0.07))
    a2 = math.radians(ang / 12 - 90)
    p.line([(cx, cy), (cx + math.cos(a2) * r * 0.45, cy + math.sin(a2) * r * 0.45)], INK, w=max(2, r * 0.09))
    p.circle(cx, cy, r * 0.08, fill=INK)


def window(p, x0, y0, x1, y1, url=False):
    p.rect(x0, y0, x1, y1, r=28, fill=WIN)
    p.rect(x0, y0, x1, y0 + 62, r=28, fill=(220, 226, 238))
    p.rect(x0, y0 + 34, x1, y0 + 62, fill=(220, 226, 238))
    for k, c in enumerate([(240, 110, 110), (245, 190, 80), (110, 200, 130)]):
        p.circle(x0 + 34 + k * 30, y0 + 31, 9, fill=c)
    if url:
        p.rect(x0 + 140, y0 + 16, x1 - 100, y0 + 46, r=15, fill=WIN)


def heart(p, cx, cy, s, col=RED):
    p.circle(cx - s * 0.5, cy - s * 0.2, s * 0.55, fill=col)
    p.circle(cx + s * 0.5, cy - s * 0.2, s * 0.55, fill=col)
    p.poly([(cx - s * 1.02, cy - s * 0.05), (cx + s * 1.02, cy - s * 0.05), (cx, cy + s * 1.1)], fill=col)


def bubble(p, x0, y0, x1, y1, col, tail="left"):
    p.rect(x0, y0, x1, y1, r=min(36, (y1 - y0) / 2), fill=col)
    if tail == "left":
        p.poly([(x0 + 24, y1 - 8), (x0 + 6, y1 + 26), (x0 + 64, y1 - 8)], fill=col)
    else:
        p.poly([(x1 - 24, y1 - 8), (x1 - 6, y1 + 26), (x1 - 64, y1 - 8)], fill=col)


def dots(p, cx, cy, t, col, gap=40, r=12):
    for k in range(3):
        b = 10 * max(0, math.sin(t * 6 - k * 0.8))
        p.circle(cx + (k - 1) * gap, cy - b, r, fill=col)


# ---------------------------------------------------------------- scenes
# Each scene: fn(p, lt, d, ctx). lt = seconds since scene start, d = scene duration.
SRV_W, SRV_H, SRV_GX, SRV_GY = 180, 110, 30, 44
SRV_X0, SRV_Y0 = 95, 330
FIRST_FAIL = [5, 2, 6]
CASCADE = [1, 7, 4, 0, 3]


def srv_xy(i):
    return SRV_X0 + (i % 4) * (SRV_W + SRV_GX), SRV_Y0 + (i // 4) * (SRV_H + SRV_GY)


def s_inbox(p, lt, d, ctx):
    oy = (1 - eo(seg(lt, 0, 0.45))) * 90
    window(p, 190, 110 + oy, 810, 650 + oy)
    pulse = 10 + 3 * math.sin(lt * 8)
    if lt > 0.6:
        p.circle(770, 141 + oy, pulse, fill=RED)
    for i in range(5):
        y = 200 + i * 86 + oy
        die = seg(lt, 0.6 + i * 0.2, 1.0 + i * 0.2)
        xo = eo(die) * 90
        p.circle(250 + xo, y + 30, 24, fill=lerp(BLUE, WIN, die))
        p.rect(295 + xo, y + 12, 640 + xo, y + 26, r=7, fill=lerp((150, 160, 180), WIN, die))
        p.rect(295 + xo, y + 38, 560 + xo, y + 50, r=6, fill=lerp((190, 198, 212), WIN, die))
    sa = seg(lt, 1.7, 2.1)
    if sa > 0:
        p.arc(500, 400 + oy, 56, (lt * 360) % 360, (lt * 360) % 360 + 270, lerp(WIN, BLUE, sa), 13)
    c = back(seg(lt, 0.3, 0.75))
    if c > 0.02:
        clockface(p, 810, 120 + oy, 62 * c, lt * 700)


def s_nohack(p, lt, d, ctx):
    for k in range(3):
        ph = ((lt * 0.8 + k / 3) % 1)
        if lt > 0.5:
            p.circle(500, 390, 230 + ph * 170, outline=lerp(GREEN, PBG, ph), w=6)
    sh = back(seg(lt, 0.35, 0.85))
    if sh > 0.02:
        shield(p, 500, 390, 210 * sh, (36, 150, 90))
        shield(p, 500, 390, 180 * sh, GREEN)
    oy = -(1 - back(seg(lt, 0, 0.6))) * 320
    cx, cy = 500, 420 + oy
    p.arc(cx, cy - 70, 72, 180, 360, (200, 208, 222), 26)
    p.rect(cx - 72 - 13, cy - 70, cx - 72 + 13, cy - 20, fill=(200, 208, 222))
    p.rect(cx + 72 - 13, cy - 70, cx + 72 + 13, cy - 20, fill=(200, 208, 222))
    p.rect(cx - 115, cy - 30, cx + 115, cy + 130, r=28, fill=(250, 200, 70))
    p.circle(cx, cy + 35, 20, fill=(120, 80, 20))
    p.rect(cx - 8, cy + 40, cx + 8, cy + 85, r=6, fill=(120, 80, 20))
    c = back(seg(lt, 1.0, 1.35))
    badge_check(p, 650, 300 + oy * 0, 52 * c)
    sp = seg(lt, 1.05, 1.6)
    if 0 < sp < 1:
        for k in range(8):
            a = k * math.pi / 4
            r0, r1 = 70 + sp * 40, 80 + sp * 80
            p.line([(650 + math.cos(a) * r0, 300 + math.sin(a) * r0), (650 + math.cos(a) * r1, 300 + math.sin(a) * r1)],
                   lerp(GREEN, PBG, sp), w=6)


def calendar(p, cx, cy, s, day, fade=0.0):
    w, h = 300 * s, 320 * s
    p.rect(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2, r=30 * s, fill=lerp(WIN, PBG, fade))
    p.rect(cx - w / 2, cy - h / 2, cx + w / 2, cy - h / 2 + 90 * s, r=30 * s, fill=lerp(RED, PBG, fade))
    p.rect(cx - w / 2, cy - h / 2 + 50 * s, cx + w / 2, cy - h / 2 + 90 * s, fill=lerp(RED, PBG, fade))
    p.text(cx, cy - h / 2 + 47 * s, "NOV", 44 * s, lerp((255, 255, 255), PBG, fade))
    p.text(cx, cy + 45 * s, str(day), 150 * s, lerp(INK, PBG, fade))


def draw_servers(p, lt, failed_at, cascade=None, load_t=None):
    """failed_at: {index: time it fails}; cascade adds load bars + shake for the rest."""
    for i in range(8):
        x, y = srv_xy(i)
        ft = failed_at.get(i)
        if ft is not None and lt >= ft:
            f = eo(seg(lt, ft, ft + 0.3))
            server(p, x, y + 18 * f, SRV_W, SRV_H, RED, body=lerp(BODY, (72, 36, 48), f))
            badge_x(p, x + SRV_W - 8, y - 6 + 18 * f, 26 * back(seg(lt, ft, ft + 0.3)))
        elif cascade is not None:
            L = clamp(load_t + 0.08 * (i % 3))
            col = lerp(GREEN, AMBER, clamp(L * 2)) if L < 0.5 else lerp(AMBER, RED, clamp((L - 0.5) * 2))
            jit = 5 * L * math.sin(lt * 50 + i * 1.7)
            led = col if int(lt * (4 + 10 * L)) % 2 == 0 else BODY
            server(p, x + jit, y, SRV_W, SRV_H, led, load=L, load_col=col)
        else:
            led = GREEN if int(lt * 3 + i) % 4 else (30, 150, 80)
            server(p, x, y, SRV_W, SRV_H, led)


def s_calendar_servers(p, lt, d, ctx):
    idx = min(2, int(lt / 0.32))
    m = eio(seg(lt, 1.25, 1.85))
    cx, cy, s = lerp(500, 150, m), lerp(330, 140, m), 1 - 0.58 * m
    calendar(p, cx, cy, s, 10 + idx)
    for k in range(idx):
        tk = seg(lt, (k + 1) * 0.32, (k + 1) * 0.32 + 0.3)
        if tk < 1:
            calendar(p, cx, cy - eo(tk) * 140, s, 10 + k, fade=tk)
    if lt > 1.35:
        span = max(0.6, d - 2.4)
        fails = {i: 2.3 + k * span * 0.3 for k, i in enumerate(FIRST_FAIL)}
        for i in range(8):
            a = back(seg(lt, 1.35 + i * 0.06, 1.75 + i * 0.06))
            if a < 1:
                x, y = srv_xy(i)
                server(p, x, y + (1 - a) * 60, SRV_W, SRV_H, lerp(PBG, GREEN, clamp(a)), body=lerp(PBG, BODY, clamp(a)))
        if lt > 1.75 + 0.42:
            draw_servers(p, lt, fails)
        if lt > 2.0:
            by = 300 + ((lt - 2.0) % 1.3) / 1.3 * 340
            p.rect(70, by - 10, 930, by + 10, fill=GREEN + (50,))
            p.rect(70, by - 3, 930, by + 3, fill=GREEN + (200,))


def s_overload(p, lt, d, ctx):
    L = clamp(lt / max(0.8, d * 0.75))
    for j in range(11):
        x = 110 + j * 78
        y = 120 + ((lt * (140 + 300 * L) + j * 53) % 170)
        p.poly([(x - 16, y), (x + 16, y), (x, y + 22)], fill=AMBER + (220,))
    fails = {i: -1 for i in FIRST_FAIL}
    for k, i in enumerate(CASCADE):
        fails[i] = d * 0.35 + k * d * 0.1
    draw_servers(p, lt, fails, cascade=True, load_t=L)


def s_globe(p, lt, d, ctx):
    sc = back(seg(lt, 0, 0.5))
    cx, cy, r = 500, 400, 235 * sc
    if r < 5:
        return
    p.circle(cx, cy, r + 14, fill=(40, 60, 110))
    p.circle(cx, cy, r, fill=(40, 90, 170))
    for lat in (-0.66, -0.33, 0, 0.33, 0.66):
        y = cy + lat * r
        hw = r * math.sqrt(1 - lat * lat)
        p.line([(cx - hw, y), (cx + hw, y)], SKY, w=3)
    for k in range(6):
        ph = lt * 0.8 + k * math.pi / 6
        p.ellipse(cx, cy, r * abs(math.cos(ph)), r, outline=SKY, w=3)
    rnd = random.Random(7)
    for j in range(14):
        a, rr = rnd.uniform(0, 2 * math.pi), r * math.sqrt(rnd.uniform(0.05, 0.85))
        x, y = cx + math.cos(a) * rr, cy + math.sin(a) * rr
        at = 0.5 + j * 0.16
        if lt >= at:
            f = ((lt - at) % 1.2) / 1.2
            p.circle(x, y, 12 + f * 40, outline=lerp(RED, (40, 90, 170), f), w=4)
            p.circle(x, y, 11 * back(seg(lt, at, at + 0.25)), fill=RED)
    for k, (col, kind) in enumerate([((0, 120, 212), "mail"), ((98, 100, 217), "chat")]):
        a = lt * 0.9 + k * math.pi
        tx, ty = cx + math.cos(a) * 340, cy + math.sin(a) * 120 + 150 * 0
        p.rect(tx - 50, ty - 50, tx + 50, ty + 50, r=22, fill=col)
        if kind == "mail":
            envelope(p, tx, ty, 58, 40, col=WIN, line=col)
        else:
            bubble(p, tx - 28, ty - 22, tx + 28, ty + 14, WIN)
        badge_x(p, tx + 44, ty - 44, 20 * back(seg(lt, 0.8 + k * 0.3, 1.1 + k * 0.3)))


def s_cause(p, lt, d, ctx):
    oy = (1 - eo(seg(lt, 0, 0.4))) * 80
    p.rect(220, 160 + oy, 560, 640 + oy, r=24, fill=WIN)
    for k in range(9):
        y = 210 + k * 45 + oy
        wdt = [280, 240, 260, 200, 270, 230, 250, 180, 220][k]
        col = SLATE if k in (2, 3, 6) else (180, 188, 204)
        p.rect(255, y, 255 + wdt, y + 16, r=8, fill=col)
    mx, my = 400 + 120 * math.sin(lt * 1.6), 380 + 100 * math.sin(lt * 3.2) + oy
    p.circle(mx, my, 78, fill=(180, 210, 255, 70))
    p.circle(mx, my, 78, outline=(200, 208, 222), w=16)
    p.line([(mx + 58, my + 58), (mx + 125, my + 125)], (200, 208, 222), w=24)
    q = back(seg(lt, 0.4, 0.8))
    if q > 0.02:
        p.text(770, 380, "?", 280 * q * (1 + 0.05 * math.sin(lt * 5)), AMBER)


def s_status(p, lt, d, ctx):
    oy = (1 - eo(seg(lt, 0, 0.4))) * 80
    window(p, 150, 120 + oy, 850, 640 + oy, url=True)
    bx, by = 800, 151 + oy
    p.arc(bx, by, 15, 40, 330, SLATE, 5)
    p.poly([(bx + 14, by - 18), (bx + 20, by - 2), (bx + 4, by - 4)], fill=SLATE)
    click = 1.15
    reload = seg(lt, click, click + 0.5)
    states = [RED, AMBER, GREEN, RED]
    for i in range(4):
        y = 220 + i * 98 + oy
        shimmer = 0.5 + 0.5 * math.sin((lt - click) * 10 - i) if 0 < reload < 1 else 0
        p.rect(200, y, 800, y + 72, r=18, fill=lerp((228, 233, 243), (210, 220, 240), shimmer))
        p.rect(230, y + 22, 230 + [300, 240, 280, 220][i], y + 50, r=12, fill=(170, 178, 196))
        on = int(lt * 3 + i) % 2 == 0 or states[i] == GREEN
        p.circle(755, y + 36, 16, fill=states[i] if on else lerp(states[i], WIN, 0.6))
    hl = eo(seg(lt, click + 0.5, click + 0.8))
    if hl > 0:
        p.rect(192, 212 + oy, 808, 300 + oy, r=22, outline=lerp(WIN, BLUE, hl), w=6)
    cm = eio(seg(lt, 0.3, 1.1))
    cx_, cy_ = lerp(940, bx + 4, cm), lerp(720, by + 6, cm)
    rp = seg(lt, click, click + 0.5)
    if 0 < rp < 1:
        p.circle(bx, by, 20 + rp * 50, outline=lerp(BLUE, WIN, rp), w=5)
    pts = [(0, 0), (0, 46), (12, 36), (21, 55), (30, 51), (21, 32), (37, 32)]
    sc = 1.4 * (0.9 if 0 < rp < 0.15 else 1)
    p.poly([(cx_ + x * sc - 2, cy_ + y * sc - 2) for x, y in pts], fill=INK)
    p.poly([(cx_ + x * sc * 0.86 + 2, cy_ + y * sc * 0.86 + 3) for x, y in pts], fill=(255, 255, 255))


def bezier(a, c, b, u):
    return ((1 - u) ** 2 * a[0] + 2 * (1 - u) * u * c[0] + u * u * b[0],
            (1 - u) ** 2 * a[1] + 2 * (1 - u) * u * c[1] + u * u * b[1])


def s_late(p, lt, d, ctx):
    A, C, B = (120, 560), (420, 120), (700, 300)
    for k in range(26):
        u0, u1 = k / 26, (k + 0.5) / 26
        p.line([bezier(A, C, B, u0), bezier(A, C, B, u1)], (120, 130, 160), w=6)
    u = eio(seg(lt, 0.2, max(1.0, d))) * 0.8
    x, y = bezier(A, C, B, u)
    y += 8 * math.sin(lt * 4)
    envelope(p, x, y, 150, 100)
    clockface(p, x + 70, y - 50, 34, lt * 400)
    hx, hy, s = 820, 470, 1.0
    sand = seg(lt, 0, max(1.0, d))
    p.rect(hx - 80, hy - 160, hx + 80, hy - 145, r=6, fill=LIGHT)
    p.rect(hx - 80, hy + 145, hx + 80, hy + 160, r=6, fill=LIGHT)
    p.poly([(hx - 65, hy - 145), (hx + 65, hy - 145), (hx + 6, hy), (hx - 6, hy)], fill=(60, 72, 100))
    p.poly([(hx - 6, hy), (hx + 6, hy), (hx + 65, hy + 145), (hx - 65, hy + 145)], fill=(60, 72, 100))
    top = 1 - sand
    p.poly([(hx - 60 * top, hy - 145 * top), (hx + 60 * top, hy - 145 * top), (hx, hy - 4)], fill=GOLD)
    p.poly([(hx - 60 * sand, hy + 145 - 60 * sand), (hx + 60 * sand, hy + 145 - 60 * sand), (hx + 60, hy + 145),
            (hx - 60, hy + 145)], fill=GOLD)
    if top > 0.02:
        p.line([(hx, hy), (hx, hy + 140 - 60 * sand)], GOLD, w=4)


def s_call(p, lt, d, ctx):
    ring = (lt % 1.2) < 0.7
    jx = 7 * math.sin(lt * 48) if ring else 0
    cx, cy = 330 + jx, 400
    for k in range(3):
        f = ((lt * 1.2 + k / 3) % 1)
        col = lerp(GREEN, PBG, f)
        p.arc(cx, cy, 150 + f * 90, -40, 40, col, 8)
        p.arc(cx, cy, 150 + f * 90, 140, 220, col, 8)
    p.rect(cx - 110, cy - 200, cx + 110, cy + 200, r=36, fill=(20, 24, 36), outline=LIGHT, w=8)
    p.rect(cx - 30, cy - 182, cx + 30, cy - 172, r=5, fill=LIGHT)
    pr = 44 + 5 * math.sin(lt * 8)
    p.circle(cx, cy + 110, pr, fill=GREEN)
    p.arc(cx, cy + 114, 20, 200, 340, (255, 255, 255), 8)
    p.circle(cx, cy - 40, 50, fill=(60, 72, 100))
    for k, (t0, col, y) in enumerate([(0.5, (37, 190, 100), 170), (1.1, BLUE, 320), (1.7, (37, 190, 100), 470)]):
        a = back(seg(lt, t0, t0 + 0.35))
        if a <= 0.02:
            continue
        x0 = 560
        x1 = x0 + 330 * a
        bubble(p, x0, y, x1, y + 100, col, tail="left")
        if a > 0.9:
            dots(p, (x0 + x1) / 2, y + 50, lt + k, (255, 255, 255), gap=36, r=10)


def s_switch(p, lt, d, ctx):
    a1, a2 = back(seg(lt, 0, 0.4)), back(seg(lt, 0.15, 0.55))
    if a1 > 0.02:
        cloud(p, 220, 420, 0.95 * a1, (160, 196, 250))
    if a2 > 0.02:
        cloud(p, 780, 420, 0.95 * a2, (236, 238, 246))
    for k in range(18):
        u0, u1 = k / 18, (k + 0.5) / 18
        x0, x1 = lerp(250, 750, u0), lerp(250, 750, u1)
        p.line([(x0, 360 - math.sin(math.pi * u0) * 200), (x1, 360 - math.sin(math.pi * u1) * 200)], (120, 130, 160), w=5)
    if lt > 0.5:
        u = ((lt - 0.5) * 0.55) % 1
        bx = lerp(250, 750, u)
        by = 360 - math.sin(math.pi * u) * 200 - 40
        p.rect(bx - 48, by - 40, bx + 48, by + 40, r=8, fill=(196, 150, 96))
        p.rect(bx - 48, by - 8, bx + 48, by + 8, fill=(230, 200, 150))
    q = back(seg(lt, 0.6, 1.0))
    if q > 0.02:
        p.text(500, 150 + 8 * math.sin(lt * 4), "?", 150 * q, AMBER)


def s_costly(p, lt, d, ctx):
    shake = 8 * math.sin(lt * 45) if 0.3 < lt < 0.9 else 0
    cloud(p, 280 + shake, 300, 1.05, (236, 238, 246))
    if (lt % 1.0) < 0.12 and lt > 0.3:
        p.poly([(300, 380), (250, 480), (290, 480), (260, 580), (350, 450), (305, 450), (335, 380)], fill=GOLD)
    badge_x(p, 400 + shake, 210, 46 * back(seg(lt, 0.3, 0.65)))
    n = int(eo(seg(lt, 0.8, max(1.2, d * 0.85))) * 11)
    for k in range(n):
        coin(p, 700, 640 - k * 22)
    if n < 11 and lt > 0.8:
        fy = lerp(150, 640 - n * 22, ((lt - 0.8) * 4) % 1)
        coin(p, 700, fy)
    ay = 600 - n * 22
    if lt > 1.0:
        p.poly([(860, ay - 60), (900, ay), (875, ay), (875, ay + 70), (845, ay + 70), (845, ay), (820, ay)], fill=RED)


def s_scale(p, lt, d, ctx):
    th = math.radians(14) * eio(seg(lt, 0.4, 1.5))
    px_, py_ = 500, 190
    p.rect(490, py_, 510, 620, fill=LIGHT)
    p.rect(380, 620, 620, 650, r=12, fill=LIGHT)
    L = (px_ - 300 * math.cos(th), py_ + 300 * math.sin(th))
    R = (px_ + 300 * math.cos(th), py_ - 300 * math.sin(th))
    p.line([L, R], LIGHT, w=16)
    p.circle(px_, py_, 22, fill=AMBER)
    for (ex, ey), kind in ((L, "coins"), (R, "shield")):
        pan_y = ey + 170
        p.line([(ex, ey), (ex - 110, pan_y)], (150, 160, 180), w=4)
        p.line([(ex, ey), (ex + 110, pan_y)], (150, 160, 180), w=4)
        p.rect(ex - 120, pan_y, ex + 120, pan_y + 16, r=8, fill=LIGHT)
        if kind == "coins":
            for k in range(6):
                coin(p, ex, pan_y - 22 - k * 20, 60, 18)
        else:
            g = seg(lt, 1.6, 2.2)
            if g > 0:
                p.circle(ex, pan_y - 70, 70 + 30 * math.sin(lt * 4), fill=GREEN + (int(60 * g),))
            shield(p, ex, pan_y - 70, 50, GREEN)
            p.line([(ex - 22, pan_y - 70), (ex - 6, pan_y - 54), (ex + 24, pan_y - 88)], (255, 255, 255), w=9)


def s_running(p, lt, d, ctx):
    rnd = random.Random(3)
    for j in range(24):
        x = rnd.uniform(220, 780)
        y = 200 + ((lt * 420 + rnd.uniform(0, 300)) % 240)
        p.line([(x, y), (x - 8, y + 26)], (120, 150, 200), w=4)
    cloud(p, 500, 150, 1.05, (110, 118, 138))
    if (lt % 1.1) < 0.12:
        p.poly([(520, 220), (470, 320), (510, 320), (480, 420), (570, 290), (525, 290), (555, 220)], fill=GOLD)
    a = eo(seg(lt, 0, 0.5))
    bx0, by0 = 320, 380 + (1 - a) * 60
    p.rect(bx0, by0, bx0 + 360, 610, r=10, fill=(60, 72, 100))
    p.rect(bx0 - 20, by0 - 20, bx0 + 380, by0 + 6, r=6, fill=(80, 92, 122))
    for r_ in range(3):
        for c_ in range(4):
            on = (int(lt * 2 + r_ * 3 + c_ * 5) % 7) != 0
            col = (250, 215, 100) if on else (90, 100, 130)
            x, y = bx0 + 30 + c_ * 82, by0 + 30 + r_ * 62
            p.rect(x, y, x + 56, y + 40, r=6, fill=col)
    p.rect(470, 560, 530, 610, r=6, fill=(40, 48, 70))
    p.rect(60, 610, 940, 618, fill=LIGHT)
    for j in range(7):
        x = 60 + ((lt * 150 + j * 140) % 900)
        p.rect(x, 640, x + 70, 700, r=8, fill=(196, 150, 96))
        p.rect(x + 28, 640, x + 42, 700, fill=(230, 200, 150))
    for j in range(12):
        x = 60 + j * 80 - (lt * 150) % 80
        p.circle(x + 40, 715, 9, fill=SLATE)


def s_checklist(p, lt, d, ctx):
    labels = ctx["labels"]
    keys = ctx["keys"]
    for i in range(3):
        y = 120 + i * 190
        xo = (1 - eo(seg(lt, 0.1 + i * 0.15, 0.55 + i * 0.15))) * 700
        p.rect(100 + xo, y, 900 + xo, y + 150, r=34, fill=(44, 54, 82))
        ix, iy = 190 + xo, y + 75
        p.circle(ix, iy, 50, fill=(60, 72, 104))
        if i == 0:
            bubble(p, ix - 32, iy - 30, ix + 14, iy + 2, GREEN)
            bubble(p, ix - 10, iy - 8, ix + 34, iy + 22, BLUE, tail="right")
        elif i == 1:
            p.rect(ix - 34, iy - 26, ix + 34, iy + 26, r=8, fill=WIN)
            p.circle(ix - 14, iy - 4, 10, fill=SLATE)
            p.rect(ix + 2, iy - 10, ix + 24, iy - 4, r=3, fill=SLATE)
            p.rect(ix + 2, iy + 4, ix + 20, iy + 10, r=3, fill=SLATE)
        else:
            p.circle(ix, iy + 4, 28, fill=WIN)
            p.rect(ix - 6, iy - 36, ix + 6, iy - 24, r=3, fill=WIN)
            a = math.radians(lt * 360 - 90)
            p.line([(ix, iy + 4), (ix + math.cos(a) * 20, iy + 4 + math.sin(a) * 20)], RED, w=5)
        p.text(275 + xo, y + 75, labels[i], 50, (255, 255, 255), anchor="lm", path=F_BOLD)
        kt = keys[i]
        c = back(seg(lt, kt, kt + 0.35))
        p.rect(790 + xo, y + 40, 860 + xo, y + 110, r=16, outline=LIGHT, w=6)
        if c > 0.02:
            m = 35 * c
            p.rect(825 + xo - m, y + 75 - m, 825 + xo + m, y + 75 + m, r=16 * c, fill=GREEN)
            if c > 0.6:
                p.line([(808 + xo, y + 76), (821 + xo, y + 90), (845 + xo, y + 60)], (255, 255, 255), w=8)


def s_comments(p, lt, d, ctx):
    rnd = random.Random(11)
    widths = [rnd.uniform(300, 560) for _ in range(30)]
    for k in range(30):
        birth = 0.15 + k * 0.8
        age = lt - birth
        if age < 0:
            break
        y = 560 - age * 130
        if y < 60 or y > 560:
            continue
        a = back(clamp(age / 0.3))
        fade = seg(160 - y, 0, 100)
        left = k % 2 == 0
        w = widths[k] * a
        col = lerp(WIN if left else (60, 140, 230), PBG, fade)
        if left:
            p.circle(140, y + 40, 30 * a, fill=lerp((150, 160, 190), PBG, fade))
            bubble(p, 190, y, 190 + w, y + 80, col)
            p.rect(220, y + 32, 190 + w * 0.75, y + 48, r=8, fill=lerp((170, 178, 196), col, 0.3 + 0.7 * fade))
        else:
            p.circle(860, y + 40, 30 * a, fill=lerp((150, 160, 190), PBG, fade))
            bubble(p, 810 - w, y, 810, y + 80, col, tail="right")
            p.rect(810 - w * 0.75, y + 32, 780, y + 48, r=8, fill=lerp((200, 220, 250), col, 0.3 + 0.7 * fade))
    for j in range(6):
        hb = 0.4 + j * 0.5
        if lt > hb:
            f = ((lt - hb) % 2.4) / 2.4
            heart(p, 900 + 20 * math.sin(lt * 3 + j), 640 - f * 520, 18, lerp(RED, PBG, f))
    ay = 650 + 10 * math.sin(lt * 6)
    p.poly([(455, ay), (545, ay), (500, ay + 50)], fill=AMBER)


SCENES = [
    {"beat": 0, "fn": s_inbox,
     "say": {"en": "Outlook was down for about a day.", "id": "Outlook sempat mati sekitar sehari."},
     "head": {"en": "Outlook was *down*", "id": "Outlook *mati*"}},
    {"beat": 0, "fn": s_nohack,
     "say": {"en": "And it wasn't a hack.", "id": "Dan itu bukan karena diretas."},
     "head": {"en": "Not a *hack*.", "id": "Bukan *diretas*."}},
    {"beat": 1, "fn": s_calendar_servers,
     "say": {"en": "On November 12, Microsoft's email servers started failing their own safety checks and dropped offline.",
             "id": "Tanggal 12 November, server email Microsoft mulai gagal di pemeriksaan otomatisnya sendiri, lalu offline."},
     "head": {"en": "Safety checks *failed*", "id": "Pengecekan *gagal*"}},
    {"beat": 1, "fn": s_overload,
     "say": {"en": "The rest got overloaded and failed too.", "id": "Server yang tersisa kewalahan dan ikut tumbang."},
     "head": {"en": "The rest got *overloaded*", "id": "Sisanya *kewalahan*"}},
    {"beat": 1, "fn": s_globe,
     "say": {"en": "Outlook and Teams went down around the world.", "id": "Outlook dan Teams lumpuh di seluruh dunia."},
     "head": {"en": "Down *worldwide*", "id": "Lumpuh *seluruh dunia*"}},
    {"beat": 1, "fn": s_cause,
     "say": {"en": "Microsoft hasn't published the full cause yet.", "id": "Penyebab pastinya belum diumumkan Microsoft."},
     "head": {"en": "Full cause: *not public yet*", "id": "Penyebab: *belum diumumkan*"}},
    {"beat": 2, "fn": s_status,
     "say": {"en": "Next time, check Microsoft's status page first.", "id": "Kalau terjadi lagi, cek dulu halaman status Microsoft."},
     "head": {"en": "1. Check the *status page*", "id": "1. Cek *halaman status*"}},
    {"beat": 2, "fn": s_late,
     "say": {"en": "Expect late emails.", "id": "Siap-siap email telat masuk."},
     "head": {"en": "2. Expect *late emails*", "id": "2. Email bisa *telat*"}},
    {"beat": 2, "fn": s_call,
     "say": {"en": "Move anything urgent to a call or WhatsApp.", "id": "Yang mendesak, pindahkan ke telepon atau WhatsApp."},
     "head": {"en": "3. Urgent? *Call or chat*", "id": "3. Mendesak? *Telepon/chat*"}},
    {"beat": 3, "fn": s_switch,
     "say": {"en": "Should you switch to Google?", "id": "Perlu pindah ke Google?"},
     "head": {"en": "Switch to *Google*?", "id": "Pindah ke *Google*?"}},
    {"beat": 3, "fn": s_costly,
     "say": {"en": "You can, but Google goes down too, and moving a company is expensive.",
             "id": "Bisa, tapi Google juga pernah down, dan migrasi satu kantor itu mahal."},
     "head": {"en": "It goes down too. And it's *costly*.", "id": "Bisa down juga. Dan *mahal*."}},
    {"beat": 3, "fn": s_scale,
     "say": {"en": "A backup plan costs far less.", "id": "Rencana cadangan jauh lebih murah."},
     "head": {"en": "A backup plan is *cheaper*", "id": "Rencana cadangan *lebih murah*"}},
    {"beat": 4, "fn": s_running,
     "say": {"en": "You can't stop Microsoft from breaking, but you can keep your business running.",
             "id": "Kita nggak bisa mencegah Microsoft gangguan, tapi bisa menjaga bisnis tetap jalan."},
     "head": {"en": "Keep your business *running*", "id": "Bisnis tetap *jalan*"}},
    {"beat": 4, "fn": s_checklist,
     "say": {"en": "Pick a second channel, keep key contacts offline, and practise it once.",
             "id": "Tentukan jalur komunikasi kedua, simpan kontak penting secara offline, dan latih rencananya sekali."},
     "head": {"en": "Your *backup plan*", "id": "Rencana *cadangan* kamu"},
     "labels": {"en": ["Second channel", "Offline contacts", "Practise once"],
                "id": ["Jalur kedua", "Kontak offline", "Latih sekali"]},
     "keys": {"en": ["channel", "contacts", "practise"], "id": ["kedua", "kontak", "latih"]}},
    {"beat": 5, "fn": s_comments,
     "say": {"en": "What did your office do when Outlook went down? Tell me in the comments.",
             "id": "Kantor kamu ngapain waktu Outlook mati? Tulis di komentar."},
     "head": {"en": "What did *your office* do?", "id": "Kantor kamu *ngapain*?"}},
]


# ---------------------------------------------------------------- audio + timeline
def wav_len(path):
    with wave.open(path) as w:
        return w.getnframes() / w.getframerate()


TRIM = ("silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,"
        "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse")


def voice_clip(lang, text, adir):
    h = hashlib.sha1(f"{VOICE}|{lang}|{text}".encode()).hexdigest()[:12]
    raw = os.path.join(adir, f".{h}.raw.wav")
    out = os.path.join(adir, f"{h}.wav")
    if not os.path.exists(raw):
        norm = lambda x: re.sub(r"[^a-z0-9 ]", "", x.lower()).split()  # noqa: E731
        for attempt in range(4):
            tr, _, _ = tts(text, raw, voice=VOICE, lang_hint=LANG_NAME[lang])
            if norm(tr) == norm(text):
                break
            print(f"  ! retry ({attempt + 1}) {text[:40]!r} -> {tr[:60]!r}", flush=True)
        else:
            raise SystemExit(f"voiceover never matched: {text!r}")
    if not os.path.exists(out):
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af", TRIM + f",atempo={TEMPO[lang]}", "-ar", "24000",
                        "-ac", "1", "-c:a", "pcm_s16le", out], check=True)
    return out


def chunks(text, n=7):
    out = []
    for ph in re.findall(r"[^.,?]+[.,?]?", text):
        w = ph.split()
        if not w:
            continue
        parts = -(-len(w) // n)
        size = -(-len(w) // parts)
        out += [" ".join(w[i:i + size]) for i in range(0, len(w), size)]
    return out


def ts(sec):
    ms = int(round(sec * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def build_timeline(lang, base):
    adir = os.path.join(base, "audio")
    os.makedirs(adir, exist_ok=True)
    t, pcm, tl = LEAD_IN, bytearray(b"\x00\x00" * int(24000 * LEAD_IN)), []
    for i, sc in enumerate(SCENES):
        if i > 0:
            gap = GAP_BEAT if sc["beat"] != SCENES[i - 1]["beat"] else GAP_SENT
            pcm += b"\x00\x00" * int(24000 * gap)
            t += gap
        clip = voice_clip(lang, sc["say"][lang], adir)
        with wave.open(clip) as w:
            frames = w.readframes(w.getnframes())
        dur = len(frames) / 2 / 24000
        tl.append({"i": i, "speech": (t, t + dur)})
        pcm += frames
        t += dur
    pcm += b"\x00\x00" * int(24000 * TAIL)
    total = t + TAIL
    with wave.open(os.path.join(base, f"voiceover-{lang}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(24000)
        w.writeframes(bytes(pcm))
    # scene windows: start a touch before speech, run until next scene starts
    for k, e in enumerate(tl):
        e["start"] = 0.0 if k == 0 else max(0.0, e["speech"][0] - 0.2)
    for k, e in enumerate(tl):
        e["end"] = tl[k + 1]["start"] if k + 1 < len(tl) else total
    return tl, total


# ---------------------------------------------------------------- frame rendering
G = {}  # globals for worker processes (set before forking)


def make_bg():
    bg = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(bg)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=(int(16 + 12 * t), int(22 + 8 * t), int(42 - 6 * t)))
    return bg


def panel_mask():
    m = Image.new("L", (PW, PH), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, PW - 1, PH - 1], radius=48, fill=255)
    return m


def head_words(text, lang):
    """Render headline words once: list of rows; each row a list of (img, x) ; returns rows and line height."""
    f = font(F_BLACK, 92)
    words = text.split()
    tmp = ImageDraw.Draw(Image.new("RGB", (10, 10)))
    space = tmp.textlength(" ", font=f)
    items = []
    hl = False
    for w_ in words:
        start = w_.startswith("*")
        if start:
            hl = True
        clean = w_.replace("*", "")
        col = AMBER if hl else (255, 255, 255)
        if w_.endswith("*") or w_.endswith("*.") or w_.endswith("*?"):
            hl_after = False
        else:
            hl_after = hl
        tw = tmp.textlength(clean, font=f)
        img = Image.new("RGBA", (int(tw) + 20, 130), (0, 0, 0, 0))
        ImageDraw.Draw(img).text((10, 10), clean, font=f, fill=col + (255,))
        items.append((img, tw))
        hl = hl_after
    rows, cur, cur_w = [], [], 0
    for img, tw in items:
        need = tw if not cur else cur_w + space + tw
        if cur and need > W - 180:
            rows.append((cur, cur_w))
            cur, cur_w = [], 0
            need = tw
        cur.append((img, tw))
        cur_w = need
    if cur:
        rows.append((cur, cur_w))
    return rows, space


def caption_img(text):
    f = font(F_BOLD, 54)
    img = Image.new("RGBA", (W, 230), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    words, lines, cur = text.split(), [], ""
    for w_ in words:
        t_ = (cur + " " + w_).strip()
        if d.textlength(t_, font=f) <= W - 260:
            cur = t_
        else:
            lines.append(cur)
            cur = w_
    lines.append(cur)
    lh = 70
    y = 115 - lh * len(lines) / 2
    for ln in lines:
        x = (W - d.textlength(ln, font=f)) / 2
        d.text((x, y), ln, font=f, fill=(255, 255, 255, 255), stroke_width=6, stroke_fill=(0, 0, 0, 255))
        y += lh
    return img


def scene_canvas(k, tt):
    e = G["tl"][k]
    sc = SCENES[k]
    lt = tt - e["start"]
    d = e["end"] - e["start"]
    img = Image.new("RGB", (PW * SS, PH * SS), PBG)
    ctx = dict(G["ctx"][k])
    sc["fn"](P(img), lt, d, ctx)
    # camera: slow push-in with a gentle drift
    z = 1.04 + 0.06 * eio(lt / max(d, 0.1))
    bw, bh = PW * SS / z, PH * SS / z
    mx, my = (PW * SS - bw) / 2, (PH * SS - bh) / 2
    cx = PW * SS / 2 + mx * 0.8 * math.sin(lt * 0.7 + k)
    cy = PH * SS / 2 + my * 0.8 * math.cos(lt * 0.5 + k)
    box = (cx - bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2)
    return img.resize((PW, PH), Image.BILINEAR, box=box, reducing_gap=1.5)


def with_alpha(img, a):
    if a >= 1:
        return img
    out = img.copy()
    out.putalpha(img.getchannel("A").point(lambda v: int(v * a)))
    return out


def draw_head(frame, k, tt, fade_out=1.0):
    e = G["tl"][k]
    lt = tt - e["start"]
    delay = 0.05 if k == 0 else TR * 0.5  # wait for the previous headline to clear
    rows, space = G["heads"][k]
    lh = 112
    y0 = 400 - lh * len(rows) / 2
    n = 0
    for r, (items, rw) in enumerate(rows):
        x = (W - rw) / 2
        for img, tw in items:
            a = clamp((lt - delay - n * 0.08) / 0.3)
            if a > 0:
                yo = (1 - back(a)) * 40
                frame.alpha_composite(with_alpha(img, min(1, a * 1.5) * fade_out), (int(x - 10), int(y0 + r * lh + yo - 10)))
            x += tw + space
            n += 1


def render_frame(fi):
    tt = fi / FPS
    tl = G["tl"]
    k = max(i for i, e in enumerate(tl) if tt >= e["start"])
    e = tl[k]
    frame = G["bg"].copy().convert("RGBA")
    d = ImageDraw.Draw(frame, "RGBA")
    # drifting particles
    for j in range(40):
        x = (j * 197 + tt * (8 + j % 5 * 4)) % W
        y = (j * 331 - tt * (14 + j % 7 * 5)) % H
        r = 2 + j % 3
        d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, 22 + (j % 4) * 8))
    # progress bar + beat label
    d.rounded_rectangle([90, 196, W - 90, 204], radius=4, fill=(255, 255, 255, 40))
    d.rounded_rectangle([90, 196, 90 + (W - 180) * tt / G["total"], 204], radius=4, fill=BLUE + (255,))
    beat = SCENES[k]["beat"]
    d.text((90, 236), BEATS[G["lang"]][beat], font=font(F_SEMI, 34), fill=(160, 170, 190, 255))

    # stage panel with scene (push transition from the previous scene)
    lt = tt - e["start"]
    cur = scene_canvas(k, tt)
    if k > 0 and lt < TR:
        a = eio(lt / TR)
        prev = scene_canvas(k - 1, tt)
        stage = Image.new("RGB", (PW, PH), PBG)
        stage.paste(prev, (int(-a * PW * 0.35), 0))
        dark = Image.new("RGB", (PW, PH), PBG)
        stage = Image.blend(stage, dark, a * 0.6)
        stage.paste(cur, (int((1 - a) * PW), 0))
    else:
        stage = cur
    pop = back(clamp(tt / 0.45)) if k == 0 else 1.0
    if pop < 0.999:
        sw, sh = max(1, int(PW * (0.9 + 0.1 * pop))), max(1, int(PH * (0.9 + 0.1 * pop)))
        st = stage.resize((sw, sh), Image.BILINEAR)
        frame.paste(st, (PX + (PW - sw) // 2, PY + (PH - sh) // 2), panel_mask_cached(sw, sh))
    else:
        frame.paste(stage, (PX, PY), G["mask"])

    # headline: previous one fades out during the transition
    if k > 0 and lt < TR:
        draw_head(frame, k - 1, tt, fade_out=1 - clamp(lt / (TR * 0.45)))
    draw_head(frame, k, tt)

    # captions
    cap = next((c for c in G["caps"] if c[0] <= tt < c[1]), None)
    if cap:
        frame.alpha_composite(G["cap_imgs"][cap[2]], (0, 1300))
    return frame.convert("RGB").tobytes()


_mask_cache = {}


def panel_mask_cached(w, h):
    if (w, h) not in _mask_cache:
        m = Image.new("L", (w, h), 0)
        ImageDraw.Draw(m).rounded_rectangle([0, 0, w - 1, h - 1], radius=48, fill=255)
        _mask_cache[(w, h)] = m
    return _mask_cache[(w, h)]


def build(lang, out_dir):
    base = os.path.join(out_dir, lang)
    os.makedirs(base, exist_ok=True)
    tl, total = build_timeline(lang, base)

    # captions timed by characters within each sentence's speech window
    caps, srt = [], []
    for e in tl:
        s0, s1 = e["speech"]
        cs = chunks(SCENES[e["i"]]["say"][lang])
        tot = sum(len(c) for c in cs)
        cur = s0
        for c in cs:
            dur = (s1 - s0) * len(c) / tot
            caps.append((cur, cur + dur, c))
            cur += dur
    for n, (a, b, c) in enumerate(caps, 1):
        srt.append(f"{n}\n{ts(a)} --> {ts(b)}\n{c}\n")
    with open(os.path.join(base, f"captions-{lang}.srt"), "w", encoding="utf-8") as f:
        f.write("\n".join(srt))
    with open(os.path.join(base, f"script-{lang}.txt"), "w", encoding="utf-8") as f:
        for e in tl:
            f.write(f"[{e['speech'][0]:05.2f}s] {SCENES[e['i']]['say'][lang]}\n")

    ctx = []
    for e in tl:
        sc = SCENES[e["i"]]
        c = {"lang": lang}
        if "labels" in sc:
            c["labels"] = sc["labels"][lang]
            text = sc["say"][lang]
            s0, s1 = e["speech"]
            c["keys"] = []
            for kw in sc["keys"][lang]:
                pos = text.lower().find(kw.lower())
                frac = (pos + len(kw)) / len(text) if pos >= 0 else 0.5
                c["keys"].append(s0 - e["start"] + frac * (s1 - s0))
        ctx.append(c)

    G.update(lang=lang, tl=tl, total=total, ctx=ctx, bg=make_bg(), mask=panel_mask(),
             heads=[head_words(SCENES[e["i"]]["head"][lang], lang) for e in tl],
             caps=caps, cap_imgs={c[2]: caption_img(c[2]) for c in caps})

    if STILLS:
        sdir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "stills")
        os.makedirs(sdir, exist_ok=True)
        for e in tl:
            for frac in (0.35, 0.9):
                tt = e["start"] + (e["end"] - e["start"]) * frac
                Image.frombytes("RGB", (W, H), render_frame(int(tt * FPS))).save(
                    os.path.join(sdir, f"{lang}-{e['i']:02}-{int(frac * 100)}.png"))
        tt = tl[3]["start"] + 0.2  # mid-transition
        Image.frombytes("RGB", (W, H), render_frame(int(tt * FPS))).save(os.path.join(sdir, f"{lang}-transition.png"))
        print(f"{lang}: stills written, total {total:.1f}s")
        return

    out_mp4 = os.path.join(base, f"outlook-reel-{lang}.mp4")
    ff = subprocess.Popen(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
         "-i", "-", "-i", os.path.join(base, f"voiceover-{lang}.wav"), "-c:v", "libx264", "-preset", "medium",
         "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-shortest",
         "-movflags", "+faststart", out_mp4], stdin=subprocess.PIPE)
    nframes = int(math.ceil(total * FPS))
    with Pool(os.cpu_count()) as pool:
        for buf in pool.imap(render_frame, range(nframes), chunksize=8):
            ff.stdin.write(buf)
    ff.stdin.close()
    ff.wait()
    print(f"{lang}: {total:.1f}s, {nframes} frames -> {out_mp4}", flush=True)


if __name__ == "__main__":
    out = sys.argv[1]
    langs = [a for a in sys.argv[2:] if a in ("en", "id")] or ["en", "id"]
    for lg in langs:
        build(lg, out)

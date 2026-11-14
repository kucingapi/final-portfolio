"""Faceless reel: OpenRouter voiceover + self-drawn motion graphics, rendered with PIL and ffmpeg.

Usage: render_faceless.py OUT_DIR [--reuse-audio]
"""
import math
import os
import re
import subprocess
import sys
import wave

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from orclient import tts  # noqa: E402

OUT = sys.argv[1]
REUSE = "--reuse-audio" in sys.argv
W, H, FPS = 1080, 1920, 30
VOICE = "sage"
FD = "/usr/share/fonts/opentype/inter/"
F_BLACK, F_BOLD, F_SEMI = FD + "Inter-Black.otf", FD + "Inter-Bold.otf", FD + "Inter-SemiBold.otf"

INK = (17, 17, 17, 255)
CARD = (255, 255, 255, 245)
BLUE = (0, 120, 212)
RED = (232, 72, 85)
AMBER = (245, 166, 35)
GREEN = (46, 204, 113)
SLATE = (86, 96, 116)
LIGHT = (205, 212, 225)

BEATS = [
    {"id": "01-hook", "label": "Hook", "anim": "envelope", "title": True,
     "overlay": {"en": [["Not a hack."]], "id": [["Bukan diretas."]]},
     "say": {"en": "Outlook was down for about a day. And it wasn't a hack.",
             "id": "Outlook sempat mati sekitar sehari. Dan itu bukan karena diretas."}},
    {"id": "02-what-happened", "label": "What happened", "anim": "servers",
     "overlay": {"en": [["Nov 12 · Worldwide"]], "id": [["12 Nov · Seluruh dunia"]]},
     "say": {"en": "On November 12, Microsoft's email servers started failing their own safety checks and dropped offline. "
                   "The rest got overloaded and failed too. Outlook and Teams went down around the world. "
                   "Microsoft hasn't published the full cause yet.",
             "id": "Tanggal 12 November, server email Microsoft mulai gagal di pemeriksaan otomatisnya sendiri, lalu offline. "
                   "Server yang tersisa kewalahan dan ikut tumbang. Outlook dan Teams lumpuh di seluruh dunia. "
                   "Penyebab pastinya belum diumumkan Microsoft."}},
    {"id": "03-what-to-do", "label": "What to do", "anim": "chat",
     "overlay": {"en": [["1. Check the status page"], ["2. Expect late emails"], ["3. Call or WhatsApp"]],
                 "id": [["1. Cek halaman status"], ["2. Email bisa telat"], ["3. Telepon atau WhatsApp"]]},
     "reveal": {"en": ["status", "late", "WhatsApp"], "id": ["status", "telat", "WhatsApp"]},
     "say": {"en": "Next time, check Microsoft's status page first. Expect late emails. Move anything urgent to a call or WhatsApp.",
             "id": "Kalau terjadi lagi, cek dulu halaman status Microsoft. Siap-siap email telat masuk. "
                   "Yang mendesak, pindahkan ke telepon atau WhatsApp."}},
    {"id": "04-migrate", "label": "Migrate?", "anim": "clouds", "title": True,
     "overlay": {"en": [["Switch to Google?"]], "id": [["Pindah ke Google?"]]},
     "say": {"en": "Should you switch to Google? You can, but Google goes down too, and moving a company is expensive. "
                   "A backup plan costs far less.",
             "id": "Perlu pindah ke Google? Bisa, tapi Google juga pernah down, dan migrasi satu kantor itu mahal. "
                   "Rencana cadangan jauh lebih murah."}},
    {"id": "05-avoid-it", "label": "Avoid it next time", "anim": "checklist",
     "overlay": {"en": [["• Second channel"], ["• Offline contacts"], ["• Practise once"]],
                 "id": [["• Jalur komunikasi kedua"], ["• Kontak offline"], ["• Latih sekali"]]},
     "reveal": {"en": ["channel", "contacts", "practise"], "id": ["kedua", "kontak", "latih"]},
     "say": {"en": "You can't stop Microsoft from breaking, but you can keep your business running. "
                   "Pick a second channel, keep key contacts offline, and practise it once.",
             "id": "Kita nggak bisa mencegah Microsoft gangguan, tapi bisa menjaga bisnis tetap jalan. "
                   "Tentukan jalur komunikasi kedua, simpan kontak penting secara offline, dan latih rencananya sekali."}},
    {"id": "06-closer", "label": "Closer", "anim": "comment",
     "overlay": {"en": [["What did your office do?"]], "id": [["Kantor kamu ngapain?"]]},
     "say": {"en": "What did your office do when Outlook went down?",
             "id": "Kantor kamu ngapain waktu Outlook mati? Tulis di komentar."}},
]
LANG_NAME = {"en": "English", "id": "Indonesian"}
LEAD_IN, GAP, TAIL = 0.3, 0.55, 1.2  # seconds of silence
TEMPO = {"en": 0.92, "id": 1.0}  # slow English slightly; pitch is kept


# ---------- helpers ----------
def ease(x):
    x = max(0.0, min(1.0, x))
    return 1 - (1 - x) ** 3


def wrap(d, text, font, max_w):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if d.textlength(t, font=font) <= max_w:
            cur = t
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def card_img(lines, title=False):
    img = Image.new("RGBA", (W, 700), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    font = ImageFont.truetype(F_BLACK, 84 if title else 58)
    max_w = W - 2 * 90 - 2 * 48 - 60
    rows = []
    for j, ln in enumerate(lines):
        marker = ln.split(" ")[0] + " " if ln[:1] in "•123456789" else ""
        ind = d.textlength(marker, font=font) if marker else 0
        for i, r in enumerate(wrap(d, ln, font, max_w - ind)):
            rows.append((0 if i == 0 else ind, r, j > 0 and i == 0))
    lh, gap = int(font.size * 1.25), int(font.size * 0.35)
    cw = max(i + d.textlength(r, font=font) for i, r, _ in rows) + 96
    chh = lh * len(rows) + gap * sum(g for *_, g in rows) + 80
    x0, y0 = 90, 20
    d.rounded_rectangle([x0, y0, x0 + cw, y0 + chh], radius=36, fill=CARD)
    d.rectangle([x0, y0 + 30, x0 + 12, y0 + chh - 30], fill=BLUE + (255,))
    y = y0 + 40
    for ind, r, g in rows:
        y += gap if g else 0
        d.text((x0 + 48 + ind, y), r, font=font, fill=INK)
        y += lh
    return img


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


def caption_img(text, font):
    img = Image.new("RGBA", (W, 300), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    rows = wrap(d, text, font, W - 2 * 130)
    lh = int(font.size * 1.3)
    y = 150 - lh * len(rows) // 2
    for r in rows:
        x = (W - d.textlength(r, font=font)) / 2
        d.text((x, y), r, font=font, fill=(255, 255, 255, 255), stroke_width=6, stroke_fill=(0, 0, 0, 255))
        y += lh
    return img


def background():
    bg = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(bg)
    for y in range(H):
        t = y / H
        c = (int(18 + 10 * t), int(24 + 8 * t), int(44 - 8 * t))
        d.line([(0, y), (W, y)], fill=c)
    return bg.convert("RGBA")


# ---------- illustrations (drawn in the band y=760..1220) ----------
CX, CY = W // 2, 990


def draw_dots(d, t):
    off = (t * 18) % 60
    for gy in range(0, H + 60, 60):
        for gx in range(0, W + 60, 60):
            d.ellipse([gx - 2, gy + off - 62, gx + 2, gy + off - 58], fill=(255, 255, 255, 18))


def envelope(d, p, t):
    s = 1 + 0.03 * math.sin(t * 3)
    w, h = 360 * s, 240 * s
    x0, y0 = CX - w / 2, CY - h / 2
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=24, fill=(235, 240, 250, 255))
    d.line([(x0 + 10, y0 + 14), (CX, y0 + h * 0.58), (x0 + w - 10, y0 + 14)], fill=SLATE + (255,), width=10, joint="curve")
    a = ease(p * 4)
    r = 120 * a
    if r > 4:
        bx, by = x0 + w - 10, y0 + 10
        d.ellipse([bx - r * .6, by - r * .6, bx + r * .6, by + r * .6], fill=RED + (255,))
        k = r * 0.28
        d.line([(bx - k, by - k), (bx + k, by + k)], fill=(255, 255, 255, 255), width=12)
        d.line([(bx - k, by + k), (bx + k, by - k)], fill=(255, 255, 255, 255), width=12)


def servers(d, p, t):
    cols, rows = 4, 3
    bw, bh, gx, gy = 170, 110, 30, 34
    tw = cols * bw + (cols - 1) * gx
    th = rows * bh + (rows - 1) * gy
    x0, y0 = CX - tw / 2, CY - th / 2
    order = [5, 2, 9, 0, 7, 11, 3, 6, 10, 1, 8, 4]
    for i in range(cols * rows):
        c, r = i % cols, i // cols
        x, y = x0 + c * (bw + gx), y0 + r * (bh + gy)
        rank = order.index(i)
        # first two fail on the health check (~15-30%), the rest cascade (~35-70%)
        fail_at = 0.15 + 0.07 * rank if rank < 2 else 0.33 + 0.035 * (rank - 2)
        warn_at = fail_at - 0.08
        if p >= fail_at:
            state, col = "down", RED
        elif p >= warn_at and rank >= 2:
            state, col = "warn", AMBER if int(t * 8) % 2 == 0 else (120, 90, 40)
        else:
            state, col = "ok", GREEN
        fill = (44, 52, 72, 255) if state != "down" else (70, 36, 46, 255)
        jit = 3 * math.sin(t * 40 + i) if state == "warn" else 0
        d.rounded_rectangle([x + jit, y, x + bw + jit, y + bh], radius=16, fill=fill, outline=(90, 100, 124, 255), width=3)
        for k in range(3):
            d.rounded_rectangle([x + 22 + jit, y + 22 + k * 24, x + bw - 60 + jit, y + 32 + k * 24], radius=5, fill=(90, 100, 124, 255))
        d.ellipse([x + bw - 42 + jit, y + bh / 2 - 12, x + bw - 18 + jit, y + bh / 2 + 12], fill=col + (255,))


def chat(d, p, t, step):
    # phone outline + chat bubble with typing dots
    px, py, pw, ph = CX - 250, CY - 190, 200, 380
    d.rounded_rectangle([px, py, px + pw, py + ph], radius=34, outline=LIGHT + (255,), width=10)
    d.rounded_rectangle([px + 70, py + 20, px + 130, py + 30], radius=5, fill=LIGHT + (255,))
    bx, by = CX - 10, CY - 120
    d.rounded_rectangle([bx, by, bx + 280, by + 170], radius=40, fill=BLUE + (255,))
    d.polygon([(bx + 40, by + 165), (bx + 20, by + 220), (bx + 100, by + 165)], fill=BLUE + (255,))
    for k in range(3):
        bounce = 12 * max(0, math.sin(t * 6 - k * 0.8))
        cx = bx + 80 + k * 60
        d.ellipse([cx - 16, by + 85 - 16 - bounce, cx + 16, by + 85 + 16 - bounce], fill=(255, 255, 255, 255))


def cloud(d, x, y, s, col):
    for dx, dy, r in [(-70, 10, 60), (0, -25, 80), (75, 10, 60), (0, 30, 60)]:
        d.ellipse([x + dx * s - r * s, y + dy * s - r * s, x + dx * s + r * s, y + dy * s + r * s], fill=col)
    d.rounded_rectangle([x - 130 * s, y + 10 * s, x + 130 * s, y + 90 * s], radius=int(40 * s), fill=col)


def clouds(d, p, t):
    cloud(d, CX - 240, CY - 40, 0.9, (225, 232, 245, 255))
    cloud(d, CX + 240, CY - 40, 0.9, (225, 232, 245, 255))
    # dashed arrow moving left -> right
    y = CY + 10
    for k in range(6):
        x = CX - 110 + ((k * 45 + t * 90) % 220)
        d.rounded_rectangle([x, y - 6, x + 26, y + 6], radius=6, fill=AMBER + (255,))
    # second half: both clouds can fail -> small red badges
    if p > 0.35:
        a = ease((p - 0.35) * 5)
        for cx in (CX - 240 + 100, CX + 240 + 100):
            r = 34 * a
            d.ellipse([cx - r, CY - 120 - r, cx + r, CY - 120 + r], fill=RED + (255,))
    # last part: shield = backup plan
    if p > 0.72:
        a = ease((p - 0.72) * 5)
        sw = 150 * a
        sy = CY + 150
        d.polygon([(CX - sw / 2, sy - sw / 2), (CX + sw / 2, sy - sw / 2), (CX + sw / 2, sy), (CX, sy + sw * 0.6), (CX - sw / 2, sy)],
                  fill=GREEN + (255,))


def checklist(d, p, t, step, n_items):
    x0, y0 = CX - 220, CY - 190
    for i in range(3):
        y = y0 + i * 135
        done = i < step
        d.rounded_rectangle([x0, y, x0 + 92, y + 92], radius=20, outline=LIGHT + (255,), width=8,
                            fill=(GREEN + (255,)) if done else None)
        if done:
            d.line([(x0 + 20, y + 48), (x0 + 40, y + 70), (x0 + 74, y + 24)], fill=(255, 255, 255, 255), width=12, joint="curve")
        d.rounded_rectangle([x0 + 130, y + 30, x0 + 130 + (300 if done else 240), y + 62], radius=16,
                            fill=(LIGHT + (255,)) if done else (70, 80, 100, 255))


def comment(d, p, t):
    bob = 14 * math.sin(t * 3)
    bx, by = CX - 200, CY - 150 + bob
    d.rounded_rectangle([bx, by, bx + 400, by + 240], radius=50, fill=(235, 240, 250, 255))
    d.polygon([(bx + 70, by + 235), (bx + 40, by + 310), (bx + 160, by + 235)], fill=(235, 240, 250, 255))
    for k in range(3):
        bounce = 12 * max(0, math.sin(t * 6 - k * 0.8))
        cx = bx + 120 + k * 80
        d.ellipse([cx - 20, by + 120 - 20 - bounce, cx + 20, by + 120 + 20 - bounce], fill=BLUE + (255,))
    # arrow pointing down to comments
    ay = CY + 230 + 10 * math.sin(t * 5)
    d.polygon([(CX - 40, ay), (CX + 40, ay), (CX, ay + 50)], fill=AMBER + (255,))


# ---------- build ----------
def concat_wavs(paths_and_gaps, out):
    frames = bytearray()
    for item in paths_and_gaps:
        if isinstance(item, float):
            frames += b"\x00\x00" * int(24000 * item)
        else:
            with wave.open(item) as w:
                frames += w.readframes(w.getnframes())
    with wave.open(out, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(24000)
        w.writeframes(bytes(frames))


def wav_len(p):
    with wave.open(p) as w:
        return w.getnframes() / w.getframerate()


def build(lang):
    base = os.path.join(OUT, lang)
    adir = os.path.join(base, "audio")
    os.makedirs(adir, exist_ok=True)

    # 1) Voiceover per beat
    seq, timeline, t = [LEAD_IN], [], LEAD_IN
    for b in BEATS:
        p = os.path.join(adir, f"{b['id']}.wav")
        raw = os.path.join(adir, f".{b['id']}.raw.wav")
        if not (REUSE and os.path.exists(raw)):
            norm = lambda x: re.sub(r"[^a-z0-9 ]", "", x.lower()).split()
            for attempt in range(4):
                tr, usage, dur = tts(b["say"][lang], raw, voice=VOICE, lang_hint=LANG_NAME[lang])
                if norm(tr) == norm(b["say"][lang]):
                    break
                print(f"  ! retry {b['id']} (attempt {attempt + 1}): {tr!r}")
            else:
                raise SystemExit(f"voiceover for {b['id']} never matched the script")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af", f"atempo={TEMPO[lang]}",
                        "-ar", "24000", "-ac", "1", "-c:a", "pcm_s16le", p], check=True)
        dur = wav_len(p)
        timeline.append((b, t, t + dur))
        seq += [p, GAP]
        t += dur + GAP
    seq[-1] = TAIL
    total = t - GAP + TAIL
    voice = os.path.join(base, f"voiceover-{lang}.wav")
    concat_wavs(seq, voice)

    # 2) Captions + per-frame state
    cap_font = ImageFont.truetype(F_BOLD, 56)
    label_font = ImageFont.truetype(F_SEMI, 34)
    srt, n, cap_spans = [], 1, []
    for b, s0, s1 in timeline:
        cs = chunks(b["say"][lang])
        total_chars = sum(len(c) for c in cs)
        cur = s0
        for i, c in enumerate(cs):
            dur = (s1 - s0) * len(c) / total_chars
            srt.append(f"{n}\n{ts(cur)} --> {ts(cur + dur)}\n{c}\n")
            n += 1
            spoken = " ".join(cs[:i + 1]).lower()
            keys = b.get("reveal", {}).get(lang)
            step = sum(k.lower() in spoken for k in keys) if keys else 1
            cap_spans.append((cur, cur + dur, c, b["id"], step))
            cur += dur
    with open(os.path.join(base, f"captions-{lang}.srt"), "w", encoding="utf-8") as f:
        f.write("\n".join(srt))

    # Pre-render cards (cumulative list steps) and captions
    cards = {}
    for b in BEATS:
        shown = []
        for i, add in enumerate(b["overlay"][lang]):
            shown = shown + add
            cards[(b["id"], i + 1)] = card_img(shown, title=b.get("title", False))
    cap_cache = {}

    bg = background()
    out_mp4 = os.path.join(base, f"outlook-reel-{lang}.mp4")
    ff = subprocess.Popen(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
         "-i", "-", "-i", voice, "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-shortest", "-movflags", "+faststart", out_mp4],
        stdin=subprocess.PIPE)

    nframes = int(math.ceil(total * FPS))
    for fi in range(nframes):
        tt = fi / FPS
        # which beat is on screen (holds through the gap until the next beat starts)
        idx = 0
        for k, (b, s0, s1) in enumerate(timeline):
            if tt >= s0 - (LEAD_IN if k == 0 else GAP * 0.5):
                idx = k
        b, s0, s1 = timeline[idx]
        p = (tt - s0) / max(0.01, s1 - s0)
        span = next((c for c in cap_spans if c[0] <= tt < c[1]), None)
        step = 1
        if b.get("reveal"):
            steps_seen = [c[4] for c in cap_spans if c[3] == b["id"] and c[0] <= tt]
            step = max([1] + steps_seen) if steps_seen else 1
        step = min(step, len(b["overlay"][lang]))

        frame = bg.copy()
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        draw_dots(d, tt)
        d.text((90, 250), b["label"].upper(), font=label_font, fill=(150, 160, 180, 255))
        # illustration fades in at the beat start
        ill = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        di = ImageDraw.Draw(ill)
        a = b["anim"]
        if a == "envelope":
            envelope(di, p, tt)
        elif a == "servers":
            servers(di, p, tt)
        elif a == "chat":
            chat(di, p, tt, step)
        elif a == "clouds":
            clouds(di, p, tt)
        elif a == "checklist":
            done = step if any(c[3] == b["id"] and c[0] <= tt and c[4] >= 1 for c in cap_spans) else 0
            ks = b["reveal"][lang]
            spoken_now = " ".join(c[2] for c in cap_spans if c[3] == b["id"] and c[0] <= tt).lower()
            done = sum(k.lower() in spoken_now for k in ks)
            checklist(di, p, tt, done, 3)
        elif a == "comment":
            comment(di, p, tt)
        fade = ease((tt - (s0 - GAP * 0.5)) / 0.35) if idx > 0 else ease(tt / 0.35)
        if fade < 1:
            alpha = ill.getchannel("A").point(lambda v: int(v * fade))
            ill.putalpha(alpha)
        layer = Image.alpha_composite(layer, ill)

        # card slides up slightly as it appears
        card = cards[(b["id"], step)]
        cy = 290 + int(30 * (1 - fade))
        if fade < 1:
            card = card.copy()
            card.putalpha(card.getchannel("A").point(lambda v: int(v * fade)))
        layer.alpha_composite(card, (0, cy))

        if span:
            if span[2] not in cap_cache:
                cap_cache[span[2]] = caption_img(span[2], cap_font)
            layer.alpha_composite(cap_cache[span[2]], (0, 1230))

        frame = Image.alpha_composite(frame, layer)
        ff.stdin.write(frame.convert("RGB").tobytes())
    ff.stdin.close()
    ff.wait()
    print(f"{lang}: {total:.1f}s -> {out_mp4}")


for lang in ("en", "id"):
    build(lang)

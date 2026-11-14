"""Outlook reel in the portfolio's style: voiceover + timeline here, visuals in tools/web/reel.html.

Usage: python3 render_web.py OUT_DIR [en] [id] [--stills]
Needs the repo's node_modules (for GSAP) and the OpenRouter key for any sentence not yet voiced.
"""
import json
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import render_animated as ra  # noqa: E402  (voice clips, timing, captions)

# Headlines for the portfolio style: *key* gets the highlight bar (blue sections) or the hand-drawn underline (navy).
HEADS = [
    {"en": "Outlook was *down*", "id": "Outlook *mati*"},
    {"en": "Not a *hack*.", "id": "Bukan *diretas*."},
    {"en": "Safety checks *failed*", "id": "Pengecekan *gagal*"},
    {"en": "The rest got *overloaded*", "id": "Sisanya *kewalahan*"},
    {"en": "Down *worldwide*", "id": "Lumpuh *seluruh dunia*"},
    {"en": "Full cause: *not public yet*", "id": "Penyebab: *belum diumumkan*"},
    {"en": "Check the *status page*", "id": "Cek *halaman status*", "num": "01"},
    {"en": "Expect *late emails*", "id": "Email bisa *telat*", "num": "02"},
    {"en": "Urgent? *Call or chat*", "id": "Mendesak? *Telepon/chat*", "num": "03"},
    {"en": "Switch to *Google*?", "id": "Pindah ke *Google*?"},
    {"en": "It goes down too. And it's *costly*.", "id": "Bisa down juga. Dan *mahal*."},
    {"en": "A backup plan is *cheaper*", "id": "Rencana cadangan *lebih murah*"},
    {"en": "Keep your business *running*", "id": "Bisnis tetap *jalan*"},
    {"en": "Your *backup plan*", "id": "Rencana *cadangan* kamu"},
    {"en": "What did *your office* do?", "id": "Kantor kamu *ngapain*?"},
]
BEATS = {
    "en": ["The outage", "What happened", "What to do", "Switch?", "Next time", "Your turn"],
    "id": ["Gangguan", "Apa yang terjadi", "Harus ngapain", "Pindah?", "Lain kali", "Giliran kamu"],
}


def timeline(lang, base):
    tl, total = ra.build_timeline(lang, base)
    scenes, caps = [], []
    for e in tl:
        sc = ra.SCENES[e["i"]]
        h = HEADS[e["i"]]
        item = {"start": round(e["start"], 3), "end": round(e["end"], 3), "beat": sc["beat"],
                "speech": [round(e["speech"][0], 3), round(e["speech"][1], 3)], "head": h[lang]}
        if "num" in h:
            item["num"] = h["num"]
        if "labels" in sc:
            text = sc["say"][lang]
            s0, s1 = e["speech"]
            item["labels"] = sc["labels"][lang]
            item["keys"] = []
            for kw in sc["keys"][lang]:
                pos = text.lower().find(kw.lower())
                frac = (pos + len(kw)) / len(text) if pos >= 0 else 0.5
                item["keys"].append(round(s0 - e["start"] + frac * (s1 - s0), 3))
        scenes.append(item)
        s0, s1 = e["speech"]
        cs = ra.chunks(sc["say"][lang])
        tot = sum(len(c) for c in cs)
        cur = s0
        for c in cs:
            dur = (s1 - s0) * len(c) / tot
            caps.append([round(cur, 3), round(cur + dur, 3), c])
            cur += dur
    with open(os.path.join(base, f"captions-{lang}.srt"), "w", encoding="utf-8") as f:
        f.write("\n".join(f"{n}\n{ra.ts(a)} --> {ra.ts(b)}\n{c}\n" for n, (a, b, c) in enumerate(caps, 1)))
    with open(os.path.join(base, f"script-{lang}.txt"), "w", encoding="utf-8") as f:
        for e in tl:
            f.write(f"[{e['speech'][0]:05.2f}s] {ra.SCENES[e['i']]['say'][lang]}\n")
    return {"lang": lang, "total": round(total, 3), "beats": BEATS[lang], "scenes": scenes, "caps": caps}


def ensure_gsap():
    src = os.path.join(HERE, "..", "..", "node_modules", "gsap", "dist")
    for f in ("gsap.min.js", "DrawSVGPlugin.min.js", "MotionPathPlugin.min.js"):
        dst = os.path.join(HERE, "web", f)
        if not os.path.exists(dst):
            shutil.copy(os.path.join(src, f), dst)


def main():
    out = sys.argv[1]
    langs = [a for a in sys.argv[2:] if a in ("en", "id")] or ["en", "id"]
    ensure_gsap()
    for lang in langs:
        base = os.path.join(out, lang)
        os.makedirs(base, exist_ok=True)
        data = timeline(lang, base)
        tl_path = os.path.join(base, ".timeline.json")
        with open(tl_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)
        voice = os.path.join(base, f"voiceover-{lang}.wav")
        mp4 = os.path.join(base, f"outlook-reel-{lang}.mp4")
        if "--stills" in sys.argv:
            times = [round(s["start"] + (s["end"] - s["start"]) * 0.75, 2) for s in data["scenes"]]
            times += [round(data["scenes"][2]["start"] + 0.35, 2)]  # mid beat transition
            subprocess.run(["node", os.path.join(HERE, "record.cjs"), tl_path, os.environ.get("STILLS_PREFIX", os.path.join(out, ".stills-" + lang)),
                            voice, "1", "--stills", ",".join(map(str, times))], check=True)
            print(f"{lang}: stills at {times}")
            continue
        subprocess.run(["node", os.path.join(HERE, "record.cjs"), tl_path, mp4, voice, str(os.cpu_count() or 4)], check=True)
        print(f"{lang}: {data['total']:.1f}s -> {mp4}")


if __name__ == "__main__":
    main()

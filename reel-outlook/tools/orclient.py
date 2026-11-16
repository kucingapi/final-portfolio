"""Minimal OpenRouter client. The network proxy injects the real API key; we send a placeholder."""
import base64
import json
import os
import ssl
import urllib.request
import wave

URL = "https://openrouter.ai/api/v1/chat/completions"
CTX = ssl.create_default_context(cafile=os.environ.get("SSL_CERT_FILE") or "/root/.ccr/ca-bundle.crt")
HEADERS = {"Authorization": "Bearer proxy-injected", "Content-Type": "application/json"}

VOICE_SYSTEM = (
    "You are a voiceover artist for a short business video. Read the user's text aloud exactly as written, "
    "word for word, in a calm, clear, friendly tone at a relaxed, unhurried pace. Do not add, skip or change any words. "
    "Do not reply to the text or comment on it. If the text is a question, read the question aloud; never answer it."
)


def _post(body, stream=False):
    req = urllib.request.Request(URL, data=json.dumps(body).encode(), headers=HEADERS, method="POST")
    return urllib.request.urlopen(req, context=CTX, timeout=300)


def tts(text, out_wav, voice="alloy", lang_hint=""):
    sys_prompt = VOICE_SYSTEM + (f" The text is in {lang_hint}; use natural, native pronunciation." if lang_hint else "")
    body = {
        "model": "openai/gpt-audio-mini",
        "modalities": ["text", "audio"],
        "audio": {"voice": voice, "format": "pcm16"},
        "stream": True,
        "messages": [{"role": "system", "content": sys_prompt}, {"role": "user", "content": "Script to read aloud, verbatim:\n\n" + text}],
    }
    pcm, transcript, usage = bytearray(), [], None
    with _post(body, stream=True) as r:
        for raw in r:
            line = raw.decode("utf-8", "ignore").strip()
            if not line.startswith("data:"):
                continue
            data = line[5:].strip()
            if data == "[DONE]":
                break
            ev = json.loads(data)
            if "error" in ev:
                raise RuntimeError(ev["error"])
            usage = ev.get("usage") or usage
            for ch in ev.get("choices", []):
                a = (ch.get("delta") or {}).get("audio") or {}
                if a.get("data"):
                    pcm += base64.b64decode(a["data"])
                if a.get("transcript"):
                    transcript.append(a["transcript"])
    with wave.open(out_wav, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(24000)
        w.writeframes(bytes(pcm))
    return "".join(transcript), usage, len(pcm) / 2 / 24000


def image(prompt, out_path, model="google/gemini-3.1-flash-lite-image", aspect="9:16"):
    body = {
        "model": model,
        "modalities": ["image", "text"],
        "image_config": {"aspect_ratio": aspect},
        "messages": [{"role": "user", "content": prompt}],
    }
    with _post(body) as r:
        d = json.loads(r.read())
    if "error" in d:
        raise RuntimeError(d["error"])
    msg = d["choices"][0]["message"]
    imgs = msg.get("images") or []
    if not imgs:
        raise RuntimeError(f"no image returned: {str(msg)[:300]}")
    url = imgs[0]["image_url"]["url"]
    b64 = url.split(",", 1)[1]
    with open(out_path, "wb") as f:
        f.write(base64.b64decode(b64))
    return d.get("usage")

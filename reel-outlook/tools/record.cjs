// Records tools/web/reel.html frame by frame with Playwright and encodes with ffmpeg.
// Usage: node record.cjs <timeline.json> <out.mp4> <voiceover.wav> [workers] [--stills t1,t2,...]
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const [, , tlPath, outMp4, voice, workersArg, stillsFlag, stillsArg] = process.argv;
const FPS = 30;
const W = 1080, H = 1920;
const webDir = path.join(__dirname, "web");
const reel = JSON.parse(fs.readFileSync(tlPath, "utf8"));
const fig = path.join(__dirname, "..", "..", "public", "figma");
const read = (p) => fs.readFileSync(path.join(fig, p), "utf8");
const ASSETS = {
  starburst: read("hero/starburst.svg"), loop: read("hero/loop-top.svg"), swoosh: read("hero/swoosh-bottom.svg"),
  underline: read("hero/underline.svg"), arrow: read("hero/arrow.svg"), spark18: read("hero/spark-18.svg"),
  spark19: read("hero/spark-19.svg"), spark20: read("hero/spark-20.svg"), spark21: read("hero/spark-21.svg"),
  tickV: read("hero/tick-vertical.svg"), striped: read("hero/striped-circle.svg"), logo: read("brand/logo.svg"),
  phone: read("icons/phone.svg"), arrowLarge: read("icons/arrow-right-large.svg"),
};

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => console.error("pageerror:", e.message));
  await page.addInitScript(([r, a]) => { window.REEL = r; window.ASSETS = a; }, [reel, ASSETS]);
  await page.goto("file://" + path.join(webDir, "reel.html"));
  await page.waitForFunction(() => window.READY === true, null, { timeout: 30000 });
  return page;
}

async function renderRange(browser, from, to, segPath) {
  const page = await openPage(browser);
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", String(FPS), segPath], { stdio: ["pipe", "inherit", "inherit"] });
  for (let f = from; f < to; f++) {
    await page.evaluate((t) => window.seekTo(t), f / FPS);
    const buf = await page.screenshot({ type: "jpeg", quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  }
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
  await page.close();
}

(async () => {
  const browser = await chromium.launch();
  if (stillsFlag === "--stills") {
    const page = await openPage(browser);
    const times = stillsArg.split(",").map(Number);
    for (const t of times) {
      await page.evaluate((x) => window.seekTo(x), t);
      await page.screenshot({ path: `${outMp4}-${t.toFixed(2)}.png` });
    }
    await browser.close();
    return;
  }
  const total = Math.ceil(reel.total * FPS);
  const n = Math.max(1, Number(workersArg) || 4);
  const per = Math.ceil(total / n);
  const tmp = fs.mkdtempSync(path.join(path.dirname(outMp4), ".seg-"));
  const segs = [];
  const jobs = [];
  for (let k = 0; k < n; k++) {
    const from = k * per, to = Math.min(total, (k + 1) * per);
    if (from >= to) break;
    const seg = path.join(tmp, `seg${k}.mp4`);
    segs.push(seg);
    jobs.push(renderRange(browser, from, to, seg));
  }
  await Promise.all(jobs);
  await browser.close();
  const list = path.join(tmp, "list.txt");
  fs.writeFileSync(list, segs.map((s) => `file '${s}'`).join("\n"));
  await new Promise((res, rej) => {
    const p = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-i", voice, "-c:v", "copy",
      "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-shortest", "-movflags", "+faststart", outMp4], { stdio: "inherit" });
    p.on("close", (c) => (c === 0 ? res() : rej(new Error("ffmpeg concat failed"))));
  });
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`wrote ${outMp4} (${total} frames)`);
})();

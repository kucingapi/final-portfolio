/**
 * Builds the project images and photos ahead of time as AVIF at a ladder of widths, so browsers get
 * static files instead of waiting on the image optimizer to encode a size the first time anyone asks
 * for it (a second or more each on Vercel, for every size, in every region). Writes public/img/** and
 * src/lib/image-variants.json, which <Picture> reads (src/components/Picture.tsx).
 *
 * Each image's files carry a hash of its bytes and of the settings below, so a replaced image gets new
 * URLs and the files can be cached for a year (see headers() in next.config.ts). Only new or changed
 * images are encoded, and the files of removed images are deleted. `npm run dev` and `npm run build`
 * run this first (and Vercel's build with it); `npm run images` runs it alone. Commit what it writes,
 * so builds find it done.
 *
 * The quality is what the optimizer serves today (AVIF quality 47, 4:4:4, the same libaom), encoded
 * with more effort, which makes the files about a tenth smaller at the same SSIM and PSNR.
 */

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const OUT = path.join(PUBLIC, "img");
const MANIFEST = path.join(ROOT, "src/lib/image-variants.json");

/** Folders under public/ whose images get variants. */
const FOLDERS = ["projects", "figma/hero", "figma/about"];
const EXTENSIONS = new Set([".webp", ".png", ".jpg", ".jpeg"]);
/** Widths to build, up to the image's own width, which is always built. */
const LADDER = [480, 768, 1080, 1440, 1920, 2400];
/** A step at least this close to the image's own width is left out: the full width covers it. */
const MERGE = 0.9;
const AVIF = { quality: 47, effort: 8, chromaSubsampling: "4:4:4" };
const SETTINGS = JSON.stringify({ LADDER, MERGE, AVIF });

const rel = (file) => path.relative(PUBLIC, file).split(path.sep).join("/");
const variantFile = (key, width, hash) => path.join(OUT, `${key.replace(/\.[^./]+$/, "")}-${width}.${hash}.avif`);
const filesOf = (key, entry) => entry.widths.map((w) => variantFile(key, w, entry.hash));

async function walk(dir, extensions = EXTENSIONS) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) out.push(...(await walk(full, extensions)));
    else if (extensions.has(path.extname(item.name).toLowerCase())) out.push(full);
  }
  return out;
}

function widthsFor(width) {
  return [...LADDER.filter((w) => w < width * MERGE), width];
}

/** Runs `task` over `items`, `limit` at a time. */
async function pool(items, limit, task) {
  let next = 0;
  const run = async () => {
    while (next < items.length) await task(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
}

async function main() {
  const previous = existsSync(MANIFEST) ? JSON.parse(await readFile(MANIFEST, "utf8")) : {};
  const sources = (await Promise.all(FOLDERS.map((f) => walk(path.join(PUBLIC, f))))).flat();
  const manifest = {};
  const stale = [];

  for (const file of sources) {
    const key = `/${rel(file)}`;
    const bytes = await readFile(file);
    const hash = createHash("sha256").update(bytes).update(SETTINGS).digest("hex").slice(0, 10);
    const known = previous[key];
    if (known?.hash === hash && filesOf(key, known).every((f) => existsSync(f))) manifest[key] = known;
    else stale.push({ key, bytes, hash });
  }

  let written = 0;
  let size = 0;
  if (stale.length) {
    const { default: sharp } = await import("sharp");
    const started = Date.now();
    await pool(stale, Math.max(1, Math.floor(os.cpus().length / 2)), async ({ key, bytes, hash }) => {
      const { width } = await sharp(bytes).metadata();
      const widths = widthsFor(width);
      for (const w of widths) {
        const image = w < width ? sharp(bytes).resize({ width: w }) : sharp(bytes);
        const avif = await image.avif(AVIF).toBuffer();
        const out = variantFile(key, w, hash);
        await mkdir(path.dirname(out), { recursive: true });
        await writeFile(out, avif);
        written++;
        size += avif.length;
      }
      manifest[key] = { hash, widths };
      console.log(`images: built ${key} (${widths.join(", ")})`);
    });
    console.log(`images: ${stale.length} image(s), ${written} files, ${Math.round(size / 1024)} KB in ${Math.round((Date.now() - started) / 1000)}s`);
  }

  // Delete the files no image in the manifest points to any more.
  const keep = new Set(Object.entries(manifest).flatMap(([key, entry]) => filesOf(key, entry)));
  let removed = 0;
  for (const file of await walk(OUT, new Set([".avif"]))) {
    if (!keep.has(file)) {
      await rm(file);
      removed++;
    }
  }
  if (removed) console.log(`images: removed ${removed} old file(s)`);

  // One image per line, sorted, so a change shows as one line in a diff.
  const lines = Object.keys(manifest)
    .sort()
    .map((key) => `  ${JSON.stringify(key)}: ${JSON.stringify(manifest[key])}`);
  const json = `{\n${lines.join(",\n")}\n}\n`;
  if (!existsSync(MANIFEST) || (await readFile(MANIFEST, "utf8")) !== json) await writeFile(MANIFEST, json);
  if (!stale.length && !removed) console.log(`images: ${sources.length} up to date`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

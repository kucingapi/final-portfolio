import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * Site images for the portfolio PDF. The site serves WebP at full size; a PDF can't hold WebP, and a
 * full-size picture per slide would make it heavy. Each one is cut down to about twice the size it is
 * shown at and saved as a compact JPEG, so the whole deck stays around a megabyte or two.
 */

export type PdfImage = { data: Buffer; format: "jpg"; width: number; height: number };

/** The slides' background, so transparent renders don't turn black. */
const MATTE = "#010326";

const cache = new Map<string, Promise<PdfImage | null>>();

/** `src` is a public path like "/projects/agentflow/review.webp"; `max` is the longest side, in px. */
export function pdfImage(src: string, max = 1400): Promise<PdfImage | null> {
  const key = `${src}@${max}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = load(src, max);
    cache.set(key, hit);
  }
  return hit;
}

async function load(src: string, max: number): Promise<PdfImage | null> {
  try {
    const file = await readFile(path.join(process.cwd(), "public", src));
    const { data, info } = await sharp(file)
      .resize({ width: max, height: max, fit: "inside", withoutEnlargement: true })
      .flatten({ background: MATTE })
      .jpeg({ quality: 70, mozjpeg: true, chromaSubsampling: "4:2:0" })
      .toBuffer({ resolveWithObject: true });
    return { data, format: "jpg", width: info.width, height: info.height };
  } catch {
    return null;
  }
}

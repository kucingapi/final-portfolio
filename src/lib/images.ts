import built from "./image-variants.json";

/** What scripts/images.mjs built for one image under public/: a hash of its bytes, and the widths. */
type Variants = { hash: string; widths: number[] };

const VARIANTS: Record<string, Variants> = built;

/**
 * The AVIF files scripts/images.mjs built ahead of time for an image under public/ (`/projects/…`),
 * as a srcset and the largest file; undefined when it has none, as for a full URL or an image added
 * since the script last ran.
 */
export function builtAvif(src: string): { srcSet: string; largest: string } | undefined {
  const v = VARIANTS[src];
  if (!v) return undefined;
  const base = src.replace(/\.[^./]+$/, "");
  const url = (w: number) => `/img${base}-${w}.${v.hash}.avif`;
  return {
    srcSet: v.widths.map((w) => `${url(w)} ${w}w`).join(", "),
    largest: url(v.widths[v.widths.length - 1]),
  };
}

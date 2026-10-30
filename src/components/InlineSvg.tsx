import { readFileSync } from "node:fs";
import path from "node:path";

const cache = new Map<string, string>();

function load(src: string) {
  let markup = cache.get(src);
  if (!markup) {
    markup = readFileSync(path.join(process.cwd(), "public", src), "utf8")
      // Figma exports carry inline sizing meant for <img>; the wrapper sizes the SVG instead.
      .replace(/\s(width|height)="[^"]*"/, " ")
      .replace(/\s(width|height)="[^"]*"/, " ")
      .replace(/\sstyle="[^"]*"/, "")
      .replace("<svg", '<svg width="100%" height="100%" aria-hidden="true" focusable="false"');
    cache.set(src, markup);
  }
  return markup;
}

/**
 * Renders a downloaded Figma SVG inline (unchanged paths) so its strokes can be
 * animated. `src` is a path under /public, e.g. "/figma/hero/loop-top.svg".
 */
export function InlineSvg({ src, className, ...rest }: { src: string; className?: string; [data: `data-${string}`]: string | undefined }) {
  return <span className={`block ${className ?? ""}`} dangerouslySetInnerHTML={{ __html: load(src) }} {...rest} />;
}

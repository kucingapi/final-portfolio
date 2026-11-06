import type { CSSProperties } from "react";
import { Picture } from "@/components/Picture";
import type { Art, Placement } from "@/content/projects";

const px = (n: number) => `calc(var(--s) * ${n})`;

/**
 * A project render in two layers: the flat two-tone twin underneath, and the real render on top,
 * clipped to the circle in the picture. The parent decides when it opens: `.group` hover/focus,
 * or `data-open="true"` on any ancestor (see `.art-real` in globals.css).
 *
 * `frame` is the box the art fills and `place` where the image sits inside it, both in design px.
 * `preload` is for the art at the top of a page. Elsewhere the real render, hidden but for its
 * circle until the art opens, loads after the twin that shows.
 */
export function ProjectArt({
  art,
  frame,
  place,
  sizes,
  preload = false,
}: {
  art: Art;
  frame: { w: number; h: number };
  place: Placement;
  sizes: string;
  preload?: boolean;
}) {
  const cx = place.x + art.circle.x * place.w;
  const cy = place.y + art.circle.y * place.h;
  const r0 = art.circle.r * place.w;
  const corners = [
    [0, 0],
    [frame.w, 0],
    [0, frame.h],
    [frame.w, frame.h],
  ];
  const r1 = Math.ceil(Math.max(...corners.map(([x, y]) => Math.hypot(x - cx, y - cy)))) + 8;
  // The real image settles from a slight zoom; its origin is the circle in the image's own box.
  const vars = {
    "--cx": cx,
    "--cy": cy,
    "--ox": cx - place.x,
    "--oy": cy - place.y,
    "--r0": r0,
    "--r1": r1,
  } as CSSProperties;
  const box: CSSProperties = { left: px(place.x), top: px(place.y), width: px(place.w), height: px(place.h) };

  return (
    <div aria-hidden className="absolute inset-0" style={vars}>
      <Picture
        src={art.abstract}
        alt=""
        width={art.width}
        height={art.height}
        sizes={sizes}
        preload={preload}
        fetchPriority={preload ? "high" : undefined}
        className="absolute max-w-none"
        style={box}
      />
      <div className="art-real absolute inset-0">
        <Picture
          src={art.real}
          alt=""
          width={art.width}
          height={art.height}
          sizes={sizes}
          preload={preload}
          fetchPriority={preload ? undefined : "low"}
          className="absolute max-w-none"
          style={box}
        />
        {art.circle.drawn && (
          <span
            className="art-button absolute flex items-center justify-center rounded-full bg-midnight-500"
            style={{ left: px(cx - r0), top: px(cy - r0), width: px(r0 * 2), height: px(r0 * 2) }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="size-1/2 text-white" aria-hidden>
              <path d="M7 17 17 7M9 7h8v8" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        )}
      </div>
    </div>
  );
}

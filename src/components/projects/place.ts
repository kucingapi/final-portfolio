import type { Art, Placement, Project } from "@/content/projects";

/**
 * Where a project's render sits in a frame, in design px. A crop drawn for that exact frame wins (the
 * project's `hero` for the 1240×700 frame, its `card` for a home-grid card of its size); otherwise the
 * render is fitted around its focus, the device's box: as large as fits with a margin, centred, and
 * always covering the frame. A frame narrower than the device crops its sides.
 */

export type Frame = { w: number; h: number };

/** The case-study frame: the top of each case study and the large rows on the projects page. */
export const HERO_FRAME: Frame = { w: 1240, h: 700 };

/** At most this share of the frame for the device, so it never touches the edges. */
const FILL = 0.8;
/** Without a focus box: the middle of the picture. */
const MIDDLE = { x: 0.2, y: 0.15, w: 0.6, h: 0.7 };

const round = (n: number) => Math.round(n * 10) / 10;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function fitArt(art: Art, frame: Frame): Placement {
  const f = art.focus ?? MIDDLE;
  const aspect = art.width / art.height;
  const cover = Math.max(frame.w, frame.h * aspect);
  const fit = Math.min((frame.w * FILL) / f.w, (frame.h * FILL * aspect) / f.h);
  const w = Math.max(cover, fit);
  const h = w / aspect;
  // A screen sits in the upper part of its device: centre a little above the box's middle, so a crop
  // takes the base or the rock before the screen.
  const x = clamp(frame.w / 2 - (f.x + f.w / 2) * w, frame.w - w, 0);
  const y = clamp(frame.h / 2 - (f.y + f.h * 0.42) * h, frame.h - h, 0);
  return { w: round(w), h: round(h), x: round(x), y: round(y) };
}

export function placeArt(project: Pick<Project, "hero" | "card"> & { art: Art }, frame: Frame): Placement {
  if (project.hero && frame.w === HERO_FRAME.w && frame.h === HERO_FRAME.h) return project.hero;
  if (project.card && project.card.w === frame.w && project.card.h === frame.h) return project.card.place;
  return fitArt(project.art, frame);
}

/**
 * A phone: a device well over half again as tall as it is wide, which suits a tall card. (A tilted
 * laptop's box is a little taller than wide too, but it still wants a wide frame.)
 */
export const isPortrait = (art: Art) => Boolean(art.focus && art.focus.w * art.width < 0.65 * art.focus.h * art.height);

import Image from "next/image";
import type { CSSProperties } from "react";
import { isFeatured, type Placement, type Project } from "@/content/projects";
import { ProjectArt } from "./ProjectArt";

const px = (n: number) => `calc(var(--s) * ${n})`;

/**
 * Any project drawn into a frame (design px). Featured projects show their device render
 * (`place` crops it). The others show their one number; when they have a cover, the same
 * "open" disc grows a circle that reveals the screenshot (`.art-real` in globals.css).
 */
export function ProjectVisual({
  project,
  frame,
  place,
  sizes,
  priority = false,
  footnote,
}: {
  project: Project;
  frame: { w: number; h: number };
  place?: Placement;
  sizes: string;
  priority?: boolean;
  /** A small line along the bottom of the number panel, e.g. the stack. */
  footnote?: string;
}) {
  if (isFeatured(project)) {
    return <ProjectArt art={project.art} frame={frame} place={place ?? project.hero} sizes={sizes} priority={priority} />;
  }

  // The disc sits in the top-right corner, one disc-width in.
  const r0 = Math.round(frame.h * 0.075);
  const cx = frame.w - r0 * 2.4;
  const cy = r0 * 2.4;
  const r1 = Math.ceil(Math.max(Math.hypot(cx, frame.h - cy), Math.hypot(cx, cy))) + 8;
  const vars = { "--cx": cx, "--cy": cy, "--ox": cx, "--oy": cy, "--r0": 0, "--r1": r1 } as CSSProperties;
  const { cover, stat } = project;

  return (
    <div aria-hidden className="absolute inset-0 bg-midnight-500" style={vars}>
      <div className="absolute flex flex-col" style={{ left: px(frame.h * 0.1), top: px(frame.h * 0.1), gap: px(frame.h * 0.03) }}>
        <span className="font-display leading-none font-semibold text-midnight-50 tabular-nums" style={{ fontSize: px(frame.h * 0.24) }}>
          {stat.value}
        </span>
        <span className="font-semibold text-midnight-100" style={{ fontSize: px(frame.h * 0.05), maxWidth: px(frame.w * 0.6) }}>
          {stat.label}
        </span>
      </div>
      {footnote && (
        <span className="absolute font-medium text-midnight-100" style={{ left: px(frame.h * 0.1), bottom: px(frame.h * 0.08), fontSize: px(frame.h * 0.042) }}>
          {footnote}
        </span>
      )}
      {cover && (
        <>
          <div className="art-real absolute inset-0 bg-white">
            <Image src={cover.src} alt="" fill sizes={sizes} priority={priority} className="object-cover object-top" />
          </div>
          <span
            className="art-button absolute flex items-center justify-center rounded-full bg-midnight-950"
            style={{ left: px(cx - r0), top: px(cy - r0), width: px(r0 * 2), height: px(r0 * 2) }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="size-1/2 text-white" aria-hidden>
              <path d="M7 17 17 7M9 7h8v8" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </>
      )}
    </div>
  );
}

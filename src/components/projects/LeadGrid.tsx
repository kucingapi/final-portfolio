"use client";

import { useEffect, type CSSProperties } from "react";
import { Chip } from "@/components/ui";
import { TransitionLink } from "@/components/transition/PageTransition";
import { useLead } from "@/components/cv/Variant";
import { ScrollTrigger } from "@/lib/gsap";
import { useUi } from "@/lib/i18n/client";
import type { Art, Project } from "@/content/projects";
import { ProjectArt } from "./ProjectArt";
import { isPortrait, placeArt } from "./place";

export type GridProject = Pick<Project, "slug" | "title" | "tag" | "card" | "hero"> & { art: Art };

/**
 * Slots of the Figma grid, in reading order, at their design sizes: the big tile, the tall one beside
 * it, then a small and a wide one. Each card is drawn at its design size and scaled as a whole on
 * phones (`--k`), so the crops stay as composed.
 */
const SLOTS = [
  { pos: "top-306 left-100", radius: "rounded-br-lg", w: 813, h: 741 },
  { pos: "top-306 left-950", radius: "rounded-bl-lg", w: 390, h: 742 },
  { pos: "top-1084 left-100", radius: "rounded-tr-lg", w: 390, h: 480 },
  { pos: "top-1084 left-527", radius: "rounded-tl-lg", w: 813, h: 480 },
];

/**
 * The render is drawn wider than its card, so ask for an image as wide as the render, not the card.
 * The design stops growing at 1440, so from there it is the render's design width in px.
 */
const artSizes = (imageW: number, cardW: number) =>
  `(max-width: 1023px) ${Math.round((imageW / cardW) * 91)}vw, (min-width: 1440px) ${Math.round(imageW)}px, ${Math.round(imageW / 14.4)}vw`;

/** Reading order, except that a phone, when one leads, takes the tall slot a laptop would be cropped in. */
function fitSlots(lead: GridProject[]): GridProject[] {
  const order = [...lead];
  if (order[1] && !isPortrait(order[1].art)) {
    const k = order.findIndex((p, i) => i > 1 && isPortrait(p.art));
    if (k > 1) [order[1], order[k]] = [order[k], order[1]];
  }
  return order;
}

/**
 * The home page's project grid: the four projects that lead for this visitor, which are the site's first
 * four unless a tailored link puts its own first. Cards keep their slot as their key, so the scroll
 * reveals set up on them survive a tailored link swapping what is in them.
 */
export function LeadGrid({ projects }: { projects: GridProject[] }) {
  const { lead } = useLead(projects);
  const t = useUi().project;
  const cards = fitSlots(lead);
  const key = cards.map((p) => p.slug).join(" ");

  // New renders can change the page's height on phones: measure the scroll reveals again.
  useEffect(() => {
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, [key]);

  return (
    <ul data-grid className="max-md:mt-32 max-md:flex max-md:flex-col max-md:gap-16">
      {cards.map((project, i) => {
        const slot = SLOTS[i];
        const { w, h } = slot;
        const place = placeArt(project, slot);
        // On phones the card is the slot scaled to 390 wide; a crop drawn for this slot says its own height.
        const drawn = project.card && project.card.w === w && project.card.h === h;
        const mobileH = drawn ? project.card!.mobileH : Math.round((h * 390) / w);
        return (
          <li
            key={i}
            data-card
            data-swap
            className={`absolute h-[calc(var(--s)*var(--h))] w-[calc(var(--s)*var(--w))] ${slot.pos} max-md:relative max-md:inset-auto max-md:h-[calc(var(--s)*var(--mh))] max-md:w-full`}
            style={{ "--w": w, "--h": h, "--mh": mobileH, "--k": 390 / w } as CSSProperties}
          >
            <TransitionLink
              href={`/projects/${project.slug}`}
              aria-label={t.cardLabel(project.title, project.tag)}
              className={`group absolute inset-0 block overflow-hidden bg-midnight-950 ${slot.radius} max-md:rounded-lg`}
            >
              <div className="absolute top-0 left-0 h-[calc(var(--s)*var(--h))] w-[calc(var(--s)*var(--w))] origin-top-left max-md:scale-(--k)">
                <ProjectArt key={project.slug} art={project.art} frame={slot} place={place} sizes={artSizes(place.w, w)} />
              </div>
              <span className="pointer-events-none absolute bottom-24 left-24 flex flex-wrap items-center gap-8 pr-24 max-md:bottom-14 max-md:left-14">
                <Chip>{project.title}</Chip>
                {/* Narrow cards keep only the title so the chips don't stack over the render. */}
                {w > 500 && (
                  <span className="inline-flex h-40 items-center rounded-full border-2 border-midnight-50/70 bg-midnight-950/70 px-16 font-inter text-chip font-medium tracking-[-0.01em] whitespace-nowrap text-midnight-50 backdrop-blur-sm max-md:hidden">
                    {project.tag}
                  </span>
                )}
              </span>
            </TransitionLink>
          </li>
        );
      })}
    </ul>
  );
}

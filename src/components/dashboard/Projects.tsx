"use client";

import { Download } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { CONTRA, UPWORK, type ProjectExport } from "@/lib/dashboard/export";
import { CopyField, CopyList } from "./Copy";
import { Button } from "./ui/button";

/**
 * Each project as Upwork's and Contra's forms ask for it: copy-ready fields, read-only (they come from
 * src/content/projects.ts), and the images as one numbered zip.
 */
export function Projects({ projects }: { projects: ProjectExport[] }) {
  const [slug, setSlug] = useState(projects[0]?.slug);
  const p = projects.find((x) => x.slug === slug);

  return (
    <div className="flex flex-col gap-6">
      <div role="group" aria-label="Project" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
        {projects.map((x) => (
          <button
            key={x.slug}
            type="button"
            onClick={() => setSlug(x.slug)}
            aria-pressed={x.slug === slug}
            className="h-9 shrink-0 rounded-full border border-border px-4 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground aria-pressed:border-transparent aria-pressed:bg-foreground aria-pressed:text-background"
          >
            {x.title}
          </button>
        ))}
      </div>
      {p && <ProjectExportView key={p.slug} p={p} />}
    </div>
  );
}

function Part({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function ProjectExportView({ p }: { p: ProjectExport }) {
  return (
    <article className="flex flex-col gap-10">
      <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">
        Made from src/content/projects.ts. To change a line, edit the project or the rules in src/lib/dashboard/export.ts.
      </p>

      <Part title={`Images (${p.images.length})`}>
        {p.images.length ? (
          <>
            <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {p.images.map((img) => (
                <li key={img.src} className="flex flex-col gap-1.5">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-card">
                    <Image src={img.src} alt="" fill sizes="(max-width: 1023px) 45vw, 180px" className="object-contain" />
                  </div>
                  <span className="truncate text-xs text-muted-foreground">
                    {img.name} · {img.label}
                  </span>
                </li>
              ))}
            </ol>
            <Button asChild variant="secondary" className="self-start">
              <a href={`/api/dashboard/projects/${p.slug}`} download>
                <Download />
                Download all as a zip
              </a>
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No images yet: this project has no render, cover or chapter shots.</p>
        )}
      </Part>

      <Part title="Upwork">
        <CopyField {...p.upwork.title} />
        <CopyField {...p.upwork.role} />
        <CopyField {...p.upwork.description} />
        <CopyList label="Skills (from the stack)" items={p.upwork.skills} limit={UPWORK.skills} />
        <p className="text-[0.8125rem] text-muted-foreground">Media: the zip above, in its order. The first image is the thumbnail.</p>
      </Part>

      <Part title="Contra">
        <CopyField {...p.contra.link} />
        <p className="-mt-2 text-[0.8125rem] leading-relaxed text-muted-foreground">
          Contra&apos;s Portfolio Magic can build the project from this link. Or fill it in by hand:
        </p>
        <CopyField {...p.contra.title} />
        <CopyField {...p.contra.description} />
        <CopyList label="Roles" items={p.contra.roles} limit={CONTRA.roles} />
        <CopyList label="Tools" items={p.contra.tools} />
        <CopyField {...p.contra.duration} />
        <p className="text-[0.8125rem] text-muted-foreground">Cover image: 01 in the zip. Images: the rest, in order.</p>
      </Part>
    </article>
  );
}

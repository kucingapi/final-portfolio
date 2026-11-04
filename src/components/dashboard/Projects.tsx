"use client";

import { Download, ExternalLink } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { CONTRA, UPWORK, type ProjectExport } from "@/lib/dashboard/export";
import { CopyField, CopyList } from "./Copy";
import { Button } from "./ui/button";

/**
 * Each project as Upwork's and Contra's forms ask for it: copy-ready fields, read-only (they come from
 * the published projects), the images as one numbered zip, and the project's slides as a PDF.
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
        Made from the published projects. To change a line, edit the project in Content, or the rules in
        src/lib/dashboard/export.ts.
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

      <Part title="PDF">
        <p className="-mt-2 text-[0.8125rem] leading-relaxed text-muted-foreground">
          This project&apos;s slides from the portfolio deck, without the site address or links.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <a href={`/api/portfolio?project=${p.slug}&download=1`} download>
              <Download />
              Download the PDF
            </a>
          </Button>
          <Button asChild variant="ghost">
            <a href={`/api/portfolio?project=${p.slug}`} target="_blank" rel="noopener">
              <ExternalLink />
              Open
            </a>
          </Button>
        </div>
      </Part>

      <Part title="Upwork">
        <CopyField {...p.upwork.title} />
        <CopyField {...p.upwork.role} />
        <CopyField {...p.upwork.description} />
        <CopyList label="Skills (from the stack)" items={p.upwork.skills} limit={UPWORK.skills} />
        <p className="text-[0.8125rem] text-muted-foreground">
          Media: the zip above, in its order (the first image is the thumbnail), or the PDF.
        </p>
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

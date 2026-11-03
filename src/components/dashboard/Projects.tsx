"use client";

import Image from "next/image";
import { useState } from "react";
import { CONTRA, UPWORK, type ProjectExport } from "@/lib/dashboard/export";
import { CopyField, CopyList } from "./Copy";

/**
 * Each project as Upwork's and Contra's forms ask for it: copy-ready fields, read-only (they come from
 * src/content/projects.ts), and the images as one numbered zip.
 */
export function Projects({ projects }: { projects: ProjectExport[] }) {
  const [slug, setSlug] = useState(projects[0]?.slug);
  const p = projects.find((x) => x.slug === slug);

  return (
    <div className="flex flex-col gap-24">
      <div className="flex flex-wrap gap-8">
        {projects.map((x) => (
          <button
            key={x.slug}
            onClick={() => setSlug(x.slug)}
            aria-pressed={x.slug === slug}
            className={`rounded-xs px-12 py-4 text-chip ${x.slug === slug ? "bg-midnight-50 text-midnight-950" : "border border-midnight-900 hover:bg-midnight-900"}`}
          >
            {x.title}
          </button>
        ))}
      </div>
      {p && <ProjectCard key={p.slug} p={p} />}
    </div>
  );
}

function ProjectCard({ p }: { p: ProjectExport }) {
  return (
    <article className="flex flex-col gap-32">
      <header className="flex flex-wrap items-baseline justify-between gap-12">
        <h2 className="text-lead font-semibold text-midnight-50">{p.title}</h2>
        <span className="text-chip text-midnight-200">
          Generated from src/content/projects.ts. To change a line, edit the project or src/lib/dashboard/export.ts.
        </span>
      </header>

      <section className="flex flex-col gap-12">
        <div className="flex flex-wrap items-center justify-between gap-12">
          <h3 className="font-semibold text-midnight-50">Images ({p.images.length})</h3>
          {p.images.length > 0 && (
            <a href={`/api/dashboard/projects/${p.slug}`} download className="rounded-xs bg-midnight-400 px-16 py-8 font-semibold text-midnight-950">
              Download zip
            </a>
          )}
        </div>
        {p.images.length ? (
          <ol className="grid grid-cols-4 gap-12 max-md:grid-cols-2">
            {p.images.map((img) => (
              <li key={img.src} className="flex flex-col gap-4">
                <div className="relative aspect-[4/3] overflow-hidden rounded-xs bg-base-900">
                  <Image src={img.src} alt="" fill sizes="(max-width: 1023px) 45vw, 300px" className="object-contain" />
                </div>
                <span className="truncate text-chip text-midnight-200">
                  {img.name} · {img.label}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-chip text-midnight-200">No images: this project has no render, cover or chapter shots yet.</p>
        )}
      </section>

      <section className="flex flex-col gap-16">
        <h3 className="font-semibold text-midnight-50">Upwork</h3>
        <CopyField {...p.upwork.title} />
        <CopyField {...p.upwork.role} />
        <CopyField {...p.upwork.description} />
        <CopyList label="Skills (from the stack)" items={p.upwork.skills} limit={UPWORK.skills} />
        <p className="text-chip text-midnight-200">Media: the zip above, in its order. The first image is the thumbnail.</p>
      </section>

      <section className="flex flex-col gap-16">
        <h3 className="font-semibold text-midnight-50">Contra</h3>
        <CopyField {...p.contra.link} />
        <p className="-mt-8 text-chip text-midnight-200">
          Contra&apos;s Portfolio Magic can build the project from this link. Or fill it in by hand:
        </p>
        <CopyField {...p.contra.title} />
        <CopyField {...p.contra.description} />
        <CopyList label="Roles" items={p.contra.roles} limit={CONTRA.roles} />
        <CopyList label="Tools" items={p.contra.tools} />
        <CopyField {...p.contra.duration} />
        <p className="text-chip text-midnight-200">Cover image: 01 in the zip. Images: the rest, in order.</p>
      </section>
    </article>
  );
}

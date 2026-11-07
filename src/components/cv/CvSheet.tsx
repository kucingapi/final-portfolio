"use client";

import { useVariant } from "./Variant";
import { Downloads } from "./Downloads";
import { localizeVariant, resolveCv, type ResolvedEntry } from "@/lib/cv/variant";
import type { CvContent } from "@/lib/content/schema";
import { useLang, useNames, useUi } from "@/lib/i18n/client";

/**
 * The CV as a sheet of paper on the page: the same lines, order and layout as the PDF, tailored when
 * the visitor came through a `?v=` link. While a fresh code is still loading, the sheet waits rather
 * than flashing the default CV first.
 */

function Entry({ e }: { e: ResolvedEntry }) {
  const t = useUi().cv;
  return (
    <div className="flex flex-col gap-4">
      <p className="font-bold">
        {e.org}
        {e.place ? ` – ${e.place}` : ""}
        {e.proof && (
          <>
            {" | "}
            <a href={e.proof} target="_blank" rel="noreferrer" className="font-normal text-[#444] underline underline-offset-2 hover:text-[#111]">
              {t.certificate}
            </a>
          </>
        )}
      </p>
      <p className="flex justify-between gap-16 italic max-md:flex-col max-md:gap-0">
        <span>
          {e.title}
          {e.note ? `, ${e.note}` : ""}
          {e.grade ? ` | ${e.grade}` : ""}
        </span>
        <span className="shrink-0 tabular-nums">{e.period}</span>
      </p>
      {e.about && <p>{e.about}</p>}
      {e.bullets.length > 0 && (
        <ul className="mt-2 flex list-disc flex-col gap-4 pl-20">
          {e.bullets.map((b) => (
            <li key={b.id}>{b.text}</li>
          ))}
        </ul>
      )}
      {e.courses.length > 0 && (
        <p className="pl-20">
          <strong>{t.coursework}</strong> {e.courses.map((c) => c.title).join(", ")}
        </p>
      )}
      {e.stack && e.stack.length > 0 && (
        <p className="pl-20">
          <strong>{t.tech}</strong> {e.stack.join(", ")}
        </p>
      )}
    </div>
  );
}

/**
 * `content` is the master CV as published, in the page's language; the variant picks from it here, in the
 * browser, once its English titles and skills are put in that language.
 */
export function CvSheet({ content }: { content: CvContent }) {
  const { current, loading } = useVariant();
  const lang = useLang();
  const t = useUi().cv;
  const cv = resolveCv(content, localizeVariant(current?.variant, lang, useNames()), current?.code, lang);

  return (
    <div className="flex flex-col gap-32 max-md:gap-20">
      <div className="flex items-center justify-between gap-24 max-md:flex-col max-md:items-start">
        <p className="text-lead text-midnight-100">{t.intro}</p>
        <Downloads className="shrink-0" />
      </div>

      <article
        aria-label={t.label(cv.name)}
        aria-busy={loading}
        className={`rounded-xs bg-white px-72 py-64 font-[Arial,Helvetica,sans-serif] text-[max(13px,calc(var(--s)*15))] leading-[1.4] text-[#111] shadow-[0_calc(var(--s)*30)_calc(var(--s)*60)_rgb(1_3_38/0.45)] transition-opacity duration-300 max-md:px-20 max-md:py-28 ${
          loading ? "opacity-0" : "opacity-100"
        }`}
      >
        <header className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-[max(22px,calc(var(--s)*28))] leading-[1.15] font-bold">{cv.name}</h2>
          <p className="text-[max(15px,calc(var(--s)*17))]">{cv.headline}</p>
          <p className="text-[#444]">
            {cv.location}
            {cv.email && ` | ${cv.email}`}
            {cv.links.map((l) => (
              <span key={l.href}>
                {" | "}
                <a href={l.href} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                  {l.label}
                </a>
              </span>
            ))}
          </p>
        </header>

        {cv.summary && <p className="mt-20">{cv.summary}</p>}

        {cv.sections.map((section) => (
          <section key={section.id} aria-labelledby={`cv-${section.id}`} className="mt-24">
            <h3 id={`cv-${section.id}`} className="mb-10 border-b-[1.5px] border-[#111] pb-4 font-bold tracking-[0.04em] uppercase">
              {section.title}
            </h3>
            {section.id === "skills" ? (
              <div className="flex flex-col gap-4">
                {cv.skills.map((g) => (
                  <p key={g.id}>
                    <strong>{g.label}:</strong> {g.items.join(", ")}
                  </p>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-14">
                {section.entries.map((e) => (
                  <Entry key={e.id} e={e} />
                ))}
              </div>
            )}
          </section>
        ))}
      </article>
    </div>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import { Picture } from "@/components/Picture";
import { Deco, Heading } from "@/components/ui";
import { SectionMotion } from "@/components/motion/SectionMotion";
import { Footer } from "@/components/sections/Footer";
import { TailoredCareerList } from "@/components/career/TailoredCareerList";
import { RESUME_URL, mailto } from "@/content/site";
import { getCvContent, getSiteContent } from "@/lib/content/read";
import { linkRoles, roleLines } from "@/lib/cv/career";
import { localePath } from "@/lib/i18n/lang";
import { alternates } from "@/lib/i18n/meta";
import { getLang } from "@/lib/i18n/server";
import { ui } from "@/lib/i18n/ui";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const { site } = await getSiteContent(lang);
  const t = ui(lang).meta.career;
  return { title: t.title, description: t.description(site.name), alternates: alternates(lang, "/career") };
}

const round = "relative block size-100 shrink-0 rounded-full bg-midnight-500 transition-colors max-md:size-64";

/** Career page (Figma 317:462, "Experiences"). */
export default async function CareerPage() {
  const lang = await getLang();
  const t = ui(lang).career.page;
  const [{ site, about, careerDetail }, cv, en, cvEn] = await Promise.all([
    getSiteContent(lang),
    getCvContent(lang),
    getSiteContent(),
    getCvContent(),
  ]);
  // A tailored link shows each role as its CV does: the same title, its lines, in the CV's order. Roles
  // are matched to CV entries in English; a translation keeps every list in the same order.
  const allLinks = linkRoles(
    en.careerDetail.flatMap((g) => g.roles),
    cvEn,
  );
  const lines = roleLines(cv, allLinks);
  const starts = careerDetail.map((_, i) => careerDetail.slice(0, i).reduce((n, g) => n + g.roles.length, 0));
  const LINKS = [
    { label: "GitHub", href: site.social.github, icon: "/figma/icons/github-large.svg", box: "size-63" },
    { label: "Upwork", href: site.social.upwork, icon: "/figma/icons/upwork.svg", box: "h-44 w-63" },
    { label: "Email", href: mailto(site.email), icon: "/figma/icons/mail-large.svg", box: "size-63" },
    { label: "LinkedIn", href: site.social.linkedin, icon: "/figma/icons/linkedin.svg", box: "size-63" },
  ];
  return (
    <>
      <SectionMotion preset="experiences">
        <main>
          <section aria-labelledby="profile-name" data-node-id="336:12055" className="relative overflow-clip bg-midnight-950">
            <div className="relative mx-auto h-691 w-1440 max-md:h-auto max-md:w-full max-md:px-20 max-md:pt-100 max-md:pb-80">
              <div className="absolute top-113 left-98 flex flex-col gap-56 text-midnight-50 max-md:static max-md:gap-20">
                <h1 id="profile-name" data-headline className="text-h1 font-bold whitespace-nowrap [text-box:trim-both_cap_alphabetic]">
                  {site.name}
                </h1>
                <p className="flex flex-col text-h2 font-semibold">
                  <span data-subline>{site.role}</span>
                  <span data-subline>{t.subtitle}</span>
                </p>
              </div>

              <div className="absolute top-455 left-97 max-md:static max-md:mt-24">
                <a
                  data-pop
                  data-magnetic="8"
                  href={localePath(lang, RESUME_URL)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-full border-2 border-midnight-50 px-32 py-12 text-h4 font-semibold text-midnight-50 transition-colors hover:bg-midnight-50 hover:text-midnight-950"
                >
                  {t.resume}
                </a>
              </div>

              <ul className="absolute top-553 left-98 flex gap-41 max-md:static max-md:mt-20 max-md:gap-16">
                {LINKS.map((link) => {
                  const icon = <Image src={link.icon} alt="" width={63} height={63} unoptimized className={`absolute top-1/2 left-1/2 max-w-none -translate-1/2 ${link.box} max-md:scale-[0.64]`} />;
                  return (
                    <li key={link.label} data-pop>
                      {link.href ? (
                        <a
                          href={link.href}
                          aria-label={link.label}
                          data-magnetic="10"
                          target={link.href.startsWith("http") ? "_blank" : undefined}
                          rel="noreferrer"
                          className={`${round} hover:bg-midnight-400`}
                        >
                          {icon}
                        </a>
                      ) : (
                        <span aria-hidden className={`${round} opacity-60`}>
                          {icon}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>

              <div className="absolute top-84 left-910 h-534 w-418 max-md:relative max-md:inset-auto max-md:mx-auto max-md:mt-48 max-md:w-[calc(var(--s)*330)] max-md:h-[calc(var(--s)*450)]">
                <div
                  data-portrait
                  className="absolute top-24 left-31 h-486 w-387 overflow-hidden rounded-[calc(var(--s)*43.7)] border-[calc(var(--s)*2.2)] border-base-200 bg-midnight-950 max-md:inset-x-0 max-md:top-24 max-md:bottom-0 max-md:h-auto max-md:w-auto"
                >
                  {/* 520 design px wide on every screen: wider than its frame on phones. */}
                  <Picture
                    src="/figma/about/portrait.webp"
                    alt={t.portrait}
                    width={520}
                    height={520}
                    preload
                    sizes="(max-width: 1023px) 121vw, (min-width: 1440px) 520px, 36vw"
                    className="absolute -top-36 left-1/2 size-520 max-w-none -translate-x-1/2 opacity-80"
                  />
                </div>
                <div data-spark className="absolute top-0 left-3 h-51 w-58">
                  <Deco src="/figma/experiences/sparks-top.svg" width={70} height={62} className="inset-0" bleed="-10.83% -9.46%" />
                </div>
                <div data-spark className="absolute top-475 left-0 flex h-58 w-51 items-center justify-center max-md:top-auto max-md:-bottom-30">
                  <div className="relative h-51 w-58 flex-none -rotate-90">
                    <Deco src="/figma/experiences/sparks-bottom.svg" width={70} height={62} className="inset-0" bleed="-10.83% -9.46%" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section aria-label={t.history} className="relative">
            <div data-curve aria-hidden className="absolute inset-x-0 top-0 h-201 rounded-tr-[calc(var(--s)*1000)] bg-midnight-900 max-md:h-120" />
            <div aria-hidden className="absolute inset-x-0 top-200 -bottom-1 bg-midnight-900 max-md:top-119" />
            <div className="relative mx-auto w-1240 pt-170 pb-200 max-md:w-full max-md:px-20 max-md:pt-110 max-md:pb-96">
              <p data-lines className="w-980 text-h4 font-semibold text-midnight-50 max-md:w-full">
                {about}
              </p>
              {/* The same timeline as the home page's Career section, in full. */}
              {careerDetail.map((group, i) => (
                <div key={group.id} aria-labelledby={`${group.id}-title`} role="group" className={i ? "mt-140 max-md:mt-80" : "mt-100 max-md:mt-64"}>
                  <Heading barTop="0.875em">
                    <span id={`${group.id}-title`}>{group.heading}</span>
                  </Heading>
                  <TailoredCareerList roles={group.roles} links={allLinks.slice(starts[i], starts[i] + group.roles.length)} lines={lines} className="mt-48 max-md:mt-28" />
                </div>
              ))}
            </div>
          </section>
        </main>
      </SectionMotion>
      <Footer />
    </>
  );
}

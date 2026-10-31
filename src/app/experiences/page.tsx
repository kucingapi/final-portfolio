import type { Metadata } from "next";
import Image from "next/image";
import { Deco, Heading } from "@/components/ui";
import { SectionMotion } from "@/components/motion/SectionMotion";
import { Footer } from "@/components/sections/Footer";
import { about, experiences, mailHref, site, telHref } from "@/content/site";

export const metadata: Metadata = {
  title: "Experiences",
  description: `Education, leadership and professional experience of ${site.name}.`,
};

const LINKS = [
  { label: "GitHub", href: site.social.github, icon: "/figma/icons/github-large.svg", box: "size-63" },
  { label: "Upwork", href: site.social.upwork, icon: "/figma/icons/upwork.svg", box: "h-44 w-63" },
  { label: "Email", href: mailHref, icon: "/figma/icons/mail-large.svg", box: "size-63" },
  { label: "Phone", href: telHref, icon: "/figma/icons/phone-large.svg", box: "size-63" },
];

const round = "relative block size-100 shrink-0 rounded-full bg-midnight-500 transition-colors max-md:size-64";

/** Experiences page (Figma 317:462). */
export default function ExperiencesPage() {
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
                  <span data-subline>Freelance &amp; Full-time</span>
                </p>
              </div>

              <div className="absolute top-455 left-97 max-md:static max-md:mt-24">
                <a
                  data-pop
                  data-magnetic="8"
                  href={site.resumeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-full border-2 border-midnight-50 px-32 py-12 text-h4 font-semibold text-midnight-50 transition-colors hover:bg-midnight-50 hover:text-midnight-950"
                >
                  Resume
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
                  <Image
                    src="/figma/about/portrait.png"
                    alt="Portrait of Novel Bafagih"
                    width={520}
                    height={520}
                    priority
                    sizes="(max-width: 768px) 80vw, 30vw"
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

          <section aria-labelledby="about-title" className="relative">
            <div data-curve aria-hidden className="absolute inset-x-0 top-0 h-201 rounded-tr-[calc(var(--s)*1000)] bg-midnight-900 max-md:h-120" />
            <div aria-hidden className="absolute inset-x-0 top-200 -bottom-1 bg-midnight-900 max-md:top-119" />
            <div className="relative mx-auto flex w-1240 flex-col items-center pt-64 pb-220 max-md:w-full max-md:px-20 max-md:pt-48 max-md:pb-96">
              <Heading className="relative" barLeft="-0.16em" barRight="-0.16em">
                <span id="about-title">About</span>
              </Heading>
              <p data-lines className="relative mt-41 text-h4 font-semibold text-justify text-midnight-100 max-md:mt-24 max-md:text-left">
                {about}
              </p>

              <div className="relative mt-16 max-md:mt-56">
                <Heading barLeft="-0.03em" barRight="-0.03em">
                  Experiences
                </Heading>
              </div>

              <div className="relative mt-53 grid w-full grid-cols-3 gap-40 max-md:mt-32 max-md:grid-cols-1 max-md:gap-48">
                {experiences.map((column) => (
                  <div key={column.heading} data-column className="flex flex-col">
                    <div className="flex justify-center">
                      <Heading as="h3" size="text-h3" barTop="0.64em" barHeight="0.69em" barLeft="-0.1em" barRight="-0.1em">
                        {column.heading}
                      </Heading>
                    </div>
                    <ul className="mt-30 flex flex-col gap-10 text-midnight-50 max-md:mt-20">
                      {column.items.map((item, i) => (
                        <li key={i} data-entry className="flex flex-col">
                          <span className="text-h4 font-semibold">{item.title}</span>
                          <span className="text-lead font-semibold">{item.org}</span>
                          {item.detail && <span className="text-lead font-semibold">{item.detail}</span>}
                          <span className="text-body">{item.period}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </SectionMotion>
      <Footer />
    </>
  );
}

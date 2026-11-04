import Image from "next/image";
import { SectionMotion } from "@/components/motion/SectionMotion";
import { Logo } from "@/components/Navbar";
import { mailto } from "@/content/site";
import { getSiteContent } from "@/lib/content/read";

/** Footer (Figma 270:3045). */
export async function Footer() {
  const { site } = await getSiteContent();
  const mailHref = mailto(site.email);
  const ICONS = [
    { key: "github", label: "GitHub", src: "/figma/icons/github.svg", href: site.social.github },
    { key: "linkedin", label: "LinkedIn", src: "/figma/icons/linkedin.svg", href: site.social.linkedin },
    { key: "instagram", label: "Instagram", src: "/figma/icons/instagram.svg", href: site.social.instagram },
    { key: "mail", label: "Email", src: "/figma/icons/mail.svg", href: mailHref },
  ];
  return (
    <SectionMotion preset="footer">
      <footer data-node-id="270:3045" className="relative overflow-clip bg-midnight-600">
        <div className="relative mx-auto h-315 w-1440 max-md:h-auto max-md:w-full max-md:px-20 max-md:py-48">
          <div className="absolute top-59 left-100 max-md:static">
            <div data-footer-item>
              <Logo />
            </div>
            <div className="mt-13 ml-3 flex flex-col gap-11 text-body text-white max-md:mt-20">
              <p data-footer-item>Handcrafted by {site.name}</p>
              <p data-footer-item>{site.location}</p>
              <a data-footer-item href={mailHref} className="hover:underline">
                {site.email}
              </a>
              <ul data-footer-item className="flex w-157 items-start justify-between">
                {ICONS.map((icon) => {
                  const img = <Image src={icon.src} alt="" width={22} height={22} unoptimized className="size-22" />;
                  return (
                    <li key={icon.key}>
                      {icon.href ? (
                        <a
                          href={icon.href}
                          aria-label={icon.label}
                          target={icon.href.startsWith("http") ? "_blank" : undefined}
                          rel="noreferrer"
                          className="block transition-transform hover:-translate-y-2"
                        >
                          {img}
                        </a>
                      ) : (
                        <span aria-hidden className="block opacity-60">
                          {img}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
          <div data-block aria-hidden className="absolute -top-4 left-537 h-319 w-903 bg-midnight-950 max-md:hidden" />
        </div>
      </footer>
    </SectionMotion>
  );
}

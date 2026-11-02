import path from "node:path";
import type { ReactNode } from "react";
// `Image as PdfImg`: the lint rule for HTML <img> alt text would flag it, and a PDF image has no alt.
import { Document, Font, Image as PdfImg, Link, Page, Path, StyleSheet, Svg, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/stylesheet";
import { about, site } from "@/content/site";
import { projects as allProjects, type Chapter, type Project } from "@/content/projects";
import type { ResolvedCv, Variant } from "@/lib/cv/variant";
import { pdfImage, type PdfImage } from "./images";

/**
 * The portfolio as a PDF deck, in the site's look: 16:9 slides, the Midnight palette, Cabin, the
 * highlight bar under headings. It shows three projects, the first three in the variant's order, so
 * a tailored link hands out a deck that leads with the work that matters for that application.
 */

const FONTS = path.join(process.cwd(), "src/lib/portfolio/fonts");
Font.register({
  family: "Cabin",
  fonts: [400, 500, 600, 700].map((fontWeight) => ({
    src: path.join(FONTS, `cabin-${fontWeight}.woff`),
    fontWeight,
  })),
});

const W = 960;
const H = 540;
const PAD_X = 56;
const PAD_Y = 48;

const C = {
  night: "#010326", // midnight-950, the site's background
  panel: "#0411ab", // midnight-900
  brand: "#0017ff", // midnight-600
  accent: "#4571ff", // midnight-400, the highlight bar
  text: "#e5f0ff", // midnight-50
  soft: "#d0e3ff", // midnight-100
  muted: "#abcbff", // midnight-200
};

const s = StyleSheet.create({
  page: {
    paddingTop: PAD_Y,
    paddingHorizontal: PAD_X,
    paddingBottom: 20,
    backgroundColor: C.night,
    color: C.text,
    fontFamily: "Cabin",
    fontSize: 10.5,
    lineHeight: 1.45,
  },
  brandPage: { backgroundColor: C.brand },
  body: { flexGrow: 1, position: "relative" },
  footer: { marginTop: 14, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 8, lineHeight: 1.2, color: C.muted },
  label: {
    fontSize: 8.5,
    fontWeight: 600,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: C.muted,
  },
  lead: { fontSize: 13, lineHeight: 1.45, color: C.soft },
  para: { marginTop: 8, fontSize: 11.5, color: C.soft },
  link: { color: C.text, textDecoration: "none" },
  chip: {
    borderWidth: 1,
    borderColor: C.accent,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 9,
    marginRight: 6,
    marginBottom: 6,
    fontSize: 8.5,
    color: C.soft,
  },
});

/** No hyphenation: words stay whole, as on the site. */
const whole = (word: string) => [word];

function T({ style, children }: { style?: Style | Style[]; children: ReactNode }) {
  return (
    <Text style={style} hyphenationCallback={whole}>
      {children}
    </Text>
  );
}

/** A heading with the site's highlight bar across the lower half of the glyphs. One line only. */
function Heading({ children, size = 40, bar = C.accent }: { children: string; size?: number; bar?: string }) {
  return (
    <View style={{ alignSelf: "flex-start", position: "relative" }}>
      <View
        style={{
          position: "absolute",
          left: -size * 0.12,
          right: -size * 0.25,
          top: size * 0.62,
          height: size * 0.5,
          backgroundColor: bar,
          borderTopRightRadius: size * 0.22,
          borderBottomLeftRadius: size * 0.22,
        }}
      />
      <T
        style={{
          fontSize: size,
          fontWeight: 600,
          lineHeight: 1.15,
          color: C.text,
        }}
      >
        {children}
      </T>
    </View>
  );
}

function Arrow({ size, color }: { size: number; color: string }) {
  return (
    <Svg viewBox="0 0 24 24" style={{ width: size, height: size, marginHorizontal: size * 0.2 }}>
      <Path d="M4 12h15m0 0-6-6m6 6-6 6" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

/** A number like "73 → 85". Cabin has no arrow, so it is drawn. */
function Value({ from, to, size, color = C.text }: { from?: string; to: string; size: number; color?: string }) {
  const text = { fontSize: size, fontWeight: 600, lineHeight: 1.05, color };
  return (
    <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
      {from && <T style={text}>{from}</T>}
      {from && <Arrow size={size * 0.8} color={C.accent} />}
      <T style={text}>{to}</T>
    </View>
  );
}

const splitStat = (value: string) => {
  const [from, to] = value.split("→").map((x) => x.trim());
  return to ? { from, to } : { to: value };
};

/** An image scaled to fit a box, keeping its shape, with rounded corners. */
function Picture({ img, w, h, radius = 12 }: { img: PdfImage; w: number; h: number; radius?: number }) {
  const k = Math.min(w / img.width, h / img.height);
  return (
    <View
      style={{
        width: img.width * k,
        height: img.height * k,
        borderRadius: radius,
        overflow: "hidden",
      }}
    >
      <PdfImg src={img} style={{ width: "100%", height: "100%" }} />
    </View>
  );
}

function Footer({ project, host }: { project?: string; host: string }) {
  return (
    <View style={s.footer}>
      <T style={s.footerText}>{`${site.name} · Portfolio${project ? ` · ${project}` : ""}`}</T>
      <T style={s.footerText}>{host}</T>
    </View>
  );
}

function Slide({
  children,
  brand,
  project,
  footer = true,
  id,
  host,
}: {
  children: ReactNode;
  brand?: boolean;
  project?: string;
  footer?: boolean;
  id?: string;
  host: string;
}) {
  return (
    <Page size={[W, H]} style={brand ? [s.page, s.brandPage] : s.page} id={id}>
      <View style={s.body}>{children}</View>
      {footer ? <Footer project={project} host={host} /> : <View style={{ height: 24 }} />}
    </Page>
  );
}

/* ---------- Choosing what goes in ---------- */

/** The variant's lead projects first, then the site's order; the first three make the deck. */
export function pickProjects(v: Variant = {}, count = 3): Project[] {
  const lead = (v.projects ?? []).map((slug) => allProjects.find((p) => p.slug === slug)).filter((p): p is Project => Boolean(p));
  return [...lead, ...allProjects.filter((p) => !lead.includes(p))].slice(0, count);
}

const weight = (c: Chapter) => (c.figure && c.shot ? 3 : c.shot || c.figure || c.bars ? 2 : 0);

/** The chapter that opens the story, then the two with the most to show, in reading order. */
export function pickChapters(p: Project, count = 3): Chapter[] {
  const [first, ...rest] = p.chapters;
  const best = rest
    .map((c, i) => ({ c, i }))
    .sort((a, b) => weight(b.c) - weight(a.c) || a.i - b.i)
    .slice(0, count - 1)
    .sort((a, b) => a.i - b.i)
    .map(({ c }) => c);
  return [first, ...best];
}

/* ---------- Slides ---------- */

type Links = { site: string; project: (slug: string) => string; host: string };

function Cover({ cv, photo, picks, links }: { cv: ResolvedCv; photo: PdfImage | null; picks: Project[]; links: Links }) {
  const D = 380;
  return (
    <Slide host={links.host} footer={false}>
      {/* The circle reveal, from the site: a disc with the photo inside and a ring around it. */}
      <View
        style={{
          position: "absolute",
          right: -PAD_X + 40,
          top: -PAD_Y + 60,
          width: D + 40,
          height: D + 40,
          borderRadius: 999,
          borderWidth: 2,
          borderColor: C.accent,
        }}
      />
      <View
        style={{
          position: "absolute",
          right: -PAD_X + 60,
          top: -PAD_Y + 80,
          width: D,
          height: D,
          borderRadius: 999,
          overflow: "hidden",
          backgroundColor: C.brand,
        }}
      >
        {photo && (
          <PdfImg
            src={photo}
            style={{
              width: D,
              height: (D * photo.height) / photo.width,
              marginTop: -D * 0.12,
            }}
          />
        )}
      </View>

      <View style={{ width: 470, flexGrow: 1, justifyContent: "space-between" }}>
        <T style={s.label}>Portfolio · {new Date().getFullYear()}</T>
        <View>
          <T
            style={{
              fontSize: 20,
              fontWeight: 500,
              color: C.muted,
              marginBottom: 6,
            }}
          >
            {cv.headline}
          </T>
          <Heading size={58}>{cv.name}</Heading>
          <T style={[s.lead, { marginTop: 22, width: 400 }]}>
            Three projects, told by what changed: the problem, what I built, and what it did.
          </T>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 16 }}>
            {picks.map((p) => (
              <Link key={p.slug} src={`#${p.slug}`} style={{ textDecoration: "none" }}>
                <T style={s.chip}>{p.title}</T>
              </Link>
            ))}
          </View>
        </View>
        <T style={{ fontSize: 10, color: C.muted }}>
          <Link src={`mailto:${cv.email}`} style={s.link}>
            {cv.email}
          </Link>
          {"   ·   "}
          <Link src={links.site} style={s.link}>
            {links.host}
          </Link>
        </T>
      </View>
    </Slide>
  );
}

function About({ cv, links }: { cv: ResolvedCv; links: Links }) {
  const profiles = [
    { label: "GitHub", href: site.social.github },
    { label: "LinkedIn", href: site.social.linkedin },
    { label: "Upwork", href: site.social.upwork },
  ].filter((l) => l.href);
  return (
    <Slide host={links.host}>
      <View style={{ flexDirection: "row", gap: 48, flexGrow: 1 }}>
        <View style={{ width: 430 }}>
          <T style={s.label}>About me</T>
          <View style={{ marginTop: 10 }}>
            <Heading size={36}>Hi, I’m Novel</Heading>
          </View>
          <T style={[s.lead, { marginTop: 18 }]}>{cv.summary ?? about}</T>
          <T style={[s.para, { marginTop: 14 }]}>{cv.location}.</T>
          <View style={{ flexDirection: "row", marginTop: 18 }}>
            {profiles.map((l) => (
              <Link key={l.label} src={l.href} style={{ textDecoration: "none" }}>
                <T style={s.chip}>{l.label}</T>
              </Link>
            ))}
            <Link src={links.site} style={{ textDecoration: "none" }}>
              <T style={s.chip}>{links.host}</T>
            </Link>
          </View>
        </View>
        <View
          style={{
            flex: 1,
            backgroundColor: C.panel,
            borderRadius: 16,
            padding: 24,
          }}
        >
          <T style={s.label}>Skills</T>
          {cv.skills.map((g) => (
            <View key={g.id} style={{ marginTop: 12 }}>
              <T style={{ fontSize: 10.5, fontWeight: 600, color: C.text }}>{g.label}</T>
              <T style={{ fontSize: 10, color: C.soft, marginTop: 2 }}>{g.items.join(" · ")}</T>
            </View>
          ))}
        </View>
      </View>
    </Slide>
  );
}

function Contents({ picks, links }: { picks: Project[]; links: Links }) {
  return (
    <Slide host={links.host}>
      <T style={s.label}>Selected work</T>
      <View style={{ marginTop: 10 }}>
        <Heading size={36}>Three projects</Heading>
      </View>
      <View style={{ flexDirection: "row", gap: 16, marginTop: 30, flexGrow: 1 }}>
        {picks.map((p, i) => {
          const stat = splitStat(p.stat.value);
          return (
            <Link key={p.slug} src={`#${p.slug}`} style={{ flex: 1, textDecoration: "none", color: C.text }}>
              <View
                style={{
                  flexGrow: 1,
                  backgroundColor: C.panel,
                  borderRadius: 16,
                  padding: 22,
                  justifyContent: "space-between",
                }}
              >
                <View>
                  <T style={{ fontSize: 11, fontWeight: 600, color: C.accent }}>{String(i + 1).padStart(2, "0")}</T>
                  <T
                    style={{
                      fontSize: 22,
                      fontWeight: 600,
                      lineHeight: 1.15,
                      marginTop: 8,
                    }}
                  >
                    {p.title}
                  </T>
                  <T style={{ fontSize: 9.5, color: C.muted, marginTop: 4 }}>
                    {p.kind} · {p.year}
                  </T>
                  <T style={{ fontSize: 10, color: C.soft, marginTop: 12 }}>{p.summary}</T>
                </View>
                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: C.accent,
                    paddingTop: 12,
                    marginTop: 12,
                  }}
                >
                  <Value from={stat.from} to={stat.to} size={26} />
                  <T style={{ fontSize: 9.5, color: C.muted, marginTop: 4 }}>{p.stat.label}</T>
                </View>
              </View>
            </Link>
          );
        })}
      </View>
    </Slide>
  );
}

function Opener({ p, n, img, links }: { p: Project; n: number; img: PdfImage | null; links: Links }) {
  const stat = splitStat(p.stat.value);
  const meta = [
    { k: "Client", v: p.client },
    { k: "Role", v: p.role },
    { k: "When", v: p.period },
    { k: "What", v: `${p.kind}, ${p.platform.toLowerCase()}` },
  ];
  return (
    <Slide host={links.host} brand project={p.title} id={p.slug}>
      <View style={{ flexDirection: "row", gap: 40, flexGrow: 1 }}>
        <View style={{ width: 400, justifyContent: "space-between" }}>
          <View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <T style={[s.label, { color: C.soft }]}>Case study {String(n).padStart(2, "0")}</T>
              {p.status && (
                <T
                  style={[
                    s.chip,
                    {
                      borderColor: C.text,
                      marginLeft: 10,
                      marginBottom: 0,
                      fontSize: 7.5,
                    },
                  ]}
                >
                  {p.status.label}
                </T>
              )}
            </View>
            <View style={{ marginTop: 10 }}>
              <Heading size={p.title.length > 16 ? 30 : 40} bar={C.night}>
                {p.title}
              </Heading>
            </View>
            {p.fullName && <T style={{ fontSize: 11, color: C.soft, marginTop: 6 }}>{p.fullName}</T>}
            <T style={[s.lead, { marginTop: 14, color: C.text }]}>{p.summary}</T>
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 16 }}>
              {meta.map((m) => (
                <View key={m.k} style={{ width: "50%", marginBottom: 8, paddingRight: 8 }}>
                  <T style={[s.label, { color: C.soft, fontSize: 7.5 }]}>{m.k}</T>
                  <T style={{ fontSize: 10, marginTop: 1 }}>{m.v}</T>
                </View>
              ))}
            </View>
          </View>
          <View>
            <Value from={stat.from} to={stat.to} size={34} />
            <T style={{ fontSize: 10, color: C.soft, marginTop: 4 }}>{p.stat.label}</T>
          </View>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          {img ? (
            <Picture img={img} w={W - 2 * PAD_X - 440} h={H - 2 * PAD_Y - 60} radius={16} />
          ) : (
            <View
              style={{
                width: "100%",
                flexGrow: 1,
                backgroundColor: C.night,
                borderRadius: 16,
                padding: 30,
                justifyContent: "center",
              }}
            >
              <Value from={stat.from} to={stat.to} size={72} />
              <T style={{ fontSize: 13, color: C.soft, marginTop: 10 }}>{p.stat.label}</T>
            </View>
          )}
        </View>
      </View>
      <Link
        src={links.project(p.slug)}
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          fontSize: 9.5,
          color: C.text,
          textDecoration: "none",
        }}
      >
        <T>Read the full case study on the site ›</T>
      </Link>
    </Slide>
  );
}

function Overview({ p, links }: { p: Project; links: Links }) {
  return (
    <Slide host={links.host} project={p.title}>
      <View style={{ flexDirection: "row", gap: 48, flexGrow: 1 }}>
        <View style={{ flex: 1 }}>
          <Heading size={26}>The project</Heading>
          {p.intro.map((t, i) => (
            <T key={i} style={[s.para, i === 0 ? { marginTop: 14 } : {}]}>
              {t}
            </T>
          ))}
          {p.status && <T style={[s.para, { color: C.muted }]}>{p.status.note}</T>}
          <T style={[s.label, { marginTop: 20 }]}>Built with</T>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
            {p.stack.map((x) => (
              <T key={x} style={s.chip}>
                {x}
              </T>
            ))}
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Heading size={26}>My part</Heading>
          {p.part.map((t, i) => (
            <T key={i} style={[s.para, i === 0 ? { marginTop: 14 } : {}]}>
              {t}
            </T>
          ))}
          {p.method && (
            <View
              style={{
                marginTop: 16,
                borderLeftWidth: 2,
                borderLeftColor: C.accent,
                paddingLeft: 12,
              }}
            >
              <T style={s.label}>How it was built</T>
              <T style={{ marginTop: 4, color: C.soft, fontSize: 10.5 }}>{p.method}</T>
            </View>
          )}
          <View style={{ marginTop: 16 }}>
            {[{ label: "The full case study", href: links.project(p.slug) }, ...(p.links ?? [])].map((l) => (
              <Link
                key={l.href}
                src={l.href}
                style={{
                  textDecoration: "none",
                  color: C.accent,
                  fontSize: 10,
                  marginTop: 3,
                }}
              >
                <T>{l.label} ›</T>
              </Link>
            ))}
          </View>
        </View>
      </View>
    </Slide>
  );
}

function ChapterSlide({ p, c, n, of, img, links }: { p: Project; c: Chapter; n: number; of: number; img: PdfImage | null; links: Links }) {
  const visual = Boolean(img || c.figure || c.bars);
  const side = W - 2 * PAD_X - 420 - 40;
  return (
    <Slide host={links.host} project={p.title}>
      <View style={{ flexDirection: "row", gap: 40, flexGrow: 1 }}>
        <View style={{ width: 420 }}>
          <T style={s.label}>
            {p.title} · {n} of {of}
          </T>
          <T
            style={{
              fontSize: 24,
              fontWeight: 600,
              lineHeight: 1.15,
              marginTop: 8,
            }}
          >
            {c.title}
          </T>
          <T style={[s.label, { marginTop: 16, color: C.accent }]}>The problem</T>
          <T style={{ marginTop: 3, color: C.soft, fontSize: 11 }}>{c.problem}</T>
          <T style={[s.label, { marginTop: 12, color: C.accent }]}>What I did</T>
          {c.did.map((d, i) => (
            <View key={i} style={{ flexDirection: "row", marginTop: 3 }}>
              <T style={{ width: 12, color: C.accent, fontSize: 11 }}>•</T>
              <T style={{ flex: 1, color: C.soft, fontSize: 11 }}>{d}</T>
            </View>
          ))}
          {visual && (
            <View
              style={{
                marginTop: 12,
                borderLeftWidth: 2,
                borderLeftColor: C.accent,
                paddingLeft: 10,
              }}
            >
              <T style={[s.label, { color: C.accent }]}>Result</T>
              <T style={{ marginTop: 3, fontSize: 11.5, color: C.text }}>{c.result}</T>
            </View>
          )}
        </View>

        <View style={{ width: side, justifyContent: "center" }}>
          {!visual && (
            <View
              style={{
                backgroundColor: C.panel,
                borderRadius: 16,
                padding: 26,
                flexGrow: 1,
                justifyContent: "center",
              }}
            >
              <T style={[s.label, { color: C.soft }]}>Result</T>
              <T
                style={{
                  fontSize: 17,
                  lineHeight: 1.4,
                  fontWeight: 500,
                  marginTop: 8,
                }}
              >
                {c.result}
              </T>
            </View>
          )}
          {c.figure && (
            <View
              style={
                img
                  ? { marginBottom: 16 }
                  : {
                      backgroundColor: C.panel,
                      borderRadius: 16,
                      padding: 30,
                      flexGrow: 1,
                      justifyContent: "center",
                    }
              }
            >
              <Value from={c.figure.from} to={c.figure.to} size={img ? 30 : 60} />
              <T
                style={{
                  fontSize: img ? 10 : 13,
                  color: C.muted,
                  marginTop: 6,
                }}
              >
                {c.figure.label}
              </T>
            </View>
          )}
          {c.bars && (
            <View
              style={{
                backgroundColor: C.panel,
                borderRadius: 16,
                padding: 26,
              }}
            >
              {c.bars.map((b) => (
                <View key={b.label} style={{ marginBottom: 16 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "flex-end",
                    }}
                  >
                    <T style={{ fontSize: 11, fontWeight: 600 }}>{b.label}</T>
                    <T style={{ fontSize: 26, fontWeight: 600, lineHeight: 1 }}>{b.value}%</T>
                  </View>
                  <View
                    style={{
                      height: 10,
                      backgroundColor: C.night,
                      borderRadius: 5,
                      marginTop: 6,
                    }}
                  >
                    <View
                      style={{
                        width: `${Math.max(b.value, 1.5)}%`,
                        height: 10,
                        backgroundColor: C.accent,
                        borderRadius: 5,
                      }}
                    />
                  </View>
                  <T style={{ fontSize: 9, color: C.muted, marginTop: 4 }}>{b.note}</T>
                </View>
              ))}
            </View>
          )}
          {img && (
            <View>
              <Picture img={img} w={side} h={c.figure ? 290 : 360} />
              {c.shot?.caption && <T style={{ fontSize: 8.5, color: C.muted, marginTop: 6 }}>{c.shot.caption}</T>}
            </View>
          )}
        </View>
      </View>
    </Slide>
  );
}

function Contact({ cv, links }: { cv: ResolvedCv; links: Links }) {
  const rows = [
    { k: "Email", v: cv.email, href: `mailto:${cv.email}` },
    { k: "Website", v: links.host, href: links.site },
    {
      k: "GitHub",
      v: site.social.github.replace(/^https:\/\/(www\.)?/, ""),
      href: site.social.github,
    },
    {
      k: "LinkedIn",
      v: site.social.linkedin.replace(/^https:\/\/(www\.)?/, ""),
      href: site.social.linkedin,
    },
    { k: "Upwork", v: "Upwork profile", href: site.social.upwork },
  ].filter((r) => r.href);
  return (
    <Slide host={links.host} brand footer={false}>
      <View
        style={{
          flexDirection: "row",
          gap: 48,
          flexGrow: 1,
          alignItems: "center",
        }}
      >
        <View style={{ width: 430 }}>
          <T style={[s.label, { color: C.soft }]}>Thanks for reading</T>
          <View style={{ marginTop: 10 }}>
            <Heading size={58} bar={C.night}>
              Let’s talk
            </Heading>
          </View>
          <T style={[s.lead, { marginTop: 20, color: C.text }]}>
            Every project here is told in full on my site, with more work besides. If one of them looks like the problem you have, write to
            me.
          </T>
        </View>
        <View
          style={{
            flex: 1,
            backgroundColor: C.night,
            borderRadius: 16,
            padding: 26,
          }}
        >
          {rows.map((r, i) => (
            <View
              key={r.k}
              style={{
                flexDirection: "row",
                paddingVertical: 9,
                borderTopWidth: i ? 1 : 0,
                borderTopColor: C.panel,
              }}
            >
              <T style={[s.label, { width: 80, marginTop: 2 }]}>{r.k}</T>
              <Link src={r.href} style={[s.link, { fontSize: 11.5, fontWeight: 500 }]}>
                <T>{r.v}</T>
              </Link>
            </View>
          ))}
        </View>
      </View>
    </Slide>
  );
}

/* ---------- The deck ---------- */

type Deck = {
  cv: ResolvedCv;
  picks: {
    p: Project;
    opener: PdfImage | null;
    chapters: { c: Chapter; img: PdfImage | null }[];
  }[];
  photo: PdfImage | null;
  links: Links;
};

export function PortfolioDocument({ deck }: { deck: Deck }) {
  const { cv, picks, photo, links } = deck;
  return (
    <Document title={`${cv.name} – Portfolio`} author={cv.name} subject={cv.headline} creator={cv.name} producer={cv.name}>
      <Cover cv={cv} photo={photo} picks={picks.map((x) => x.p)} links={links} />
      <About cv={cv} links={links} />
      <Contents picks={picks.map((x) => x.p)} links={links} />
      {picks.map(({ p, opener, chapters }, i) => [
        <Opener key={`${p.slug}-open`} p={p} n={i + 1} img={opener} links={links} />,
        <Overview key={`${p.slug}-overview`} p={p} links={links} />,
        ...chapters.map(({ c, img }, j) => (
          <ChapterSlide key={`${p.slug}-${c.id}`} p={p} c={c} n={j + 1} of={chapters.length} img={img} links={links} />
        )),
      ])}
      <Contact cv={cv} links={links} />
    </Document>
  );
}

/**
 * Render the deck. `origin` is the site's address, for the links in it; `code` keeps a tailored link's
 * tailoring when the reader follows one back to the site.
 */
export async function renderPortfolioPdf({
  cv,
  variant,
  origin,
  code,
  count = 3,
}: {
  cv: ResolvedCv;
  variant?: Variant;
  origin: string;
  code?: string;
  count?: number;
}): Promise<{ pdf: Uint8Array<ArrayBuffer>; pages: number; expected: number }> {
  const q = code ? `?v=${code}` : "";
  const links: Links = {
    site: `${origin}/${q}`,
    project: (slug) => `${origin}/projects/${slug}${q}`,
    host: origin.replace(/^https?:\/\//, ""),
  };
  const projects = pickProjects(variant, count);
  const [photo, ...picks] = await Promise.all([
    pdfImage("/figma/hero/photo-main.jpg", 800),
    ...projects.map(async (p) => {
      const cover = p.art?.real ?? p.cover?.src ?? p.chapters.find((c) => c.shot)?.shot?.src;
      const chapters = pickChapters(p);
      return {
        p,
        opener: cover ? await pdfImage(cover, 1300) : null,
        chapters: await Promise.all(
          chapters.map(async (c) => ({
            c,
            img: c.shot ? await pdfImage(c.shot.src, 1200) : null,
          })),
        ),
      };
    }),
  ]);
  const deck: Deck = {
    cv,
    picks: picks as Deck["picks"],
    photo: photo as PdfImage | null,
    links,
  };
  const buffer = await renderToBuffer(<PortfolioDocument deck={deck} />);
  const pages = (buffer.toString("latin1").match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
  const expected = 4 + deck.picks.reduce((n, x) => n + 2 + x.chapters.length, 0);
  return { pdf: Uint8Array.from(buffer), pages, expected };
}

import type { ReactNode } from "react";
import { Document, Link, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { ResolvedCv, ResolvedEntry } from "./variant";
import type { CvCourse } from "@/lib/content/schema";
import { UI, type Ui } from "@/lib/i18n/ui";

/**
 * The CV as a real text PDF, laid out like a classic ATS CV: one column, standard headings, the title
 * and dates on one line, plain bullets. Helvetica is a PDF base font, so parsers read every word.
 */

const INK = "#111111";
const MUTED = "#444444";

const s = StyleSheet.create({
  page: { paddingVertical: 36, paddingHorizontal: 44, fontFamily: "Helvetica", fontSize: 9.6, color: INK, lineHeight: 1.3 },
  name: { fontFamily: "Helvetica-Bold", fontSize: 18, lineHeight: 1.15, textAlign: "center" },
  headline: { fontSize: 11, textAlign: "center", marginTop: 4 },
  contact: { fontSize: 9.4, textAlign: "center", marginTop: 4, color: MUTED },
  link: { color: INK, textDecoration: "none" },
  proof: { fontFamily: "Helvetica", color: MUTED, textDecoration: "underline" },
  summary: { marginTop: 10 },
  section: { marginTop: 10 },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10.5,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    paddingBottom: 2,
    borderBottomWidth: 0.9,
    borderBottomColor: INK,
    marginBottom: 5,
  },
  entry: { marginBottom: 6 },
  org: { fontFamily: "Helvetica-Bold" },
  row: { flexDirection: "row", justifyContent: "space-between" },
  title: { fontFamily: "Helvetica-Oblique" },
  period: { fontFamily: "Helvetica-Oblique" },
  bullet: { flexDirection: "row", marginTop: 1.5 },
  dot: { width: 10 },
  bulletText: { flex: 1 },
  about: { marginTop: 1 },
  stack: { marginTop: 1.5, paddingLeft: 10 },
  courses: { marginTop: 2.5, paddingLeft: 10, fontFamily: "Helvetica-Bold" },
  course: { paddingLeft: 10 },
  skill: { marginTop: 1.5 },
  bold: { fontFamily: "Helvetica-Bold" },
});

function Bullet({ children, style }: { children: ReactNode; style?: typeof s.course }) {
  return (
    <View style={style ? [s.bullet, style] : s.bullet} wrap={false}>
      <Text style={s.dot}>•</Text>
      <Text style={s.bulletText}>{children}</Text>
    </View>
  );
}

/** "Web-Based Application Development (A, 4 credits): built …", the title in bold. */
function Course({ c, t }: { c: CvCourse; t: Ui["cv"] }) {
  return (
    <Bullet style={s.course}>
      <Text style={s.bold}>{c.title}</Text> ({t.courseGrade(c.grade, c.credits)}): {c.text}
    </Bullet>
  );
}

/** Page numbers seen while laying out, keyed "title:<section>" and "entry:<section>". */
type Probe = Map<string, number>;

/** An invisible marker that records the page it lands on. */
function Mark({ probe, id }: { probe?: Probe; id: string }) {
  if (!probe) return null;
  return (
    <Text
      style={{ fontSize: 0.1 }}
      render={({ pageNumber }) => {
        probe.set(id, pageNumber);
        return "";
      }}
    />
  );
}

function Entry({ e, mark, origin, t }: { e: ResolvedEntry; mark?: ReactNode; origin?: string; t: Ui["cv"] }) {
  const [first, ...rest] = e.bullets;
  const [firstCourse, ...moreCourses] = e.courses;
  return (
    <View style={s.entry}>
      {/* The header never ends a page alone: it moves with its first bullet. */}
      <View wrap={false}>
        {mark}
        <Text style={s.org}>
          {e.org}
          {e.place ? ` – ${e.place}` : ""}
          {e.proof && origin && (
            <Text>
              {" | "}
              <Link src={`${origin}${e.proof}`} style={s.proof}>
                {t.certificate}
              </Link>
            </Text>
          )}
        </Text>
        <View style={s.row}>
          <Text style={s.title}>
            {e.title}
            {e.note ? `, ${e.note}` : ""}
            {e.grade ? ` | ${e.grade}` : ""}
          </Text>
          <Text style={s.period}>{e.period}</Text>
        </View>
        {e.about && <Text style={s.about}>{e.about}</Text>}
        {first && <Bullet>{first.text}</Bullet>}
      </View>
      {rest.map((b) => (
        <Bullet key={b.id}>{b.text}</Bullet>
      ))}
      {firstCourse && (
        // The label never ends a page alone either.
        <View wrap={false}>
          <Text style={s.courses}>{t.coursework}</Text>
          <Course c={firstCourse} t={t} />
        </View>
      )}
      {moreCourses.map((c) => (
        <Course key={c.id} c={c} t={t} />
      ))}
      {e.stack && e.stack.length > 0 && (
        <Text style={s.stack} wrap={false}>
          <Text style={s.bold}>{t.tech} </Text>
          {e.stack.join(", ")}
        </Text>
      )}
    </View>
  );
}

/** Name, headline and the contact line; shared with the rate card. `email` and `links` already honour `contact: false`. */
export function CvHeader({ cv }: { cv: Pick<ResolvedCv, "name" | "headline" | "location" | "email" | "links"> }) {
  return (
    <>
      <Text style={s.name}>{cv.name}</Text>
      <Text style={s.headline}>{cv.headline}</Text>
      <Text style={s.contact}>
        {cv.location}
        {cv.email && ` | ${cv.email}`}
        {cv.links.map((l) => (
          <Text key={l.href}>
            {" | "}
            <Link src={l.href} style={s.link}>
              {l.label}
            </Link>
          </Text>
        ))}
      </Text>
    </>
  );
}

/**
 * `breaks` lists sections that start a new page; `probe` records where titles and first entries land,
 * so renderCvPdf can find a title left alone at the foot of a page and render again with a break.
 */
export function CvDocument({ cv, breaks, probe, origin }: { cv: ResolvedCv; breaks?: Set<string>; probe?: Probe; origin?: string }) {
  return (
    <Document title={UI[cv.lang].cv.documentTitle(cv.name)} language={cv.lang} author={cv.name} subject={cv.headline} creator={cv.name} producer={cv.name}>
      <Page size="A4" style={s.page}>
        <CvHeader cv={cv} />
        {cv.summary && <Text style={s.summary}>{cv.summary}</Text>}
        {cv.sections.map((section) => (
          <View key={section.id} style={s.section}>
            {section.id === "skills" ? (
              <View wrap={false}>
                <Text style={s.sectionTitle}>{section.title}</Text>
                {cv.skills.map((g) => (
                  <Text key={g.id} style={s.skill}>
                    <Text style={s.bold}>{g.label}: </Text>
                    {g.items.join(", ")}
                  </Text>
                ))}
              </View>
            ) : (
              <>
                <View break={breaks?.has(section.id)}>
                  <Mark probe={probe} id={`title:${section.id}`} />
                  <Text style={s.sectionTitle}>{section.title}</Text>
                </View>
                {section.entries.map((e, i) => (
                  <Entry key={e.id} e={e} origin={origin} t={UI[cv.lang].cv} mark={i === 0 ? <Mark probe={probe} id={`entry:${section.id}`} /> : undefined} />
                ))}
              </>
            )}
          </View>
        ))}
      </Page>
    </Document>
  );
}

/**
 * Render the PDF and count its pages, so a variant can be checked against the two-page limit. A first
 * pass finds section titles stranded at the foot of a page; if there are any, a second pass moves
 * them to the top of the next one. `origin` turns the certificate links into full URLs; without it they
 * are left out.
 */
export async function renderCvPdf(cv: ResolvedCv, origin?: string): Promise<{ pdf: Uint8Array<ArrayBuffer>; pages: number }> {
  const probe: Probe = new Map();
  let buffer = await renderToBuffer(<CvDocument cv={cv} probe={probe} origin={origin} />);
  const breaks = new Set(
    cv.sections
      .map((sec) => sec.id)
      .filter((id) => (probe.get(`title:${id}`) ?? 0) < (probe.get(`entry:${id}`) ?? 0)),
  );
  if (breaks.size) buffer = await renderToBuffer(<CvDocument cv={cv} breaks={breaks} origin={origin} />);
  const pages = (buffer.toString("latin1").match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
  return { pdf: Uint8Array.from(buffer), pages };
}

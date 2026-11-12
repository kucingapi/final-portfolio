import { Document, Link, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { CvHeader } from "./pdf";
import type { ResolvedRateCard } from "./rate-card";
import type { ResolvedCv } from "./variant";
import { UI } from "@/lib/i18n/ui";

/** One A4 page: the CV's header, a table of formats and prices, the notes. Caps of 12 rows and 8 notes keep it to one page. */

const INK = "#111111";
const MUTED = "#444444";

const s = StyleSheet.create({
  page: { paddingVertical: 36, paddingHorizontal: 44, fontFamily: "Helvetica", fontSize: 10, color: INK, lineHeight: 1.35 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 13, marginTop: 22, marginBottom: 8 },
  row: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: "#bbbbbb" },
  head: { fontFamily: "Helvetica-Bold", borderBottomWidth: 0.9, borderBottomColor: INK },
  format: { flex: 3, paddingRight: 8 },
  duration: { flex: 1.3, paddingRight: 8, color: MUTED },
  rate: { flex: 2, textAlign: "right" },
  notes: { marginTop: 16 },
  note: { flexDirection: "row", marginTop: 3 },
  dot: { width: 10 },
  noteText: { flex: 1 },
  site: { marginTop: 20, color: MUTED },
  link: { color: MUTED, textDecoration: "none" },
});

export async function renderRateCardPdf(cv: ResolvedCv, card: ResolvedRateCard): Promise<Uint8Array<ArrayBuffer>> {
  const t = UI[card.lang].rateCard;
  const site = cv.links[0];
  const buffer = await renderToBuffer(
    <Document title={t.documentTitle(cv.name)} language={card.lang} author={cv.name} subject={cv.headline} creator={cv.name} producer={cv.name}>
      <Page size="A4" style={s.page}>
        <CvHeader cv={cv} />
        <Text style={s.title}>{t.title}</Text>
        <View style={[s.row, s.head]}>
          <Text style={s.format}>{t.format}</Text>
          <Text style={s.duration}>{t.duration}</Text>
          <Text style={s.rate}>{t.rate}</Text>
        </View>
        {card.rows.map((r) => (
          <View key={r.id} style={s.row} wrap={false}>
            <Text style={s.format}>{r.label}</Text>
            <Text style={s.duration}>{r.duration ?? ""}</Text>
            <Text style={s.rate}>
              {r.price} {t.units[r.unit]}
            </Text>
          </View>
        ))}
        {card.notes.length > 0 && (
          <View style={s.notes}>
            {card.notes.map((n) => (
              <View key={n} style={s.note} wrap={false}>
                <Text style={s.dot}>•</Text>
                <Text style={s.noteText}>{n}</Text>
              </View>
            ))}
          </View>
        )}
        {site && (
          <Text style={s.site}>
            <Link src={site.href} style={s.link}>
              {site.label}
            </Link>
          </Text>
        )}
      </Page>
    </Document>,
  );
  return Uint8Array.from(buffer);
}

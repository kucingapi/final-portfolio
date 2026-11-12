import type { RateCard, RateUnit } from "@/lib/content/schema";
import { LOCALES, type Lang } from "@/lib/i18n/lang";
import { UI } from "@/lib/i18n/ui";
import type { Variant } from "./variant";

/**
 * A variant's rate card: the master's formats and notes (src/content/site.ts `rateCard`), picked by id in
 * the variant's order, each with this client's price. Named rate-card, not rates: src/lib/rate.ts is the
 * rate limiter.
 */

export type ResolvedRateCard = {
  lang: Lang;
  currency: string;
  rows: { id: string; label: string; duration?: string; unit: RateUnit; price: string }[];
  notes: string[];
};

/** Errors for ids the master doesn't have and ids listed twice; empty when valid. */
export function checkRates(rateCard: RateCard, rates: NonNullable<Variant["rates"]>): string[] {
  const errors: string[] = [];
  const check = (field: string, ids: string[], known: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (!known.includes(id)) errors.push(`rates.${field}: unknown "${id}" (${known.join(", ")}).`);
      if (seen.has(id)) errors.push(`rates.${field}: "${id}" is listed twice.`);
      seen.add(id);
    }
  };
  check(
    "items",
    rates.items.map((i) => i.id),
    rateCard.formats.map((f) => f.id),
  );
  check(
    "notes",
    rates.notes ?? [],
    rateCard.notes.map((n) => n.id),
  );
  return errors;
}

/** `rateCard` is the master in `lang` (labels and notes translated); unknown ids are skipped. */
export function resolveRateCard(rateCard: RateCard, rates: NonNullable<Variant["rates"]>, lang: Lang): ResolvedRateCard {
  const { currency } = rates;
  const fmt = new Intl.NumberFormat(LOCALES[lang], { style: "currency", currency, maximumFractionDigits: currency === "IDR" ? 0 : 2 });
  const rows = rates.items.flatMap(({ id, price }) => {
    const f = rateCard.formats.find((x) => x.id === id);
    return f ? [{ id, label: f.label, duration: f.duration || undefined, unit: f.unit, price: fmt.format(price) }] : [];
  });
  const notes = (rates.notes ?? []).flatMap((id) => rateCard.notes.find((n) => n.id === id)?.text ?? []);
  return { lang, currency, rows, notes };
}

/** One row per line, for preview_cv. */
export function rateCardToText(r: ResolvedRateCard): string {
  const units = UI[r.lang].rateCard.units;
  return [
    ...r.rows.map((x) => [x.id, x.label, x.duration ?? "", `${x.price} ${units[x.unit]}`].join(" | ")),
    ...r.notes.map((n) => `• ${n}`),
  ].join("\n");
}

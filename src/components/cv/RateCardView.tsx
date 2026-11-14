"use client";

import { useEffect } from "react";
import { useVariant } from "./Variant";
import { track } from "@/lib/analytics";
import type { RateCard } from "@/lib/content/schema";
import { resolveRateCard } from "@/lib/cv/rate-card";
import { localePath } from "@/lib/i18n/lang";
import { useLang, useUi } from "@/lib/i18n/client";

const pill = "inline-flex items-center gap-12 rounded-full px-28 py-12 text-lead font-semibold transition-colors";

/**
 * The rate card of the visitor's tailored link: the master's formats in the link's order, each with its
 * price. A visitor without such a link sees a note instead; there is no public rate card. Each view is
 * counted on the link (the dashboard) and in analytics.
 */
export function RateCardView({ rateCard }: { rateCard?: RateCard }) {
  const { current, loading } = useVariant();
  const lang = useLang();
  const t = useUi().rateCard;
  const rates = current?.variant.rates;
  const code = current?.code;
  const priced = Boolean(rates);

  // Once per code and page load.
  useEffect(() => {
    if (!code || !priced) return;
    track("rate_card_viewed", { v_code: code, lang });
    void fetch(`/api/rate-card?v=${encodeURIComponent(code)}`, { method: "POST", keepalive: true }).catch(() => {});
  }, [code, priced, lang]);

  if (loading) return null;
  if (!rates || !rateCard || !code) {
    return (
      <div className="flex flex-col items-start gap-24">
        <p className="max-w-[60ch] text-lead text-midnight-100">{t.private}</p>
        <a href={localePath(lang, "/")} className={`${pill} border-2 border-midnight-50 text-midnight-50 hover:bg-midnight-50 hover:text-midnight-950`}>
          {t.home}
        </a>
        <a href={localePath(lang, "/?mode=speaker#rate-card")} className={`${pill} bg-midnight-500 text-white hover:bg-midnight-400`}>
          {t.request}
        </a>
      </div>
    );
  }

  const card = resolveRateCard(rateCard, rates, lang);
  return (
    <div className="flex flex-col gap-40 max-md:gap-28">
      <p className="max-w-[60ch] text-lead text-midnight-100">{t.intro}</p>
      <table className="w-full border-collapse text-left text-lead text-midnight-50">
        <thead>
          <tr className="border-b-2 border-midnight-50/60 text-midnight-200">
            <th className="py-16 pr-24 font-semibold">{t.format}</th>
            <th className="py-16 pr-24 font-semibold max-md:hidden">{t.duration}</th>
            <th className="py-16 text-right font-semibold">{t.rate}</th>
          </tr>
        </thead>
        <tbody>
          {card.rows.map((r) => (
            <tr key={r.id} className="border-b border-midnight-50/25 align-baseline">
              <td className="py-20 pr-24">
                {r.label}
                {r.duration && <span className="block text-midnight-200 md:hidden">{r.duration}</span>}
              </td>
              <td className="py-20 pr-24 text-midnight-200 max-md:hidden">{r.duration}</td>
              <td className="py-20 text-right font-semibold tabular-nums">
                {r.price} <span className="font-normal text-midnight-200">{t.units[r.unit]}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {card.notes.length > 0 && (
        <ul className="flex list-disc flex-col gap-8 pl-24 text-lead text-midnight-100">
          {card.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
      <div>
        <a
          href={`/api/rate-card?v=${encodeURIComponent(code)}&lang=${lang}&download=1`}
          onClick={() => track("rate_card_downloaded", { tailored: true, lang })}
          className={`${pill} bg-midnight-50 text-midnight-950 hover:bg-white`}
        >
          {t.download}
        </a>
      </div>
    </div>
  );
}

import { speakerId } from "@/content/id/site";
import { modes as defaultModes, rateCard, speaking } from "@/content/site";
import type { DocContent, DocId, SiteContent, SiteView } from "./schema";

/**
 * Fields added after the site first launched are optional in the schema, so a document published
 * before they existed still parses. Documents are not re-parsed on read, so those fields are filled
 * in from the bundled copy here: the rate card, the speaking list and Speaker / Teacher mode's copy;
 * and the Bahasa for Speaker mode's copy under whatever the stored Bahasa document says.
 */

export function backfillSite(site: SiteContent): SiteContent {
  return {
    ...site,
    modes: { ...site.modes, speaker: site.modes.speaker ?? defaultModes.speaker },
    speaking: site.speaking ?? speaking,
    rateCard: site.rateCard ?? rateCard,
  };
}

export function backfill<D extends DocId>(doc: D, value: DocContent[D]): DocContent[D] {
  if (doc === "site") return backfillSite(value as SiteContent) as DocContent[D];
  if (doc === "bahasa") return { ...value, strings: { ...speakerId, ...(value as DocContent["bahasa"]).strings } } as DocContent[D];
  return value;
}

/** The site document as pages read it, with every added field present. */
export function siteView(site: SiteContent): SiteView {
  return backfillSite(site) as SiteView;
}

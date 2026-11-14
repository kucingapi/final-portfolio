import type { Lang } from "@/lib/i18n/lang";
import type { Device } from "./links";

/** The service a rate card request is saved under; the Inbox labels it instead of a project type. */
export const RATE_CARD = "Rate card";

/** A message sent through the site's forms, as the Inbox shows it. Client-safe (no storage). */
export type Enquiry = {
  id: string;
  at: string;
  service: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  /** A rate card request: the organisation, the event or topic, and the language it was asked in. */
  org?: string;
  event?: string;
  lang?: Lang;
  country?: string;
  device?: Device;
  /** Whether the email copy reached the inbox. */
  emailed: boolean;
};

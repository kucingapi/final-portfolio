import { forget } from "./activity";
import type { Enquiry } from "./enquiry-types";
import { getValue, pushToList, readList, removeFromList, setValue } from "./state";

/**
 * Messages sent through the site's contact form, newest first, kept whether or not the email copy went
 * out, so none is lost when Resend is down or not set up. The dashboard's Inbox reads them; what's newer
 * than the last time the Inbox was opened counts as unread. The latest 500 are kept. Server only.
 */

export type { Enquiry };

const LIST = "dash:enquiries";
const SEEN = "dash:enquiries:seen";
const KEEP = 500;

export async function saveEnquiry(input: Omit<Enquiry, "id" | "at">): Promise<Enquiry> {
  const row: Enquiry = { id: crypto.randomUUID().slice(0, 8), at: new Date().toISOString(), ...input };
  await pushToList(LIST, row, KEEP);
  return row;
}

export const listEnquiries = () => readList<Enquiry>(LIST, KEEP);

export async function deleteEnquiry(id: string) {
  const row = (await listEnquiries()).find((e) => e.id === id);
  if (!row) return false;
  await removeFromList(LIST, row);
  // Its sender and first words are in the feed too; deleting means from there as well.
  await forget(`enquiry:${id}`);
  return true;
}

/** When the Inbox was last opened; anything newer is unread. */
export const lastSeen = () => getValue<string>(SEEN);
export const markSeen = (at = new Date().toISOString()) => setValue(SEEN, at);

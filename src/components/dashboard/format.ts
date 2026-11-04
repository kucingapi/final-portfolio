const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "just now", "12 min ago", "3 h ago", "yesterday", "2 Nov". */
export function ago(iso?: string, now = Date.now()) {
  if (!iso) return "never";
  const at = new Date(iso);
  const diff = now - at.getTime();
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} min ago`;
  const days = Math.round((dayStart(new Date(now)) - dayStart(at)) / 86_400_000);
  if (days === 0) return `${Math.floor(diff / HOUR)} h ago`;
  if (days === 1) return "yesterday";
  return at.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

export const date = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** Feed group headings: "Today", "Yesterday", "Monday 2 November". */
export function dayHeading(iso: string, now = Date.now()) {
  const at = new Date(iso);
  const days = Math.round((dayStart(new Date(now)) - dayStart(at)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return at.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

export function countryName(code?: string) {
  if (!code) return undefined;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The address without its scheme, as people read it. */
export const bare = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

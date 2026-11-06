import type { CareerRole, CvContent, CvEntry } from "@/lib/content/schema";
import type { Variant } from "./variant";

/**
 * How a tailored link reaches the site's career lists (the home page's, in Full-time mode, and the Career
 * page). Each role can stand for an entry of the master CV; the variant's choices for that entry, its
 * title, its lines and its place in the order, then apply to the role too, so the site tells the same
 * story as the CV it sent. Types only from the schema, so the browser half stays small.
 */

/** What a career role can take from its CV entry: the entry's allowed titles and its lines. */
export type RoleLines = Record<string, { titles: string[]; bullets: { id: string; text: string }[] }>;

const orgMatches = (role: Pick<CareerRole, "org">, entry: Pick<CvEntry, "org">) =>
  entry.org === role.org || entry.org.startsWith(`${role.org},`) || entry.org.startsWith(`${role.org} `);

/**
 * The CV entry behind each role in a list (`all` is every role in the same document, to tell when a
 * match is ambiguous), or null. A role's own `cv` wins. Without one, a role whose organisation matches
 * exactly one Experience entry, which no other role in the document claims or matches, is linked to it;
 * education entries are linked by hand only, as their lines are not always about the same thing.
 */
export function linkRoles(roles: CareerRole[], cv: CvContent, all: CareerRole[] = roles): (string | null)[] {
  const ids = new Set(cv.entries.map((e) => e.id));
  const explicit = new Set(all.map((r) => r.cv).filter((id): id is string => Boolean(id && ids.has(id))));
  const matches = (r: CareerRole) => cv.entries.filter((e) => e.section === "experience" && orgMatches(r, e)).map((e) => e.id);
  return roles.map((role) => {
    if (role.cv) return ids.has(role.cv) ? role.cv : null;
    const m = matches(role);
    if (m.length !== 1 || explicit.has(m[0])) return null;
    const rivals = all.filter((r) => r !== role && !r.cv && matches(r).includes(m[0]));
    return rivals.length ? null : m[0];
  });
}

/** The titles and lines of the entries a list links to, for the browser to tailor it with. */
export function roleLines(cv: CvContent, links: (string | null)[]): RoleLines {
  const out: RoleLines = {};
  for (const id of links) {
    const e = id ? cv.entries.find((x) => x.id === id) : undefined;
    if (e) out[e.id] = { titles: e.titles, bullets: e.bullets.map((b) => ({ id: b.id, text: b.text })) };
  }
  return out;
}

/**
 * A career list as a tailored link shows it. A role linked to a CV entry takes the title the variant
 * chose for that entry and, when the variant picked the entry's lines, those lines (in `summary` lists,
 * as many as the role usually shows). Among the linked roles, those the variant's CV includes lead, in
 * its order; roles without an entry stay where they are.
 */
export function tailorRoles(
  roles: CareerRole[],
  links: (string | null)[],
  lines: RoleLines,
  v: Variant,
  summary = false,
): CareerRole[] {
  const shown = roles.map((role, i) => {
    const id = links[i];
    const entry = id ? lines[id] : undefined;
    if (!id || !entry) return role;
    const title = v.titles?.[id];
    const picked = (v.bullets?.[id] ?? [])
      .map((b) => entry.bullets.find((x) => x.id === b)?.text)
      .filter((t): t is string => Boolean(t));
    return {
      ...role,
      role: title && entry.titles.includes(title) ? title : role.role,
      points: picked.length ? (summary ? picked.slice(0, Math.max(1, role.points.length)) : picked) : role.points,
    };
  });
  // Linked roles trade places among themselves: those the CV includes first, in its order, then the
  // others as they were. Roles without an entry keep their place.
  const rank = (i: number) => {
    const k = links[i] && v.entries ? v.entries.indexOf(links[i]) : -1;
    return k < 0 ? Infinity : k;
  };
  const slots = shown.map((_, i) => i).filter((i) => links[i]);
  const linked = [...slots].sort((a, b) => rank(a) - rank(b) || a - b);
  const order = shown.map((_, i) => i);
  slots.forEach((slot, k) => (order[slot] = linked[k]));
  return order.map((i) => shown[i]);
}


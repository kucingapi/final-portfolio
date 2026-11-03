import { getActivity, listVariants } from "@/lib/cv/store";
import { signedIn, unauthorized } from "@/lib/dashboard/auth";
import { createLink, getStats, listLinks } from "@/lib/dashboard/links";

const noStore = { "Cache-Control": "no-store" };

/**
 * Every link in one list: short links with their click totals and clicks per day, and the tailored CV
 * links with their opens and downloads. The CV links are read-only here; the `novel-cv` MCP edits them.
 */
export async function GET(request: Request) {
  if (!(await signedIn(request))) return unauthorized();
  const [links, variants] = await Promise.all([listLinks(), listVariants()]);
  const [stats, activity] = await Promise.all([
    getStats(links.map((l) => l.name)),
    Promise.all(variants.map((v) => getActivity(v.code))),
  ]);
  return Response.json(
    {
      links: links.map((link) => ({ ...link, stats: stats[link.name] })),
      cv: variants.map((v, i) => ({
        code: v.code,
        label: v.label,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
        activity: activity[i],
      })),
    },
    { headers: noStore },
  );
}

/** A new short link: `{ name?, url, note? }`. A blank name gets a random code. */
export async function POST(request: Request) {
  if (!(await signedIn(request))) return unauthorized();
  const body = await request.json().catch(() => null);
  if (typeof body?.url !== "string") return Response.json({ error: "A destination is required." }, { status: 400 });
  try {
    const link = await createLink({ name: body.name, url: body.url, note: body.note });
    return Response.json(link, { status: 201, headers: noStore });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400, headers: noStore });
  }
}

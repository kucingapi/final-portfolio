import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { getProject } from "@/lib/content/read";
import { signedIn, unauthorized } from "@/lib/dashboard/auth";
import { exportImages } from "@/lib/dashboard/export";
import { zip } from "@/lib/dashboard/zip";

/** The site's dark background, behind renders that have transparent corners. */
const MATTE = "#010326";

/**
 * One project's images as a zip, numbered in page order with the cover first, ready to drop into
 * Upwork's or Contra's form. The site keeps WebP; the forms want JPEG or PNG, so each is re-encoded as
 * a high-quality JPEG at up to 2400 px on its long side.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/dashboard/projects/[slug]">) {
  if (!(await signedIn(request))) return unauthorized();
  const { slug } = await ctx.params;
  const project = await getProject(slug);
  if (!project) return Response.json({ error: "No such project." }, { status: 404 });
  const files = await Promise.all(
    exportImages(project).map(async (image) => {
      // A path under public/, or a full URL once images are uploaded elsewhere.
      const source = /^https?:\/\//.test(image.src)
        ? Buffer.from(await (await fetch(image.src)).arrayBuffer())
        : await readFile(path.join(process.cwd(), "public", image.src));
      const data = await sharp(source)
        .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
        .flatten({ background: MATTE })
        .jpeg({ quality: 88, mozjpeg: true })
        .toBuffer();
      return { name: image.name, data };
    }),
  );
  if (!files.length) return Response.json({ error: "This project has no images." }, { status: 404 });
  return new Response(new Uint8Array(zip(files)), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${slug}-images.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}

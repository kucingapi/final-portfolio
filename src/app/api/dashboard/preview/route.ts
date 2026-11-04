import { cookies, draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { signedIn, unauthorized } from "@/lib/dashboard/auth";

/** Read by the site's PreviewBadge, which offers the way out. Not a secret: Draft Mode's own cookie is. */
const PREVIEW_COOKIE = "nb_preview";

/**
 * Opens the site showing the drafts (Next's Draft Mode: every content read returns the draft, see
 * src/lib/content/read.ts), at `?path=`. Only a signed-in dashboard can turn it on; `?exit=1` turns it
 * off for anyone. The path must stay on this site.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = url.searchParams.get("path") ?? "/";
  const path = /^\/(?![/\\])\S*$/.test(raw) ? raw : "/";
  const draft = await draftMode();
  const jar = await cookies();

  if (url.searchParams.has("exit")) {
    draft.disable();
    jar.delete(PREVIEW_COOKIE);
    redirect(path);
  }
  if (!(await signedIn(request))) return unauthorized();
  draft.enable();
  jar.set(PREVIEW_COOKIE, "1", { path: "/", sameSite: "lax", secure: url.protocol === "https:" });
  redirect(path);
}

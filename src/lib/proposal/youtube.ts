/**
 * YouTube video ids. A proposal stores only the id of each unlisted video, so any form Novel pastes
 * (`watch?v=`, `youtu.be/`, `shorts/`, `embed/`) comes down to the same 11 characters. Client-safe.
 */

const ID = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"]);

export const isYouTubeId = (id: string) => ID.test(id);

/** The video id in a YouTube URL, or null for anything that isn't a YouTube video. */
export function youTubeId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split("/").filter(Boolean);
  let id: string | null | undefined;
  if (host === "youtu.be") id = parts[0];
  else if (HOSTS.has(host)) {
    if (parts[0] === "watch") id = url.searchParams.get("v");
    else if (["shorts", "embed", "live", "v"].includes(parts[0])) id = parts[1];
  }
  return id && ID.test(id) ? id : null;
}

/** The thumbnail YouTube serves for a video, shown before its player loads. */
export const thumbnail = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

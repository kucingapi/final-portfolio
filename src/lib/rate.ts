import { countWithin, redis } from "@/lib/kv";

/**
 * Per-visitor request limits for the public endpoints, counted in Upstash. Server only.
 */

/**
 * The visitor's address, as the host's proxy reports it (on Vercel, x-real-ip is set by the platform and
 * can't be forged by the client).
 */
export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return request.headers.get("x-real-ip")?.trim() || forwarded || "unknown";
}

/**
 * Who a limit counts as one sender: an IPv4 address as is, but an IPv6 address by its /64 network. One
 * connection is usually handed a whole /64, so counting single IPv6 addresses would let one machine
 * step through billions of fresh ones.
 */
export function senderKey(ip: string) {
  const v4 = ip.match(/^(?:::ffff:)?(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (v4) return v4[1];
  if (!ip.includes(":")) return ip;
  const bare = ip.replace(/^\[|\](?::\d+)?$/g, "").replace(/%.*$/, "").toLowerCase();
  // Spell out the "::" run of zero groups, then keep the first four groups.
  const [head, tail, extra] = bare.split("::");
  const parts = (s: string | undefined) => (s ? s.split(":") : []);
  const groups =
    tail === undefined ? parts(head) : [...parts(head), ...Array(Math.max(0, 8 - parts(head).length - parts(tail).length)).fill("0"), ...parts(tail)];
  const front = groups.slice(0, 4);
  if (extra !== undefined || front.length < 4 || front.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return bare;
  return `${front.map((g) => parseInt(g, 16).toString(16)).join(":")}::/64`;
}

/**
 * One more request from this visitor under `name`; true once there have been more than `max` within
 * `seconds`. Without Upstash (development) nothing is counted, and if Upstash fails the request goes
 * through: a limit being down must not take the page down with it.
 */
export async function tooMany(name: string, request: Request, max: number, seconds: number) {
  if (!redis) return { over: false, retryAfter: 0 };
  try {
    const { count, ttl } = await countWithin(redis, `${name}:rate:ip:${senderKey(clientIp(request))}`, seconds);
    return { over: count > max, retryAfter: ttl };
  } catch (error) {
    console.error(`[${name}] rate limit unavailable`, error);
    return { over: false, retryAfter: 0 };
  }
}

/**
 * Each CV or portfolio PDF is rendered fresh, so a loop of requests costs real CPU and bandwidth. Both
 * routes share one allowance per visitor, far more than anyone reading or forwarding them needs (an
 * office behind one address included): a 429 with Retry-After past it, null otherwise.
 */
const PDF_PER_VISITOR = 60;
const PDF_WINDOW = 600;

export async function pdfLimited(request: Request): Promise<Response | null> {
  const { over, retryAfter } = await tooMany("pdf", request, PDF_PER_VISITOR, PDF_WINDOW);
  if (!over) return null;
  return new Response("Too many downloads from here. Please try again in a few minutes.", {
    status: 429,
    headers: { "Retry-After": String(Math.max(1, retryAfter)), "Content-Type": "text/plain; charset=utf-8" },
  });
}

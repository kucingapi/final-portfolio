// A stand-in for PostHog's query API (POST /api/projects/:id/query/), answering the dashboard's HogQL
// watch-data query with two viewings for whatever link code it is asked about.
import { createServer } from "node:http";

const port = Number(process.argv[2] ?? 3199);
const stats = (o) => JSON.stringify({ played: true, watched: 0, covered: 0, furthest: 0, position: 0, duration: 120, skipped: [], rewatched: [], ended: false, ...o });

createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const ok = req.method === "POST" && /^\/api\/projects\/4242\/query\/?$/.test(req.url ?? "") && req.headers.authorization === "Bearer phx_e2e_test";
    if (!ok) {
      res.writeHead(req.method === "GET" ? 200 : 403, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: req.method === "GET" }));
    }
    const { query } = JSON.parse(body || "{}");
    const code = query?.values?.code;
    const results = [
      ["viewing-b", 1, stats({ watched: 120, covered: 120, furthest: 120, position: 120, ended: true }), "2026-11-19 09:00:00", "2026-11-19 09:02:00", "0193a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b"],
      ["viewing-b", 2, stats({ watched: 95, covered: 72, furthest: 100, position: 72, skipped: [[30, 50]], rewatched: [[10, 33]] }), "2026-11-19 09:02:05", "2026-11-19 09:04:00", "0193a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b"],
      ["viewing-a", 1, stats({ watched: 15, covered: 15, furthest: 15, position: 15 }), "2026-11-18 10:00:00", "2026-11-18 10:00:15", null],
    ];
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ results: code ? results : [], columns: ["viewing", "video", "stats", "started", "last", "session"] }));
  });
}).listen(port, "127.0.0.1", () => console.log(`mock PostHog on ${port}`));

// Starts `next dev` for the e2e tests. In some environments Next stops a start a second after it is ready,
// to print an upgrade notice, and asks for the command to be run again; so a stop in the first 30 s is
// followed by one more start. The tests wait for the server's address (see playwright.config.ts).
import { spawn } from "node:child_process";
import path from "node:path";

const port = process.argv[2] ?? "3100";
const bin = path.join(process.cwd(), "node_modules", ".bin", "next");

function start(retries) {
  const began = Date.now();
  const server = spawn(bin, ["dev", "-p", port], { stdio: "inherit", env: process.env });
  const stop = (signal) => server.kill(signal);
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  server.on("exit", (code) => {
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
    if (retries > 0 && Date.now() - began < 30_000) start(retries - 1);
    else process.exit(code ?? 0);
  });
}

start(2);

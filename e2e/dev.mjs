// Starts `next dev` for the e2e tests. Next may stop its first start in a while to print an upgrade notice
// (it runs when started again), and that stop comes a second after it is ready, which would pull the
// server out from under the tests. So it is started once on a spare port first, and stopped, then for real.
import { spawn } from "node:child_process";

const port = process.argv[2] ?? "3100";
const next = (p) => spawn("npx", ["next", "dev", "-p", p], { stdio: "inherit", env: process.env });

const prime = next(String(Number(port) + 1000));
await new Promise((done) => {
  const timer = setTimeout(() => {
    prime.kill("SIGTERM");
    done();
  }, 8000);
  prime.on("exit", () => {
    clearTimeout(timer);
    done();
  });
});

const server = next(port);
server.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.kill(signal));

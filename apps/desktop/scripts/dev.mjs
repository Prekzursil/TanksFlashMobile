import { spawn } from "node:child_process";
import { once } from "node:events";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_URL = "http://127.0.0.1:5173";

const here = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(here, "..");
const webDir = path.resolve(desktopDir, "..", "web");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHttpOk(url, timeoutMs) {
  const start = Date.now();
  while (true) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timed out waiting for dev server: ${url}`);
    }
    try {
      const resp = await fetch(url, { method: "GET" });
      if (resp.ok) return;
    } catch {
      // ignore
    }
    await sleep(250);
  }
}

function npmCmd() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

async function stopProcess(child, timeoutMs = 5_000) {
  if (!child || child.killed) return;
  child.kill("SIGTERM");

  const didExit = await Promise.race([
    once(child, "exit").then(() => true),
    sleep(timeoutMs).then(() => false),
  ]);

  if (!didExit) {
    child.kill("SIGKILL");
    await Promise.race([once(child, "exit"), sleep(timeoutMs)]);
  }
}

async function main() {
  const url = process.env.ELECTRON_START_URL || DEFAULT_URL;

  const web = spawn(
    npmCmd(),
    ["run", "dev", "--", "--host", "127.0.0.1", "--port", "5173", "--strictPort"],
    {
      cwd: webDir,
      stdio: "inherit",
      env: { ...process.env, BROWSER: "none" },
    },
  );

  try {
    await waitForHttpOk(url, 60_000);
  } catch (err) {
    await stopProcess(web);
    throw err;
  }

  const electron = spawn(npmCmd(), ["run", "start"], {
    cwd: desktopDir,
    stdio: "inherit",
    env: { ...process.env, ELECTRON_START_URL: url },
  });

  const shutdown = async () => {
    await stopProcess(electron);
    await stopProcess(web);
  };

  process.on("SIGINT", () => {
    shutdown().finally(() => process.exit(130));
  });
  process.on("SIGTERM", () => {
    shutdown().finally(() => process.exit(143));
  });

  const [code] = await once(electron, "exit");
  await stopProcess(web);
  process.exit(typeof code === "number" ? code : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


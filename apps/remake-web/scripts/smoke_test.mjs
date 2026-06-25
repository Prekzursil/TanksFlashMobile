import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

const DEFAULT_URL = "http://127.0.0.1:4174";
const DEFAULT_OUT_DIR = path.join("output", "smoke");
const DEFAULT_TIMEOUT_MS = 60_000;
const SERVER_PROBE_URL = "http://127.0.0.1:4174/";

function log(...parts) {
  console.log("[smoke]", ...parts);
}

function parseArgs(argv) {
  const args = {
    url: null,
    outDir: DEFAULT_OUT_DIR,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    headed: false,
    noServer: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--url" && next) {
      args.url = next;
      i++;
    } else if (arg === "--out-dir" && next) {
      args.outDir = next;
      i++;
    } else if (arg === "--headed") {
      args.headed = true;
    } else if (arg === "--no-server") {
      args.noServer = true;
    }
  }

  return args;
}

function resolveSmokeUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid --url value: ${rawUrl}`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Unsupported URL protocol for smoke test: ${parsed.protocol}`);
  }

  if (parsed.username || parsed.password) {
    throw new Error("URL credentials are not allowed in smoke test target.");
  }

  const allowedHosts = new Set(["127.0.0.1", "localhost", "::1"]);
  if (!allowedHosts.has(parsed.hostname)) {
    throw new Error(`Disallowed smoke test host: ${parsed.hostname}`);
  }

  return parsed.toString();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout(promise, timeoutMs, label) {
  return await Promise.race([
    promise,
    sleep(timeoutMs).then(() => {
      throw new Error(`Timed out: ${label} (${timeoutMs}ms)`);
    }),
  ]);
}

async function waitForHttpOk(url, timeoutMs) {
  const start = Date.now();
  while (true) {
    if (Date.now() - start > timeoutMs) throw new Error(`Timed out waiting for server: ${url}`);
    try {
      const resp = await fetch(url, { method: "GET" });
      if (resp.ok) return;
    } catch {
      // ignore
    }
    await sleep(250);
  }
}

async function deleteDirIfExists(dir) {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

function startPreviewServer() {
  const child = spawn(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["run", "preview", "--", "--host", "127.0.0.1", "--port", "4174", "--strictPort"],
    {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, BROWSER: "none" },
      // Ensure we can kill the entire process group reliably on Linux CI (npm -> vite preview).
      detached: process.platform !== "win32",
    },
  );
  return child;
}

async function stopProcess(child, timeoutMs = 5_000) {
  if (!child) return;
  if (child.exitCode !== null || child.signalCode !== null) return;

  const isWin = process.platform === "win32";
  const killTree = (signal) => {
    try {
      if (!isWin && child.pid) {
        process.kill(-child.pid, signal);
        return;
      }
    } catch {
      // fall back to direct kill below
    }
    try {
      child.kill(signal);
    } catch {
      // ignore
    }
  };

  killTree("SIGTERM");

  const start = Date.now();
  while (child.exitCode === null && child.signalCode === null) {
    if (Date.now() - start > timeoutMs) break;
    await sleep(100);
  }

  if (child.exitCode === null && child.signalCode === null) {
    killTree("SIGKILL");
    const start2 = Date.now();
    while (child.exitCode === null && child.signalCode === null) {
      if (Date.now() - start2 > timeoutMs) break;
      await sleep(100);
    }
  }

  // Ensure our process can exit even if the preview server lingers.
  child.stdout?.removeAllListeners();
  child.stderr?.removeAllListeners();
  child.stdout?.destroy();
  child.stderr?.destroy();
  child.unref?.();
}

function collectOutput(child, limitBytes = 200_000) {
  let buf = "";
  const onData = (chunk) => {
    buf += chunk.toString("utf8");
    if (buf.length > limitBytes) buf = buf.slice(-limitBytes);
  };
  child.stdout?.on("data", onData);
  child.stderr?.on("data", onData);
  return () => buf;
}

async function main() {
  const args = parseArgs(process.argv);
  const url = resolveSmokeUrl(args.url ?? DEFAULT_URL);

  log("Starting", { url, outDir: args.outDir, timeoutMs: args.timeoutMs, noServer: args.noServer });

  await deleteDirIfExists(args.outDir);
  await fs.mkdir(args.outDir, { recursive: true });

  let server = null;
  let getServerLogs = null;
  let browser = null;

  try {
    if (!args.noServer) {
      try {
        await fs.access(path.join("dist", "index.html"));
      } catch {
        throw new Error(
          "Missing production build. Run `npm run build` before running the smoke test.",
        );
      }

      log("Starting preview server…");
      server = startPreviewServer();
      getServerLogs = collectOutput(server);

      const serverExit = once(server, "exit").then(([code, signal]) => ({
        type: "exit",
        code,
        signal,
      }));
      const ready = waitForHttpOk(SERVER_PROBE_URL, args.timeoutMs).then(() => ({ type: "ready" }));
      const result = await Promise.race([ready, serverExit]);
      if (result.type === "exit") {
        throw new Error(
          `Preview server exited before ready (code ${result.code}, signal ${result.signal ?? "none"}).`,
        );
      }
      log("Preview server ready");
    }

    const consoleErrors = [];
    const pageErrors = [];

    log("Launching Chromium…");
    browser = await chromium.launch({
      headless: !args.headed,
      args: ["--use-gl=angle", "--use-angle=swiftshader"],
    });

    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.setDefaultTimeout(args.timeoutMs);
    page.setDefaultNavigationTimeout(args.timeoutMs);
    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      consoleErrors.push({ type: "console.error", text: msg.text() });
    });
    page.on("pageerror", (err) => {
      pageErrors.push({ type: "pageerror", text: String(err) });
    });

    log("Navigating…");
    await withTimeout(
      page.goto(url, { waitUntil: "domcontentloaded", timeout: args.timeoutMs }),
      args.timeoutMs + 5_000,
      `page.goto ${url}`,
    );

    log("Starting game…");
    await page.click("#start-btn");
    await page.waitForTimeout(400);

    /* eslint-disable no-undef -- executed in the browser context via page.evaluate */
    const checks = await withTimeout(
      page.evaluate(() => {
        const hasCanvas = Boolean(document.querySelector("#game-canvas"));
        const hasHud = Boolean(document.querySelector("#hud"));
        const hasAdvanceTime = typeof window.advanceTime === "function";
        const hasRenderHook = typeof window.render_game_to_text === "function";
        const stateText = hasRenderHook ? window.render_game_to_text() : null;
        return { hasCanvas, hasHud, hasAdvanceTime, hasRenderHook, stateText };
      }),
      args.timeoutMs,
      "page.evaluate checks",
    );
    /* eslint-enable no-undef */

    await fs.writeFile(path.join(args.outDir, "state.json"), JSON.stringify(checks, null, 2));
    if (!checks.hasCanvas || !checks.hasHud)
      throw new Error("Missing core UI elements (#game-canvas/#hud).");
    if (!checks.hasAdvanceTime || !checks.hasRenderHook)
      throw new Error("Missing render/advance hooks.");

    log("Capturing screenshot…");
    await page.screenshot({ path: path.join(args.outDir, "screen.png"), fullPage: true });

    await fs.writeFile(
      path.join(args.outDir, "errors.json"),
      JSON.stringify({ consoleErrors, pageErrors }, null, 2),
    );
    if (consoleErrors.length || pageErrors.length) {
      throw new Error(
        `Page had ${consoleErrors.length} console error(s) and ${pageErrors.length} pageerror(s). See errors.json.`,
      );
    }

    log("Smoke test OK");
  } catch (err) {
    if (getServerLogs) {
      await fs.writeFile(path.join(args.outDir, "server.log"), getServerLogs(), "utf8");
    }
    log("Smoke test FAILED:", err?.stack ?? String(err));
    throw err;
  } finally {
    if (browser) {
      log("Closing Chromium…");
      await browser.close().catch(() => {});
    }
    if (server) {
      log("Stopping preview server…");
      await stopProcess(server);
    }
  }
}

await main();

import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

const DEFAULT_URL = "http://127.0.0.1:4173";
const DEFAULT_OUT_DIR = path.join("output", "smoke");
const DEFAULT_TIMEOUT_MS = 30_000;

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
    } else if (arg === "--timeout-ms" && next) {
      args.timeoutMs = Number(next);
      i++;
    } else if (arg === "--headed") {
      args.headed = true;
    } else if (arg === "--no-server") {
      args.noServer = true;
    }
  }

  return args;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHttpOk(url, timeoutMs) {
  const start = Date.now();
  while (true) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timed out waiting for server: ${url}`);
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

async function deleteDirIfExists(dir) {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

function startPreviewServer() {
  // `npm run preview -- --host 127.0.0.1 --port 4173 --strictPort`
  const child = spawn(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["run", "preview", "--", "--host", "127.0.0.1", "--port", "4173", "--strictPort"],
    {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, BROWSER: "none" },
    },
  );

  return child;
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
  const url = args.url ?? DEFAULT_URL;

  await deleteDirIfExists(args.outDir);
  await fs.mkdir(args.outDir, { recursive: true });

  let server = null;
  let getServerLogs = null;

  if (!args.noServer) {
    // Quick sanity: ensure build exists (vite preview expects dist/)
    try {
      await fs.access(path.join("dist", "index.html"));
    } catch {
      throw new Error(
        "Missing production build. Run `npm run build` before running the smoke test.",
      );
    }

    server = startPreviewServer();
    getServerLogs = collectOutput(server);

    server.on("exit", (code) => {
      if (code && code !== 0) {
        // We keep going; waitForHttpOk will time out and report logs.
      }
    });

    try {
      await waitForHttpOk(url, args.timeoutMs);
    } catch (err) {
      const logs = getServerLogs ? getServerLogs() : "";
      await fs.writeFile(path.join(args.outDir, "server.log"), logs);
      throw err;
    }
  }

  const consoleErrors = [];
  const pageErrors = [];

  const browser = await chromium.launch({
    headless: !args.headed,
    args: ["--use-gl=angle", "--use-angle=swiftshader"],
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      consoleErrors.push({ type: "console.error", text: msg.text() });
    });
    page.on("pageerror", (err) => {
      pageErrors.push({ type: "pageerror", text: String(err) });
    });

    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    /* eslint-disable no-undef -- executed in the browser context via page.evaluate */
    const checks = await page.evaluate(() => {
      const status = document.querySelector("#status")?.textContent?.trim() ?? "";
      const hasViewport = Boolean(document.querySelector("#viewport"));
      const hasStage = Boolean(document.querySelector("#stage"));
      const hasRuffle = typeof window.RufflePlayer?.newest === "function";
      const hasRenderHook = typeof window.render_game_to_text === "function";
      const stateText = hasRenderHook ? window.render_game_to_text() : null;
      return { status, hasViewport, hasStage, hasRuffle, hasRenderHook, stateText };
    });
    /* eslint-enable no-undef */

    await fs.writeFile(path.join(args.outDir, "state.json"), JSON.stringify(checks, null, 2));

    if (!checks.hasViewport || !checks.hasStage) {
      throw new Error("Missing core UI elements (#viewport/#stage).");
    }
    if (!checks.status) {
      throw new Error("Status text is empty; expected wrapper to render.");
    }
    if (!checks.hasRuffle) {
      throw new Error("Ruffle runtime not detected (window.RufflePlayer missing).");
    }

    // Enable touch overlay once to ensure the input layer doesn't throw.
    await page.click("#touchEnabled");
    await page.waitForTimeout(200);

    await page.screenshot({ path: path.join(args.outDir, "smoke.png"), fullPage: true });

    // Validate wrapper state if available.
    if (checks.stateText) {
      try {
        const parsed = JSON.parse(checks.stateText);
        if (
          parsed?.loadState === "error" &&
          typeof parsed?.lastError === "string" &&
          !parsed.lastError.includes("Missing SWF") &&
          !parsed.lastError.includes("Could not check SWF")
        ) {
          throw new Error(`Unexpected wrapper error: ${parsed.lastError}`);
        }
      } catch (err) {
        throw new Error(`Invalid wrapper state JSON: ${String(err)}`);
      }
    }

    const allErrors = [...consoleErrors, ...pageErrors];
    if (allErrors.length) {
      await fs.writeFile(path.join(args.outDir, "errors.json"), JSON.stringify(allErrors, null, 2));
      throw new Error(`Console/page errors detected (${allErrors.length}).`);
    }
  } finally {
    await browser.close();
    if (server) {
      await stopProcess(server);
      const logs = getServerLogs ? getServerLogs() : "";
      await fs.writeFile(path.join(args.outDir, "server.log"), logs);
    }
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

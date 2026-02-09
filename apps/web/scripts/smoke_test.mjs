import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

const DEFAULT_URL = "http://127.0.0.1:4173";
const DEFAULT_OUT_DIR = path.join("output", "smoke");
const DEFAULT_TIMEOUT_MS = 60_000;

function log(...parts) {
  // Keep logs minimal but actionable in CI.
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

  log("Starting", { url, outDir: args.outDir, timeoutMs: args.timeoutMs, noServer: args.noServer });

  await deleteDirIfExists(args.outDir);
  await fs.mkdir(args.outDir, { recursive: true });

  let server = null;
  let getServerLogs = null;
  let browser = null;

  try {
    if (!args.noServer) {
      // Quick sanity: ensure build exists (vite preview expects dist/)
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

      const ready = waitForHttpOk(url, args.timeoutMs).then(() => ({ type: "ready" }));
      const result = await Promise.race([ready, serverExit]);

      if (result.type === "exit") {
        throw new Error(
          `Preview server exited before it became ready (code ${result.code}, signal ${result.signal ?? "none"}).`,
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
    await page.waitForTimeout(750);

    // With the SWF bundled, the wrapper should autoload it on startup. This catches cases where
    // CI/release builds accidentally ship without the SWF.
    log("Waiting for SWF autoload…");
    await withTimeout(
      page.waitForFunction(() => {
        if (typeof window.render_game_to_text !== "function") return false;
        try {
          const parsed = JSON.parse(window.render_game_to_text());
          return parsed?.loadState === "ready" || parsed?.loadState === "error";
        } catch {
          return false;
        }
      }),
      Math.min(args.timeoutMs, 20_000),
      "page.waitForFunction SWF autoload",
    );

    /* eslint-disable no-undef -- executed in the browser context via page.evaluate */
    log("Running wrapper checks…");
    const checks = await withTimeout(
      page.evaluate(() => {
        const status = document.querySelector("#status")?.textContent?.trim() ?? "";
        const hasViewport = Boolean(document.querySelector("#viewport"));
        const hasStage = Boolean(document.querySelector("#stage"));
        const hasRuffle = typeof window.RufflePlayer?.newest === "function";
        const hasRenderHook = typeof window.render_game_to_text === "function";
        const stateText = hasRenderHook ? window.render_game_to_text() : null;
        return { status, hasViewport, hasStage, hasRuffle, hasRenderHook, stateText };
      }),
      args.timeoutMs,
      "page.evaluate wrapper checks",
    );
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
    if (checks.stateText) {
      let parsed;
      try {
        parsed = JSON.parse(checks.stateText);
      } catch (err) {
        throw new Error(`Invalid wrapper state JSON: ${String(err)}`);
      }

      if (parsed?.loadState !== "ready") {
        const details =
          typeof parsed?.lastError === "string" && parsed.lastError.trim()
            ? ` (${parsed.lastError})`
            : "";
        throw new Error(`SWF did not autoload: ${String(parsed?.loadState)}${details}`);
      }
    }

    // Enable touch overlay once to ensure the input layer doesn't throw.
    await page.click("#settingsBtn");
    await page.waitForSelector("#settingsDialog[open]", { timeout: 5000 });
    await page.click("#touchEnabled");
    await page.waitForTimeout(200);

    // Exercise UI scale setting once.
    /* eslint-disable no-undef -- executed in the browser context via page.evaluate */
    await page.evaluate(() => {
      const el = document.querySelector("#uiScale");
      if (!(el instanceof HTMLInputElement)) throw new Error("Missing #uiScale range input");
      el.value = "120";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.waitForTimeout(100);

    const uiScale = await page.evaluate(() => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue("--ui-scale").trim();
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : null;
    });
    /* eslint-enable no-undef */
    if (uiScale == null || Math.abs(uiScale - 1.2) > 0.05) {
      throw new Error(`UI scale did not apply (expected ~1.2, got ${String(uiScale)})`);
    }

    // Exercise gamepad settings controls once.
    /* eslint-disable no-undef -- executed in the browser context via page.evaluate */
    await page.evaluate(() => {
      const actionA = document.querySelector("#gamepadActionA");
      if (!(actionA instanceof HTMLSelectElement)) {
        throw new Error("Missing #gamepadActionA select");
      }
      actionA.value = "2";
      actionA.dispatchEvent(new Event("change", { bubbles: true }));

      const deadzone = document.querySelector("#gamepadDeadzone");
      if (!(deadzone instanceof HTMLInputElement)) {
        throw new Error("Missing #gamepadDeadzone range input");
      }
      deadzone.value = "60";
      deadzone.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const gamepadSettings = await page.evaluate(() => {
      const hint = document.querySelector("#gamepadMappingHint")?.textContent?.trim() ?? "";
      return {
        actionA: localStorage.getItem("tanks.gamepadActionAButton"),
        deadzone: localStorage.getItem("tanks.gamepadAxisDeadzone"),
        hint,
      };
    });
    /* eslint-enable no-undef */

    if (gamepadSettings.actionA !== "2") {
      throw new Error(
        `Gamepad Action A mapping did not persist (expected "2", got ${String(gamepadSettings.actionA)})`,
      );
    }
    if (gamepadSettings.deadzone !== "60") {
      throw new Error(
        `Gamepad deadzone did not persist (expected "60", got ${String(gamepadSettings.deadzone)})`,
      );
    }
    if (!gamepadSettings.hint) {
      throw new Error("Gamepad mapping hint did not render.");
    }

    log("Capturing screenshot…");
    await withTimeout(
      page.screenshot({ path: path.join(args.outDir, "smoke.png"), fullPage: true }),
      args.timeoutMs,
      "page.screenshot",
    );

    // Open help dialog and capture it too (ensures it renders and doesn't throw).
    await page.click("#settingsCloseBtn");
    await page.waitForTimeout(100);
    await page.click("#helpBtn");
    await page.waitForSelector("#helpDialog[open]", { timeout: 5000 });
    await page.waitForTimeout(150);
    await withTimeout(
      page.screenshot({ path: path.join(args.outDir, "help.png"), fullPage: true }),
      args.timeoutMs,
      "page.screenshot help",
    );
    await page.click("#helpCloseBtn");
    await page.waitForTimeout(100);

    const allErrors = [...consoleErrors, ...pageErrors];
    if (allErrors.length) {
      await fs.writeFile(path.join(args.outDir, "errors.json"), JSON.stringify(allErrors, null, 2));
      throw new Error(`Console/page errors detected (${allErrors.length}).`);
    }

    log("Smoke test OK");
  } finally {
    if (browser) {
      log("Closing Chromium…");
      await withTimeout(browser.close(), args.timeoutMs, "browser.close");
    }
    if (server) {
      log("Stopping preview server…");
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

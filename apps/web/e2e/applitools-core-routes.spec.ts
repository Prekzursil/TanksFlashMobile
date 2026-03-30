import fs from "node:fs";

import { BatchInfo, Configuration, Eyes, Target } from "@applitools/eyes-playwright";
import { test } from "@playwright/test";
import type { Page } from "@playwright/test";

function numberOrZero(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) return Number(value);
  return 0;
}

function buildConfiguration(): Configuration {
  const configuration = new Configuration();
  configuration.setApiKey(process.env.APPLITOOLS_API_KEY || "");
  configuration.setAppName("TanksFlashMobile");
  configuration.setBatch(
    new BatchInfo(process.env.APPLITOOLS_BATCH_NAME || `TanksFlashMobile-${process.env.GITHUB_SHA || "local"}`),
  );
  configuration.setMatchLevel("Strict");
  return configuration;
}

async function openShell(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.clear();
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition: none !important;
        caret-color: transparent !important;
      }
    `,
  });
  await page.waitForTimeout(250);
}

test("capture wrapper shell states with Applitools", async ({ page }) => {
  test.skip(!process.env.APPLITOOLS_API_KEY, "APPLITOOLS_API_KEY is required");

  const resultsPath = process.env.APPLITOOLS_RESULTS_PATH || "applitools/results.json";
  const eyes = new Eyes();
  eyes.setConfiguration(buildConfiguration());

  await openShell(page);
  await eyes.open(page, "TanksFlashMobile", "wrapper-shell", { width: 1366, height: 900 });

  try {
    await eyes.check("Shell", Target.window().fully());

    await page.getByRole("button", { name: "Help" }).click();
    await page.waitForTimeout(200);
    await eyes.check("Help dialog", Target.window().fully());
    await page.getByRole("button", { name: /^close$/i }).click();

    await page.getByRole("button", { name: "Settings" }).click();
    await page.waitForTimeout(200);
    await eyes.check("Settings dialog", Target.window().fully());

    const closeResult = await eyes.close();
    const payload = {
      unresolved: numberOrZero((closeResult as any)?.getUnresolved?.() ?? (closeResult as any)?.unresolved),
      mismatches: numberOrZero((closeResult as any)?.getMismatches?.() ?? (closeResult as any)?.mismatches),
      missing: numberOrZero((closeResult as any)?.getMissing?.() ?? (closeResult as any)?.missing),
    };

    fs.mkdirSync("applitools", { recursive: true });
    fs.writeFileSync(resultsPath, JSON.stringify(payload, null, 2));

    if (payload.unresolved || payload.mismatches || payload.missing) {
      throw new Error(`Applitools visual diff detected: ${JSON.stringify(payload)}`);
    }
  } finally {
    await eyes.abortIfNotClosed();
  }
});

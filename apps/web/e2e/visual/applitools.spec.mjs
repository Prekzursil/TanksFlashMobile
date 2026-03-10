import { test } from "@playwright/test";
import { BatchInfo, Configuration, Eyes, Target } from "@applitools/eyes-playwright";

import { openHelp, openReadyGame, openSettings } from "./helpers.mjs";

function buildEyesConfiguration() {
  const configuration = new Configuration();
  configuration.setApiKey(process.env.APPLITOOLS_API_KEY || "");
  configuration.setAppName("TanksFlashMobile");
  configuration.setBatch(new BatchInfo(process.env.APPLITOOLS_BATCH_NAME || "GitHub CI"));
  configuration.setMatchLevel("Strict");
  return configuration;
}

test("Applitools Visual: capture web shell states", async ({ page }, testInfo) => {
  test.skip(!process.env.APPLITOOLS_API_KEY, "APPLITOOLS_API_KEY is required for Applitools runs");

  const eyes = new Eyes();
  eyes.setConfiguration(buildEyesConfiguration());

  await eyes.open(page, "TanksFlashMobile Web", testInfo.title, { width: 1280, height: 720 });

  try {
    await openReadyGame(page);
    await eyes.check("Game shell", Target.window().fully());

    await openSettings(page);
    await eyes.check("Settings dialog", Target.window().fully());
    await page.click("#settingsCloseBtn");
    await page.waitForTimeout(100);

    await openHelp(page);
    await eyes.check("Help dialog", Target.window().fully());

    await eyes.close(false);
  } finally {
    await eyes.abortIfNotClosed();
  }
});

import { expect, test } from "@chromatic-com/playwright";

import { openHelp, openReadyGame, openSettings } from "./helpers.mjs";

test("Chromatic Playwright: game shell renders", async ({ page }) => {
  await openReadyGame(page);

  await expect(page.locator("#viewport")).toBeVisible();
  await expect(page.locator("#stage")).toBeVisible();
  await expect(page.locator("#status")).toContainText("Loaded");
});

test("Chromatic Playwright: settings dialog renders", async ({ page }) => {
  await openReadyGame(page);
  await openSettings(page);

  await expect(page.locator("#settingsDialog")).toBeVisible();
  await expect(page.locator("#touchEnabled")).toBeVisible();
  await expect(page.locator("#uiScale")).toBeVisible();
});

test("Chromatic Playwright: help dialog renders", async ({ page }) => {
  await openReadyGame(page);
  await openHelp(page);

  await expect(page.locator("#helpDialog")).toBeVisible();
  await expect(page.getByText("Controls & Tips")).toBeVisible();
});

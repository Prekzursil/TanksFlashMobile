export async function openReadyGame(page) {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    if (typeof globalThis.render_game_to_text !== "function") return false;
    try {
      const parsed = JSON.parse(globalThis.render_game_to_text());
      return parsed?.loadState === "ready" || parsed?.loadState === "error";
    } catch {
      return false;
    }
  });

  const loadState = await page.evaluate(() => {
    const parsed = JSON.parse(globalThis.render_game_to_text());
    return parsed?.loadState ?? null;
  });

  if (loadState !== "ready") {
    throw new Error(`Expected game to autoload successfully, got ${String(loadState)}`);
  }

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

export async function openSettings(page) {
  await page.click("#settingsBtn");
  await page.waitForSelector("#settingsDialog[open]", { timeout: 5000 });
  await page.waitForTimeout(150);
}

export async function openHelp(page) {
  await page.click("#helpBtn");
  await page.waitForSelector("#helpDialog[open]", { timeout: 5000 });
  await page.waitForTimeout(150);
}

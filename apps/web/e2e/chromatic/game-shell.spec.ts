import { expect, test } from '@chromatic-com/playwright';
import type { Page } from '@playwright/test';

async function openShell(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.clear();
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(250);
}

test('wrapper shell renders', async ({ page }) => {
  await openShell(page);
  await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Help' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Load SWF…' })).toBeVisible();
});

test('help dialog renders', async ({ page }) => {
  await openShell(page);
  await page.getByRole('button', { name: 'Help' }).click();
  await expect(page.getByText('Controls & Tips')).toBeVisible();
  await expect(page.getByText(/enable the on-screen overlay/i)).toBeVisible();
});

test('settings dialog renders', async ({ page }) => {
  await openShell(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  const dialog = page.locator('#settingsDialog');
  await expect(dialog.getByText('Settings', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Touch Controls', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Gamepad', { exact: true })).toBeVisible();
});

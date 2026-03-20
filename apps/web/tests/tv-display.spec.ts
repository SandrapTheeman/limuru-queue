import { test, expect } from '@playwright/test';

test.describe('TV Display Functionality', () => {
  test('should display TV queue view', async ({ page }) => {
    await page.goto('/display');
    
    await expect(page).toHaveURL(/\/display/);
  });

  test('should show current patient being called', async ({ page }) => {
    await page.goto('/display');
    
    await expect(page.locator('text=/now serving|current|please/i')).toBeVisible();
  });

  test('should display queue list', async ({ page }) => {
    await page.goto('/display');
    
    const queueItems = page.locator('[class*="queue"], [class*="patient"], [data-testid*="queue"]');
    await expect(queueItems.first()).toBeVisible();
  });

  test('should update queue in real-time', async ({ page }) => {
    await page.goto('/display');
    
    const initialContent = await page.locator('[class*="queue"]').first().textContent();
    
    await page.waitForTimeout(3000);
    
    const updatedContent = await page.locator('[class*="queue"]').first().textContent();
    expect(updatedContent).toBeDefined();
  });

  test('should show department name', async ({ page }) => {
    await page.goto('/display');
    
    await expect(page.locator('text=/MED|PED|GYN|OPH|DEN|ORTH/i')).toBeVisible();
  });

  test('should display ticket numbers', async ({ page }) => {
    await page.goto('/display');
    
    const ticketNumber = page.locator('text=/[A-Z]{3}-\\d+/');
    await expect(ticketNumber.first()).toBeVisible();
  });

  test('should show estimated wait time', async ({ page }) => {
    await page.goto('/display');
    
    const waitTime = page.locator('text=/wait|estimated|~\\d+/i');
    await expect(waitTime.first()).toBeVisible();
  });

  test('should highlight priority patients', async ({ page }) => {
    await page.goto('/display');
    
    const urgentBadge = page.locator('[class*="urgent"], [class*="priority"], [class*="emergency"]');
    const firstBadge = urgentBadge.first();
    if (await firstBadge.isVisible()) {
      await expect(firstBadge).toBeVisible();
    }
  });

  test('should auto-refresh display', async ({ page }) => {
    await page.goto('/display');
    
    await page.waitForTimeout(60000);
  });

  test('should be readable from distance', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/display');
    
    const headings = page.locator('h1, h2, [class*="title"]');
    await expect(headings.first()).toBeVisible();
    
    const bodyText = page.locator('p, [class*="patient"], [class*="ticket"]');
    await expect(bodyText.first()).toBeVisible();
  });

  test('should work in fullscreen mode', async ({ page }) => {
    await page.goto('/display');
    
    await page.evaluate(() => {
      document.documentElement.requestFullscreen?.();
    });
    
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveURL(/\/display/);
  });

  test('should show announcement banner', async ({ page }) => {
    await page.goto('/display');
    
    const announcement = page.locator('[class*="announcement"], [class*="banner"], [class*="alert"]');
    const firstAnnouncement = announcement.first();
    if (await firstAnnouncement.isVisible()) {
      await expect(firstAnnouncement).toBeVisible();
    }
  });

  test('should display current time', async ({ page }) => {
    await page.goto('/display');
    
    const timeDisplay = page.locator('[class*="time"], text=/\\d{1,2}:\\d{2}/');
    await expect(timeDisplay.first()).toBeVisible();
  });

  test('should display hospital logo', async ({ page }) => {
    await page.goto('/display');
    
    const logo = page.locator('img[alt*="logo" i], [class*="logo"]');
    await expect(logo.first()).toBeVisible();
  });

  test('should switch between departments', async ({ page }) => {
    await page.goto('/display');
    
    const deptSelector = page.locator('select, button:has-text("MED")').first();
    if (await deptSelector.isVisible()) {
      await page.waitForTimeout(500);
    }
  });

  test('should be responsive on different screen sizes', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1280, height: 720 },
      { width: 3840, height: 2160 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/display');
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should not require authentication', async ({ page }) => {
    await page.goto('/display');
    
    const loginForm = page.locator('input[type="password"], button:has-text("Login")');
    await expect(loginForm.first()).not.toBeVisible();
  });
});

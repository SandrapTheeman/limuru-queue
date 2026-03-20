import { test, expect } from '@playwright/test';

test.describe('Queue Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/kiosk');
  });

  test('patient check-in flow', async ({ page }) => {
    await expect(page.locator('h1:has-text("Self-Service Kiosk")')).toBeVisible();
    await page.click('button:has-text("General Medicine")');
    await expect(page.locator('h2:has-text("General Medicine")')).toBeVisible();
    await page.fill('input[placeholder="P-XXXXXX"]', 'P-123456');
    await page.click('button:has-text("Get Queue Ticket")');
    await expect(page.locator('text=Ticket Issued Successfully')).toBeVisible();
    await expect(page.locator('text=Your Ticket Number')).toBeVisible();
  });

  test('queue status displays correctly', async ({ page }) => {
    await page.goto('/dashboard/patient');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Patient Portal")')).toBeVisible();
    const ticketElement = page.locator('text=T0025');
    if (await ticketElement.isVisible()) {
      await expect(page.locator('text=Current Visit Status')).toBeVisible();
      await expect(page.locator('text=Queue Position')).toBeVisible();
      await expect(page.locator('text=Estimated Wait')).toBeVisible();
    }
  });

  test('queue display shows all patients', async ({ page }) => {
    await page.goto('/display');
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page.locator('text=T00')).toBeVisible();
  });

  test('get another ticket resets kiosk', async ({ page }) => {
    await page.click('button:has-text("General Medicine")');
    await page.fill('input[placeholder="P-XXXXXX"]', 'P-123456');
    await page.click('button:has-text("Get Queue Ticket")');
    await expect(page.locator('text=Ticket Issued Successfully')).toBeVisible();
    await page.click('button:has-text("Get Another Ticket")');
    await expect(page.locator('h1:has-text("Self-Service Kiosk")')).toBeVisible();
    await expect(page.locator('button:has-text("General Medicine")')).toBeVisible();
  });

  test('back button works on kiosk', async ({ page }) => {
    await page.click('button:has-text("General Medicine")');
    await page.click('button:has-text("Back to Departments")');
    await expect(page.locator('h1:has-text("Self-Service Kiosk")')).toBeVisible();
  });

  test('register as new patient link works', async ({ page }) => {
    await page.click('button:has-text("General Medicine")');
    await page.click('button:has-text("Register as New Patient")');
    await expect(page).toHaveURL(/\/register/);
  });

  test('all departments are displayed', async ({ page }) => {
    const departments = [
      'General Medicine',
      'Cardiology',
      'Orthopedics',
      'Pediatrics',
      'Dermatology',
      'Neurology'
    ];
    for (const dept of departments) {
      await expect(page.locator(`button:has-text("${dept}")`)).toBeVisible();
    }
  });

  test('view queue display link works', async ({ page }) => {
    await page.click('a:has-text("View Queue Display")');
    await expect(page).toHaveURL(/\/display/);
  });
});

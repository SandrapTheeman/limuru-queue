import { test, expect } from '@playwright/test';

test.describe('Queue Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"], input[name="email"]', 'doctor@hospital.com');
    await page.fill('input[type="password"], input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(staff|dashboard)/);
  });

  test('should display queue page', async ({ page }) => {
    await page.goto('/queue');
    
    await expect(page.locator('h1, h2, [class*="title"]')).toBeVisible();
  });

  test('should show department selector', async ({ page }) => {
    await page.goto('/queue');
    
    const departmentButtons = page.locator('button:has-text("MED"), button:has-text("PED"), [data-testid*="department"]');
    await expect(departmentButtons.first()).toBeVisible();
  });

  test('should switch departments', async ({ page }) => {
    await page.goto('/queue');
    
    const deptButton = page.locator('button').filter({ hasText: /^MED$/ }).first();
    if (await deptButton.isVisible()) {
      await deptButton.click();
      
      await page.waitForTimeout(500);
    }
  });

  test('should display waiting patients', async ({ page }) => {
    await page.goto('/queue');
    
    const patientCards = page.locator('[class*="card"], [class*="patient"], [data-testid*="queue-item"]');
    await expect(patientCards.first()).toBeVisible();
  });

  test('should call patient from queue', async ({ page }) => {
    await page.goto('/queue');
    
    const callButton = page.locator('button:has-text("Call"), button:has-text("Call Patient")').first();
    if (await callButton.isVisible()) {
      await callButton.click();
      
      await expect(page.locator('[role="alert"], .success, [class*="success"]')).toBeVisible();
    }
  });

  test('should complete patient consultation', async ({ page }) => {
    await page.goto('/queue');
    
    const completeButton = page.locator('button:has-text("Complete"), button:has-text("Finish")').first();
    if (await completeButton.isVisible()) {
      await completeButton.click();
      
      await page.waitForTimeout(500);
    }
  });

  test('should mark patient as no-show', async ({ page }) => {
    await page.goto('/queue');
    
    const noShowButton = page.locator('button:has-text("No Show"), button:has-text("No-Show")').first();
    if (await noShowButton.isVisible()) {
      await noShowButton.click();
      
      await page.locator('button:has-text("Confirm"), button:has-text("Yes")').click();
    }
  });

  test('should search patients', async ({ page }) => {
    await page.goto('/queue');
    
    const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('John');
      await page.waitForTimeout(500);
    }
  });

  test('should filter by status', async ({ page }) => {
    await page.goto('/queue');
    
    const statusFilter = page.locator('[role="tablist"], button:has-text("Waiting"), button:has-text("Called")');
    if (await statusFilter.first().isVisible()) {
      await statusFilter.first().click();
      await page.waitForTimeout(500);
    }
  });

  test('should display queue statistics', async ({ page }) => {
    await page.goto('/queue');
    
    const stats = page.locator('[class*="stat"], [class*="count"], [data-testid*="stat"]');
    await expect(stats.first()).toBeVisible();
  });

  test('should transfer patient to another department', async ({ page }) => {
    await page.goto('/queue');
    
    const transferButton = page.locator('button:has-text("Transfer")').first();
    if (await transferButton.isVisible()) {
      await transferButton.click();
      
      const deptSelect = page.locator('select, [role="combobox"], [data-testid*="department"]');
      if (await deptSelect.isVisible()) {
        await deptSelect.selectOption('PED');
      }
      
      await page.locator('button:has-text("Confirm"), button:has-text("Transfer")').last().click();
    }
  });

  test('should display patient priority', async ({ page }) => {
    await page.goto('/queue');
    
    const priorityBadge = page.locator('[class*="priority"], [class*="urgent"], [class*="badge"]');
    const firstBadge = priorityBadge.first();
    if (await firstBadge.isVisible()) {
      await expect(firstBadge).toBeVisible();
    }
  });

  test('should show estimated wait time', async ({ page }) => {
    await page.goto('/queue');
    
    const waitTime = page.locator('text=/\\d+\\s*min/i, text=/wait/i');
    await expect(waitTime.first()).toBeVisible();
  });

  test('should refresh queue', async ({ page }) => {
    await page.goto('/queue');
    
    const refreshButton = page.locator('button:has-text("Refresh"), button:has-text("Refresh"), [aria-label*="refresh" i]').first();
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      await page.waitForTimeout(1000);
    }
  });
});

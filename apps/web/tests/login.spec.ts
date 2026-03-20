import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login form', async ({ page }) => {
    await expect(page.locator('h1, h2, [class*="title"], [class*="heading"]')).toContainText(/login|sign in/i);
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should login as patient', async ({ page }) => {
    await page.fill('input[type="email"], input[name="email"]', 'patient@test.com');
    await page.fill('input[type="password"], input[name="password"]', 'password123');
    
    const patientTab = page.locator('button, [role="tab"]').filter({ hasText: /patient/i });
    if (await patientTab.isVisible()) {
      await patientTab.click();
    }

    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/(patient|dashboard)/);
  });

  test('should login as staff', async ({ page }) => {
    const staffTab = page.locator('button, [role="tab"]').filter({ hasText: /staff/i });
    if (await staffTab.isVisible()) {
      await staffTab.click();
    }

    await page.fill('input[type="email"], input[name="email"]', 'doctor@hospital.com');
    await page.fill('input[type="password"], input[name="password"]', 'password123');
    
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/(staff|dashboard)/);
  });

  test('should login as admin', async ({ page }) => {
    const staffTab = page.locator('button, [role="tab"]').filter({ hasText: /staff/i });
    if (await staffTab.isVisible()) {
      await staffTab.click();
    }

    await page.fill('input[type="email"], input[name="email"]', 'admin@hospital.com');
    await page.fill('input[type="password"], input[name="password"]', 'admin123');
    
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/(staff|admin|dashboard)/);
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.fill('input[type="email"], input[name="email"]', 'invalid@test.com');
    await page.fill('input[type="password"], input[name="password"]', 'wrongpassword');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('[role="alert"], .error, [class*="error"]')).toBeVisible();
  });

  test('should toggle between patient and staff login', async ({ page }) => {
    const patientTab = page.locator('button, [role="tab"]').filter({ hasText: /patient/i });
    const staffTab = page.locator('button, [role="tab"]').filter({ hasText: /staff/i });

    if (await patientTab.isVisible()) {
      await patientTab.click();
      await expect(patientTab).toHaveAttribute('aria-selected', 'true');
    }

    if (await staffTab.isVisible()) {
      await staffTab.click();
      await expect(staffTab).toHaveAttribute('aria-selected', 'true');
    }
  });

  test('should navigate to register page', async ({ page }) => {
    const registerLink = page.locator('a[href*="register"], button:has-text("Register")');
    await expect(registerLink).toBeVisible();
    
    await registerLink.click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('should navigate to forgot password page', async ({ page }) => {
    const forgotLink = page.locator('a[href*="forgot"], button:has-text("Forgot")');
    if (await forgotLink.isVisible()) {
      await forgotLink.click();
      await expect(page).toHaveURL(/\/(forgot|reset)/);
    }
  });

  test('should validate email format', async ({ page }) => {
    await page.fill('input[type="email"], input[name="email"]', 'invalid-email');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('[class*="error"], [role="alert"]')).toContainText(/valid.*email|invalid.*email/i);
  });

  test('should show loading state during login', async ({ page }) => {
    await page.fill('input[type="email"], input[name="email"]', 'patient@test.com');
    await page.fill('input[type="password"], input[name="password"]', 'password123');
    
    await page.click('button[type="submit"]');
    
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeDisabled();
  });
});

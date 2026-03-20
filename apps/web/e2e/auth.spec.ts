import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('patient login with email and password', async ({ page }) => {
    await page.click('button:has-text("Email Login")');
    await page.fill('input[type="email"]', 'patient@hospital.com');
    await page.fill('input[type="password"]', 'patient123');
    await page.click('button[type="submit"]:has-text("Sign In")');
    await expect(page).toHaveURL(/\/dashboard\/patient/);
  });

  test('staff login with email and password', async ({ page }) => {
    await page.click('button:has-text("Email Login")');
    await page.fill('input[type="email"]', 'doctor@hospital.com');
    await page.fill('input[type="password"]', 'doctor123');
    await page.click('button[type="submit"]:has-text("Sign In")');
    await expect(page).toHaveURL(/\/dashboard\/doctor/);
  });

  test('staff login with PIN', async ({ page }) => {
    await page.click('button:has-text("Staff PIN")');
    await page.fill('input[placeholder="******"]', '123456');
    await page.click('button[type="submit"]:has-text("Sign In with PIN")');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('invalid credentials show error', async ({ page }) => {
    await page.click('button:has-text("Email Login")');
    await page.fill('input[type="email"]', 'invalid@hospital.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]:has-text("Sign In")');
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });

  test('logout redirects to login', async ({ page }) => {
    await page.click('button:has-text("Email Login")');
    await page.fill('input[type="email"]', 'patient@hospital.com');
    await page.fill('input[type="password"]', 'patient123');
    await page.click('button[type="submit"]:has-text("Sign In")');
    await expect(page).toHaveURL(/\/dashboard\/patient/);
    await page.click('button:has-text("Logout")');
    await expect(page).toHaveURL('/login');
  });

  test('forgot password link works', async ({ page }) => {
    await page.click('a:has-text("Forgot Password")');
    await expect(page).toHaveURL(/\/reset-password/);
  });

  test('demo credentials are displayed', async ({ page }) => {
    await expect(page.locator('text=Demo Credentials')).toBeVisible();
    await expect(page.locator('text=admin@hospital.com')).toBeVisible();
    await expect(page.locator('text=doctor@hospital.com')).toBeVisible();
  });

  test('email and PIN tabs switch correctly', async ({ page }) => {
    const emailTab = page.locator('button:has-text("Email Login")');
    const pinTab = page.locator('button:has-text("Staff PIN")');
    await expect(emailTab).toHaveClass(/bg-white/);
    await pinTab.click();
    await expect(pinTab).toHaveClass(/bg-white/);
    await expect(page.locator('input[placeholder="******"]')).toBeVisible();
    await emailTab.click();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});

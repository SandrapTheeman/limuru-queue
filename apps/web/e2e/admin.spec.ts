import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@hospital.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]:has-text("Sign In")');
    await page.waitForURL(/\/dashboard\/admin/);
  });

  test('view statistics overview', async ({ page }) => {
    await expect(page.locator('h1:has-text("Admin Dashboard")')).toBeVisible();
    await expect(page.locator('text=Total Patients')).toBeVisible();
    await expect(page.locator('text=Today')).toBeVisible();
    await expect(page.locator('text=Avg Wait')).toBeVisible();
    await expect(page.locator('text=Satisfaction')).toBeVisible();
    await expect(page.locator('text=Departments')).toBeVisible();
    await expect(page.locator('text=Staff Online')).toBeVisible();
  });

  test('view department performance', async ({ page }) => {
    await expect(page.locator('h1:has-text("Admin Dashboard")')).toBeVisible();
    await expect(page.locator('text=Department Performance')).toBeVisible();
    await expect(page.locator('text=General Medicine')).toBeVisible();
    await expect(page.locator('text=Cardiology')).toBeVisible();
  });

  test('view recent activity', async ({ page }) => {
    await expect(page.locator('h1:has-text("Admin Dashboard")')).toBeVisible();
    await expect(page.locator('text=Recent Activity')).toBeVisible();
  });

  test('navigate to user management', async ({ page }) => {
    await expect(page.locator('h1:has-text("Admin Dashboard")')).toBeVisible();
    await page.click('button:has-text("User Management")');
    await expect(page.locator('h2:has-text("User Management")')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });

  test('view all users in table', async ({ page }) => {
    await page.click('button:has-text("User Management")');
    await expect(page.locator('th:has-text("Name")')).toBeVisible();
    await expect(page.locator('th:has-text("Email")')).toBeVisible();
    await expect(page.locator('th:has-text("Role")')).toBeVisible();
    await expect(page.locator('th:has-text("Department")')).toBeVisible();
    await expect(page.locator('th:has-text("Status")')).toBeVisible();
    await expect(page.locator('th:has-text("Actions")')).toBeVisible();
  });

  test('user actions are visible', async ({ page }) => {
    await page.click('button:has-text("User Management")');
    const viewButtons = page.locator('button >> nth=0');
    await expect(viewButtons.first()).toBeVisible();
  });

  test('navigate to departments tab', async ({ page }) => {
    await expect(page.locator('h1:has-text("Admin Dashboard")')).toBeVisible();
    await page.click('button:has-text("Departments")');
    await expect(page.locator('h2:has-text("Department Settings")')).toBeVisible();
  });

  test('view department cards', async ({ page }) => {
    await page.click('button:has-text("Departments")');
    await expect(page.locator('text=General Medicine')).toBeVisible();
    await expect(page.locator('text=Cardiology')).toBeVisible();
    await expect(page.locator('text=Patients Today')).toBeVisible();
  });

  test('navigate to IPTV management', async ({ page }) => {
    await expect(page.locator('h1:has-text("Admin Dashboard")')).toBeVisible();
    await page.click('button:has-text("IPTV Management")');
    await expect(page.locator('h2:has-text("IPTV Channel Management")')).toBeVisible();
  });

  test('view IPTV channels', async ({ page }) => {
    await page.click('button:has-text("IPTV Management")');
    await expect(page.locator('text=Hospital Information')).toBeVisible();
    await expect(page.locator('text=Health Tips')).toBeVisible();
  });

  test('add user button is visible', async ({ page }) => {
    await page.click('button:has-text("User Management")');
    await expect(page.locator('button:has-text("Add User")')).toBeVisible();
  });

  test('add department button is visible', async ({ page }) => {
    await page.click('button:has-text("Departments")');
    await expect(page.locator('button:has-text("Add Department")')).toBeVisible();
  });

  test('user role badges display correctly', async ({ page }) => {
    await page.click('button:has-text("User Management")');
    await expect(page.locator('text=admin').first()).toBeVisible();
    await expect(page.locator('text=doctor').first()).toBeVisible();
  });

  test('department status badges display correctly', async ({ page }) => {
    await page.click('button:has-text("Departments")');
    await expect(page.locator('text=active').first()).toBeVisible();
  });

  test('IPTV channel status badges display correctly', async ({ page }) => {
    await page.click('button:has-text("IPTV Management")');
    await expect(page.locator('text=active').first()).toBeVisible();
  });

  test('add channel button is visible', async ({ page }) => {
    await page.click('button:has-text("IPTV Management")');
    await expect(page.locator('button:has-text("Add Channel")')).toBeVisible();
  });
});

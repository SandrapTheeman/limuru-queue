/**
 * Authentication E2E Tests
 * 
 * Tests for login page, logout, session persistence, and remember me functionality.
 */
const { test, expect } = require('@playwright/test');

// Test credentials
const TEST_USERS = {
  admin: { email: 'admin@limuruhospital.co.ke', password: 'password123', role: 'Admin' },
  doctor: { email: 'doctor@hospital.co.ke', password: 'password123', role: 'Doctor' },
  nurse: { email: 'nurse@hospital.co.ke', password: 'password123', role: 'Nurse' },
  receptionist: { email: 'reception@hospital.co.ke', password: 'password123', role: 'Receptionist' }
};

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
  });

  test.afterEach(async ({ page }) => {
    // Logout after each test
    await page.logout?.();
  });

  test.describe('Login Page', () => {
    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    test('should display login form', async ({ page }) => {
      // Check for email input
      const emailInput = page.locator('input[type="email"], input[name="email"], [data-testid="email"]');
      await expect(emailInput).toBeVisible();

      // Check for password input
      const passwordInput = page.locator('input[type="password"], input[name="password"], [data-testid="password"]');
      await expect(passwordInput).toBeVisible();

      // Check for submit button
      const submitButton = page.locator('button[type="submit"], [data-testid="login-button"]');
      await expect(submitButton).toBeVisible();
    });

    test('should display hospital branding', async ({ page }) => {
      // Check for hospital name or logo
      const branding = page.locator('h1, .brand, .logo, [data-testid="hospital-name"]');
      await expect(branding.first()).toBeVisible();
    });

    test('should have remember me checkbox', async ({ page }) => {
      const rememberMe = page.locator('input[type="checkbox"][name*="remember"], [data-testid="remember-me"]');
      await expect(rememberMe).toBeVisible();
    });

    test('should have forgot password link', async ({ page }) => {
      const forgotLink = page.locator('a:has-text("Forgot"), [data-testid="forgot-password"]');
      await expect(forgotLink).toBeVisible();
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    test('should show error for empty email', async ({ page }) => {
      await page.fill('input[name="password"], [data-testid="password"]', 'password123');
      await page.click('button[type="submit"], [data-testid="login-button"]');
      
      // Should show validation error
      const error = page.locator('.error, .error-message, [data-testid="email-error"], text=/required|invalid/i');
      await expect(error.first()).toBeVisible();
    });

    test('should show error for empty password', async ({ page }) => {
      await page.fill('input[name="email"], [data-testid="email"]', 'admin@limuruhospital.co.ke');
      await page.click('button[type="submit"], [data-testid="login-button"]');
      
      const error = page.locator('.error, .error-message, [data-testid="password-error"], text=/required|password/i');
      await expect(error.first()).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.fill('input[name="email"], [data-testid="email"]', 'wrong@email.com');
      await page.fill('input[name="password"], [data-testid="password"]', 'wrongpassword');
      await page.click('button[type="submit"], [data-testid="login-button"]');
      
      // Wait for error message
      await page.waitForTimeout(1000);
      
      const errorMessage = page.locator('text=/invalid|incorrect|credentials|unauthorized/i');
      await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Admin Login', () => {
    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    test('should login successfully with admin credentials', async ({ page }) => {
      await page.fill('input[name="email"], [data-testid="email"]', TEST_USERS.admin.email);
      await page.fill('input[name="password"], [data-testid="password"]', TEST_USERS.admin.password);
      await page.click('button[type="submit"], [data-testid="login-button"]');
      
      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard|\//, { timeout: 10000 });
      
      // Should show admin-specific elements
      const adminBadge = page.locator('text=/admin/i, [data-testid="user-role"]');
      await expect(adminBadge.first()).toBeVisible({ timeout: 5000 });
    });

    test('should persist session after login', async ({ page }) => {
      await page.fill('input[name="email"], [data-testid="email"]', TEST_USERS.admin.email);
      await page.fill('input[name="password"], [data-testid="password"]', TEST_USERS.admin.password);
      await page.click('button[type="submit"], [data-testid="login-button"]');
      
      await expect(page).toHaveURL(/\/dashboard|\//, { timeout: 10000 });
      
      // Reload page
      await page.reload();
      
      // Should still be logged in
      await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
    });

    test('should redirect to intended page after login', async ({ page }) => {
      // Try to access a protected page
      await page.goto('/admin/settings');
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
      
      // Login
      await page.fill('input[name="email"], [data-testid="email"]', TEST_USERS.admin.email);
      await page.fill('input[name="password"], [data-testid="password"]', TEST_USERS.admin.password);
      await page.click('button[type="submit"], [data-testid="login-button"]');
      
      // Should redirect to intended page
      await expect(page).toHaveURL(/\/admin\/settings/, { timeout: 10000 });
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    test('should reject login with wrong password', async ({ page }) => {
      await page.fill('input[name="email"], [data-testid="email"]', TEST_USERS.admin.email);
      await page.fill('input[name="password"], [data-testid="password"]', 'wrongpassword');
      await page.click('button[type="submit"], [data-testid="login-button"]');
      
      await page.waitForTimeout(1000);
      
      // Should stay on login page
      await expect(page).toHaveURL(/\/login/);
      
      // Should show error message
      const errorMessage = page.locator('text=/invalid|incorrect|password/i');
      await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Doctor Login', () => {
    test('should login successfully with doctor credentials', async ({ page }) => {
      await page.fill('input[name="email"], [data-testid="email"]', TEST_USERS.doctor.email);
      await page.fill('input[name="password"], [data-testid="password"]', TEST_USERS.doctor.password);
      await page.click('button[type="submit"], [data-testid="login-button"]');
      
      await expect(page).toHaveURL(/\/dashboard|\//, { timeout: 10000 });
      
      // Should show doctor-specific elements
      const doctorBadge = page.locator('text=/doctor/i, [data-testid="user-role"]');
      await expect(doctorBadge.first()).toBeVisible({ timeout: 5000 });
    });

    test('should see queue management option', async ({ page }) => {
      await page.fill('input[name="email"], [data-testid="email"]', TEST_USERS.doctor.email);
      await page.fill('input[name="password"], [data-testid="password"]', TEST_USERS.doctor.password);
      await page.click('button[type="submit"], [data-testid="login-button"]');
      
      await expect(page).toHaveURL(/\/dashboard|\//, { timeout: 10000 });
      
      // Should see queue-related navigation
      const queueNav = page.locator('nav a:has-text("Queue"), [data-testid="queue-link"]');
      await expect(queueNav.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Receptionist Login', () => {
    test('should login successfully with receptionist credentials', async ({ page }) => {
      await page.fill('input[name="email"], [data-testid="email"]', TEST_USERS.receptionist.email);
      await page.fill('input[name="password"], [data-testid="password"]', TEST_USERS.receptionist.password);
      await page.click('button[type="submit"], [data-testid="login-button"]');
      
      await expect(page).toHaveURL(/\/dashboard|\//, { timeout: 10000 });
      
      // Should show receptionist-specific elements
      const receptionBadge = page.locator('text=/reception/i, [data-testid="user-role"]');
      await expect(receptionBadge.first()).toBeVisible({ timeout: 5000 });
    });

    test('should see patient registration option', async ({ page }) => {
      await page.fill('input[name="email"], [data-testid="email"]', TEST_USERS.receptionist.email);
      await page.fill('input[name="password"], [data-testid="password"]', TEST_USERS.receptionist.password);
      await page.click('button[type="submit"], [data-testid="login-button"]');
      
      await expect(page).toHaveURL(/\/dashboard|\//, { timeout: 10000 });
      
      // Should see patient-related navigation
      const patientNav = page.locator('nav a:has-text("Patient"), [data-testid="patients-link"]');
      await expect(patientNav.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Logout', () => {
    test('should logout successfully', async ({ page }) => {
      // Login first
      await page.fill('input[name="email"], [data-testid="email"]', TEST_USERS.admin.email);
      await page.fill('input[name="password"], [data-testid="password"]', TEST_USERS.admin.password);
      await page.click('button[type="submit"], [data-testid="login-button"]');
      
      await expect(page).toHaveURL(/\/dashboard|\//, { timeout: 10000 });
      
      // Click logout
      const logoutButton = page.locator('button:has-text("Logout"), [data-testid="logout-button"], button:has-text("Sign Out")');
      await logoutButton.first().click();
      
      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
      
      // Should not be able to access protected pages
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    });

    test('should clear session on logout', async ({ page }) => {
      // Login
      await page.fill('input[name="email"], [data-testid="email"]', TEST_USERS.admin.email);
      await page.fill('input[name="password"], [data-testid="password"]', TEST_USERS.admin.password);
      await page.click('button[type="submit"], [data-testid="login-button"]');
      
      await expect(page).toHaveURL(/\/dashboard|\//, { timeout: 10000 });
      
      // Logout
      const logoutButton = page.locator('button:has-text("Logout"), [data-testid="logout-button"]');
      await logoutButton.first().click();
      
      await page.waitForTimeout(500);
      
      // Reload page
      await page.reload();
      
      // Should be on login page (not dashboard)
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    });
  });

  test.describe('Remember Me', () => {
    test('should remember user session when checked', async ({ page, context }) => {
      // Check remember me
      const rememberCheckbox = page.locator('input[type="checkbox"][name*="remember"], [data-testid="remember-me"]');
      await rememberCheckbox.check();
      
      // Login
      await page.fill('input[name="email"], [data-testid="email"]', TEST_USERS.admin.email);
      await page.fill('input[name="password"], [data-testid="password"]', TEST_USERS.admin.password);
      await page.click('button[type="submit"], [data-testid="login-button"]');
      
      await expect(page).toHaveURL(/\/dashboard|\//, { timeout: 10000 });
      
      // Close and reopen browser
      await context.close();
      
      // Create new context and go to app
      const newContext = await context.browser().newContext();
      const newPage = await newContext.newPage();
      await newPage.goto('/');
      
      // Should still be logged in
      await expect(newPage).not.toHaveURL(/\/login/, { timeout: 5000 });
      
      await newContext.close();
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle network error gracefully', async ({ page }) => {
      // Block API requests
      await page.route('**/api/auth/**', route => route.abort());

      await page.fill('input[name="email"], [data-testid="email"]', TEST_USERS.admin.email);
      await page.fill('input[name="password"], [data-testid="password"]', TEST_USERS.admin.password);
      await page.click('button[type="submit"], [data-testid="login-button"]');
      
      await page.waitForTimeout(1000);
      
      // Should show network error message
      const errorMessage = page.locator('text=/network|connection|error/i');
      await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
    });

    test('should handle session timeout', async ({ page }) => {
      // Login first
      await page.fill('input[name="email"], [data-testid="email"]', TEST_USERS.admin.email);
      await page.fill('input[name="password"], [data-testid="password"]', TEST_USERS.admin.password);
      await page.click('button[type="submit"], [data-testid="login-button"]');
      
      await expect(page).toHaveURL(/\/dashboard|\//, { timeout: 10000 });
      
      // Simulate token expiration by clearing storage
      await page.evaluate(() => localStorage.clear());
      
      // Try to access protected page
      await page.goto('/admin/settings');
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    });

    test('should prevent SQL injection in login form', async ({ page }) => {
      const maliciousInput = "admin'--";
      
      await page.fill('input[name="email"], [data-testid="email"]', maliciousInput);
      await page.fill('input[name="password"], [data-testid="password"]', 'anything');
      await page.click('button[type="submit"], [data-testid="login-button"]');
      
      await page.waitForTimeout(1000);
      
      // Should not log in successfully
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
      
      // Should show error
      const errorMessage = page.locator('text=/invalid|incorrect/i');
      await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
    });
  });
});

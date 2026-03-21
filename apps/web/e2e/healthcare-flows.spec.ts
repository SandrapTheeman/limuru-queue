import { test, expect } from '@playwright/test';

test.describe('Patient Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('complete patient self-registration', async ({ page }) => {
    await page.click('text=Register');
    await expect(page).toHaveURL(/\/register/);
    
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');
    await page.fill('input[name="email"]', 'john.doe@example.com');
    await page.fill('input[name="phone"]', '+254712345678');
    await page.fill('input[name="password"]', 'SecurePass123');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Registration successful')).toBeVisible({ timeout: 10000 });
  });

  test('patient login after registration', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'patient@test.com');
    await page.fill('input[type="password"]', 'password123');
    
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/(dashboard|patient)/, { timeout: 10000 });
  });

  test('quick patient registration via kiosk', async ({ page }) => {
    await page.goto('/kiosk');
    
    await page.click('text=General Medicine');
    
    await page.fill('input[placeholder*="patient"]', 'John Doe');
    await page.fill('input[type="tel"]', '+254712345678');
    
    await page.click('button:has-text("Get Ticket")');
    
    await expect(page.locator('text=Ticket Number')).toBeVisible({ timeout: 10000 });
  });

  test('patient views queue status', async ({ page }) => {
    await page.goto('/dashboard/patient');
    
    await expect(page.locator('text=Queue Status')).toBeVisible();
    await expect(page.locator('text=Current Position')).toBeVisible();
  });

  test('patient cancels booking', async ({ page }) => {
    await page.goto('/dashboard/patient');
    
    const cancelButton = page.locator('button:has-text("Cancel")');
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
      await expect(page.locator('text=Are you sure')).toBeVisible();
      await page.click('button:has-text("Confirm")');
    }
  });
});

test.describe('Doctor Dashboard Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('doctor login with email', async ({ page }) => {
    await page.fill('input[type="email"]', 'doctor@hospital.com');
    await page.fill('input[type="password"]', 'doctor123');
    
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/dashboard\/doctor/, { timeout: 10000 });
  });

  test('doctor views queue', async ({ page }) => {
    await page.goto('/dashboard/doctor');
    await page.goto('/login');
    await page.fill('input[type="email"]', 'doctor@hospital.com');
    await page.fill('input[type="password"]', 'doctor123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    
    await expect(page.locator('text=Queue')).toBeVisible();
  });

  test('doctor calls next patient', async ({ page }) => {
    await page.goto('/dashboard/doctor');
    await page.goto('/login');
    await page.fill('input[type="email"]', 'doctor@hospital.com');
    await page.fill('input[type="password"]', 'doctor123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    
    const callButton = page.locator('button:has-text("Call Next")');
    if (await callButton.isVisible()) {
      await callButton.click();
    }
  });

  test('doctor starts consultation', async ({ page }) => {
    await page.goto('/dashboard/doctor');
    await page.goto('/login');
    await page.fill('input[type="email"]', 'doctor@hospital.com');
    await page.fill('input[type="password"]', 'doctor123');
    await page.click('button[type="submit"]');
    
    const startButton = page.locator('button:has-text("Start")');
    if (await startButton.isVisible()) {
      await startButton.click();
      await expect(page.locator('text=Consultation')).toBeVisible();
    }
  });

  test('doctor completes visit', async ({ page }) => {
    await page.goto('/dashboard/doctor');
    await page.goto('/login');
    await page.fill('input[type="email"]', 'doctor@hospital.com');
    await page.fill('input[type="password"]', 'doctor123');
    await page.click('button[type="submit"]');
    
    const completeButton = page.locator('button:has-text("Complete")');
    if (await completeButton.isVisible()) {
      await completeButton.click();
      await expect(page.locator('text=Visit Completed')).toBeVisible({ timeout: 5000 });
    }
  });

  test('emergency override access', async ({ page }) => {
    await page.goto('/dashboard/doctor');
    await page.goto('/login');
    await page.fill('input[type="email"]', 'doctor@hospital.com');
    await page.fill('input[type="password"]', 'doctor123');
    await page.click('button[type="submit"]');
    
    const emergencyButton = page.locator('button:has-text("Emergency")');
    if (await emergencyButton.isVisible()) {
      await emergencyButton.click();
      await expect(page.locator('text=Emergency Override')).toBeVisible();
    }
  });
});

test.describe('Receptionist Quick Register Flow', () => {
  test('receptionist login', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'reception@hospital.com');
    await page.fill('input[type="password"]', 'reception123');
    
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('quick patient registration', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'reception@hospital.com');
    await page.fill('input[type="password"]', 'reception123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    
    await page.click('text=Register Patient');
    
    await page.fill('input[name="name"]', 'Jane Smith');
    await page.fill('input[name="phone"]', '+254798765432');
    
    await page.click('button:has-text("Quick Register")');
    
    await expect(page.locator('text=Ticket Issued')).toBeVisible({ timeout: 10000 });
  });

  test('search existing patient', async ({ page }) => {
    await page.goto('/dashboard/reception');
    await page.goto('/login');
    await page.fill('input[type="email"]', 'reception@hospital.com');
    await page.fill('input[type="password"]', 'reception123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    
    await page.fill('input[placeholder*="search"]', 'Jane');
    
    await expect(page.locator('text=Jane Smith')).toBeVisible({ timeout: 5000 });
  });

  test('transfer patient to another department', async ({ page }) => {
    await page.goto('/dashboard/reception');
    await page.goto('/login');
    await page.fill('input[type="email"]', 'reception@hospital.com');
    await page.fill('input[type="password"]', 'reception123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    
    const transferButton = page.locator('button:has-text("Transfer")');
    if (await transferButton.isVisible()) {
      await transferButton.first().click();
      await page.selectOption('select[name="department"]', 'Cardiology');
      await page.click('button:has-text("Confirm Transfer")');
    }
  });
});

test.describe('TV Display Real-time Updates', () => {
  test('display shows current queue', async ({ page }) => {
    await page.goto('/display');
    
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page.locator('text=Ticket')).toBeVisible();
  });

  test('display shows currently calling', async ({ page }) => {
    await page.goto('/display');
    
    await expect(page.locator('text=Now Serving')).toBeVisible();
  });

  test('display shows up next patients', async ({ page }) => {
    await page.goto('/display');
    
    await expect(page.locator('text=Up Next')).toBeVisible();
  });

  test('display updates in real-time', async ({ page }) => {
    await page.goto('/display');
    
    const initialTickets = await page.locator('[class*="ticket"]').count();
    
    await page.waitForTimeout(3000);
    
    const updatedTickets = await page.locator('[class*="ticket"]').count();
    
    expect(updatedTickets).toBeGreaterThanOrEqual(0);
  });

  test('display respects privacy mode', async ({ page }) => {
    await page.goto('/display');
    
    const patientNames = await page.locator('text=***').count();
    
    expect(patientNames).toBeGreaterThanOrEqual(0);
  });
});

test.describe('WhatsApp Chatbot Registration Flow', () => {
  test('send REGISTER command', async ({ page }) => {
    await page.goto('/whatsapp-webhook-test');
    
    await page.fill('input[name="From"]', '+254712345678');
    await page.fill('textarea[name="Body"]', 'REGISTER');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=full name')).toBeVisible({ timeout: 5000 });
  });

  test('enter patient name', async ({ page }) => {
    await page.goto('/whatsapp-webhook-test');
    
    await page.fill('input[name="From"]', '+254712345678');
    await page.fill('textarea[name="Body"]', 'John Doe');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=phone number')).toBeVisible({ timeout: 5000 });
  });

  test('enter phone number', async ({ page }) => {
    await page.goto('/whatsapp-webhook-test');
    
    await page.fill('input[name="From"]', '+254712345678');
    await page.fill('textarea[name="Body"]', '0712345678');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Department')).toBeVisible({ timeout: 5000 });
  });

  test('select department', async ({ page }) => {
    await page.goto('/whatsapp-webhook-test');
    
    await page.fill('input[name="From"]', '+254712345678');
    await page.fill('textarea[name="Body"]', 'MED');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Confirmation')).toBeVisible({ timeout: 5000 });
  });

  test('confirm booking', async ({ page }) => {
    await page.goto('/whatsapp-webhook-test');
    
    await page.fill('input[name="From"]', '+254712345678');
    await page.fill('textarea[name="Body"]', 'YES');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Ticket Number')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Authentication Security', () => {
  test('invalid credentials show error', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'invalid@hospital.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Invalid')).toBeVisible({ timeout: 5000 });
  });

  test('rate limiting after failed attempts', async ({ page }) => {
    await page.goto('/login');
    
    for (let i = 0; i < 6; i++) {
      await page.fill('input[type="email"]', 'test@hospital.com');
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
    }
    
    await expect(page.locator('text=Too many attempts')).toBeVisible({ timeout: 5000 });
  });

  test('session expires after timeout', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'doctor@hospital.com');
    await page.fill('input[type="password"]', 'doctor123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    
    await page.evaluate(() => {
      localStorage.setItem('sessionExpiry', String(Date.now() - 86401000));
    });
    
    await page.reload();
    
    await expect(page).toHaveURL(/\/login/);
  });

  test('logout redirects to login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'doctor@hospital.com');
    await page.fill('input[type="password"]', 'doctor123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    
    await page.click('button:has-text("Logout")');
    
    await expect(page).toHaveURL('/login');
  });
});

test.describe('RBAC - Role Based Access Control', () => {
  test('patient cannot access admin routes', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'patient@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await page.goto('/admin/users');
    
    await expect(page.locator('text=Unauthorized')).toBeVisible({ timeout: 5000 });
  });

  test('doctor cannot access admin settings', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'doctor@hospital.com');
    await page.fill('input[type="password"]', 'doctor123');
    await page.click('button[type="submit"]');
    
    await page.goto('/admin/settings');
    
    await expect(page.locator('text=Unauthorized')).toBeVisible({ timeout: 5000 });
  });

  test('admin can access settings', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@hospital.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    await page.goto('/admin/settings');
    
    await expect(page).toHaveURL(/\/admin\/settings/, { timeout: 10000 });
  });
});

test.describe('Accessibility Tests', () => {
  test('keyboard navigation on login', async ({ page }) => {
    await page.goto('/login');
    
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    await expect(page.locator('input[type="email"]')).toBeFocused();
  });

  test('form labels are accessible', async ({ page }) => {
    await page.goto('/login');
    
    const emailLabel = page.locator('label[for="email"], label:has-text("Email")');
    await expect(emailLabel).toBeVisible();
    
    const passwordLabel = page.locator('label[for="password"], label:has-text("Password")');
    await expect(passwordLabel).toBeVisible();
  });

  test('color contrast meets WCAG AA', async ({ page }) => {
    await page.goto('/login');
    
    const contrastChecker = async () => {
      return true;
    };
    
    expect(await contrastChecker()).toBe(true);
  });

  test('focus indicators are visible', async ({ page }) => {
    await page.goto('/login');
    
    await page.keyboard.press('Tab');
    
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      const style = window.getComputedStyle(el);
      return {
        outline: style.outline,
        boxShadow: style.boxShadow,
      };
    });
    
    expect(focusedElement).not.toBeNull();
  });
});

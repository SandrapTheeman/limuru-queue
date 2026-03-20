/**
 * Shared Page Object Components
 * 
 * Reusable page object classes and helper functions for E2E tests.
 */
const { test, expect } = require('@playwright/test');

/**
 * Login Page Object
 */
class LoginPage {
  constructor(page) {
    this.page = page;
    this.emailInput = page.locator('input[name="email"], [data-testid="email"]');
    this.passwordInput = page.locator('input[name="password"], [data-testid="password"]');
    this.submitButton = page.locator('button[type="submit"], [data-testid="login-button"]');
    this.rememberMe = page.locator('input[type="checkbox"][name*="remember"], [data-testid="remember-me"]');
    this.errorMessage = page.locator('.error, .error-message, [data-testid="error"]');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email, password, remember = false) {
    if (remember) {
      await this.rememberMe.check();
    }
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async getErrorMessage() {
    return this.errorMessage.first().textContent();
  }

  async isLoginSuccessful() {
    await this.page.waitForURL(/\/dashboard|\//, { timeout: 10000 }).catch(() => {});
    return !this.page.url().includes('/login');
  }
}

/**
 * Dashboard Page Object
 */
class DashboardPage {
  constructor(page) {
    this.page = page;
    this.patientsCount = page.locator('[data-testid="patients-count"]');
    this.queueCount = page.locator('[data-testid="queue-count"]');
    this.waitingCount = page.locator('[data-testid="waiting-count"]');
    this.completedCount = page.locator('[data-testid="completed-count"]');
    this.addPatientBtn = page.locator('button:has-text("Add Patient"), [data-testid="add-patient"]');
    this.viewQueueBtn = page.locator('button:has-text("View Queue"), [data-testid="view-queue"]');
  }

  async goto() {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  async getPatientCount() {
    const text = await this.patientsCount.first().textContent();
    return parseInt(text.match(/\d+/)?.[0] || '0');
  }

  async clickAddPatient() {
    await this.addPatientBtn.first().click();
  }

  async clickViewQueue() {
    await this.viewQueueBtn.first().click();
  }
}

/**
 * Queue Page Object
 */
class QueuePage {
  constructor(page) {
    this.page = page;
    this.queueList = page.locator('[data-testid="queue-list"], .queue-list');
    this.addToQueueBtn = page.locator('button:has-text("Add to Queue"), [data-testid="add-to-queue"]');
    this.departmentFilter = page.locator('[data-testid="department-filter"], select[name="department"]');
    this.searchInput = page.locator('input[type="search"], [data-testid="search"]');
  }

  async goto() {
    await this.page.goto('/queue');
    await this.page.waitForLoadState('networkidle');
  }

  async filterByDepartment(department) {
    await this.departmentFilter.selectOption(department);
  }

  async searchPatient(name) {
    await this.searchInput.fill(name);
    await this.page.waitForTimeout(500);
  }

  async getQueueCount() {
    const items = this.page.locator('[data-testid="queue-item"], .queue-item');
    return items.count();
  }

  async callNextPatient() {
    const callBtn = this.page.locator('button:has-text("Call"), [data-testid="call-patient"]').first();
    await callBtn.click();
  }
}

/**
 * Patients Page Object
 */
class PatientsPage {
  constructor(page) {
    this.page = page;
    this.patientList = page.locator('[data-testid="patient-list"], .patient-list');
    this.addPatientBtn = page.locator('button:has-text("Add Patient"), [data-testid="add-patient"]');
    this.nameInput = page.locator('input[name="name"], [data-testid="patient-name"]');
    this.phoneInput = page.locator('input[name="phone"], [data-testid="patient-phone"]');
    this.emailInput = page.locator('input[name="email"], [data-testid="patient-email"]');
    this.dateOfBirthInput = page.locator('input[name="date_of_birth"], [data-testid="patient-dob"]');
    this.saveBtn = page.locator('button[type="submit"], [data-testid="save-patient"]');
  }

  async goto() {
    await this.page.goto('/patients');
    await this.page.waitForLoadState('networkidle');
  }

  async gotoNewPatient() {
    await this.page.goto('/patients/new');
  }

  async registerPatient(patientData) {
    await this.gotoNewPatient();
    
    if (patientData.name) await this.nameInput.fill(patientData.name);
    if (patientData.phone) await this.phoneInput.fill(patientData.phone);
    if (patientData.email) await this.emailInput.fill(patientData.email);
    if (patientData.dateOfBirth) await this.dateOfBirthInput.fill(patientData.dateOfBirth);
    
    await this.saveBtn.click();
    await this.page.waitForLoadState('networkidle');
  }
}

/**
 * Appointments Page Object
 */
class AppointmentsPage {
  constructor(page) {
    this.page = page;
    this.appointmentList = page.locator('[data-testid="appointment-list"]');
    this.createBtn = page.locator('button:has-text("New Appointment"), [data-testid="create-appointment"]');
    this.dateFilter = page.locator('[data-testid="date-filter"], input[type="date"]');
  }

  async goto() {
    await this.page.goto('/appointments');
    await this.page.waitForLoadState('networkidle');
  }

  async filterByDate(date) {
    await this.dateFilter.fill(date);
    await this.page.waitForTimeout(500);
  }

  async getAppointmentCount() {
    const items = this.page.locator('[data-testid="appointment-item"]');
    return items.count();
  }
}

/**
 * Doctor Notes Page Object
 */
class DoctorNotesPage {
  constructor(page) {
    this.page = page;
    this.notesList = page.locator('[data-testid="notes-list"]');
    this.createNoteBtn = page.locator('button:has-text("New Note"), [data-testid="create-note"]');
    this.subjectiveInput = page.locator('[name="subjective"], [data-testid="soap-subjective"]');
    this.objectiveInput = page.locator('[name="objective"], [data-testid="soap-objective"]');
    this.assessmentInput = page.locator('[name="assessment"], [data-testid="soap-assessment"]');
    this.planInput = page.locator('[name="plan"], [data-testid="soap-plan"]');
    this.saveNoteBtn = page.locator('button:has-text("Save"), [data-testid="save-note"]');
  }

  async goto() {
    await this.page.goto('/doctor-notes');
    await this.page.waitForLoadState('networkidle');
  }

  async createSOAPNote(noteData) {
    await this.goto();
    await this.createNoteBtn.click();
    
    if (noteData.subjective) await this.subjectiveInput.fill(noteData.subjective);
    if (noteData.objective) await this.objectiveInput.fill(noteData.objective);
    if (noteData.assessment) await this.assessmentInput.fill(noteData.assessment);
    if (noteData.plan) await this.planInput.fill(noteData.plan);
    
    await this.saveNoteBtn.click();
    await this.page.waitForLoadState('networkidle');
  }
}

/**
 * Helper Functions
 */
async function loginAs(page, role) {
  const credentials = {
    admin: { email: 'admin@limuruhospital.co.ke', password: 'password123' },
    doctor: { email: 'doctor@hospital.co.ke', password: 'password123' },
    nurse: { email: 'nurse@hospital.co.ke', password: 'password123' },
    receptionist: { email: 'reception@hospital.co.ke', password: 'password123' }
  };
  
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(credentials[role].email, credentials[role].password);
  await page.waitForURL(/\/dashboard|\//, { timeout: 10000 });
}

async function waitForToast(page) {
  const toast = page.locator('.toast, .notification, [data-testid="toast"]');
  await toast.first().waitFor({ timeout: 5000 }).catch(() => {});
  return toast.first();
}

async function takeScreenshot(page, name) {
  await page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
}

// Export all page objects and helpers
module.exports = {
  LoginPage,
  DashboardPage,
  QueuePage,
  PatientsPage,
  AppointmentsPage,
  DoctorNotesPage,
  loginAs,
  waitForToast,
  takeScreenshot
};

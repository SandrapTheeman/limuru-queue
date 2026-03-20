/**
 * Global Setup - Runs before all tests
 */
const { chromium, request } = require('@playwright/test');

async function globalSetup(config) {
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // Check if API is running
  const apiUrl = process.env.E2E_API_URL || 'http://localhost:8787';
  
  try {
    const response = await fetch(`${apiUrl}/health`);
    if (!response.ok) {
      console.warn('API health check failed, tests may fail');
    }
  } catch (err) {
    console.warn('API not reachable, tests may fail:', err.message);
  }

  // Create test users in database if needed
  // This would typically connect to the test database and create fixture users
  
  return async function globalTeardown() {
    // Cleanup after all tests
    // Close any open browser contexts
  };
}

module.exports = globalSetup;

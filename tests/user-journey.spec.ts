import { test, expect } from '@playwright/test';

test.describe('User (Worker) Journey - Activity Recording', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Login
    await page.goto('/login');
    await page.fill('#username', 'worker');
    await page.fill('#password', 'worker123');
    await page.click('button:has-text("Sign In")');
    
    // 2. Wait for navigation to user dashboard
    await page.waitForURL(/\/user\/dashboard/);
    
    // 3. Stabilization: Wait for 'greedy' auto-selection to populate the UI labels
    // We expect "Sunrise Main Farm" and "Section A" to appear automatically
    await expect(page.getByTestId('farm-select')).toContainText(/Sunrise Main Farm/i, { timeout: 15000 });
    await expect(page.getByTestId('tank-select')).toContainText(/Section A/i, { timeout: 15000 });
  });

  test('Should navigate to Activity form', async ({ page }) => {
    // Click "Observation" activity
    const observationBtn = page.getByRole('button', { name: /Observation/i });
    await expect(observationBtn).toBeVisible();
    await observationBtn.click();
    
    // Verify on activity page
    await page.waitForURL(/\/user\/activity\/observation/);
    await expect(page.getByRole('heading', { name: /Record Activity/i })).toBeVisible();
    await expect(page.getByText(/Observation Details/i)).toBeVisible();
  });

  test('Should fill out and save an Observation activity', async ({ page }) => {
    // Navigate to observation
    await page.getByRole('button', { name: /Observation/i }).click();
    await page.waitForURL(/\/user\/activity\/observation/);

    // Verify tank select is ready (should be auto-populated)
    const tankSelect = page.getByTestId('tank-select');
    await expect(tankSelect).toBeVisible();

    // Fill numerical fields
    await page.getByLabel(/Present Population/i).first().fill('100000');
    const commentsBox = page.locator('#observation-comments');
    await commentsBox.fill('E2E Test - Everything looks good');

    // Click Save
    await page.getByTestId('save-activity-button').click();

    // Verify success feedback
    await expect(page.getByText(/recorded/i)).toBeVisible();
    
    // Redirect back to dashboard
    await expect(page).toHaveURL(/\/user\/dashboard/, { timeout: 10000 });
  });

  test('Should view Daily Report', async ({ page }) => {
    // Ensure grid is ready
    const dailyReportBtn = page.getByTestId('daily-report-button');
    await expect(dailyReportBtn).toBeVisible({ timeout: 15000 });
    await dailyReportBtn.click();
    
    await expect(page).toHaveURL(/\/user\/daily-report/);
    await expect(page.getByRole('heading', { name: /Daily Report/i })).toBeVisible();
  });
});

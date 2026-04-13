import { test, expect } from '@playwright/test';

test.describe('Owner Journey - Dashboard & Management', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Unified Login
    await page.goto('/login');
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button:has-text("Sign In")');
    await expect(page).toHaveURL(/\/owner\/dashboard/);
  });

  test('Should toggle between LRT and MATURATION modules', async ({ page }) => {
    // Check initial state (LRT by default)
    const lrtTrigger = page.getByRole('tab', { name: 'LRT' });
    const maturationTrigger = page.getByRole('tab', { name: 'MATURATION' });

    await expect(lrtTrigger).toBeVisible();
    await expect(maturationTrigger).toBeVisible();

    // Switch to MATURATION
    await maturationTrigger.click();
    
    // Check for either the Broodstock Batch selector OR the "No farms" message
    const maturationContent = page.getByText(/Broodstock Batch/i).or(page.getByText(/No Maturation Farms/i));
    await expect(maturationContent).toBeVisible();

    // Switch back to LRT
    await lrtTrigger.click();
    const lrtContent = page.getByText(/Active Farm/i);
    await expect(lrtContent).toBeVisible();
  });

  test('Should navigate to Manage Farms and show table', async ({ page }) => {
    // Open profile menu
    await page.locator('button:has(svg.lucide-user)').click();
    
    // Click Manage Farms
    await page.click('text=Manage Farms');
    await expect(page).toHaveURL(/\/owner\/farms/);
    
    // Check for page title
    await expect(page.getByRole('heading', { name: 'Manage Farms', exact: true })).toBeVisible();
  });

  test('Should navigate to Manage Users', async ({ page }) => {
    await page.locator('button:has(svg.lucide-user)').click();
    await page.click('text=Manage Users');
    await expect(page).toHaveURL(/\/owner\/manage-users/);
    await expect(page.getByRole('heading', { name: 'Manage Users' })).toBeVisible();
  });

  test('Should navigate to Consolidated Reports', async ({ page }) => {
    await page.locator('button:has(svg.lucide-user)').click();
    await page.click('text=Consolidated Reports');
    await expect(page).toHaveURL(/\/owner\/consolidated-reports/);
    await expect(page.getByRole('heading', { name: 'Consolidated Reports' })).toBeVisible();
  });
});

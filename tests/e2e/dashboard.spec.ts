import { test, expect } from '@playwright/test';

test.describe('User Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login as legacy admin
    await page.goto('/login');
    await page.fill('input[placeholder*="username" i]', 'admin');
    await page.fill('input[placeholder*="password" i]', 'admin123');
    await page.click('button:has-text("Sign In")');
    await expect(page).toHaveURL('/user/dashboard');
  });

  test('should display major module tabs and switch between them', async ({ page }) => {
    const lrtTab = page.getByRole('tab', { name: /LRT/i });
    const maturationTab = page.getByRole('tab', { name: /MATURATION/i });

    await expect(lrtTab).toBeVisible();
    await expect(maturationTab).toBeVisible();

    // Switch to Maturation
    await maturationTab.click();
    await expect(page.getByText(/Maturation Portal/i)).toBeVisible();
  });

  test('should filter out Artemia and Algae cards in Maturation module', async ({ page }) => {
    // In LRT mode (default), Artemia/Algae should be visible
    await expect(page.getByText('Artemia')).toBeVisible();
    await expect(page.getByText('Algae')).toBeVisible();

    // Switch to Maturation
    await page.getByRole('tab', { name: /MATURATION/i }).click();

    // They should be gone
    await expect(page.getByText('Artemia')).not.toBeVisible();
    await expect(page.getByText('Algae')).not.toBeVisible();
  });

  test('should navigate to activity recording page on card click', async ({ page }) => {
    // Click Feed from dashboard
    await page.getByRole('button', { name: 'Feed' }).click();
    await expect(page).toHaveURL(/\/user\/activity\/feed/);
    
    // It could be "Record Activity" or "Plan Activity" depending on role
    const heading = page.getByTestId('main-heading');
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText(/Activity/i);
  });
});

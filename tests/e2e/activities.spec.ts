import { test, expect } from '@playwright/test';

test.describe('Activity Recording Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as legacy admin
    await page.goto('/login');
    await page.fill('input[placeholder*="username" i]', 'admin');
    await page.fill('input[placeholder*="password" i]', 'admin123');
    await page.click('button:has-text("Sign In")');
    await expect(page).toHaveURL('/user/dashboard');
  });

  test('should record a Feed activity instruction', async ({ page }) => {
    // Click Feed from dashboard
    await page.getByRole('button', { name: 'Feed' }).click();
    await expect(page).toHaveURL(/\/user\/activity\/feed/);

    // 1. Select Section
    // Use the data-testid we added
    const sectionSelect = page.getByTestId('section-select');
    await sectionSelect.click();
    await page.getByRole('option').first().click();

    // 2. Select Tank
    const tankSelect = page.getByTestId('tank-select');
    await tankSelect.click();
    await page.getByRole('option').first().click();

    // 3. Fill Feed Data
    await page.fill('input[placeholder*="quantity" i]', '5.5');
    
    // 4. Enter Instructions
    await page.fill('textarea[id="comments"]', 'Test instructions'); // Use the ID we added

    // 5. Save
    const saveButton = page.getByTestId('save-activity-button');
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // 6. Verify redirect back to dashboard
    await expect(page).toHaveURL('/user/dashboard');
  });

  test('should verify Harvest form calculations', async ({ page }) => {
    await page.getByRole('button', { name: 'Harvest' }).click();
    await expect(page).toHaveURL(/\/user\/activity\/harvest/);

    // Toggle to Bag Mode (Switch usually has role checkbox or similar, 
    // but in shadcn it's a button with role switch)
    const switchElement = page.getByRole('switch');
    await switchElement.click();

    // Fill Bag data using IDs we added
    await page.fill('input[id="bag-size"]', '100');
    await page.fill('input[id="bag-count"]', '10');

    // Harvested population should auto-calculate to 1000
    // (This is an internal calculation but we check the result field via ID)
    const harvestedInput = page.locator('input[id="harvest-pop"]');
    await expect(harvestedInput).toHaveValue('1000');
  });
});

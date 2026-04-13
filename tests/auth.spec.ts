import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('Successful login with admin credentials should redirect to owner dashboard', async ({ page }) => {
    await page.goto('/login');

    // Fill credentials
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    
    // Click login
    await page.click('button:has-text("Sign In")');

    // Wait for navigation
    await expect(page).toHaveURL(/\/owner\/dashboard/);
    
    // Verify dashboard content
    await expect(page.getByText(/Owner Portal/i)).toBeVisible();
  });

  test('Login with invalid credentials should show error toast', async ({ page }) => {
    await page.goto('/login');

    await page.fill('#username', 'wronguser');
    await page.fill('#password', 'wrongpass');
    
    await page.click('button:has-text("Sign In")');

    // Check for error toast
    await expect(page.getByText(/Account doesn't exist/i).or(page.getByText(/Invalid credentials/i))).toBeVisible();
  });

  test('Logout should redirect back to login page', async ({ page }) => {
    // 1. Perform login first
    await page.goto('/login');
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button:has-text("Sign In")');
    await expect(page).toHaveURL(/\/owner\/dashboard/);

    // 2. Click profile dropdown
    await page.getByRole('button', { name: /hatchery/i }).or(page.locator('button:has(svg.lucide-user)')).click();
    
    // 3. Click logout
    await page.click('text=Logout');
    
    // 4. Verify redirect
    await expect(page).toHaveURL(/\/login/);
  });
});

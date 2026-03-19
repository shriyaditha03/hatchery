import { test, expect } from '@playwright/test';

test.describe('Basic Navigation', () => {
    test('should load the splash screen or login page', async ({ page }) => {
        await page.goto('/');
        // Since the splash screen redirects to /login, we check for presence of main heading
        // which could be "Shrimpit" or "AquaNexus Login"
        await expect(page.locator('h1')).toBeVisible();
    });

    test('should navigate to the login page', async ({ page }) => {
        await page.goto('/login');
        await expect(page).toHaveURL('/login');
        
        const usernameInput = page.locator('#username');
        const passwordInput = page.locator('#password');
        
        // Wait for inputs to be attached and visible
        await expect(usernameInput).toBeVisible({ timeout: 10000 });
        await expect(passwordInput).toBeVisible({ timeout: 10000 });
    });

    test('should show a not found page for invalid routes', async ({ page }) => {
        await page.goto('/some-non-existent-page-12345');
        await expect(page.locator('text=/not found/i').first()).toBeVisible();
    });
});

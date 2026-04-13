import { test, expect } from '@playwright/test';

test.describe('Smoke & Stability Tests', () => {
  // Collection for console errors
  let consoleErrors: string[] = [];

  test.beforeEach(({ page }) => {
    consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.startsWith('404 Error')) return; // Ignore intentional 404 logging
        consoleErrors.push(text);
      }
    });
    page.on('pageerror', exception => {
      consoleErrors.push(exception.message);
    });
  });

  const routes = [
    '/',
    '/login',
    '/owner/signup',
  ];

  for (const route of routes) {
    test(`Route "${route}" should load without console errors`, async ({ page }) => {
      await page.goto(route);
      
      // Wait for layout to be stable
      await page.waitForLoadState('networkidle');

      // Check for console errors
      // Note: We ignore some common external errors like chrome-extension issues if they appear
      const criticalErrors = consoleErrors.filter(err => 
        !err.includes('chrome-extension') && 
        !err.includes('favicon.ico')
      );
      
      expect(criticalErrors, `Detected console errors on route ${route}:\n${criticalErrors.join('\n')}`).toHaveLength(0);
      
      // Verify basic content exists (not a blank page)
      const bodyText = await page.innerText('body');
      expect(bodyText.length).toBeGreaterThan(10);
    });
  }

  test('Non-existent route should show 404 page', async ({ page }) => {
    await page.goto('/some-page-that-does-not-exist');
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
  });
});

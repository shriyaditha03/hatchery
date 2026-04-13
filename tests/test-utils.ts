import { Page, expect } from '@playwright/test';

export async function login(page: Page, role: 'worker' | 'admin' = 'worker') {
  await page.goto('/login');
  if (role === 'worker') {
    await page.fill('#username', 'worker');
    await page.fill('#password', 'worker123');
  } else {
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
  }
  await page.click('button:has-text("Sign In")');
  
  const expectedUrl = role === 'admin' ? /\/owner\/dashboard/ : /\/user\/dashboard/;
  await page.waitForURL(expectedUrl);
}

export async function selectMaturationModule(page: Page) {
  const maturationTrigger = page.getByRole('tab', { name: 'MATURATION' });
  await maturationTrigger.click();
  // Wait for context to load
  await expect(page.getByText(/Active Broodstock Batch/i).or(page.getByText(/No Maturation Farms/i))).toBeVisible();
}

export async function navigateToActivity(page: Page, activityName: string) {
  // Relaxed name matching to handle icons and whitespace better
  const activityBtn = page.getByRole('button', { name: activityName, exact: false });
  await expect(activityBtn).toBeVisible({ timeout: 10000 });
  await activityBtn.click();
  
  // Wait for the Record Activity page to load
  await expect(page.getByRole('heading', { name: /Record Activity/i })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(activityName)).toBeVisible({ timeout: 10000 });
}

export async function fillCommonFields(page: Page, comments: string = 'E2E Test') {
  const commentsBox = page.getByPlaceholder(/Add notes|Add instructions/i);
  await commentsBox.fill(comments);
}

export async function saveAndVerify(page: Page) {
  const saveBtn = page.getByTestId('save-activity-button');
  await saveBtn.click();
  
  // Check for success toast
  await expect(page.getByText(/recorded|scheduled/i)).toBeVisible();
  
  // Wait for redirect to dashboard
  await page.waitForURL(/\/dashboard/);
}

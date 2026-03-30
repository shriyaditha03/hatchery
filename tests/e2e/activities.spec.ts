import { test, expect } from '@playwright/test';
import { setupSupervisorMocks } from './helpers/mockSupabase';

test.describe('Activities E2E Workflow', () => {
    test.beforeEach(async ({ page }) => {
        await setupSupervisorMocks(page);
    });

    test('should allow Harvest form interaction and manual override', async ({ page }) => {
        await page.goto('/user/activity/harvest');
        await expect(page.locator('text=Harvest Details').first()).toBeVisible({ timeout: 15000 });

        const toHarvestInput = page.getByPlaceholder('Enter harvested number');
        await expect(toHarvestInput).toBeVisible();

        await page.getByRole('switch').click();
        await expect(page.getByPlaceholder('Qty per bag')).toBeVisible();
    });

    test('should show Tank Shifting form fields and dynamic destination adding', async ({ page }) => {
        await page.goto('/user/activity/shifting');
        await expect(page.getByText('Tank Shifting Details', { exact: true })).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('Destination 1', { exact: true })).toBeVisible({ timeout: 10000 });

        await page.getByRole('button', { name: /Add Tank/i }).click();
        await expect(page.getByText('Destination 2', { exact: true })).toBeVisible();
    });

    test('should show Assign To field in Supervisor Planning mode', async ({ page }) => {
        await page.goto('/user/activity/feed?mode=instruction');
        await expect(page.getByText('1. Assign To (Optional)')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('Anyone (Open Instruction)')).toBeVisible();
    });
});

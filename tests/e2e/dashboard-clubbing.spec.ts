import { test, expect } from '@playwright/test';
import { setupSupervisorMocks } from './helpers/mockSupabase';

const tanks = [{ id: 't1', name: 'Tank 1' }, { id: 't2', name: 'Tank 2' }];

test.describe('Dashboard Clubbing / Section-Wide Instruction E2E', () => {
    test.beforeEach(async ({ page }) => {
        await setupSupervisorMocks(page, tanks);
    });

    test('Planning "All Tanks" should create exactly one Section-Wide record', async ({ page }) => {
        let postData: any = null;

        // Override the activity_charts mock to capture POST data
        await page.route('**/rest/v1/activity_charts*', async (route, request) => {
            if (request.method() === 'POST') {
                postData = JSON.parse(request.postData() || '[]');
                await route.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
            } else {
                await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
            }
        });

        await page.goto('/user/activity/feed?mode=instruction');

        // Wait for planning mode indicator (Assign To is only shown in planning mode)
        await expect(page.getByText('1. Assign To (Optional)')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('Schedule Time')).toBeVisible({ timeout: 5000 });

        // Select section using data-testid
        await page.getByTestId('section-select').click();
        await page.getByRole('option', { name: 'Test Farm - Section 1' }).click();

        // Switch to "All Tanks in Section" scope
        await page.getByTestId('all-tanks-tab').click();

        // Fill required feed fields
        await page.getByPlaceholder('e.g., Artemia, Flakes').fill('Test Feed');
        await page.getByPlaceholder('Amount').fill('100');

        // Select time slot
        await page.getByPlaceholder('Select time slot').click();
        await page.getByRole('option', { name: '8am - 12pm' }).click();

        // Save
        await page.getByRole('button', { name: /Save Instruction/i }).click();

        // Verify POST captured and has exactly 1 section-wide record
        await expect.poll(() => postData, { timeout: 10000 }).toBeTruthy();
        expect(Array.isArray(postData)).toBe(true);
        expect(postData.length).toBe(1);
        expect(postData[0].tank_id).toBeNull();
        expect(postData[0].section_id).toBe('sec1');
        expect(postData[0].farm_id).toBe('farm1');
    });
});

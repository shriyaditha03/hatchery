import { test, expect } from '@playwright/test';
import { setupSupervisorMocks } from './helpers/mockSupabase';

// 3 tanks: t1 and t2 stocked (in get_active_tank_populations), t3 is empty
const tanks = [{ id: 't1', name: 'Tank 1' }, { id: 't2', name: 'Tank 2' }, { id: 't3', name: 'Tank 3' }];

test.describe('Tank Shifting E2E Workflow', () => {
    test.beforeEach(async ({ page }) => {
        await setupSupervisorMocks(page, tanks);

        // Override the activity logs mock to return population data for t2 auto-population
        await page.route('**/rest/v1/activity_logs*', (route) => {
            route.fulfill({
                status: 200, contentType: 'application/json',
                body: JSON.stringify([{ data: { presentPopulation: '500' }, activity_type: 'Observation', tank_id: 't2' }])
            });
        });

        // Override active populations: only t1 (1000) and t2 (500) have stock — t3 is empty
        await page.route('**/rpc/get_active_tank_populations*', (route) => {
            route.fulfill({
                status: 200, contentType: 'application/json',
                body: JSON.stringify([{ tank_id: 't1', current_population: 1000 }, { tank_id: 't2', current_population: 500 }])
            });
        });
    });

    test('Warning triggers when selecting a populated destination, and filters source', async ({ page }) => {
        let dialogFired = false;
        page.on('dialog', async (dialog) => {
            dialogFired = true;
            expect(dialog.message()).toContain('You are mixing 2 Tanks');
            await dialog.accept();
        });

        await page.goto('/user/activity/shifting?mode=activity');

        // Wait for the section selector to appear (confirms user is logged in & page loaded)
        await expect(page.getByTestId('section-select')).toBeVisible({ timeout: 15000 });

        // Select source section
        await page.getByTestId('section-select').click();
        await page.getByRole('option', { name: 'Test Farm - Section 1' }).click();

        // Select source tank (Tank 1, stocked)
        await page.getByTestId('tank-select').click();
        await page.getByRole('option', { name: 'Tank 1' }).click();

        // Tank Shifting Details form should appear
        await expect(page.getByText('Tank Shifting Details')).toBeVisible({ timeout: 10000 });

        // Select destination section
        await page.getByTestId('dest-section-select').click();
        await page.getByRole('option', { name: 'Test Farm - Section 1' }).click();

        // Open destination tank dropdown
        await page.getByTestId('dest-tank-select').click();

        // Source tank (Tank 1) should NOT be in the destination dropdown
        await expect(page.getByRole('option', { name: 'Tank 1' })).toHaveCount(0);

        // Select Tank 2 (stocked — triggers mixing warning)
        await page.getByRole('option', { name: 'Tank 2' }).click();

        // Dialog should have fired with mixing warning
        expect(dialogFired).toBe(true);

        // Current population input auto-populated with 500 (from mocked activity_logs)
        await expect(page.getByRole('spinbutton').first()).toHaveValue('500', { timeout: 5000 });
    });
});

import { test, expect } from '@playwright/test';

test.describe('Activities E2E Workflow', () => {
    // Intercept Supabase requests to simulate a logged-in supervisor user
    test.beforeEach(async ({ page }) => {
        // Mock auth/session
        await page.route('**/auth/v1/**', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    access_token: 'fake-token',
                    user: {
                        id: 'fake-user-id',
                        email: 'test_supervisor@example.com',
                        user_metadata: { role: 'supervisor' }
                    }
                })
            });
        });

        // Mock profiles
        await page.route('**/rest/v1/profiles*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    { id: 'fake-user-id', role: 'supervisor', hatchery_id: 'fake-hatchery', full_name: 'Test Supervisor' },
                    { id: 'worker-id', role: 'worker', hatchery_id: 'fake-hatchery', full_name: 'Test Worker' }
                ])
            });
        });

        // Mock farm access
        await page.route('**/rest/v1/farm_access*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([{
                    farm_id: 'farm1',
                    farms: {
                        name: 'Test Farm',
                        sections: [{ id: 'sec1', name: 'Section 1', tanks: [{ id: 't1', name: 'Tank 1' }] }]
                    }
                }])
            });
        });

        // Set localStorage for mock session just in case
        await page.addInitScript(() => {
            window.localStorage.setItem('supabase.auth.token', JSON.stringify({
                currentSession: {
                    access_token: 'fake-token',
                    user: { id: 'fake-user-id', user_metadata: { role: 'supervisor' } }
                }
            }));
        });
    });

    test('should allow Harvest form interaction and manual override', async ({ page }) => {
        // Navigate with Harvest parameter
        await page.goto('/record-activity?type=harvest');

        // Wait for dynamic React mount
        await expect(page.locator('text=Harvest Details').first()).toBeVisible({ timeout: 10000 });

        // Verify "3. To Harvest *" field is visible
        const toHarvestInput = page.getByPlaceholder('Enter harvested number');
        await expect(toHarvestInput).toBeVisible();

        // Verify "Spoon / Bag Count" mode toggle works
        await page.getByRole('switch').click();
        const bagSizeInput = page.getByPlaceholder('Qty per bag');
        await expect(bagSizeInput).toBeVisible();
    });

    test('should show Tank Shifting form fields and dynamic destination adding', async ({ page }) => {
        // Navigate with Tank Shifting parameter
        await page.goto('/record-activity?type=shifting');

        await expect(page.getByText('Tank Shifting Details', { exact: true })).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Destination 1', { exact: true })).toBeVisible({ timeout: 10000 });

        // Click 'Add Tank'
        const addBtn = page.getByRole('button', { name: /Add Tank/i });
        await expect(addBtn).toBeVisible();
        await addBtn.click();

        // Should now have Destination 2
        await expect(page.getByText('Destination 2', { exact: true })).toBeVisible();
    });

    test('should show Assign To field in Supervisor Planning mode', async ({ page }) => {
        // mode=instruction triggers Planning Mode manually (Supervisor role also does by default in some configurations)
        await page.goto('/record-activity?mode=instruction');

        const assignField = page.getByText('1. Assign To (Optional)');
        await expect(assignField).toBeVisible({ timeout: 10000 });
        
        const dropdown = page.getByText('Anyone (Open Instruction)');
        await expect(dropdown).toBeVisible();
    });
});

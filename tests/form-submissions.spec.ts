import { test, expect } from '@playwright/test';
import { login, navigateToActivity, fillCommonFields, saveAndVerify, selectMaturationModule } from './test-utils';

test.describe('Consolidated Form Submissions', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'worker');
    // Ensure farm auto-selection settled
    await expect(page.getByTestId('farm-select')).toContainText(/Sunrise Main Farm/i, { timeout: 15000 });
  });

  // --- LRT MODULE ACTIVITIES ---
  test.describe('LRT Module', () => {
    const activities = [
      'Feed', 'Treatment', 'Water Quality', 'Animal Quality', 
      'Stocking', 'Observation', 'Artemia', 'Algae', 
      'Harvest', 'Tank Shifting'
    ];

    for (const activity of activities) {
      test(`Should submit ${activity} form`, async ({ page }) => {
        await navigateToActivity(page, activity);

        // Fill minimal required data per activity type if needed
        if (activity === 'Feed') {
          await page.getByLabel(/Time Slot/i).click();
          await page.getByLabel(/8am - 12pm/i).click();
          await page.getByLabel(/Feed Type/i).click();
          await page.getByRole('option').first().click();
          await page.getByPlaceholder(/0.0/i).fill('5');
        } else if (activity === 'Treatment') {
          await page.getByLabel(/Time Slot/i).click();
          await page.getByLabel(/8am - 12pm/i).click();
          await page.getByLabel(/Treatment Type/i).click();
          await page.getByRole('option').first().click();
          await page.getByPlaceholder(/0.0/i).fill('100');
        } else if (activity === 'Water Quality') {
          await page.getByLabel(/Temp/i).fill('28');
          await page.getByLabel(/Salinity/i).fill('30');
        } else if (activity === 'Animal Quality') {
          await page.getByPlaceholder(/Enter Stage/i).fill('PL10');
          await page.locator(`button:has-text("10")`).first().click();
        } else if (activity === 'Stocking') {
          await page.getByLabel(/Stocking ID/i).fill('STOCK-E2E');
          await page.getByLabel(/Actual Population Stocked/i).first().fill('100000');
        } else if (activity === 'Observation') {
          await page.getByLabel(/Present Population/i).first().fill('100000');
        } else if (activity === 'Algae') {
          await page.getByLabel(/Algae Species/i).click();
          await page.getByRole('option').first().click();
          await page.getByPlaceholder(/e.g. 20L/i).fill('20L');
        } else if (activity === 'Artemia') {
          await page.getByLabel(/Sample ID/i).fill('ART-E2E');
          await page.getByPlaceholder(/0.0/i).first().fill('1');
        } else if (activity === 'Harvest') {
          await page.getByLabel(/Harvested Population/i).fill('50000');
        } else if (activity === 'Tank Shifting') {
          await page.getByLabel(/Source Population before Shift/i).fill('100000');
          await page.getByPlaceholder(/Search tank/i).fill('T2');
          await page.getByRole('option', { name: 'T2' }).click();
          await page.getByPlaceholder(/0.0/i).fill('50000');
        }

        await fillCommonFields(page, `E2E Submit Test - ${activity}`);
        await saveAndVerify(page);
      });
    }
  });

  // --- MATURATION MODULE ACTIVITIES ---
  test.describe('Maturation Module', () => {
    test.beforeEach(async ({ page }) => {
      await selectMaturationModule(page);
    });

    const activities = [
      'Sourcing & Mating', 'Spawning', 'Egg Count', 
      'Nauplii Harvest', 'Nauplii Sale', 'Broodstock Discard'
    ];

    for (const activity of activities) {
      test(`Should submit ${activity} form`, async ({ page }) => {
        await navigateToActivity(page, activity);

        if (activity === 'Sourcing & Mating') {
          await page.getByLabel(/Mating Tank/i).click();
          await page.getByRole('option').first().click();
          await page.getByPlaceholder(/0/i).first().fill('100');
        } else if (activity === 'Spawning') {
          await page.getByLabel(/Select Spawning Tank/i).click();
          await page.getByRole('option').first().click();
          await page.getByPlaceholder(/0/i).first().fill('50');
        } else if (activity === 'Egg Count') {
          await page.getByPlaceholder(/0.0/i).first().fill('4.0');
          await page.getByPlaceholder(/0.0/i).nth(1).fill('3.5');
        } else if (activity === 'Nauplii Harvest') {
          await page.getByPlaceholder(/0.0/i).first().fill('3.0');
          await page.getByPlaceholder(/Search tank/i).fill('N1');
          await page.getByRole('option', { name: 'N1' }).click();
          await page.getByPlaceholder(/0.0/i).nth(1).fill('3.0');
        } else if (activity === 'Nauplii Sale') {
          await page.getByLabel(/Choose Batch/i).click();
          await page.getByRole('option').first().click();
          await page.getByPlaceholder(/0.0/i).first().fill('2.5');
        } else if (activity === 'Broodstock Discard') {
          await page.getByLabel(/Discard Reason/i).fill('E2E Test Discard');
        }

        await fillCommonFields(page, `E2E Submit Test - Maturation - ${activity}`);
        await saveAndVerify(page);
      });
    }
  });
});

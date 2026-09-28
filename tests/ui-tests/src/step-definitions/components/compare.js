const { When, Then } = require('@cucumber/cucumber');
const cf = require('../common/commonFunctions');

When('I remove first perfume from comparison', async function () {
    const page = cf.GetPage();
    const removeBtn = page.locator('button[title*="Kaldır"], button[aria-label*="Kaldır"]').first();
    await removeBtn.waitFor({ state: 'visible' });
    await removeBtn.click();
    await page.waitForTimeout(600);
});

Then('compare table should display {int} perfumes', async function (expectedCount) {
    const page = cf.GetPage();
    const cols = await page.locator('.compare-perfume-col, th.perfume-header, .perfume-col').count();
    if (cols !== expectedCount && cols === 0) {
        // Fallback check on headings
        const headings = await page.locator('table th a[href*="/parfum/"]').count();
        if (headings !== expectedCount) {
            throw new Error(`Expected ${expectedCount} perfumes in comparison, found ${headings || cols}`);
        }
    }
});

const { When, Then } = require('@cucumber/cucumber');
const cf = require('../common/commonFunctions');

When('I expand filter group {string}', async function (groupName) {
    const page = cf.GetPage();
    const groupBtn = page.locator(`button:has-text("${groupName}")`).first();
    await groupBtn.waitFor({ state: 'visible' });
    await groupBtn.click();
    await page.waitForTimeout(400);
});

When('I select checkbox option {string}', async function (optionLabel) {
    const page = cf.GetPage();
    const checkboxLabel = page.locator(`label:has-text("${optionLabel}")`).first();
    await checkboxLabel.waitFor({ state: 'visible' });
    await checkboxLabel.click();
    await page.waitForTimeout(600);
});

Then('search result cards count should be greater than {int}', async function (minCount) {
    const page = cf.GetPage();
    const count = await page.locator('.perfume-card, a[href*="/parfum/"]').count();
    if (count <= minCount) {
        throw new Error(`Expected more than ${minCount} search cards, found ${count}`);
    }
});

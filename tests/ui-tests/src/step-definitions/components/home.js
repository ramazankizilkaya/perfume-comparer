const { When, Then } = require('@cucumber/cucumber');
const cf = require('../common/commonFunctions');

When('I select gender preference as {string}', async function (genderName) {
    const page = cf.GetPage();
    await cf.ClickElement('Gender Dropdown Button');
    const optSelector = `.gender-opt:has-text("${genderName}")`;
    const opt = page.locator(optSelector).first();
    await opt.waitFor({ state: 'visible' });
    await opt.click();
    await page.waitForTimeout(500);
});

When('I toggle theme between light and dark mode', async function () {
    const page = cf.GetPage();
    const wasDark = await page.evaluate(() => document.body.classList.contains('dark-mode'));
    await cf.ClickElement('Theme Toggle Button');
    await page.waitForTimeout(400);
    const isDark = await page.evaluate(() => document.body.classList.contains('dark-mode'));
    if (wasDark === isDark) {
        throw new Error('Theme toggle failed: dark-mode class did not change');
    }
});

When('I toggle the mobile menu drawer', async function () {
    const page = cf.GetPage();
    const toggle = page.locator('.mobile-menu-toggle').first();
    if (await toggle.isVisible()) {
        await toggle.click();
        await page.waitForTimeout(400);
    }
});

Then('search suggestions should contain at least {int} results', async function (minCount) {
    const page = cf.GetPage();
    await page.waitForTimeout(600);
    const items = await page.locator('.ac-item, .autocomplete button, .autocomplete .ac-section').count();
    if (items < minCount) {
        throw new Error(`Expected at least ${minCount} suggestions, but got ${items}`);
    }
});

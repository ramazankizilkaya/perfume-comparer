const { When, Then } = require('@cucumber/cucumber');
const cf = require('../common/commonFunctions');

When('I sign in with developer mock login', async function () {
    const page = cf.GetPage();
    const btn = page.locator('button:has-text("Geliştirici girişi")').first();
    await btn.waitFor({ state: 'visible' });
    await btn.click();
    await page.waitForTimeout(1000);
});

Then('user session should be active in header', async function () {
    const page = cf.GetPage();
    const userMenu = page.locator('.user-btn, button[aria-label="Hesap"]').first();
    await userMenu.waitFor({ state: 'visible', timeout: 10000 });
});

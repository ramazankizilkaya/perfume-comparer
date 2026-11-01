const { When, Then } = require('@cucumber/cucumber');
const cf = require('../common/commonFunctions');

When('I open the login modal from the header', async function () {
    const page = cf.GetPage();
    if (cf.GetCurrentDevice() === 'mobile') {
        await page.locator('.mobile-menu-toggle').first().click();
        await page.locator('.mobile-login-link').first().click();
    } else {
        await page.locator('.user-menu .login-btn').first().click();
        await page.locator('.user-dropdown-link:has-text("Giriş Yap")').first().click();
    }
    await page.locator('.login-modal-card').first().waitFor({ state: 'visible' });
});

Then('element {string} should not be displayed', async function (elementName) {
    const page = cf.GetPage();
    await page.locator(cf.GetSelector(elementName)).first().waitFor({ state: 'hidden', timeout: 10000 });
});

When('I sign in with developer mock login', async function () {
    const page = cf.GetPage();
    const btn = page.locator('button:has-text("Geliştirici girişi")').first();
    await btn.waitFor({ state: 'visible' });
    await btn.click();
    await page.waitForTimeout(1000);
});

Then('user session should be active in header', async function () {
    const page = cf.GetPage();
    if (cf.GetCurrentDevice() === 'mobile') {
        // Mobilde hesap bilgisi başlıkta değil, hamburger menünün içindedir.
        await page.locator('.mobile-menu-toggle').first().click();
        await page.locator('.mobile-account-card').first().waitFor({ state: 'visible', timeout: 10000 });
        return;
    }
    const userMenu = page.locator('.user-btn, button[aria-label="Hesap"]').first();
    await userMenu.waitFor({ state: 'visible', timeout: 10000 });
});

const fs = require('fs');
const path = require('path');
const { When, Then } = require('@cucumber/cucumber');
const cf = require('../common/commonFunctions');
const { API_BASE_URL } = require('../common/constants');

function getAdminPanelPassword() {
    if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
    try {
        const file = path.resolve(__dirname, '../../../../../src/PerfumeComparer/appsettings.Local.json');
        return JSON.parse(fs.readFileSync(file, 'utf8'))?.Admin?.Password || '';
    } catch {
        return '';
    }
}

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
    if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(1000);
        return;
    }
    // LoginModal no longer renders a mock button; authenticate via /api/auth/dev-login and update auth-session
    await page.evaluate(async (apiBase) => {
        const res = await fetch(`${apiBase}/api/auth/dev-login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                name: 'UI Test Kullanici',
                email: `uitest.${Date.now()}@aura.local`,
            }),
        });
        const data = await res.json();
        if (data?.token && data?.user) {
            localStorage.setItem('auth-session', JSON.stringify({ token: data.token, user: data.user }));
            window.dispatchEvent(new StorageEvent('storage', { key: 'auth-session' }));
        }
    }, API_BASE_URL);
    await page.waitForTimeout(500);
});

When('I sign in to the admin panel with the configured password', async function () {
    const password = getAdminPanelPassword();
    if (!password) {
        throw new Error('Admin panel password is not configured in ADMIN_PASSWORD or appsettings.Local.json');
    }
    await cf.TypeText('Admin Login Prompt', password);
    await cf.ClickElement('Admin Login Submit');
});

Then('brand JSON-LD logo should be an absolute URL', async function () {
    const page = cf.GetPage();
    const logoUrl = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        for (const s of scripts) {
            try {
                const parsed = JSON.parse(s.textContent || '{}');
                if (parsed['@type'] === 'Brand') {
                    return parsed.logo || '';
                }
            } catch {
                // ignore
            }
        }
        return '';
    });
    if (!logoUrl.startsWith('http://') && !logoUrl.startsWith('https://')) {
        throw new Error(`Expected Brand JSON-LD logo to be an absolute http(s) URL, but got: "${logoUrl}"`);
    }
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

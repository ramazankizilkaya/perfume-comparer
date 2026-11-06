const { When, Then } = require('@cucumber/cucumber');
const cf = require('../common/commonFunctions');

// Mobilde cinsiyet, tema ve hesap seçenekleri başlıkta değil, hamburger menünün içindedir.
async function openMobileMenuIfCollapsed(page) {
    const panel = page.locator('.mobile-nav-panel');
    if (await panel.isVisible()) return;
    await page.locator('.mobile-menu-toggle').first().click();
    await panel.waitFor({ state: 'visible' });
}

When('I select gender preference as {string}', async function (genderName) {
    const page = cf.GetPage();
    const modal = page.locator('.gender-modal');
    if (!(await modal.isVisible())) {
        if (cf.GetCurrentDevice() === 'mobile') {
            await openMobileMenuIfCollapsed(page);
            await page.locator('.mobile-nav-link:has-text("Anasayfa Parfüm Tercihi")').first().click();
        } else {
            const dropdown = page.locator('.user-dropdown');
            if (!(await dropdown.isVisible())) {
                await page.locator('.user-menu .login-btn, .user-menu .user-btn').first().click();
                await dropdown.waitFor({ state: 'visible' });
            }
            await page.locator('.user-dropdown-link:has-text("Anasayfa Parfüm Tercihi")').first().click();
        }
        await modal.waitFor({ state: 'visible' });
    }
    const choice = page.locator(`.gender-choice:has-text("${genderName}")`).first();
    await choice.waitFor({ state: 'visible' });
    await choice.click();
    await page.locator('.gender-modal-save').first().click();
    await modal.waitFor({ state: 'hidden' });
    await page.waitForTimeout(400);
});

When('I toggle theme between light and dark mode', async function () {
    const page = cf.GetPage();
    if (cf.GetCurrentDevice() === 'mobile') {
        await openMobileMenuIfCollapsed(page);
    } else {
        const dropdown = page.locator('.user-dropdown');
        if (!(await dropdown.isVisible())) {
            await page.locator('.user-menu .login-btn, .user-menu .user-btn').first().click();
            await dropdown.waitFor({ state: 'visible' });
        }
    }
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

Then('header should show only the menu button', async function () {
    const page = cf.GetPage();
    const visible = await page
        .locator('.site-nav > *')
        .evaluateAll(els => els.filter(el => el.offsetParent !== null).map(el => el.className));
    if (visible.length !== 1 || !visible[0].includes('mobile-menu-toggle')) {
        throw new Error(`Expected only the menu button in the header, but found: ${visible.join(' | ')}`);
    }
});

Then('header menu should be in the same row as the logo', async function () {
    const page = cf.GetPage();
    const { logoBottom, logoRight, navTop, navLeft } = await page.evaluate(() => {
        const logo = document.querySelector('.header-inner .logo').getBoundingClientRect();
        const nav = document.querySelector('.header-inner .site-nav').getBoundingClientRect();
        return { logoBottom: logo.bottom, logoRight: logo.right, navTop: nav.top, navLeft: nav.left };
    });
    if (navTop >= logoBottom) {
        throw new Error(`The header menu wrapped below the logo (menu top ${Math.round(navTop)}px, logo bottom ${Math.round(logoBottom)}px)`);
    }
    if (navLeft < logoRight) {
        throw new Error(`The header menu overlaps the logo (menu left ${Math.round(navLeft)}px, logo right ${Math.round(logoRight)}px)`);
    }
});

Then('hamburger menu button should be hidden', async function () {
    const page = cf.GetPage();
    if (await page.locator('.mobile-menu-toggle').first().isVisible()) {
        throw new Error('Expected the hamburger menu button to be hidden, but it is visible');
    }
});

When('I remember the position of the header search bar', async function () {
    const page = cf.GetPage();
    this.searchBarTop = await page.evaluate(() => document.querySelector('.header-search-strip').getBoundingClientRect().top);
});

Then('the header search bar should be in the same position', async function () {
    const page = cf.GetPage();
    const top = await page.evaluate(() => document.querySelector('.header-search-strip').getBoundingClientRect().top);
    if (Math.round(top) !== Math.round(this.searchBarTop)) {
        throw new Error(`The page content moved when the menu opened (search bar top ${Math.round(this.searchBarTop)}px before, ${Math.round(top)}px after)`);
    }
});

Then('hamburger menu should list only {string}', async function (labels) {
    const page = cf.GetPage();
    const expected = labels.split(',').map(label => label.trim());
    const actual = await page
        .locator('.mobile-nav-links > a, .mobile-nav-links > button')
        .evaluateAll(els => els.filter(el => el.offsetParent !== null).map(el => el.textContent.trim()));
    if (actual.join('|') !== expected.join('|')) {
        throw new Error(`Expected the hamburger menu to list "${expected.join(', ')}", but it lists "${actual.join(', ')}"`);
    }
});

Then('hamburger menu should be at most {int} pixels wide', async function (maxWidth) {
    const page = cf.GetPage();
    const width = await page.locator('.mobile-nav-links').evaluate(el => el.getBoundingClientRect().width);
    if (width > maxWidth) {
        throw new Error(`Expected the hamburger menu to be at most ${maxWidth}px wide, but it is ${Math.round(width)}px`);
    }
});

When('I click outside the hamburger menu', async function () {
    const page = cf.GetPage();
    const { width, height } = page.viewportSize();
    await page.mouse.click(width / 2, height - 5);
});

When('I press the {string} key', async function (key) {
    await cf.GetPage().keyboard.press(key);
});

Then('hamburger menu should be closed', async function () {
    await cf.GetPage().locator('.mobile-nav-links').waitFor({ state: 'detached' });
});

Then('header logo should be at least {int} pixels wide', async function (minWidth) {
    const page = cf.GetPage();
    const width = await page
        .locator('.site-header .site-logo-img.light-only')
        .first()
        .evaluate(img => img.getBoundingClientRect().width);
    if (width < minWidth) {
        throw new Error(`Expected the header logo to be at least ${minWidth}px wide, but it is ${Math.round(width)}px`);
    }
});

Then('header logo should be {int} pixels high', async function (expectedHeight) {
    const page = cf.GetPage();
    const height = await page
        .locator('.site-header .site-logo-img.light-only')
        .first()
        .evaluate(img => img.getBoundingClientRect().height);
    if (Math.round(height) !== expectedHeight) {
        throw new Error(`Expected the header logo to be ${expectedHeight}px high, but it is ${Math.round(height)}px`);
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

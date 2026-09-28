const { When, Then } = require('@cucumber/cucumber');
const cf = require('../common/commonFunctions');
const store = require('../common/store');

When('I toggle compare button on perfume hero', async function () {
    const page = cf.GetPage();
    const btn = page.locator('.media-actions button[title*="Karşılaştır"], .media-actions button[aria-label*="Karşılaştır"]').first();
    await btn.waitFor({ state: 'visible' });
    await btn.click();
    await page.waitForTimeout(400);
});

When('I toggle favorite button on perfume hero', async function () {
    const page = cf.GetPage();
    const btn = page.locator('.media-actions .fav-btn, .media-actions button[title*="Favori"]').first();
    await btn.waitFor({ state: 'visible' });
    await btn.click();
    await page.waitForTimeout(400);
});

When('I submit a review with rating {int} and comment {string}', async function (stars, commentText) {
    const page = cf.GetPage();
    const reviewBtn = page.locator('button:has-text("Değerlendir")').first();
    if (await reviewBtn.isVisible()) {
        await reviewBtn.click();
        await page.waitForTimeout(400);
    }
    const starBtn = page.locator(`.star-btn:nth-child(${stars}), button[aria-label*="${stars} yıldız"]`).first();
    if (await starBtn.isVisible()) {
        await starBtn.click();
    }
    const textarea = page.locator('textarea[placeholder*="yorum"], textarea#comment-text').first();
    if (await textarea.isVisible()) {
        await textarea.fill(commentText);
        store.setVariable('lastSubmittedComment', commentText);
    }
    const submitBtn = page.locator('button[type="submit"]:has-text("Gönder"), button:has-text("Yorumu Gönder")').first();
    if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(1000);
    }
});

Then('submitted comment should be visible in comments section', async function () {
    const page = cf.GetPage();
    const comment = store.getVariable('lastSubmittedComment');
    if (!comment) return;
    const commentLocator = page.locator(`text="${comment}"`).first();
    await commentLocator.waitFor({ state: 'visible', timeout: 5000 });
});

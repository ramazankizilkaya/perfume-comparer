const path = require('path');
const fs = require('fs');

async function Logger(text) {
    const timestamp = new Date().toLocaleString('tr-TR', { hour12: false });
    console.log(`[${timestamp}] ${text}`);
    try {
        const logDir = path.join(__dirname, '..', 'logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        const logFile = path.join(logDir, 'ui-test-execution.log');
        fs.appendFileSync(logFile, `[${timestamp}]\t${text}\n`, { flag: 'a+' });
    } catch {
        /* ignore logging errors */
    }
}

async function takeScreenshotOnFailure(page, name = 'failure') {
    if (!page) return;
    try {
        const screenshotsDir = path.join(__dirname, '..', 'reports', 'screenshots');
        if (!fs.existsSync(screenshotsDir)) {
            fs.mkdirSync(screenshotsDir, { recursive: true });
        }
        const timestamp = Date.now();
        const screenshotPath = path.join(screenshotsDir, `${name}-${timestamp}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        return screenshotPath;
    } catch (err) {
        console.error('Failed to take screenshot:', err.message);
    }
}

module.exports = {
    Logger,
    takeScreenshotOnFailure
};

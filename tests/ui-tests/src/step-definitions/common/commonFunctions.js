const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const { chromium } = require('@playwright/test');
const { BASE_URL, SCREEN_SIZES, TIMEOUTS, PAGES } = require('./constants');
const store = require('./store');
const { Logger, takeScreenshotOnFailure } = require('../../../helpers/custom-helpers');

let selectorsCache = null;
const locatorsFilePath = path.resolve(__dirname, 'locators.yaml');

let browser = null;
let context = null;
let page = null;
let currentDevice = 'desktop';

function GetSelector(el, device = currentDevice) {
    const rawDirectPrefixes = ['/', '(', '#', '.', '[', 'textarea', 'input', 'button', 'a', 'h1', 'h2', 'h3', 'select', 'table'];
    if (rawDirectPrefixes.some(prefix => el.startsWith(prefix))) {
        return el;
    }
    if (!selectorsCache) {
        selectorsCache = yaml.load(fs.readFileSync(locatorsFilePath, 'utf8'));
    }
    if (!selectorsCache[el]) {
        throw new Error(`Locator "${el}" not found in locators.yaml file`);
    }
    const dev = device || currentDevice || 'desktop';
    const locator = selectorsCache[el][dev] || selectorsCache[el]['desktop'];
    if (!locator) {
        throw new Error(`Locator "${el}" does not have "${dev}" definition in locators.yaml`);
    }
    return locator;
}

async function InitBrowser() {
    if (!browser) {
        browser = await chromium.launch({ headless: true });
    }
    return browser;
}

async function CreatePage(viewport = SCREEN_SIZES.desktop) {
    await InitBrowser();
    if (context) {
        await context.close().catch(() => {});
    }
    context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height }
    });
    page = await context.newPage();
    return page;
}

function GetPage() {
    return page;
}

function GetCurrentDevice() {
    return currentDevice;
}

function SetCurrentDevice(device) {
    currentDevice = device;
}

async function SetScreenSize(device, width, height) {
    currentDevice = device;
    const w = parseInt(width, 10);
    const h = parseInt(height, 10);
    if (!page) {
        await CreatePage({ width: w, height: h });
    } else {
        await page.setViewportSize({ width: w, height: h });
    }
    Logger(`Screen size set to ${w}x${h} for device: ${device}`);
}

async function NavigateToPage(pageNameOrUrl) {
    if (!page) {
        await CreatePage();
    }
    const relative = PAGES[pageNameOrUrl] || pageNameOrUrl;
    const fullUrl = relative.startsWith('http') ? relative : `${BASE_URL}${relative}`;
    Logger(`Navigating to: ${fullUrl}`);
    await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: TIMEOUTS.long });
    await page.waitForTimeout(500);
}

async function ClickElement(elementName) {
    const selector = GetSelector(elementName);
    Logger(`Clicking element: "${elementName}" with selector: ${selector}`);
    const locator = page.locator(selector).first();
    await locator.waitFor({ state: 'visible', timeout: TIMEOUTS.medium });
    await locator.click();
    await page.waitForTimeout(400);
}

async function TypeText(elementName, text) {
    const selector = GetSelector(elementName);
    Logger(`Typing "${text}" into element: "${elementName}"`);
    const locator = page.locator(selector).first();
    await locator.waitFor({ state: 'visible', timeout: TIMEOUTS.medium });
    await locator.fill(text);
    await page.waitForTimeout(400);
}

async function AssertVisible(elementName) {
    const selector = GetSelector(elementName);
    Logger(`Asserting element visible: "${elementName}" with selector: ${selector}`);
    const locator = page.locator(selector).first();
    await locator.waitFor({ state: 'visible', timeout: TIMEOUTS.medium });
}

async function AssertTextContains(elementName, expectedText) {
    const selector = GetSelector(elementName);
    Logger(`Asserting element "${elementName}" contains text: "${expectedText}"`);
    const locator = page.locator(selector).first();
    await locator.waitFor({ state: 'visible', timeout: TIMEOUTS.medium });
    const actualText = await locator.innerText();
    if (!actualText.toLowerCase().includes(expectedText.toLowerCase())) {
        throw new Error(`Expected text "${expectedText}" not found in element "${elementName}". Actual text: "${actualText}"`);
    }
}

async function AssertElementsDisplayed(elementsString) {
    const elementNames = elementsString.split(',').map(s => s.trim()).filter(Boolean);
    for (const name of elementNames) {
        await AssertVisible(name);
    }
}

async function StoreCurrentUrl(key = 'storedUrl') {
    const currentUrl = page.url();
    store.setVariable(key, currentUrl);
    Logger(`Stored current URL as "${key}": ${currentUrl}`);
}

async function LaunchNewBrowserAndNavigateToStoredUrl(key = 'storedUrl') {
    const targetUrl = store.getVariable(key);
    if (!targetUrl) {
        throw new Error(`No stored URL found for key "${key}"`);
    }
    Logger(`Launching new browser context and navigating to stored URL: ${targetUrl}`);
    const viewport = SCREEN_SIZES[currentDevice] || SCREEN_SIZES.desktop;
    if (context) {
        await context.close().catch(() => {});
    }
    context = await browser.newContext({ viewport });
    page = await context.newPage();
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: TIMEOUTS.long });
    await page.waitForTimeout(600);
}

async function AssertNoHorizontalOverflow() {
    const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
    });
    if (overflow) {
        throw new Error('Horizontal overflow detected on the page');
    }
    Logger('Asserted: No horizontal overflow detected on page');
}

async function CloseBrowser() {
    if (context) {
        await context.close().catch(() => {});
        context = null;
    }
    if (browser) {
        await browser.close().catch(() => {});
        browser = null;
    }
}

module.exports = {
    GetSelector,
    InitBrowser,
    CreatePage,
    GetPage,
    GetCurrentDevice,
    SetCurrentDevice,
    SetScreenSize,
    NavigateToPage,
    ClickElement,
    TypeText,
    AssertVisible,
    AssertTextContains,
    AssertElementsDisplayed,
    StoreCurrentUrl,
    LaunchNewBrowserAndNavigateToStoredUrl,
    AssertNoHorizontalOverflow,
    CloseBrowser,
    takeScreenshotOnFailure
};

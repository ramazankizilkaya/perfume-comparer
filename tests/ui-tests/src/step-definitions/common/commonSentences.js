const { Given, When, Then } = require('@cucumber/cucumber');
const cf = require('./commonFunctions');
const store = require('./store');

//#region Screen & Viewport

Given('I set screen size to {string}x{string} for {string}', async function (width, height, device) {
    await cf.SetScreenSize(device, width, height);
});

//#endregion Screen & Viewport

//#region Navigation & Page Actions

Given('I navigate to {string} page', async function (pageName) {
    await cf.NavigateToPage(pageName);
});

When('I click on {string}', async function (elementName) {
    await cf.ClickElement(elementName);
});

When('I enter {string} into {string}', async function (text, elementName) {
    await cf.TypeText(elementName, text);
});

//#endregion Navigation & Page Actions

//#region Assertions

Then('element {string} should be displayed', async function (elementName) {
    await cf.AssertVisible(elementName);
});

Then('elements {string} should be displayed', async function (elementsString) {
    await cf.AssertElementsDisplayed(elementsString);
});

Then('element {string} should contain text {string}', async function (elementName, expectedText) {
    await cf.AssertTextContains(elementName, expectedText);
});

Then('no horizontal overflow should be detected on the page', async function () {
    await cf.AssertNoHorizontalOverflow();
});

//#endregion Assertions

//#region State Persistence & Multi-launch Re-verification

When('I store current url as {string}', async function (key) {
    await cf.StoreCurrentUrl(key);
});

When('in a new browser launch I navigate to stored url {string}', async function (key) {
    await cf.LaunchNewBrowserAndNavigateToStoredUrl(key);
});

//#endregion State Persistence & Multi-launch Re-verification

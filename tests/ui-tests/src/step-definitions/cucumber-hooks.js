const { Before, After, BeforeAll, AfterAll, setDefaultTimeout } = require('@cucumber/cucumber');
const cf = require('./common/commonFunctions');
const store = require('./common/store');
const { Logger, takeScreenshotOnFailure } = require('../../helpers/custom-helpers');

setDefaultTimeout(30000);

BeforeAll(async function () {
    Logger('==================================================');
    Logger('>> BeforeAll: Initializing Playwright browser');
    await cf.InitBrowser();
    store.clearStore();
    Logger('>> Variable store initialized');
});

Before(async function (scenario) {
    const scenarioName = scenario.pickle.name;
    const tags = (scenario.pickle.tags || []).map(t => t.name).join(', ');
    Logger('--------------------------------------------------');
    Logger(`>> Scenario START: ${scenarioName} [${tags}]`);
    await cf.CreatePage();
});

After(async function (scenario) {
    const scenarioName = scenario.pickle.name;
    const status = scenario.result ? scenario.result.status : 'UNKNOWN';
    const page = cf.GetPage();

    if (status !== 'PASSED') {
        const errorMsg = scenario.result?.message || scenario.result?.error || 'Unknown error';
        Logger(`!! Scenario FAILED: ${scenarioName}\n   Reason: ${errorMsg}`);
        await takeScreenshotOnFailure(page, scenarioName.replace(/[^a-zA-Z0-9_-]/g, '_'));
    } else {
        Logger(`>> Scenario PASSED: ${scenarioName}`);
    }
});

AfterAll(async function () {
    Logger('>> AfterAll: Closing Playwright browser');
    await cf.CloseBrowser();
    Logger('==================================================');
});

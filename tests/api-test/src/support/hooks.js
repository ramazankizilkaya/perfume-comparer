const { Before, After, BeforeAll, AfterAll, BeforeStep, AfterStep, setDefaultTimeout } = require('@cucumber/cucumber');
const { Logger, createLogFile } = require('../../helpers/customHelpers');

setDefaultTimeout(30000);

BeforeAll(function () {
    createLogFile();
});

// ── Before each scenario: set up API context ──
Before(async function (scenario) {
    const constants = require('../step-definitions/common/constants');
    await this.createApiContext(constants.BASE_URL);
    this.requestHeaders = { ...constants.DEFAULT_HEADERS };
    Logger(`${"─".repeat(80)}`);
    Logger(`▶ SCENARIO START: ${scenario.pickle.name}`);
    Logger(`${"─".repeat(80)}`);
});

// ── Before each step: log step start ──
BeforeStep(function (step) {
    const text = step.pickleStep?.text || '';
    Logger(`${"=".repeat(20)}>> [STARTED] ${text}`);
});

// ── After each step: log only failures ──
AfterStep(function (step) {
    const status = step.result?.status;
    if (status?.toUpperCase() !== 'PASSED') {
        const text = step.pickleStep?.text || '';
        Logger(`${"=".repeat(20)}>> [${status?.toUpperCase()}] ${text}`);
    }
});

// ── After each scenario: tear down + log result ──
After(async function (scenario) {
    const status = scenario.result?.status;
    const error = scenario.result?.message;

    if (error) {
        Logger(`[ERROR] ${error}`);
    }

    Logger(`${"─".repeat(80)}`);
    Logger(`■ SCENARIO ${status?.toUpperCase()}: ${scenario.pickle.name}`);
    Logger(`${"─".repeat(80)}`);

    await this.disposeApiContext();
    this.clearStore();
});

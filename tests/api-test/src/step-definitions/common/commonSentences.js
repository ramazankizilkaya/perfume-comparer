const { Given, When, Then } = require('@cucumber/cucumber');
const apiFunctions = require('./apiFunctions');
const constants = require('./constants');
const payloads = require('./payloads');
const ch = require('../../../helpers/customHelpers');

Given('I am authenticated', async function () {
    await apiFunctions.GetToken(this);
});

Given('I have an invalid authorization token', function () {
    this.setVar('token', 'invalid-tampered-jwt-token');
    this.requestHeaders['Authorization'] = 'Bearer invalid-tampered-jwt-token';
    ch.Logger('✓ Set invalid authorization token');
});

Given('I clear my authorization token', function () {
    this.setVar('token', null);
    delete this.requestHeaders['Authorization'];
    ch.Logger('✓ Cleared authorization token');
});

Given('perfume slug is {string}', function (slug) {
    this.setVar('perfumeSlug', slug);
    ch.Logger(`✓ Set perfumeSlug as "${slug}"`);
});

Given('brand slug is {string}', function (slug) {
    this.setVar('brandSlug', slug);
    ch.Logger(`✓ Set brandSlug as "${slug}"`);
});

Given('blog slug is {string}', function (slug) {
    this.setVar('blogSlug', slug);
    ch.Logger(`✓ Set blogSlug as "${slug}"`);
});

Given('search query is {string}', function (query) {
    this.setVar('query', query);
    ch.Logger(`✓ Set search query as "${query}"`);
});

Given('I omit the "X-Requested-With" header', function () {
    this.omitClientHeader = true;
    delete this.requestHeaders['X-Requested-With'];
    ch.Logger('✓ Omitted X-Requested-With header');
});

When('I send {int} rapid requests to {string} endpoint', async function (count, endpointName) {
    const url = constants.resolveEndpoint(endpointName);
    for (let i = 0; i < count; i++) {
        try {
            await apiFunctions.Requestor(this, 'GET', url, null, {}, null, `${endpointName} #${i + 1}`);
        } catch {
            // expected to hit rate limit
        }
    }
});

When('I obtain an antiforgery token', async function () {
    const url = constants.resolveEndpoint('Get AntiForgery Token');
    const entry = await apiFunctions.Requestor(this, 'GET', url, null, {}, 200, 'Get AntiForgery Token');
    const token = entry.responseBody.token;
    this.setVar('antiforgeryToken', token);
    ch.Logger(`✓ Stored AntiForgery token: ${token}`);
});

When('I send a "POST" request to {string} endpoint with valid antiforgery token', async function (endpointName) {
    const url = constants.resolveEndpoint(endpointName);
    const token = this.getVar('antiforgeryToken');
    await apiFunctions.Requestor(this, 'POST', url, {}, { 'X-XSRF-TOKEN': token }, null, endpointName);
});

When('I send a "POST" request to {string} endpoint with invalid antiforgery token', async function (endpointName) {
    const url = constants.resolveEndpoint(endpointName);
    await apiFunctions.Requestor(this, 'POST', url, {}, { 'X-XSRF-TOKEN': 'invalid-csrf-token' }, null, endpointName);
});

Given('I save {string} as {string}', function (path, varName) {
    const resolve = (obj, p) => p.split(/[.[\]]+/).filter(Boolean).reduce((acc, key) => acc?.[key], obj);
    let value = resolve(this.store, path);
    if (value === undefined && path.startsWith('requests')) {
        const requests = this.getVar('requests') || [];
        value = resolve({ requests }, path);
    }
    this.setVar(varName, value);
    ch.Logger(`✓ Stored variable ${varName} as "${value}"`);
});

When('I send a {string} request to {string} endpoint', async function (method, endpointName) {
    const perfumeSlug = this.getVar('perfumeSlug');
    const brandSlug = this.getVar('brandSlug');
    const blogSlug = this.getVar('blogSlug');
    const query = this.getVar('query');
    const url = constants.resolveEndpoint(endpointName, perfumeSlug, brandSlug, blogSlug, query);
    await apiFunctions.Requestor(this, method, url, null, {}, null, endpointName);
});

When('I send a {string} request to {string} endpoint with {string} payload', async function (method, endpointName, payloadName) {
    const perfumeSlug = this.getVar('perfumeSlug');
    const brandSlug = this.getVar('brandSlug');
    const blogSlug = this.getVar('blogSlug');
    const query = this.getVar('query');
    const url = constants.resolveEndpoint(endpointName, perfumeSlug, brandSlug, blogSlug, query);
    const body = payloads.payloads[payloadName] ? payloads.payloads[payloadName]() : {};
    await apiFunctions.Requestor(this, method, url, body, {}, null, payloadName);
});

Then('the response status should be {int}', function (expectedStatus) {
    apiFunctions.AssertStatus(this, expectedStatus);
});

Then('the response status should be {int} and should match {string} response scheme', function (expectedStatus, schemeName) {
    apiFunctions.AssertStatus(this, expectedStatus);
    const last = apiFunctions.GetRequest(this, -1);
    apiFunctions.ValidateResponseScheme(schemeName, last.responseBody);
});

Then('the response body should contain {string}', function (text) {
    apiFunctions.AssertBodyContains(this, text);
});

Then('the response body path {string} should be {string}', function (path, expectedValue) {
    apiFunctions.AssertBodyValueByKey(this, path, expectedValue);
});

Then('I should verify {string} is equal to {string}', function (pathA, pathB) {
    const resolve = (obj, p) => p.split(/[.[\]]+/).filter(Boolean).reduce((acc, key) => acc?.[key], obj);
    const context = { ...this.store, requests: this.getVar('requests') || [] };
    const valueA = resolve(context, pathA);
    const valueB = resolve(context, pathB);
    const deepEqual = (a, b) => JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
    function sortKeys(val) {
        if (Array.isArray(val)) return val.map(sortKeys);
        if (val !== null && typeof val === 'object') {
            return Object.keys(val).sort().reduce((acc, k) => { acc[k] = sortKeys(val[k]); return acc; }, {});
        }
        return val;
    }
    if (!deepEqual(valueA, valueB)) {
        const strA = typeof valueA === 'object' ? JSON.stringify(valueA) : String(valueA);
        const strB = typeof valueB === 'object' ? JSON.stringify(valueB) : String(valueB);
        throw new Error(`Verification failed:\n  ${pathA} = ${strA}\n  ${pathB} = ${strB}`);
    }
    ch.Logger(`✓ Confirmed that "${pathA}" is equal to "${pathB}"`);
});

Then('I print all store variables into logs', function () {
    const store = this.store || {};
    const keys = Object.keys(store);
    ch.Logger('── Store Variables ──────────────────────────');
    if (keys.length === 0) {
        ch.Logger('(store is empty)');
    } else {
        for (const k of keys) {
            const val = store[k];
            const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
            ch.Logger(`  ${k}: ${strVal}`);
        }
    }
    ch.Logger('─────────────────────────────────────────────');
});

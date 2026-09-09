const { expect } = require('@playwright/test');
const { Logger } = require('../../../helpers/customHelpers');
const { responseValidationSchemes } = require('./responseValidationSchemes');
const constants = require('./constants');
const payloads = require('./payloads');

async function GetToken(world) {
    const endpoint = constants.resolveEndpoint('Dev Login');
    const payload = payloads.payloads["Dev Login"]();

    const options = {
        headers: { ...world.requestHeaders },
        data: payload
    };

    const response = await world.apiContext.post(endpoint, options);
    const body = await response.json();

    if (response.status() !== 200 || !body.token) {
        throw new Error(`Authentication failed (${response.status()}): ${JSON.stringify(body)}`);
    }

    ValidateResponseScheme('Dev Login', body);
    world.setVar('token', body.token);
    world.setVar('currentUser', body.user);
    world.requestHeaders['Authorization'] = `Bearer ${body.token}`;
    Logger('✓ Authenticated successfully via Dev Login');
    return body.token;
}

async function Requestor(world, method, endpoint, body = null, headers = {}, expectedStatus = null, schemeName = null) {
    const token = world.getVar('token');
    const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};
    let mergedHeaders = { ...world.requestHeaders, ...authHeader, ...headers };
    if (world.omitClientHeader) {
        delete mergedHeaders['X-Requested-With'];
    }

    const options = { headers: mergedHeaders };
    if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        options.data = typeof body === 'string' ? JSON.parse(body) : body;
    }

    const start = Date.now();
    let response;
    switch (method.toUpperCase()) {
        case 'GET':
            response = await world.apiContext.get(endpoint, options);
            break;
        case 'POST':
            response = await world.apiContext.post(endpoint, options);
            break;
        case 'PUT':
            response = await world.apiContext.put(endpoint, options);
            break;
        case 'PATCH':
            response = await world.apiContext.patch(endpoint, options);
            break;
        case 'DELETE':
            response = await world.apiContext.delete(endpoint, options);
            break;
        default:
            throw new Error(`Unsupported HTTP method: ${method}`);
    }
    const duration = Date.now() - start;
    let responseBody;
    try {
        responseBody = await response.json();
    } catch {
        responseBody = await response.text();
    }

    const responseText = typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody);
    const payloadText = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : '';

    const sep = '*'.repeat(100);
    Logger(sep);
    Logger(`Method: ${method.toUpperCase()}`);
    Logger(`URL: ${world.baseURL}${endpoint}`);
    if (payloadText) Logger(`PAYLOAD: ${payloadText}`);
    Logger(`RESPONSE STATUS: ${response.status()}`);
    Logger(`RESPONSE PAYLOAD: ${responseText.substring(0, 1000)}${responseText.length > 1000 ? '...[truncated]' : ''}`);
    Logger(`DURATION: ${duration}ms`);
    Logger(sep);

    const actualStatus = response.status();
    if (expectedStatus !== null && actualStatus !== expectedStatus) {
        throw new Error(`Expected status ${expectedStatus} but got ${actualStatus}`);
    }

    const requestEntry = {
        requestName: schemeName,
        method: method.toUpperCase(),
        url: `${world.baseURL}${endpoint}`,
        payload: body,
        status: actualStatus,
        responseBody,
        duration
    };

    const requests = world.getVar('requests') || [];
    requests.push(requestEntry);
    world.setVar('requests', requests);

    return requestEntry;
}

function ValidateResponseScheme(name, payload) {
    const scheme = responseValidationSchemes[name];
    if (!scheme) {
        const message = `Response scheme "${name}" not found.`;
        Logger(message);
        throw new Error(message);
    }
    const { error } = scheme.validate(payload, { abortEarly: false, allowUnknown: true });
    if (error) {
        const message = `Response validation failed for "${name}": ${error.message}`;
        Logger(message);
        throw new Error(message);
    }
    Logger(`✓ Response validation passed for "${name}"`);
}

function AssertStatus(world, expectedStatus) {
    const last = GetRequest(world, -1);
    Logger(`AssertStatus started. Actual Status: "${last.status}", Expected Status: "${expectedStatus}"`);
    expect(last.status).toBe(expectedStatus);
}

function AssertBodyContains(world, text) {
    const last = GetRequest(world, -1);
    const bodyStr = typeof last.responseBody === 'string'
        ? last.responseBody
        : JSON.stringify(last.responseBody);
    expect(bodyStr).toContain(text);
    Logger(`✓ Response contains "${text}"`);
}

function AssertBodyValueByKey(world, path, expectedValue) {
    const last = GetRequest(world, -1);
    const actual = ExtractJsonPath(last.responseBody, path);
    Logger(`AssertBodyValueByKey started. Actual: "${String(actual)}", Expected: "${String(expectedValue)}"`);
    expect(String(actual)).toBe(String(expectedValue));
}

function ExtractJsonPath(obj, path) {
    return path.split('.').reduce((current, key) => {
        if (current === null || current === undefined) return undefined;
        const index = Number(key);
        if (!isNaN(index) && Array.isArray(current)) {
            return current[index];
        }
        return current[key];
    }, obj);
}

function GetRequest(world, index = -1) {
    const requests = world.getVar('requests') || [];
    if (requests.length === 0) throw new Error('No requests in store');
    const i = index < 0 ? requests.length + index : index;
    if (i < 0 || i >= requests.length) throw new Error(`Request index ${index} out of bounds (${requests.length} requests)`);
    return requests[i];
}

module.exports = {
    GetToken,
    Requestor,
    ValidateResponseScheme,
    AssertStatus,
    AssertBodyContains,
    AssertBodyValueByKey,
    ExtractJsonPath,
    GetRequest
};

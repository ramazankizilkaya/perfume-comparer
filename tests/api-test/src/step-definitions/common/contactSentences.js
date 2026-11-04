const { Given, When, Then } = require('@cucumber/cucumber');
const apiFunctions = require('./apiFunctions');
const constants = require('./constants');
const payloads = require('./payloads');
const ch = require('../../../helpers/customHelpers');

// The API rejects a contact form sent sooner than Contact:MinFillSeconds (3 s) after the token was issued.
const MIN_FILL_MS = 3200;

Given('I obtain a contact form token', async function () {
    const url = constants.resolveEndpoint('Get Contact Form Token');
    const entry = await apiFunctions.Requestor(this, 'GET', url, null, {}, 200, 'Get Contact Form Token');
    this.setVar('contactFormToken', entry.responseBody.token);
    ch.Logger('✓ Stored contact form token');
});

Given('I wait long enough to fill the contact form', { timeout: 10000 }, async function () {
    await new Promise((resolve) => setTimeout(resolve, MIN_FILL_MS));
    ch.Logger(`✓ Waited ${MIN_FILL_MS} ms`);
});

async function submitContact(world, payloadName, formToken) {
    const url = constants.resolveEndpoint('Submit Contact Message');
    const body = { ...payloads.payloads[payloadName](), formToken };
    world.setVar('lastContactMessage', body.message);
    await apiFunctions.Requestor(world, 'POST', url, body, {}, null, payloadName);
}

When('I submit the contact form with {string} payload', async function (payloadName) {
    await submitContact(this, payloadName, this.getVar('contactFormToken'));
});

When('I submit the contact form with {string} payload and no token', async function (payloadName) {
    await submitContact(this, payloadName, undefined);
});

When('I submit the contact form with {string} payload and a tampered token', async function (payloadName) {
    const token = this.getVar('contactFormToken') || 'a.b';
    const [payload, signature] = token.split('.');
    const flipped = signature.startsWith('A') ? `B${signature.slice(1)}` : `A${signature.slice(1)}`;
    await submitContact(this, payloadName, `${payload}.${flipped}`);
});

Then('the admin contact list {string} contain the last contact message', async function (verb) {
    const url = constants.resolveEndpoint('Admin Contact Messages');
    const entry = await apiFunctions.Requestor(this, 'GET', url, null, {}, 200, 'Admin Contact Messages');
    apiFunctions.ValidateResponseScheme('Admin Contact Messages', entry.responseBody);

    const text = this.getVar('lastContactMessage');
    const found = entry.responseBody.items.find((m) => m.message === text);
    if (verb === 'should' && !found) throw new Error(`Contact message "${text}" was not found in the admin list`);
    if (verb === 'should not' && found) throw new Error(`Contact message "${text}" should not have been saved`);
    if (found) this.setVar('lastContactMessageId', found.id);
    ch.Logger(`✓ Admin contact list ${verb} contain "${text}"`);
});

When('I send a {string} request to the last contact message {string} admin endpoint', async function (method, action) {
    const id = this.getVar('lastContactMessageId');
    const url = action === 'delete' ? `/api/admin/contact-messages/${id}` : `/api/admin/contact-messages/${id}/${action}`;
    await apiFunctions.Requestor(this, method, url, null, {}, null, `Contact Message ${action}`);
});

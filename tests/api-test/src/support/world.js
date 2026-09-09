const { World, setWorldConstructor } = require('@cucumber/cucumber');
const { request } = require('@playwright/test');

class CustomWorld extends World {
    constructor(options) {
        super(options);
        this.store = {};
        this.apiContext = null;
        this.requestHeaders = {};
        this.baseURL = '';
    }

    // ── Store ──
    setVar(key, value) {
        this.store[key] = value;
    }

    getVar(key) {
        return this.store[key];
    }

    clearStore() {
        this.store = {};
    }

    // ── API Context ──
    async createApiContext(baseURL, extraHTTPHeaders = {}) {
        this.baseURL = baseURL;
        this.apiContext = await request.newContext({
            baseURL,
            extraHTTPHeaders
        });
    }

    async disposeApiContext() {
        if (this.apiContext) {
            await this.apiContext.dispose();
            this.apiContext = null;
        }
    }
}

setWorldConstructor(CustomWorld);

module.exports = { CustomWorld };

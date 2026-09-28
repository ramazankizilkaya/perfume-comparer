const fs = require('fs');
const path = require('path');
const { Logger } = require('../../../helpers/custom-helpers');

const logsDir = path.resolve(__dirname, '..', '..', '..', 'logs');
const filePath = path.join(logsDir, 'variables.json');

let inMemoryStore = {};

function ensureJsonFileExists() {
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({}, null, 2), 'utf8');
    }
}

function readJsonFile() {
    try {
        ensureJsonFileExists();
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch {
        return inMemoryStore;
    }
}

function writeJsonFile(data) {
    try {
        ensureJsonFileExists();
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch {
        /* fallback to in-memory */
    }
}

function setVariable(key, value) {
    if (arguments.length !== 2) {
        throw new Error('Missing parameters: key and value are both required');
    }
    inMemoryStore[key] = value;
    const data = readJsonFile();
    data[key] = value;
    writeJsonFile(data);
    Logger(`Setting variable "${key}" = "${typeof value === 'object' ? JSON.stringify(value) : value}"`);
}

function getVariable(key) {
    if (inMemoryStore[key] !== undefined) {
        return inMemoryStore[key];
    }
    const data = readJsonFile();
    return data[key];
}

function clearStore() {
    inMemoryStore = {};
    writeJsonFile({});
}

module.exports = {
    setVariable,
    getVariable,
    clearStore
};

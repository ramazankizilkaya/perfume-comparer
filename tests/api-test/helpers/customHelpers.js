const fs = require('fs');
const path = require('path');

let cachedLogFile = null;

function Logger(text) {
    const timestamp = new Date().toLocaleString('tr-TR', { hour12: false });
    console.log(`[${timestamp}] ${text}`);
    try {
        const getLogFilePath = () => {
            if (cachedLogFile) return cachedLogFile;
            const logDir = path.join(__dirname, '..', 'logs');
            const logFile = path.join(logDir, 'logs.txt');
            cachedLogFile = logFile;
            return cachedLogFile;
        };

        const logFileName = getLogFilePath();
        const logLine = `${timestamp}\t${text}\n`;
        fs.appendFileSync(logFileName, logLine, { flag: 'a+' });
    } catch (error) {
        console.error('Failed to write log:', error);
    }
}

function createLogFile() {
    const logDir = path.join(__dirname, '..', 'logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const logFile = path.join(logDir, 'logs.txt');
    fs.writeFileSync(logFile, `Test Run Started: ${new Date().toLocaleString('tr-TR', { hour12: false })}\n`);
    cachedLogFile = logFile;
}

module.exports = { Logger, createLogFile };

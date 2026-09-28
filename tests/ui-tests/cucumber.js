module.exports = {
    default: {
        require: [
            'src/step-definitions/cucumber-hooks.js',
            'src/step-definitions/**/*.js'
        ],
        paths: ['src/features/**/*.feature'],
        format: [
            'progress-bar',
            'html:reports/cucumber-report.html',
            './node_modules/allure-cucumberjs/dist/cjs/reporter.js'
        ],
        formatOptions: {
            resultsDir: 'reports/allure-results'
        },
        parallel: 1,
        publishQuiet: true
    }
};

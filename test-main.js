var allTestFiles = [];
var TEST_REGEXP = /(spec|test)\.js$/i;

Object.keys(window.__karma__.files).forEach(function (file) {
    if (TEST_REGEXP.test(file)) {
        // Normalize paths to RequireJS module names.
        allTestFiles.push(file);
    }
});

require.config({
    // Karma serves files under /base, which is the basePath from your config file
    baseUrl: '/',

    // dynamically load all test files
    deps: allTestFiles,

    paths: {
        'jasmine': ['../lib/jasmine-core/lib/jasmine-core/jasmine'],
        'jasmine-html': ['../lib/jasmine-core/lib/jasmine-core/jasmine-html'],
        'jasmine-boot': ['../lib/jasmine-core/lib/jasmine-core/boot']
    },
    // shim: makes external libraries compatible with requirejs (AMD)
    shim: {
        'jasmine-html': {
            deps: ['jasmine']
        },
        'jasmine-boot': {
            deps: ['jasmine', 'jasmine-html']
        }
    },

    // we have to kickoff jasmine, as it is asynchronous
    callback: window.__karma__.start
});

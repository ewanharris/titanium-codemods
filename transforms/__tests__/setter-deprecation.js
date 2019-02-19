jest.autoMockOff();
const { defineTest } = require('jscodeshift/dist/testUtils');
const path = require('path');

defineTest(__dirname, 'setter-deprecation', { sdkPath: path.join(__dirname, '..', '__testfixtures__') });

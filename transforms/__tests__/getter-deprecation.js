jest.autoMockOff();
const { defineTest } = require('jscodeshift/dist/testUtils');
const path = require('path');

defineTest(__dirname, 'getter-deprecation', { sdkPath: path.join(__dirname, '..', '__testfixtures__') });

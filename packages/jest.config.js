const jestPreset = require('@rocket-scripts/web/jest-preset');

module.exports = {
  ...jestPreset,

  collectCoverageFrom: [
    ...jestPreset.collectCoverageFrom,
    '!src/test-app/**',
  ]
};

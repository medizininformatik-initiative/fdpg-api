module.exports = {
  testMatch: ['**/*.spec.ts'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: './',
  modulePaths: ['<rootDir>'],
  collectCoverage: true,
  coverageReporters: ['text', 'cobertura', 'html', 'lcov'],
  coverageDirectory: 'reports/coverage',
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'reports',
        outputName: 'junit.xml',
      },
    ],
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    // do not cover types declarations
    '!src/**/*.d.ts',

    '!**/__mocks__/**',
    '!**/__tests__/**',
    '!**/__test__/**',
    '!**/*.spec.ts',
    '!**/*.mock.ts',
    '!**/*.module.ts',
    '!**/main.ts',
    '!**/telemetry.ts',
    '!**/migrations/index.ts',
    '!**/*.migration.ts',
    '!**/*.migration.constants.ts',

    // Libs where we assume that they are tested by the maintainer
    '!src/libs/**',
  ],
};

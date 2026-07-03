module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@types/(.*)$': '<rootDir>/assets/scripts/types/$1',
    '^@config/(.*)$': '<rootDir>/assets/scripts/config/$1',
    '^@core/(.*)$': '<rootDir>/assets/scripts/core/$1',
    '^@modules/(.*)$': '<rootDir>/assets/scripts/modules/$1',
    '^@utils/(.*)$': '<rootDir>/assets/scripts/utils/$1',
  },
  collectCoverageFrom: [
    'assets/scripts/**/*.ts',
    '!assets/scripts/types/**',
    '!assets/scripts/config/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

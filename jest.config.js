module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/js/$1',
    '^@/components/(.*)$': '<rootDir>/js/components/$1',
    '^@/hooks/(.*)$': '<rootDir>/js/hooks/$1',
    '^@/utils/(.*)$': '<rootDir>/js/utils/$1',
    '^@/types/(.*)$': '<rootDir>/js/types/$1'
  },
  testMatch: [
    '<rootDir>/tests/**/*.test.{ts,tsx}',
    '<rootDir>/js/**/*.test.{ts,tsx}'
  ],
  collectCoverageFrom: [
    'js/**/*.{ts,tsx}',
    '!js/**/*.d.ts',
    '!js/main.tsx',
    '!js/types/**/*'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testTimeout: 10000
}

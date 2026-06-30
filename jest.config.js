module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.spec.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/.claude/worktrees/'],
  moduleFileExtensions: ['ts', 'js'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        experimentalDecorators: true,
        emitDecoratorMetadata: true
      }
    }]
  },
  moduleNameMapper: {
    '^@transaction-report/shared$': '<rootDir>/packages/shared/src/index.ts',
    '^@shared/(.*)$': '<rootDir>/packages/shared/src/$1'
  }
};

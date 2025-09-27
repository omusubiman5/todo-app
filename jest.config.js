const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Next.js アプリのパスを指定
  dir: './',
})

// Jest の設定オプション
const customJestConfig = {
  // テスト環境を設定（adminテストはNode.js環境）
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    customExportConditions: ['']
  },
  
  // セットアップファイルを指定
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // テストファイルのパターンを指定
  testMatch: [
    '**/__tests__/**/*.(js|jsx|ts|tsx)',
    '**/*.(test|spec).(js|jsx|ts|tsx)'
  ],

  // プロジェクト設定で環境を分割
  projects: [
    {
      displayName: 'jsdom',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/__tests__/components/**/*.(test|spec).(js|jsx|ts|tsx)'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
      }
    },
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/__tests__/admin/**/*.(test|spec).(js|jsx|ts|tsx)'],
      setupFilesAfterEnv: ['<rootDir>/__tests__/admin/setup.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
      },
      preset: 'ts-jest',
      extensionsToTreatAsEsm: ['.ts', '.tsx'],
      globals: {
        'ts-jest': {
          useESM: true
        }
      }
    }
  ],
  
  // Playwright テストを除外
  testPathIgnorePatterns: [
    '<rootDir>/.next/', 
    '<rootDir>/node_modules/',
    '<rootDir>/e2e/',
    '<rootDir>/tests/'
  ],
  
  // カバレッジ設定
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/*.config.js',
    '!**/*.stories.{js,jsx,ts,tsx}',
  ],
  
  // カバレッジレポート設定
  coverageReporters: ['text', 'lcov', 'html'],
  
  // カバレッジしきい値設定（80%基準）
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },
  
  // モジュール名のマッピングを指定
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  
  
  // テスト実行前の設定
  verbose: true,
  
  // テストタイムアウト設定
  testTimeout: 10000
}

// createJestConfig は非同期でNext.js の設定を読み込むため、
// Next.js設定と統合したJest設定を返す
module.exports = createJestConfig(customJestConfig)
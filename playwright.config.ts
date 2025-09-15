import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  // テストファイルのディレクトリ
  testDir: './e2e',
  
  // 各テストのタイムアウト
  timeout: 30 * 1000,
  expect: {
    // assertion のタイムアウト
    timeout: 5000
  },
  
  // テスト失敗時の設定
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // レポート設定
  reporter: 'html',
  
  // 全テスト共通の設定
  use: {
    // ベースURL（開発サーバーのURL）
    baseURL: 'http://localhost:3007',
    
    // テスト実行時にブラウザを表示するか
    headless: true,
    
    // ビューポートサイズ
    viewport: { width: 1280, height: 720 },
    
    // 失敗時のスクリーンショット
    screenshot: 'only-on-failure',
    
    // 失敗時の動画録画
    video: 'retain-on-failure',
    
    // トレース（デバッグ用）
    trace: 'on-first-retry',
  },

  // テストするブラウザの設定
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // モバイル端末でのテスト
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  // 開発サーバーの起動設定
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3007',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
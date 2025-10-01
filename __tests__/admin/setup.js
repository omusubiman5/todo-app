/**
 * 管理者テスト用セットアップファイル
 * Node.js環境でのNext.js APIルートテストに必要なグローバル設定
 */

// Mock NextRequest and Response for testing
global.Response = class {
  constructor(body, init) {
    this.body = body;
    this.status = init?.status || 200;
    this._json = typeof body === 'string' ? JSON.parse(body) : body;
  }

  static json(body, init) {
    return new Response(JSON.stringify(body), {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...init?.headers
      }
    });
  }

  async json() {
    return this._json;
  }
};

// Mock console methods to reduce test noise
global.console = {
  ...console,
  // Suppress non-critical logs during testing
  log: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  error: console.error // Keep errors visible
};

// Set up environment variables for testing
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.NEXT_PUBLIC_APP_URL = 'https://test-app.com';
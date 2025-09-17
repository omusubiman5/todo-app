// 🔧 【MCP活用】Supabaseクライアントの包括的モック設定
// 公式ドキュメントに基づいた適切なテスト環境構築

// リアルタイム購読用のモックチャンネル
const createMockChannel = () => ({
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn().mockResolvedValue({ status: 'SUBSCRIBED' }),
  unsubscribe: jest.fn().mockResolvedValue({ status: 'UNSUBSCRIBED' }),
  send: jest.fn(),
  track: jest.fn(),
  untrack: jest.fn()
});

// クエリビルダーのモック
const createMockQueryBuilder = (mockData: unknown = null, mockError: Error | null = null) => ({
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  gt: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lt: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  like: jest.fn().mockReturnThis(),
  ilike: jest.fn().mockReturnThis(),
  is: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  contains: jest.fn().mockReturnThis(),
  containedBy: jest.fn().mockReturnThis(),
  rangeGt: jest.fn().mockReturnThis(),
  rangeGte: jest.fn().mockReturnThis(),
  rangeLt: jest.fn().mockReturnThis(),
  rangeLte: jest.fn().mockReturnThis(),
  rangeAdjacent: jest.fn().mockReturnThis(),
  overlaps: jest.fn().mockReturnThis(),
  textSearch: jest.fn().mockReturnThis(),
  match: jest.fn().mockReturnThis(),
  not: jest.fn().mockReturnThis(),
  or: jest.fn().mockReturnThis(),
  filter: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  abortSignal: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: mockData, error: mockError }),
  maybeSingle: jest.fn().mockResolvedValue({ data: mockData, error: mockError }),
  csv: jest.fn().mockReturnThis(),
  geojson: jest.fn().mockReturnThis(),
  explain: jest.fn().mockReturnThis(),
  rollback: jest.fn().mockReturnThis(),
  returns: jest.fn().mockReturnThis(),
  then: jest.fn((callback) => callback({ data: mockData, error: mockError }))
});

// 認証モック
const createMockAuth = () => ({
  signInWithPassword: jest.fn().mockResolvedValue({
    data: { user: null, session: null },
    error: null
  }),
  signUp: jest.fn().mockResolvedValue({
    data: { user: null, session: null },
    error: null
  }),
  signOut: jest.fn().mockResolvedValue({ error: null }),
  getSession: jest.fn().mockResolvedValue({
    data: { session: null },
    error: null
  }),
  getUser: jest.fn().mockResolvedValue({
    data: { user: null },
    error: null
  }),
  onAuthStateChange: jest.fn(() => ({
    data: { subscription: { unsubscribe: jest.fn() } }
  })),
  refreshSession: jest.fn().mockResolvedValue({
    data: { session: null, user: null },
    error: null
  }),
  resetPasswordForEmail: jest.fn().mockResolvedValue({ 
    data: {}, 
    error: null 
  }),
  updateUser: jest.fn().mockResolvedValue({
    data: { user: null },
    error: null
  }),
  setSession: jest.fn().mockResolvedValue({
    data: { session: null, user: null },
    error: null
  })
});

// ストレージモック
const createMockStorage = () => ({
  from: jest.fn(() => ({
    upload: jest.fn().mockResolvedValue({ data: null, error: null }),
    download: jest.fn().mockResolvedValue({ data: null, error: null }),
    remove: jest.fn().mockResolvedValue({ data: null, error: null }),
    list: jest.fn().mockResolvedValue({ data: [], error: null }),
    getPublicUrl: jest.fn().mockReturnValue({
      data: { publicUrl: 'https://example.com/file.jpg' }
    })
  }))
});

// 関数呼び出しモック
const createMockFunctions = () => ({
  invoke: jest.fn().mockResolvedValue({
    data: null,
    error: null
  })
});

// メインのSupabaseクライアントモック
export const createMockSupabaseClient = (options: {
  mockTasks?: any[],
  mockError?: any,
  enableRealtime?: boolean
} = {}) => {
  const { mockTasks = [], mockError = null, enableRealtime = false } = options;

  const mockClient = {
    // テーブル操作
    from: jest.fn((table: string) => {
      if (table === 'tasks') {
        return createMockQueryBuilder(mockTasks, mockError);
      }
      return createMockQueryBuilder(null, mockError);
    }),

    // リアルタイム購読
    channel: jest.fn((name: string) => {
      const channel = createMockChannel();
      if (enableRealtime) {
        // テストでリアルタイム機能をシミュレートする場合
        setTimeout(() => {
          // モックコールバックを呼び出し
          const onCallbacks = channel.on.mock.calls;
          onCallbacks.forEach(([event, config, callback]) => {
            if (typeof callback === 'function') {
              callback({
                eventType: 'INSERT',
                new: mockTasks[0] || {},
                old: null,
                schema: 'public',
                table: 'tasks'
              });
            }
          });
        }, 100);
      }
      return channel;
    }),

    // 認証
    auth: createMockAuth(),

    // ストレージ
    storage: createMockStorage(),

    // 関数呼び出し
    functions: createMockFunctions(),

    // RPC呼び出し
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),

    // リアルタイム接続削除
    removeChannel: jest.fn(),
    removeAllChannels: jest.fn(),
    getChannels: jest.fn(() => [])
  };

  return mockClient;
};

// デフォルトのSupabaseクライアントモック設定
export const setupSupabaseMock = () => {
  const mockClient = createMockSupabaseClient();

  // @/lib/supabase をモック
  jest.mock('@/lib/supabase', () => ({
    supabase: mockClient
  }));

  return mockClient;
};

// テスト用のヘルパー関数
export const mockSupabaseResponses = {
  // 成功レスポンス
  success: (data: any) => ({ data, error: null }),
  
  // エラーレスポンス
  error: (message: string, code?: string) => ({
    data: null,
    error: { message, code: code || 'MOCK_ERROR' }
  }),

  // 空のレスポンス
  empty: () => ({ data: [], error: null })
};

export default setupSupabaseMock;

// Jest requires at least one test
describe('Supabase Mock Setup', () => {
  it('モックが正しく設定されている', () => {
    const mockClient = createMockSupabaseClient();
    expect(mockClient).toBeDefined();
    expect(mockClient.from).toBeDefined();
    expect(mockClient.auth).toBeDefined();
  });

  it('モックレスポンスヘルパーが動作する', () => {
    const success = mockSupabaseResponses.success({ id: 1 });
    const error = mockSupabaseResponses.error('Test error');
    const empty = mockSupabaseResponses.empty();

    expect(success.data).toEqual({ id: 1 });
    expect(success.error).toBeNull();
    expect(error.error.message).toBe('Test error');
    expect(empty.data).toEqual([]);
  });
});
'use client';

import { useState } from 'react';

export default function ApiTestPage() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState<string | null>(null);

  // API テスト関数
  const testApi = async (endpoint: string, method: 'GET' | 'POST', body?: any, params?: string) => {
    const testKey = `${method} ${endpoint}`;
    setLoading(testKey);
    
    try {
      const url = params ? `/api/tasks/${endpoint}?${params}` : `/api/tasks/${endpoint}`;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        ...(body && { body: JSON.stringify(body) })
      });

      const data = await response.json();
      
      setResults(prev => ({
        ...prev,
        [testKey]: {
          status: response.status,
          data,
          timestamp: new Date().toLocaleTimeString()
        }
      }));
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [testKey]: {
          status: 'ERROR',
          data: { error: error instanceof Error ? error.message : 'Unknown error' },
          timestamp: new Date().toLocaleTimeString()
        }
      }));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">API テスト画面</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* テストボタン */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-600">🧪 API接続テスト</h2>
            <div className="space-y-3">
              <button
                onClick={() => testApi('test', 'GET')}
                disabled={loading === 'GET test'}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {loading === 'GET test' ? '実行中...' : 'GET接続テスト'}
              </button>
              <button
                onClick={() => testApi('test', 'POST', { test: 'data', message: 'Hello API' })}
                disabled={loading === 'POST test'}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {loading === 'POST test' ? '実行中...' : 'POST接続テスト'}
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-blue-600">📊 統計情報 API</h2>
            <div className="space-y-3">
              <button
                onClick={() => testApi('statistics', 'GET', undefined, 'period=all')}
                disabled={loading === 'GET statistics'}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {loading === 'GET statistics' ? '実行中...' : '全期間統計を取得'}
              </button>
              <button
                onClick={() => testApi('statistics', 'GET', undefined, 'period=week')}
                disabled={loading === 'GET statistics'}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {loading === 'GET statistics' ? '実行中...' : '週間統計を取得'}
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-green-600">🔍 検索 API</h2>
            <div className="space-y-3">
              <button
                onClick={() => testApi('search', 'GET', undefined, 'q=test&limit=10')}
                disabled={loading === 'GET search'}
                className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {loading === 'GET search' ? '実行中...' : '簡単検索テスト'}
              </button>
              <button
                onClick={() => testApi('search', 'POST', {
                  text_search: { query: 'タスク', type: 'contains' },
                  filters: { priorities: ['高', '中'] },
                  sorting: { columns: [{ column: 'created_at', order: 'desc' }] },
                  pagination: { limit: 5, offset: 0 }
                })}
                disabled={loading === 'POST search'}
                className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {loading === 'POST search' ? '実行中...' : '高度検索テスト'}
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-purple-600">📥 エクスポート API</h2>
            <div className="space-y-3">
              <button
                onClick={() => testApi('export', 'GET', undefined, 'format=json&include_completed=true')}
                disabled={loading === 'GET export'}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {loading === 'GET export' ? '実行中...' : 'JSON エクスポート'}
              </button>
              <button
                onClick={() => testApi('export', 'GET', undefined, 'format=csv&include_completed=false')}
                disabled={loading === 'GET export'}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {loading === 'GET export' ? '実行中...' : 'CSV エクスポート'}
              </button>
              <button
                onClick={() => testApi('export', 'POST', {
                  export_type: 'json',
                  filters: { include_completed: true },
                  task_count: 0
                })}
                disabled={loading === 'POST export'}
                className="w-full bg-purple-400 hover:bg-purple-500 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {loading === 'POST export' ? '実行中...' : 'エクスポート履歴記録'}
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-red-600">⚡ 一括操作 API</h2>
            <div className="space-y-3">
              <button
                onClick={() => testApi('bulk', 'GET', undefined, 'operation_id=test123')}
                disabled={loading === 'GET bulk'}
                className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {loading === 'GET bulk' ? '実行中...' : '操作状況確認'}
              </button>
              <button
                onClick={() => testApi('bulk', 'POST', {
                  operation: 'update',
                  task_ids: ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'],
                  updates: { priority: '高' }
                })}
                disabled={loading === 'POST bulk'}
                className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {loading === 'POST bulk' ? '実行中...' : '一括更新テスト'}
              </button>
            </div>
          </div>
        </div>

        {/* 結果表示 */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">テスト結果</h2>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {Object.entries(results).length === 0 ? (
              <p className="text-gray-500">上のボタンをクリックしてAPIをテストしてください</p>
            ) : (
              Object.entries(results).reverse().map(([key, result]: [string, any]) => (
                <div key={key} className="bg-white p-4 rounded border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">{key}</span>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        result.status === 200 || result.status === 201 
                          ? 'bg-green-100 text-green-800' 
                          : result.status >= 400 
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {result.status}
                      </span>
                      <span className="text-xs text-gray-500">{result.timestamp}</span>
                    </div>
                  </div>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 説明セクション */}
      <div className="mt-8 bg-blue-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-3 text-blue-800">📋 APIテスト方法</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="font-semibold mb-2">ブラウザでのテスト:</h4>
            <ul className="space-y-1 text-gray-700">
              <li>• 上のボタンでAPIを直接テスト可能</li>
              <li>• レスポンスコードと内容を確認</li>
              <li>• 認証が必要な場合はログイン後に実行</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">外部ツールでのテスト:</h4>
            <ul className="space-y-1 text-gray-700">
              <li>• Postman: GUI でAPIテスト</li>
              <li>• curl: コマンドラインでテスト</li>
              <li>• VS Code REST Client拡張機能</li>
            </ul>
          </div>
        </div>
      </div>

      {/* エラー対処法 */}
      <div className="mt-6 bg-yellow-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-3 text-yellow-800">⚠️ よくあるエラーと対処法</h3>
        <div className="text-sm space-y-2">
          <div><strong>401 Unauthorized:</strong> ログインが必要です</div>
          <div><strong>404 Not Found:</strong> APIエンドポイントが見つからない</div>
          <div><strong>500 Internal Server Error:</strong> サーバー側のエラー（ログを確認）</div>
          <div><strong>CORS エラー:</strong> ブラウザの同一オリジンポリシー（開発環境では通常問題なし）</div>
        </div>
      </div>
    </div>
  );
}
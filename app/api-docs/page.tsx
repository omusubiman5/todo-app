'use client';

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            📚 API 仕様書
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Next.js 15ベースの協業タスク管理アプリケーションのAPI仕様書です。
          </p>
        </div>
        
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">🚧</div>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">メンテナンス中</h2>
          <p className="text-gray-500">API仕様書機能は現在準備中です。しばらくお待ちください。</p>
        </div>
      </div>
    </div>
  );
}
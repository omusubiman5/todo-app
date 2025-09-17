'use client';

import { useEffect, useState } from 'react';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { initializeAnalytics } from '@/lib/analyticsIntegration';
import {
  generateSampleAnalyticsData,
  clearAnalyticsData,
  exportAnalyticsData,
  getAnalyticsDataSummary
} from '@/lib/generateTestData';

export default function AnalyticsPage() {
  const [showDeveloperTools, setShowDeveloperTools] = useState(false);

  useEffect(() => {
    // アナリティクス初期化
    initializeAnalytics();
  }, []);

  const handleGenerateTestData = () => {
    generateSampleAnalyticsData();
    // ページをリロードしてデータを反映
    window.location.reload();
  };

  const handleClearData = () => {
    if (confirm('すべてのアナリティクスデータを削除しますか？')) {
      clearAnalyticsData();
      window.location.reload();
    }
  };

  const handleExportData = () => {
    exportAnalyticsData();
  };

  const handleShowSummary = () => {
    getAnalyticsDataSummary();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              📈 Todo App アナリティクス
            </h1>
            <p className="text-gray-600">
              あなたのタスク管理習慣と生産性を詳しく分析
            </p>
          </div>

          {/* 開発者ツール */}
          <div className="relative">
            <button
              onClick={() => setShowDeveloperTools(!showDeveloperTools)}
              className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
            >
              🛠️ Dev Tools
            </button>

            {showDeveloperTools && (
              <div className="absolute right-0 top-8 bg-white border rounded-lg shadow-lg p-4 w-64 z-10">
                <h3 className="text-sm font-semibold mb-3">開発者ツール</h3>
                <div className="space-y-2">
                  <button
                    onClick={handleGenerateTestData}
                    className="w-full text-left px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 rounded"
                  >
                    📊 サンプルデータ生成
                  </button>
                  <button
                    onClick={handleExportData}
                    className="w-full text-left px-3 py-2 text-sm bg-green-50 hover:bg-green-100 rounded"
                  >
                    📥 データエクスポート
                  </button>
                  <button
                    onClick={handleShowSummary}
                    className="w-full text-left px-3 py-2 text-sm bg-purple-50 hover:bg-purple-100 rounded"
                  >
                    📋 データサマリー表示
                  </button>
                  <button
                    onClick={handleClearData}
                    className="w-full text-left px-3 py-2 text-sm bg-red-50 hover:bg-red-100 rounded text-red-700"
                  >
                    🗑️ 全データ削除
                  </button>
                </div>
                <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                  ※ 開発・テスト用機能です
                </div>
              </div>
            )}
          </div>
        </div>

        <AnalyticsDashboard />

        {/* GA4への案内 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">
            🔍 より詳細な分析
          </h3>
          <p className="text-blue-700 mb-4">
            このダッシュボードはローカルデータに基づいています。
            より高度な分析はGoogle Analytics 4で確認できます。
          </p>
          <div className="space-y-2">
            <h4 className="font-medium text-blue-800">GA4で確認できる指標:</h4>
            <ul className="list-disc list-inside text-blue-700 space-y-1">
              <li>デバイス・ブラウザ別の利用状況</li>
              <li>ユーザーフローとページ遷移</li>
              <li>リアルタイムアクセス状況</li>
              <li>コンバージョン率（タスク完了率）</li>
              <li>セッション継続時間の詳細分析</li>
            </ul>
          </div>
          <a
            href="https://analytics.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            GA4ダッシュボードを開く
          </a>
        </div>

        {/* データプライバシー情報 */}
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-800 mb-2">
            🔒 データプライバシー
          </h4>
          <p className="text-sm text-gray-600">
            このページの分析データはお使いのブラウザにローカル保存されています。
            個人情報は含まれておらず、外部に送信される情報は統計データのみです。
            詳細は<a href="/privacy" className="text-blue-600 hover:underline">プライバシーポリシー</a>をご確認ください。
          </p>
        </div>
      </div>
    </div>
  );
}
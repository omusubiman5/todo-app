'use client';

import React, { useState, useEffect } from 'react';
import { useErrorMonitoring, ErrorInfo, ErrorMetrics } from '@/lib/errorMonitoring';
import { usePerformanceMonitoring, PerformanceMetric } from '@/lib/performanceMonitoring';

interface MonitoringDashboardProps {
  userId?: string;
  className?: string;
}

export const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({
  userId,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'errors' | 'performance' | 'overview'>('overview');
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('24h');

  const {
    getErrorHistory,
    getErrorMetrics,
    reportError
  } = useErrorMonitoring(userId);

  const {
    metrics: performanceMetrics,
    summary: performanceSummary,
    captureCustomMetric
  } = usePerformanceMonitoring(userId);

  const [errorHistory, setErrorHistory] = useState<ErrorInfo[]>([]);
  const [errorMetrics, setErrorMetrics] = useState<Map<string, ErrorMetrics>>(new Map());

  useEffect(() => {
    const updateData = () => {
      setErrorHistory(getErrorHistory(100));
      setErrorMetrics(getErrorMetrics());
    };

    updateData();
    const interval = setInterval(updateData, 5000);
    
    return () => clearInterval(interval);
  }, [getErrorHistory, getErrorMetrics]);

  // フィルタリング関数
  const filterByTimeRange = (items: Array<{ [key: string]: unknown }>, timeField: string) => {
    const now = new Date();
    const cutoff = new Date();

    switch (timeRange) {
      case '1h':
        cutoff.setHours(now.getHours() - 1);
        break;
      case '24h':
        cutoff.setDate(now.getDate() - 1);
        break;
      case '7d':
        cutoff.setDate(now.getDate() - 7);
        break;
    }

    return items.filter(item => new Date(item[timeField]) >= cutoff);
  };

  const filteredErrors = filterByTimeRange(errorHistory, 'timestamp');
  const filteredPerformanceMetrics = filterByTimeRange(performanceMetrics, 'timestamp');

  // 統計計算
  const errorStats = {
    total: filteredErrors.length,
    critical: filteredErrors.filter(e => e.severity === 'critical').length,
    high: filteredErrors.filter(e => e.severity === 'high').length,
    medium: filteredErrors.filter(e => e.severity === 'medium').length,
    low: filteredErrors.filter(e => e.severity === 'low').length,
    byCategory: {
      network: filteredErrors.filter(e => e.category === 'network').length,
      auth: filteredErrors.filter(e => e.category === 'auth').length,
      data: filteredErrors.filter(e => e.category === 'data').length,
      ui: filteredErrors.filter(e => e.category === 'ui').length,
      unknown: filteredErrors.filter(e => e.category === 'unknown').length
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'network': return 'text-purple-600 bg-purple-100';
      case 'auth': return 'text-red-600 bg-red-100';
      case 'data': return 'text-blue-600 bg-blue-100';
      case 'ui': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatValue = (value: number, unit?: string) => {
    if (unit === 'ms') {
      return `${value.toFixed(2)}ms`;
    }
    if (unit === 'mb') {
      return `${value.toFixed(2)}MB`;
    }
    if (unit === 'percent') {
      return `${value.toFixed(1)}%`;
    }
    return value.toFixed(2);
  };

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* システムヘルス概要 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">総エラー数</p>
              <p className="text-2xl font-bold text-gray-900">{errorStats.total}</p>
            </div>
            <div className={`p-2 rounded-full ${errorStats.critical > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
              <span className={errorStats.critical > 0 ? 'text-red-600' : 'text-green-600'}>
                {errorStats.critical > 0 ? '⚠️' : '✅'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">平均ロード時間</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatValue(performanceSummary.averageLoadTime, 'ms')}
              </p>
            </div>
            <div className={`p-2 rounded-full ${performanceSummary.averageLoadTime > 3000 ? 'bg-yellow-100' : 'bg-green-100'}`}>
              <span className={performanceSummary.averageLoadTime > 3000 ? 'text-yellow-600' : 'text-green-600'}>
                {performanceSummary.averageLoadTime > 3000 ? '⚡' : '🚀'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Web Vitalsスコア</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatValue(performanceSummary.webVitalsScore, 'percent')}
              </p>
            </div>
            <div className={`p-2 rounded-full ${performanceSummary.webVitalsScore < 75 ? 'bg-orange-100' : 'bg-green-100'}`}>
              <span className={performanceSummary.webVitalsScore < 75 ? 'text-orange-600' : 'text-green-600'}>
                {performanceSummary.webVitalsScore < 75 ? '📊' : '🎯'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">メモリ使用量</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatValue(performanceSummary.memoryUsage, 'mb')}
              </p>
            </div>
            <div className={`p-2 rounded-full ${performanceSummary.memoryUsage > 100 ? 'bg-red-100' : 'bg-green-100'}`}>
              <span className={performanceSummary.memoryUsage > 100 ? 'text-red-600' : 'text-green-600'}>
                {performanceSummary.memoryUsage > 100 ? '🧠' : '💚'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* エラーカテゴリ別分布 */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">エラーカテゴリ別分布</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(errorStats.byCategory).map(([category, count]) => (
            <div key={category} className="text-center">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(category)}`}>
                {category}
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900">{count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 最近のアラート */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">最近のアラート</h3>
        <div className="space-y-3">
          {filteredErrors
            .filter(error => error.severity === 'critical' || error.severity === 'high')
            .slice(0, 5)
            .map((error, index) => (
              <div key={index} className="flex items-center p-3 bg-red-50 rounded-lg">
                <span className="text-red-600 mr-3">🚨</span>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{error.message}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(error.timestamp).toLocaleString()} - {error.category}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(error.severity)}`}>
                  {error.severity}
                </span>
              </div>
            ))}
          {filteredErrors.filter(error => error.severity === 'critical' || error.severity === 'high').length === 0 && (
            <p className="text-gray-500 text-center py-4">現在、重要なアラートはありません</p>
          )}
        </div>
      </div>
    </div>
  );

  const ErrorsTab = () => (
    <div className="space-y-6">
      {/* エラー統計 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{errorStats.critical}</p>
            <p className="text-sm text-gray-600">Critical</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">{errorStats.high}</p>
            <p className="text-sm text-gray-600">High</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">{errorStats.medium}</p>
            <p className="text-sm text-gray-600">Medium</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{errorStats.low}</p>
            <p className="text-sm text-gray-600">Low</p>
          </div>
        </div>
      </div>

      {/* エラー一覧 */}
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">エラー履歴</h3>
        </div>
        <div className="divide-y">
          {filteredErrors.slice(0, 20).map((error, index) => (
            <div key={index} className="p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(error.severity)}`}>
                      {error.severity}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(error.category)}`}>
                      {error.category}
                    </span>
                  </div>
                  <p className="font-medium text-gray-900 mb-1">{error.message}</p>
                  <p className="text-sm text-gray-600 mb-2">
                    {new Date(error.timestamp).toLocaleString()}
                    {error.userId && ` - User: ${error.userId}`}
                  </p>
                  {error.stack && (
                    <details className="text-xs text-gray-500">
                      <summary className="cursor-pointer hover:text-gray-700">スタックトレース</summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto">{error.stack}</pre>
                    </details>
                  )}
                  {error.metadata && (
                    <details className="text-xs text-gray-500">
                      <summary className="cursor-pointer hover:text-gray-700">メタデータ</summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
                        {JSON.stringify(error.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filteredErrors.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-gray-500">選択した期間にエラーはありません</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const PerformanceTab = () => (
    <div className="space-y-6">
      {/* パフォーマンス概要 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {formatValue(performanceSummary.averageLoadTime, 'ms')}
            </p>
            <p className="text-sm text-gray-600">平均ロード時間</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {formatValue(performanceSummary.averageApiResponseTime, 'ms')}
            </p>
            <p className="text-sm text-gray-600">平均API応答時間</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">
              {formatValue(performanceSummary.webVitalsScore, 'percent')}
            </p>
            <p className="text-sm text-gray-600">Web Vitalsスコア</p>
          </div>
        </div>
      </div>

      {/* パフォーマンスメトリクス一覧 */}
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">パフォーマンスメトリクス</h3>
        </div>
        <div className="divide-y">
          {filteredPerformanceMetrics.slice(0, 50).map((metric, index) => (
            <div key={index} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{metric.name}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(metric.timestamp).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{formatValue(metric.value, 'ms')}</p>
                  {metric.metadata?.category && (
                    <p className="text-xs text-gray-500">{metric.metadata.category}</p>
                  )}
                </div>
              </div>
              {metric.metadata && (
                <details className="text-xs text-gray-500 mt-2">
                  <summary className="cursor-pointer hover:text-gray-700">詳細</summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
                    {JSON.stringify(metric.metadata, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
          {filteredPerformanceMetrics.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-gray-500">選択した期間にパフォーマンスメトリクスがありません</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`bg-gray-50 min-h-screen p-6 ${className}`}>
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">監視ダッシュボード</h1>
          <p className="text-gray-600">システムのエラーとパフォーマンスを監視します</p>
        </div>

        {/* コントロール */}
        <div className="flex flex-wrap gap-4 mb-6">
          {/* タブ切り替え */}
          <div className="flex bg-white rounded-lg border">
            <button
              className={`px-4 py-2 rounded-l-lg font-medium ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
              onClick={() => setActiveTab('overview')}
            >
              概要
            </button>
            <button
              className={`px-4 py-2 font-medium ${
                activeTab === 'errors'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
              onClick={() => setActiveTab('errors')}
            >
              エラー
            </button>
            <button
              className={`px-4 py-2 rounded-r-lg font-medium ${
                activeTab === 'performance'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
              onClick={() => setActiveTab('performance')}
            >
              パフォーマンス
            </button>
          </div>

          {/* 時間範囲選択 */}
          <select
            className="px-4 py-2 bg-white border rounded-lg font-medium text-gray-600"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '1h' | '24h' | '7d')}
          >
            <option value="1h">過去1時間</option>
            <option value="24h">過去24時間</option>
            <option value="7d">過去7日間</option>
          </select>
        </div>

        {/* コンテンツ */}
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'errors' && <ErrorsTab />}
        {activeTab === 'performance' && <PerformanceTab />}
      </div>
    </div>
  );
};
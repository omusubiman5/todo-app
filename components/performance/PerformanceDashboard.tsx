"use client";

import React, { useState, useEffect } from 'react';
import { performanceMonitor, usePerformanceMonitor } from '@/lib/performance/performanceMonitor';

// 🚀 Phase 3 Stage 3: パフォーマンス監視ダッシュボード

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

interface CustomMetric {
  name: string;
  value: number;
  timestamp: number;
  category: 'navigation' | 'interaction' | 'loading' | 'custom';
}

interface ErrorReport {
  message: string;
  stack?: string;
  timestamp: number;
}

interface CurrentMetrics {
  coreVitals: PerformanceMetric[];
  customMetrics: CustomMetric[];
  errors: ErrorReport[];
}

interface SummaryData {
  coreWebVitals: {
    name: string;
    average: number;
    count: number;
    good: number;
    needsImprovement: number;
    poor: number;
    trend: 'improving' | 'stable' | 'degrading';
  }[];
  errorRate: number;
}

interface MetricCardProps {
  title: string;
  value: number;
  unit: string;
  rating: 'good' | 'needs-improvement' | 'poor';
  trend?: 'improving' | 'stable' | 'degrading';
  description: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  unit, 
  rating, 
  trend, 
  description 
}) => {
  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'good': return 'text-green-600 bg-green-50 border-green-200';
      case 'needs-improvement': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'poor': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'improving': return '📈';
      case 'degrading': return '📉';
      case 'stable': return '➡️';
      default: return '';
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${getRatingColor(rating)}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">{title}</h3>
        {trend && <span className="text-lg">{getTrendIcon(trend)}</span>}
      </div>
      
      <div className="mb-2">
        <span className="text-2xl font-bold">
          {typeof value === 'number' ? value.toFixed(1) : value}
        </span>
        <span className="text-sm ml-1">{unit}</span>
      </div>
      
      <div className="text-xs opacity-75">
        {description}
      </div>
      
      <div className="mt-2">
        <span className={`text-xs px-2 py-1 rounded-full ${getRatingColor(rating)}`}>
          {rating.replace('-', ' ')}
        </span>
      </div>
    </div>
  );
};

interface PerformanceDashboardProps {
  darkMode?: boolean;
  showOnlyInDev?: boolean;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ 
  darkMode = false,
  showOnlyInDev = true 
}) => {
  const [currentMetrics, setCurrentMetrics] = useState<CurrentMetrics>({
    coreVitals: [],
    customMetrics: [],
    errors: [],
  });
  const [isVisible, setIsVisible] = useState(false);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  
  const { getCurrentMetrics } = usePerformanceMonitor();

  // 開発環境でのみ表示
  useEffect(() => {
    if (showOnlyInDev && process.env.NODE_ENV !== 'development') {
      return;
    }
    setIsVisible(true);
  }, [showOnlyInDev]);

  // メトリクスの定期更新
  useEffect(() => {
    if (!isVisible) return;

    const updateMetrics = () => {
      const metrics = getCurrentMetrics();
      setCurrentMetrics(metrics);
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000); // 5秒ごと

    return () => clearInterval(interval);
  }, [isVisible, getCurrentMetrics]);

  // サマリーデータの取得
  useEffect(() => {
    if (!isVisible) return;

    const fetchSummary = async () => {
      try {
        const response = await fetch('/api/performance?timeRange=3600000'); // 1時間
        const data = await response.json();
        setSummaryData(data.summary);
      } catch (error) {
        console.warn('Failed to fetch performance summary:', error);
      }
    };

    fetchSummary();
    const interval = setInterval(fetchSummary, 30000); // 30秒ごと

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  const coreVitalsMetrics = currentMetrics.coreVitals || [];
  const hasData = coreVitalsMetrics.length > 0 || summaryData;

  return (
    <div className={`fixed bottom-4 right-4 max-w-md ${
      darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
    } border rounded-lg shadow-lg z-50`}>
      {/* ヘッダー */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Performance Monitor</h2>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* メトリクス表示 */}
      <div className="p-3 max-h-96 overflow-y-auto">
        {!hasData ? (
          <div className="text-center py-4 text-gray-500">
            <div className="text-2xl mb-2">📊</div>
            <p className="text-sm">Collecting performance data...</p>
          </div>
        ) : (
          <>
            {/* Core Web Vitals */}
            <div className="mb-4">
              <h3 className="font-medium text-sm mb-2">Core Web Vitals</h3>
              <div className="grid grid-cols-1 gap-2">
                {coreVitalsMetrics.map((metric: PerformanceMetric, index: number) => (
                  <MetricCard
                    key={index}
                    title={metric.name}
                    value={metric.value}
                    unit={getMetricUnit(metric.name)}
                    rating={metric.rating}
                    description={getMetricDescription(metric.name)}
                  />
                ))}
                
                {/* サマリーデータからのメトリクス */}
                {summaryData?.coreWebVitals?.map((metric, index: number) => (
                  <MetricCard
                    key={`summary-${index}`}
                    title={`${metric.name} (Avg)`}
                    value={metric.average}
                    unit={getMetricUnit(metric.name)}
                    rating={getAverageRating(metric)}
                    trend={metric.trend}
                    description={`${metric.count} samples`}
                  />
                ))}
              </div>
            </div>

            {/* カスタムメトリクス */}
            {currentMetrics.customMetrics.length > 0 && (
              <div className="mb-4">
                <h3 className="font-medium text-sm mb-2">Custom Metrics</h3>
                <div className="space-y-1 text-xs">
                  {currentMetrics.customMetrics.slice(-5).map((metric: CustomMetric, index: number) => (
                    <div key={index} className={`p-2 rounded ${
                      darkMode ? 'bg-gray-700' : 'bg-gray-50'
                    }`}>
                      <div className="flex justify-between">
                        <span className="font-medium">{metric.name}</span>
                        <span>{metric.value.toFixed(1)}{getMetricUnit(metric.name)}</span>
                      </div>
                      <div className="text-gray-500 text-xs">
                        {metric.category} • {new Date(metric.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* エラー統計 */}
            {(currentMetrics.errors.length > 0 || summaryData?.errorRate > 0) && (
              <div className="mb-4">
                <h3 className="font-medium text-sm mb-2">Error Statistics</h3>
                <div className={`p-2 rounded ${
                  darkMode ? 'bg-red-900/20' : 'bg-red-50'
                } border border-red-200`}>
                  <div className="text-red-600 text-sm">
                    Session Errors: {currentMetrics.errors.length}
                  </div>
                  {summaryData?.errorRate && (
                    <div className="text-red-600 text-sm">
                      Global Rate: {summaryData.errorRate.toFixed(2)} errors/session
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 最適化提案 */}
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-sm mb-2">Recommendations</h3>
              <div className="space-y-1 text-xs">
                {generateRecommendations(currentMetrics, summaryData).map((rec, index) => (
                  <div key={index} className={`p-2 rounded ${
                    darkMode ? 'bg-blue-900/20' : 'bg-blue-50'
                  } text-blue-700 dark:text-blue-300`}>
                    {rec}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ヘルパー関数
function getMetricUnit(metricName: string): string {
  const units: { [key: string]: string } = {
    'LCP': 'ms',
    'FID': 'ms',
    'CLS': '',
    'FCP': 'ms',
    'TTFB': 'ms',
    'memory-used': 'MB',
    'memory-total': 'MB',
    'long-task': 'ms',
  };
  return units[metricName] || 'ms';
}

function getMetricDescription(metricName: string): string {
  const descriptions: { [key: string]: string } = {
    'LCP': 'Largest Contentful Paint',
    'FID': 'First Input Delay',
    'CLS': 'Cumulative Layout Shift',
    'FCP': 'First Contentful Paint',
    'TTFB': 'Time to First Byte',
  };
  return descriptions[metricName] || metricName;
}

function getAverageRating(metric: { good: number; count: number }): 'good' | 'needs-improvement' | 'poor' {
  const goodPercent = (metric.good / metric.count) * 100;
  if (goodPercent >= 75) return 'good';
  if (goodPercent >= 50) return 'needs-improvement';
  return 'poor';
}

function generateRecommendations(currentMetrics: CurrentMetrics, summaryData: SummaryData | null): string[] {
  const recommendations: string[] = [];
  
  // Core Web Vitals based recommendations
  currentMetrics.coreVitals?.forEach((metric: PerformanceMetric) => {
    if (metric.rating === 'poor') {
      switch (metric.name) {
        case 'LCP':
          recommendations.push('Optimize image loading and server response time');
          break;
        case 'FID':
          recommendations.push('Reduce JavaScript execution time and optimize event handlers');
          break;
        case 'CLS':
          recommendations.push('Add size attributes to images and reserve space for dynamic content');
          break;
      }
    }
  });
  
  // Error rate recommendations
  if (summaryData?.errorRate > 0.1) {
    recommendations.push('High error rate detected - review error logs');
  }
  
  // Memory usage recommendations
  const memoryMetric = currentMetrics.customMetrics?.find((m: CustomMetric) => m.name === 'memory-used');
  if (memoryMetric && memoryMetric.value > 50 * 1024 * 1024) { // 50MB
    recommendations.push('High memory usage - consider optimizing component state');
  }
  
  // Default recommendation if none specific
  if (recommendations.length === 0) {
    recommendations.push('Performance is looking good! 🎉');
  }
  
  return recommendations.slice(0, 3); // Show max 3 recommendations
}

export default PerformanceDashboard;
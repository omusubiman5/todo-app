import { NextRequest, NextResponse } from 'next/server';

// 🚀 Phase 3 Stage 3: パフォーマンスデータ収集API

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  url: string;
  userAgent: string;
  connectionType?: string;
}

interface CustomMetric {
  name: string;
  value: number;
  timestamp: number;
  category: 'navigation' | 'interaction' | 'loading' | 'custom';
  metadata?: Record<string, unknown>;
}

interface ErrorReport {
  message: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  timestamp: number;
  userAgent: string;
  url: string;
}

interface PageView {
  url: string;
  title: string;
  timestamp: number;
  loadTime?: number;
  referrer?: string;
}

interface PerformanceReport {
  sessionId: string;
  userId?: string;
  metrics: PerformanceMetric[];
  customMetrics: CustomMetric[];
  errors: ErrorReport[];
  pageViews: PageView[];
  timestamp: number;
}

interface MetricSummary {
  name: string;
  count: number;
  average: number;
  good: number;
  needsImprovement: number;
  poor: number;
  trend: 'improving' | 'stable' | 'degrading';
}

// インメモリストレージ（本番環境ではデータベースを使用）
const performanceData: PerformanceReport[] = [];
const MAX_REPORTS = 1000;

export async function POST(request: NextRequest) {
  try {
    const report: PerformanceReport = await request.json();
    
    // データ検証
    if (!report.sessionId || !report.timestamp) {
      return NextResponse.json(
        { error: 'Invalid report data' },
        { status: 400 }
      );
    }
    
    // レポートの保存
    performanceData.push(report);
    
    // 古いデータの削除
    if (performanceData.length > MAX_REPORTS) {
      performanceData.splice(0, performanceData.length - MAX_REPORTS);
    }
    
    // Critical メトリクスのチェック
    const criticalIssues = detectCriticalIssues(report);
    
    if (criticalIssues.length > 0) {
      // Critical issues detected - log for monitoring
      console.warn('Critical performance issues detected:', {
        sessionId: report.sessionId,
        userId: report.userId,
        issues: criticalIssues,
        timestamp: new Date().toISOString(),
      });
    }
    
    return NextResponse.json({ 
      status: 'success',
      criticalIssues: criticalIssues.length,
    });
  } catch (error) {
    console.error('Performance data processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process performance data' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId');
    const timeRange = parseInt(searchParams.get('timeRange') || '3600000'); // 1時間
    const metricName = searchParams.get('metric');
    
    const now = Date.now();
    const startTime = now - timeRange;
    
    // フィルタリング
    let filteredData = performanceData.filter(report => 
      report.timestamp >= startTime
    );
    
    if (sessionId) {
      filteredData = filteredData.filter(report => report.sessionId === sessionId);
    }
    
    if (userId) {
      filteredData = filteredData.filter(report => report.userId === userId);
    }
    
    // 特定のメトリック情報
    if (metricName) {
      const metricData = extractMetricData(filteredData, metricName);
      return NextResponse.json(metricData);
    }
    
    // サマリー統計の生成
    const summary = generatePerformanceSummary(filteredData);
    
    return NextResponse.json({
      summary,
      reportCount: filteredData.length,
      timeRange: {
        start: new Date(startTime).toISOString(),
        end: new Date(now).toISOString(),
      },
    });
  } catch (error) {
    console.error('Performance data retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve performance data' },
      { status: 500 }
    );
  }
}

function detectCriticalIssues(report: PerformanceReport): string[] {
  const issues: string[] = [];
  
  // Core Web Vitals の閾値チェック
  report.metrics.forEach(metric => {
    if (metric.rating === 'poor') {
      switch (metric.name) {
        case 'LCP':
          if (metric.value > 4000) {
            issues.push(`Critical LCP: ${metric.value}ms (>4000ms)`);
          }
          break;
        case 'FID':
          if (metric.value > 300) {
            issues.push(`Critical FID: ${metric.value}ms (>300ms)`);
          }
          break;
        case 'CLS':
          if (metric.value > 0.25) {
            issues.push(`Critical CLS: ${metric.value} (>0.25)`);
          }
          break;
      }
    }
  });
  
  // エラー率のチェック
  if (report.errors.length > 5) {
    issues.push(`High error rate: ${report.errors.length} errors in session`);
  }
  
  // Long tasks のチェック
  const longTasks = report.customMetrics.filter(m => 
    m.name === 'long-task' && m.value > 50
  );
  if (longTasks.length > 3) {
    issues.push(`Multiple long tasks: ${longTasks.length} tasks >50ms`);
  }
  
  // メモリ使用量のチェック
  const memoryUsed = report.customMetrics.find(m => m.name === 'memory-used');
  const memoryLimit = report.customMetrics.find(m => m.name === 'memory-limit');
  
  if (memoryUsed && memoryLimit && memoryUsed.value > memoryLimit.value * 0.9) {
    issues.push(`High memory usage: ${Math.round(memoryUsed.value / memoryLimit.value * 100)}%`);
  }
  
  return issues;
}

function extractMetricData(reports: PerformanceReport[], metricName: string) {
  const metricValues: number[] = [];
  const timestamps: number[] = [];
  
  reports.forEach(report => {
    const metric = report.metrics.find(m => m.name === metricName) ||
                   report.customMetrics.find(m => m.name === metricName);
    
    if (metric) {
      metricValues.push(metric.value);
      timestamps.push(report.timestamp);
    }
  });
  
  if (metricValues.length === 0) {
    return { error: 'No data found for metric' };
  }
  
  return {
    metricName,
    data: metricValues.map((value, index) => ({
      value,
      timestamp: (timestamps && index < timestamps.length) ? timestamps[index] : new Date(),
    })),
    statistics: {
      count: metricValues.length,
      average: metricValues.reduce((a, b) => a + b, 0) / metricValues.length,
      min: Math.min(...metricValues),
      max: Math.max(...metricValues),
      median: getMedian(metricValues),
      p95: getPercentile(metricValues, 95),
    },
  };
}

interface CustomMetricSummary {
  count: number;
  average: number;
  min: number;
  max: number;
}

function generatePerformanceSummary(reports: PerformanceReport[]): {
  coreWebVitals: MetricSummary[];
  customMetrics: { [key: string]: CustomMetricSummary };
  errorRate: number;
  sessionCount: number;
} {
  const coreWebVitalsNames = ['LCP', 'FID', 'CLS', 'FCP', 'TTFB'];
  const coreWebVitals: MetricSummary[] = [];
  
  coreWebVitalsNames.forEach(metricName => {
    const metrics = reports.flatMap(r => 
      r.metrics.filter(m => m.name === metricName)
    );
    
    if (metrics.length > 0) {
      const values = metrics.map(m => m.value);
      const average = values.reduce((a, b) => a + b, 0) / values.length;
      
      const ratings = metrics.map(m => m.rating);
      const good = ratings.filter(r => r === 'good').length;
      const needsImprovement = ratings.filter(r => r === 'needs-improvement').length;
      const poor = ratings.filter(r => r === 'poor').length;
      
      coreWebVitals.push({
        name: metricName,
        count: metrics.length,
        average,
        good,
        needsImprovement,
        poor,
        trend: calculateTrend(values),
      });
    }
  });
  
  // カスタムメトリクスの集計
  const customMetricsMap = new Map<string, number[]>();
  reports.forEach(report => {
    report.customMetrics.forEach(metric => {
      if (!customMetricsMap.has(metric.name)) {
        customMetricsMap.set(metric.name, []);
      }
      customMetricsMap.get(metric.name)!.push(metric.value);
    });
  });
  
  const customMetrics: { [key: string]: CustomMetricSummary } = {};
  customMetricsMap.forEach((values, name) => {
    // Validate name to prevent object injection
    const safeName = String(name).replace(/[^a-zA-Z0-9_-]/g, '_');
    customMetrics[safeName] = {
      count: values.length,
      average: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  });
  
  // エラー率の計算
  const totalErrors = reports.reduce((sum, r) => sum + r.errors.length, 0);
  const totalSessions = new Set(reports.map(r => r.sessionId)).size;
  const errorRate = totalSessions > 0 ? totalErrors / totalSessions : 0;
  
  return {
    coreWebVitals,
    customMetrics,
    errorRate,
    sessionCount: totalSessions,
  };
}

function calculateTrend(values: number[]): 'improving' | 'stable' | 'degrading' {
  if (values.length < 2) return 'stable';
  
  const half = Math.floor(values.length / 2);
  const firstHalf = values.slice(0, half);
  const secondHalf = values.slice(half);
  
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  
  const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;
  
  if (changePercent < -5) return 'improving';
  if (changePercent > 5) return 'degrading';
  return 'stable';
}

function getMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length === 0) return 0;
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
    : (sorted[mid] ?? 0);
}

function getPercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.ceil((percentile / 100) * sorted.length) - 1));
  return sorted[index] ?? 0;
}
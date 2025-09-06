// パフォーマンス監視システム
export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: string;
  url: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface WebVitalsMetric {
  name: 'FCP' | 'LCP' | 'FID' | 'CLS' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface CustomMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percent';
  category: 'load' | 'interaction' | 'memory' | 'network' | 'custom';
  timestamp: string;
}

class PerformanceMonitoring {
  private static instance: PerformanceMonitoring;
  private metricsQueue: PerformanceMetric[] = [];
  private isOnline = true;
  private batchSize = 20;
  private flushInterval = 10000; // 10 seconds
  private maxQueueSize = 200;
  private sessionStartTime = Date.now();
  private navigationStartTime = 0;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): PerformanceMonitoring {
    if (!PerformanceMonitoring.instance) {
      PerformanceMonitoring.instance = new PerformanceMonitoring();
    }
    return PerformanceMonitoring.instance;
  }

  private initialize(): void {
    if (typeof window === 'undefined') return;

    // Navigation APIの監視
    this.navigationStartTime = performance.timeOrigin;
    
    // Web Vitalsの監視を開始
    this.initializeWebVitals();
    
    // カスタムメトリクスの監視
    this.initializeCustomMetrics();
    
    // ページ離脱時の処理
    window.addEventListener('beforeunload', () => {
      this.captureSessionMetrics();
      this.flushMetrics(true); // 強制フラッシュ
    });

    // オンライン/オフライン状態の監視
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushMetrics();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // 定期的にメトリクスをフラッシュ
    setInterval(() => {
      this.flushMetrics();
    }, this.flushInterval);

    // ページロード完了時の監視
    window.addEventListener('load', () => {
      this.captureLoadMetrics();
    });
  }

  private initializeWebVitals(): void {
    // Web Vitals ライブラリが利用可能な場合
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.observeWebVitals();
    }
  }

  private observeWebVitals(): void {
    try {
      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry;
        
        this.captureWebVital({
          name: 'LCP',
          value: lastEntry.startTime,
          rating: this.rateLCP(lastEntry.startTime),
          timestamp: new Date().toISOString(),
          metadata: {
            element: lastEntry.element?.tagName,
            url: lastEntry.url
          }
        });
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: PerformanceEntry) => {
          this.captureWebVital({
            name: 'FID',
            value: entry.processingStart - entry.startTime,
            rating: this.rateFID(entry.processingStart - entry.startTime),
            timestamp: new Date().toISOString(),
            metadata: {
              eventType: entry.name
            }
          });
        });
      });
      fidObserver.observe({ type: 'first-input', buffered: true });

      // Cumulative Layout Shift (CLS)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: PerformanceEntry) => {
          const layoutShiftEntry = entry as any; // Layout shift entries have additional properties
          if (!layoutShiftEntry.hadRecentInput) {
            clsValue += layoutShiftEntry.value || 0;
          }
        });
        
        this.captureWebVital({
          name: 'CLS',
          value: clsValue,
          rating: this.rateCLS(clsValue),
          timestamp: new Date().toISOString()
        });
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });

    } catch (error) {
      console.warn('Web Vitals observation failed:', error);
    }
  }

  private rateLCP(value: number): WebVitalsMetric['rating'] {
    if (value <= 2500) return 'good';
    if (value <= 4000) return 'needs-improvement';
    return 'poor';
  }

  private rateFID(value: number): WebVitalsMetric['rating'] {
    if (value <= 100) return 'good';
    if (value <= 300) return 'needs-improvement';
    return 'poor';
  }

  private rateCLS(value: number): WebVitalsMetric['rating'] {
    if (value <= 0.1) return 'good';
    if (value <= 0.25) return 'needs-improvement';
    return 'poor';
  }

  private initializeCustomMetrics(): void {
    if (typeof window === 'undefined') return;

    // リソースロード時間の監視
    const resourceObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: PerformanceResourceTiming) => {
        if (entry.duration > 1000) { // 1秒以上のリソース
          this.captureMetric({
            name: 'slow-resource-load',
            value: entry.duration,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            metadata: {
              resourceUrl: entry.name,
              resourceType: entry.initiatorType,
              transferSize: entry.transferSize,
              encodedSize: entry.encodedBodySize
            }
          });
        }
      });
    });
    
    try {
      resourceObserver.observe({ entryTypes: ['resource'] });
    } catch (e) {
      // Resource timing not supported
    }

    // メモリ使用量の定期監視
    this.monitorMemoryUsage();
    
    // ネットワーク情報の監視
    this.monitorNetworkInformation();
  }

  private monitorMemoryUsage(): void {
    if (typeof window === 'undefined') return;

    const checkMemory = () => {
      const memory = (performance as typeof performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      if (memory) {
        const usedMB = memory.usedJSHeapSize / (1024 * 1024);
        const totalMB = memory.totalJSHeapSize / (1024 * 1024);
        const limitMB = memory.jsHeapSizeLimit / (1024 * 1024);

        this.captureMetric({
          name: 'memory-usage',
          value: usedMB,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          metadata: {
            totalMemory: totalMB,
            memoryLimit: limitMB,
            usagePercent: (usedMB / limitMB) * 100
          }
        });
      }
    };

    // 初回測定
    checkMemory();
    
    // 30秒間隔で監視
    setInterval(checkMemory, 30000);
  }

  private monitorNetworkInformation(): void {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as typeof navigator & { connection?: { effectiveType?: string; downlink?: number; rtt?: number } }).connection;
      
      this.captureMetric({
        name: 'network-information',
        value: connection?.downlink || 0,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        metadata: {
          effectiveType: connection?.effectiveType,
          rtt: connection?.rtt,
          saveData: (connection as any)?.saveData
        }
      });

      // ネットワーク変更の監視
      if (connection && 'addEventListener' in connection) {
        connection.addEventListener('change', () => {
          this.captureMetric({
            name: 'network-change',
            value: connection?.downlink || 0,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            metadata: {
              effectiveType: connection?.effectiveType,
              rtt: connection?.rtt,
              saveData: (connection as any)?.saveData
            }
          });
        });
      }
    }
  }

  private captureLoadMetrics(): void {
    if (typeof performance === 'undefined') return;

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      // First Contentful Paint
      const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
      if (fcpEntry) {
        this.captureWebVital({
          name: 'FCP',
          value: fcpEntry.startTime,
          rating: fcpEntry.startTime <= 1800 ? 'good' : fcpEntry.startTime <= 3000 ? 'needs-improvement' : 'poor',
          timestamp: new Date().toISOString()
        });
      }

      // Time to First Byte
      this.captureWebVital({
        name: 'TTFB',
        value: navigation.responseStart - navigation.fetchStart,
        rating: (navigation.responseStart - navigation.fetchStart) <= 800 ? 'good' : 
                (navigation.responseStart - navigation.fetchStart) <= 1800 ? 'needs-improvement' : 'poor',
        timestamp: new Date().toISOString()
      });

      // その他のロードメトリクス
      this.captureMetric({
        name: 'dom-load-time',
        value: navigation.loadEventEnd - navigation.loadEventStart,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        metadata: {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          totalLoadTime: navigation.loadEventEnd - navigation.fetchStart
        }
      });
    }
  }

  private captureSessionMetrics(): void {
    const sessionDuration = Date.now() - this.sessionStartTime;
    
    this.captureMetric({
      name: 'session-duration',
      value: sessionDuration,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      metadata: {
        sessionStart: this.sessionStartTime,
        pageViews: this.getPageViewCount()
      }
    });
  }

  private getPageViewCount(): number {
    // 実装に応じてページビュー数を取得
    return parseInt(sessionStorage.getItem('pageViews') || '1');
  }

  public captureMetric(metric: Partial<PerformanceMetric>): void {
    const fullMetric: PerformanceMetric = {
      name: metric.name || 'unknown-metric',
      value: metric.value || 0,
      timestamp: metric.timestamp || new Date().toISOString(),
      url: metric.url || (typeof window !== 'undefined' ? window.location.href : 'unknown'),
      userId: metric.userId,
      sessionId: metric.sessionId || this.generateSessionId(),
      metadata: metric.metadata
    };

    this.metricsQueue.push(fullMetric);

    // キューサイズ制限
    if (this.metricsQueue.length > this.maxQueueSize) {
      this.metricsQueue = this.metricsQueue.slice(-this.maxQueueSize);
    }

    // 開発環境でのログ
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Performance Metric: ${fullMetric.name} = ${fullMetric.value}`, fullMetric);
    }
  }

  public captureWebVital(vital: WebVitalsMetric): void {
    this.captureMetric({
      name: `web-vital-${vital.name}`,
      value: vital.value,
      timestamp: vital.timestamp,
      metadata: {
        ...vital.metadata,
        rating: vital.rating,
        vitalName: vital.name
      }
    });
  }

  public captureCustomMetric(metric: CustomMetric): void {
    this.captureMetric({
      name: metric.name,
      value: metric.value,
      timestamp: metric.timestamp,
      metadata: {
        unit: metric.unit,
        category: metric.category
      }
    });
  }

  // API呼び出し時間の測定
  public measureApiCall<T>(
    apiName: string,
    apiCall: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    
    return apiCall()
      .then((result) => {
        const duration = performance.now() - startTime;
        this.captureMetric({
          name: `api-call-${apiName}`,
          value: duration,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          metadata: {
            apiName,
            success: true,
            category: 'network'
          }
        });
        return result;
      })
      .catch((error) => {
        const duration = performance.now() - startTime;
        this.captureMetric({
          name: `api-call-${apiName}`,
          value: duration,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          metadata: {
            apiName,
            success: false,
            error: error.message,
            category: 'network'
          }
        });
        throw error;
      });
  }

  // コンポーネントレンダリング時間の測定
  public measureRender(componentName: string): {
    start: () => void;
    end: () => void;
  } {
    let startTime: number;
    
    return {
      start: () => {
        startTime = performance.now();
      },
      end: () => {
        const duration = performance.now() - startTime;
        this.captureMetric({
          name: `render-${componentName}`,
          value: duration,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          metadata: {
            componentName,
            category: 'ui'
          }
        });
      }
    };
  }

  private generateSessionId(): string {
    return `perf_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async flushMetrics(force = false): Promise<void> {
    if ((!this.isOnline && !force) || this.metricsQueue.length === 0) {
      return;
    }

    const batch = this.metricsQueue.splice(0, this.batchSize);

    try {
      await this.sendToMonitoringService(batch);
    } catch (error) {
      // 送信失敗時はキューに戻す（強制フラッシュでない場合）
      if (!force) {
        this.metricsQueue.unshift(...batch);
      }
      console.warn('Failed to send performance metrics:', error);
    }
  }

  private async sendToMonitoringService(metrics: PerformanceMetric[]): Promise<void> {
    // 本番環境では外部サービスに送信
    if (process.env.NODE_ENV === 'production') {
      // Example: Google Analytics, Adobe Analytics, 独自のエンドポイント
      // await fetch('/api/performance', { method: 'POST', body: JSON.stringify(metrics) });
      console.info('📈 Performance metrics sent:', metrics.length);
    }

    // 開発環境ではローカルストレージに保存
    if (typeof window !== 'undefined') {
      const existingMetrics = JSON.parse(localStorage.getItem('performance-metrics') || '[]');
      const updatedMetrics = [...existingMetrics, ...metrics].slice(-1000); // 最新1000件を保持
      localStorage.setItem('performance-metrics', JSON.stringify(updatedMetrics));
    }
  }

  public getMetricsHistory(limit: number = 100): PerformanceMetric[] {
    if (typeof window === 'undefined') return [];
    
    const metrics = JSON.parse(localStorage.getItem('performance-metrics') || '[]');
    return metrics.slice(-limit);
  }

  public getMetricsSummary(): {
    averageLoadTime: number;
    averageApiResponseTime: number;
    memoryUsage: number;
    webVitalsScore: number;
  } {
    const metrics = this.getMetricsHistory(500);
    
    const loadTimes = metrics
      .filter(m => m.name === 'dom-load-time')
      .map(m => m.value);
    
    const apiTimes = metrics
      .filter(m => m.name.startsWith('api-call-'))
      .map(m => m.value);
    
    const memoryMetrics = metrics
      .filter(m => m.name === 'memory-usage')
      .map(m => m.value);
    
    const webVitals = metrics.filter(m => m.name.startsWith('web-vital-'));
    const webVitalsScore = this.calculateWebVitalsScore(webVitals);

    return {
      averageLoadTime: loadTimes.length > 0 ? loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length : 0,
      averageApiResponseTime: apiTimes.length > 0 ? apiTimes.reduce((a, b) => a + b, 0) / apiTimes.length : 0,
      memoryUsage: memoryMetrics.length > 0 ? memoryMetrics[memoryMetrics.length - 1] : 0,
      webVitalsScore
    };
  }

  private calculateWebVitalsScore(webVitals: PerformanceMetric[]): number {
    const vitalsCount = webVitals.length;
    if (vitalsCount === 0) return 0;

    const goodCount = webVitals.filter(v => v.metadata?.rating === 'good').length;
    return (goodCount / vitalsCount) * 100;
  }

  public clearMetricsHistory(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('performance-metrics');
    }
    this.metricsQueue = [];
  }

  public setUserContext(userId: string, sessionId?: string): void {
    this.metricsQueue.forEach(metric => {
      metric.userId = userId;
      if (sessionId) {
        metric.sessionId = sessionId;
      }
    });
  }
}

// シングルトンインスタンスをエクスポート
export const performanceMonitor = PerformanceMonitoring.getInstance();

// React hooks
export const usePerformanceMonitoring = (userId?: string) => {
  const [metrics, setMetrics] = React.useState<PerformanceMetric[]>([]);
  const [summary, setSummary] = React.useState({
    averageLoadTime: 0,
    averageApiResponseTime: 0,
    memoryUsage: 0,
    webVitalsScore: 0
  });

  React.useEffect(() => {
    const monitor = PerformanceMonitoring.getInstance();
    
    if (userId) {
      monitor.setUserContext(userId);
    }
    
    // メトリクスを定期的に更新
    const updateMetrics = () => {
      setMetrics(monitor.getMetricsHistory(50));
      setSummary(monitor.getMetricsSummary());
    };
    
    updateMetrics();
    const interval = setInterval(updateMetrics, 5000);
    
    return () => clearInterval(interval);
  }, [userId]);

  const measureApiCall = React.useCallback(<T>(apiName: string, apiCall: () => Promise<T>) => {
    return performanceMonitor.measureApiCall(apiName, apiCall);
  }, []);

  const measureRender = React.useCallback((componentName: string) => {
    return performanceMonitor.measureRender(componentName);
  }, []);

  const captureCustomMetric = React.useCallback((metric: CustomMetric) => {
    performanceMonitor.captureCustomMetric(metric);
  }, []);

  return {
    metrics,
    summary,
    measureApiCall,
    measureRender,
    captureCustomMetric
  };
};

// HOC for component performance measurement
export function withPerformanceMeasurement<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const MeasuredComponent = React.forwardRef<unknown, P>((props, ref) => {
    const name = componentName || Component.displayName || Component.name || 'Unknown';
    const renderMeasure = performanceMonitor.measureRender(name);
    
    React.useEffect(() => {
      renderMeasure.start();
      return () => renderMeasure.end();
    });

    return React.createElement(Component, { ...props, ref });
  });

  MeasuredComponent.displayName = `withPerformanceMeasurement(${componentName || Component.displayName || Component.name})`;
  
  return MeasuredComponent;
}

// 型定義は上部で既にエクスポート済み

import React from 'react';
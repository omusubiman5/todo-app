"use client";

import { getCLS, getFID, getFCP, getLCP, getTTFB, Metric } from 'web-vitals';

// 🚀 Phase 3 Stage 3: 高度なパフォーマンス監視システム

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
  metadata?: Record<string, any>;
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

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private sessionId: string;
  private userId?: string;
  private metrics: PerformanceMetric[] = [];
  private customMetrics: CustomMetric[] = [];
  private errors: ErrorReport[] = [];
  private pageViews: PageView[] = [];
  private reportingEndpoint: string;
  private reportInterval: number;
  private maxMetrics: number;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.reportingEndpoint = '/api/performance';
    this.reportInterval = 30000; // 30秒
    this.maxMetrics = 100;
    
    this.initializeMonitoring();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Web Vitals監視
    this.initializeWebVitals();
    
    // カスタムメトリクス監視
    this.initializeCustomMetrics();
    
    // エラー監視
    this.initializeErrorMonitoring();
    
    // ページビュー監視
    this.initializePageViewMonitoring();
    
    // 定期レポート送信
    this.startPeriodicReporting();
    
    // ページ離脱時のレポート送信
    this.setupBeforeUnloadReporting();
  }

  private initializeWebVitals(): void {
    const handleMetric = (metric: Metric) => {
      this.recordWebVital(metric);
    };

    // Core Web Vitals
    getCLS(handleMetric);
    getFID(handleMetric);
    getFCP(handleMetric);
    getLCP(handleMetric);
    getTTFB(handleMetric);
  }

  private recordWebVital(metric: Metric): void {
    const performanceMetric: PerformanceMetric = {
      name: metric.name,
      value: metric.value,
      rating: this.getMetricRating(metric),
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      connectionType: this.getConnectionType(),
    };

    this.addMetric(performanceMetric);
  }

  private getMetricRating(metric: Metric): 'good' | 'needs-improvement' | 'poor' {
    // Web Vitals thresholds
    const thresholds = {
      CLS: { good: 0.1, poor: 0.25 },
      FID: { good: 100, poor: 300 },
      FCP: { good: 1800, poor: 3000 },
      LCP: { good: 2500, poor: 4000 },
      TTFB: { good: 800, poor: 1800 },
    };

    const threshold = thresholds[metric.name as keyof typeof thresholds];
    if (!threshold) return 'good';

    if (metric.value <= threshold.good) return 'good';
    if (metric.value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  private getConnectionType(): string | undefined {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection?.effectiveType || connection?.type;
    }
    return undefined;
  }

  private initializeCustomMetrics(): void {
    // Navigation Timing
    this.measureNavigationTiming();
    
    // Resource Timing
    this.measureResourceTiming();
    
    // Long Tasks
    this.measureLongTasks();
    
    // Memory Usage
    this.measureMemoryUsage();
  }

  private measureNavigationTiming(): void {
    if (typeof window === 'undefined' || !window.performance) return;

    const navigation = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (!navigation) return;

    const metrics = [
      { name: 'dns-lookup', value: navigation.domainLookupEnd - navigation.domainLookupStart },
      { name: 'tcp-connect', value: navigation.connectEnd - navigation.connectStart },
      { name: 'ssl-handshake', value: navigation.connectEnd - navigation.secureConnectionStart },
      { name: 'ttfb', value: navigation.responseStart - navigation.requestStart },
      { name: 'download', value: navigation.responseEnd - navigation.responseStart },
      { name: 'dom-processing', value: navigation.domComplete - navigation.domLoading },
      { name: 'load-complete', value: navigation.loadEventEnd - navigation.loadEventStart },
    ];

    metrics.forEach(metric => {
      if (metric.value >= 0) {
        this.recordCustomMetric(metric.name, metric.value, 'navigation');
      }
    });
  }

  private measureResourceTiming(): void {
    if (typeof window === 'undefined' || !window.performance) return;

    const resources = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    // グループ別のリソース統計
    const resourceGroups = {
      scripts: resources.filter(r => r.name.includes('.js')),
      styles: resources.filter(r => r.name.includes('.css')),
      images: resources.filter(r => /\.(jpg|jpeg|png|gif|webp|svg)/.test(r.name)),
      fonts: resources.filter(r => /\.(woff|woff2|ttf|otf)/.test(r.name)),
    };

    Object.entries(resourceGroups).forEach(([type, resources]) => {
      if (resources.length > 0) {
        const totalDuration = resources.reduce((sum, r) => sum + r.duration, 0);
        const averageDuration = totalDuration / resources.length;
        
        this.recordCustomMetric(`${type}-count`, resources.length, 'loading');
        this.recordCustomMetric(`${type}-avg-duration`, averageDuration, 'loading');
      }
    });
  }

  private measureLongTasks(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.recordCustomMetric('long-task', entry.duration, 'interaction', {
            startTime: entry.startTime,
            name: entry.name,
          });
        });
      });

      observer.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      console.warn('Long task monitoring not supported:', error);
    }
  }

  private measureMemoryUsage(): void {
    if (typeof window === 'undefined') return;

    const measureMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this.recordCustomMetric('memory-used', memory.usedJSHeapSize, 'custom');
        this.recordCustomMetric('memory-total', memory.totalJSHeapSize, 'custom');
        this.recordCustomMetric('memory-limit', memory.jsHeapSizeLimit, 'custom');
      }
    };

    measureMemory();
    setInterval(measureMemory, 60000); // 1分ごと
  }

  private initializeErrorMonitoring(): void {
    if (typeof window === 'undefined') return;

    // JavaScript エラー
    window.addEventListener('error', (event) => {
      this.recordError({
        message: event.error?.message || event.message,
        stack: event.error?.stack,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      });
    });

    // Promise rejection
    window.addEventListener('unhandledrejection', (event) => {
      this.recordError({
        message: event.reason?.message || 'Unhandled Promise Rejection',
        stack: event.reason?.stack,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      });
    });
  }

  private initializePageViewMonitoring(): void {
    if (typeof window === 'undefined') return;

    const recordPageView = () => {
      const loadTime = window.performance.timing
        ? window.performance.timing.loadEventEnd - window.performance.timing.navigationStart
        : undefined;

      this.recordPageView({
        url: window.location.href,
        title: document.title,
        timestamp: Date.now(),
        loadTime,
        referrer: document.referrer,
      });
    };

    recordPageView();

    // SPA navigation
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(recordPageView, 100);
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(recordPageView, 100);
    };

    window.addEventListener('popstate', () => {
      setTimeout(recordPageView, 100);
    });
  }

  public recordCustomMetric(
    name: string, 
    value: number, 
    category: 'navigation' | 'interaction' | 'loading' | 'custom',
    metadata?: Record<string, any>
  ): void {
    const metric: CustomMetric = {
      name,
      value,
      timestamp: Date.now(),
      category,
      metadata,
    };

    this.customMetrics.push(metric);
    this.limitArraySize(this.customMetrics);
  }

  public setUserId(userId: string): void {
    this.userId = userId;
  }

  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    this.limitArraySize(this.metrics);
  }

  private recordError(error: ErrorReport): void {
    this.errors.push(error);
    this.limitArraySize(this.errors);
  }

  private recordPageView(pageView: PageView): void {
    this.pageViews.push(pageView);
    this.limitArraySize(this.pageViews);
  }

  private limitArraySize<T>(array: T[]): void {
    if (array.length > this.maxMetrics) {
      array.splice(0, array.length - this.maxMetrics);
    }
  }

  private startPeriodicReporting(): void {
    setInterval(() => {
      this.sendReport();
    }, this.reportInterval);
  }

  private setupBeforeUnloadReporting(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('beforeunload', () => {
      this.sendReport(true);
    });

    // Page Visibility API
    if ('visibilityState' in document) {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.sendReport(true);
        }
      });
    }
  }

  private async sendReport(isBeforeUnload = false): Promise<void> {
    if (this.metrics.length === 0 && this.customMetrics.length === 0 && this.errors.length === 0) {
      return;
    }

    const report: PerformanceReport = {
      sessionId: this.sessionId,
      userId: this.userId,
      metrics: [...this.metrics],
      customMetrics: [...this.customMetrics],
      errors: [...this.errors],
      pageViews: [...this.pageViews],
      timestamp: Date.now(),
    };

    try {
      if (isBeforeUnload && 'sendBeacon' in navigator) {
        // ページ離脱時は sendBeacon を使用
        navigator.sendBeacon(
          this.reportingEndpoint,
          JSON.stringify(report)
        );
      } else {
        // 通常の fetch
        await fetch(this.reportingEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(report),
        });
      }

      // 送信成功後はデータをクリア
      this.clearReportData();
    } catch (error) {
      console.warn('Failed to send performance report:', error);
    }
  }

  private clearReportData(): void {
    this.metrics = [];
    this.customMetrics = [];
    this.errors = [];
    // pageViews は保持（セッション情報として）
  }

  // パフォーマンス測定ヘルパー
  public measureFunction<T extends (...args: any[]) => any>(
    fn: T,
    name: string
  ): T {
    return ((...args: any[]) => {
      const start = performance.now();
      const result = fn(...args);
      const duration = performance.now() - start;
      
      this.recordCustomMetric(`function-${name}`, duration, 'custom');
      
      return result;
    }) as T;
  }

  public async measureAsync<T>(
    promise: Promise<T>,
    name: string
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await promise;
      const duration = performance.now() - start;
      this.recordCustomMetric(`async-${name}`, duration, 'custom');
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordCustomMetric(`async-${name}-error`, duration, 'custom');
      throw error;
    }
  }

  // リアルタイムメトリクス取得
  public getCurrentMetrics(): {
    coreVitals: PerformanceMetric[];
    customMetrics: CustomMetric[];
    errors: ErrorReport[];
  } {
    return {
      coreVitals: this.metrics.filter(m => 
        ['CLS', 'FID', 'FCP', 'LCP', 'TTFB'].includes(m.name)
      ),
      customMetrics: this.customMetrics,
      errors: this.errors,
    };
  }
}

// シングルトンインスタンス
export const performanceMonitor = PerformanceMonitor.getInstance();

// React フック
export function usePerformanceMonitor() {
  return {
    recordMetric: (name: string, value: number, category: 'navigation' | 'interaction' | 'loading' | 'custom') =>
      performanceMonitor.recordCustomMetric(name, value, category),
    measureFunction: <T extends (...args: any[]) => any>(fn: T, name: string) =>
      performanceMonitor.measureFunction(fn, name),
    measureAsync: <T>(promise: Promise<T>, name: string) =>
      performanceMonitor.measureAsync(promise, name),
    getCurrentMetrics: () => performanceMonitor.getCurrentMetrics(),
  };
}
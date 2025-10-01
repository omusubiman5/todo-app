/**
 * Performance monitoring utilities for tracking Core Web Vitals and app performance
 */

interface PerformanceMetric {
  name: string;
  value: number;
  id?: string;
  timestamp: number;
}

interface WebVitalsMetric extends PerformanceMetric {
  rating: 'good' | 'needs-improvement' | 'poor';
  delta?: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private webVitalsBuffer: WebVitalsMetric[] = [];
  private reportingEnabled: boolean;

  constructor() {
    this.reportingEnabled = typeof window !== 'undefined' && process.env.NODE_ENV === 'production';
    
    if (typeof window !== 'undefined') {
      this.initializeWebVitals();
      this.initializeNavigationTiming();
      this.initializeResourceTiming();
    }
  }

  /**
   * Initialize Core Web Vitals monitoring
   */
  private async initializeWebVitals() {
    try {
      const { getCLS, getFID, getFCP, getLCP, getTTFB } = await import('web-vitals');

      getCLS((metric) => this.handleWebVital({ ...metric, name: 'CLS' }));
      getFID((metric) => this.handleWebVital({ ...metric, name: 'FID' }));
      getFCP((metric) => this.handleWebVital({ ...metric, name: 'FCP' }));
      getLCP((metric) => this.handleWebVital({ ...metric, name: 'LCP' }));
      getTTFB((metric) => this.handleWebVital({ ...metric, name: 'TTFB' }));
    } catch (error) {
      console.warn('Web Vitals not available:', error);
    }
  }

  /**
   * Handle Web Vital metrics
   */
  private handleWebVital(metric: { name: string; value: number; id?: string; rating?: string; delta?: number }) {
    const webVital: WebVitalsMetric = {
      name: metric.name,
      value: metric.value,
      id: metric.id,
      timestamp: Date.now(),
      rating: metric.rating || this.rateMetric(metric.name, metric.value),
      delta: metric.delta
    };

    this.webVitalsBuffer.push(webVital);
    this.reportWebVital(webVital);
  }

  /**
   * Rate metrics based on Core Web Vitals thresholds
   */
  private rateMetric(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = {
      CLS: { good: 0.1, poor: 0.25 },
      FID: { good: 100, poor: 300 },
      FCP: { good: 1800, poor: 3000 },
      LCP: { good: 2500, poor: 4000 },
      TTFB: { good: 800, poor: 1800 }
    };

    const threshold = thresholds[name as keyof typeof thresholds];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Initialize Navigation Timing monitoring
   */
  private initializeNavigationTiming() {
    if ('performance' in window && 'getEntriesByType' in performance) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          
          if (nav) {
            this.trackMetric('DOM_CONTENT_LOADED', nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart);
            this.trackMetric('DOM_COMPLETE', nav.domComplete - nav.domLoading);
            this.trackMetric('LOAD_EVENT', nav.loadEventEnd - nav.loadEventStart);
            this.trackMetric('PAGE_LOAD_TIME', nav.loadEventEnd - nav.fetchStart);
          }
        }, 0);
      });
    }
  }

  /**
   * Initialize Resource Timing monitoring
   */
  private initializeResourceTiming() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resource = entry as PerformanceResourceTiming;
            
            // Track large resources
            if (resource.transferSize > 100000) { // > 100KB
              this.trackMetric(`LARGE_RESOURCE_${resource.name.split('/').pop()}`, resource.duration);
            }
          }
        }
      });

      observer.observe({ entryTypes: ['resource'] });
    }
  }

  /**
   * Track custom performance metric
   */
  public trackMetric(name: string, value: number, id?: string) {
    const metric: PerformanceMetric = {
      name,
      value,
      id,
      timestamp: Date.now()
    };

    this.metrics.push(metric);

    if (this.reportingEnabled) {
      this.reportMetric(metric);
    }
  }

  /**
   * Track task operation performance
   */
  public trackTaskOperation(operation: 'create' | 'update' | 'delete' | 'fetch', duration: number, count?: number) {
    const metricName = `TASK_${operation.toUpperCase()}${count ? `_${count}` : ''}`;
    this.trackMetric(metricName, duration);
  }

  /**
   * Track component render performance
   */
  public trackComponentRender(componentName: string, duration: number) {
    this.trackMetric(`COMPONENT_RENDER_${componentName}`, duration);
  }

  /**
   * Report Web Vital to analytics
   */
  private reportWebVital(metric: WebVitalsMetric) {
    if (!this.reportingEnabled) return;

    // In a real app, send to your analytics service
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as { gtag: (...args: unknown[]) => void }).gtag('event', metric.name, {
        event_category: 'Web Vitals',
        event_label: metric.id,
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        non_interaction: true,
      });
    }

    // Console log for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 Web Vital - ${metric.name}:`, {
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta
      });
    }
  }

  /**
   * Report custom metric
   */
  private reportMetric(metric: PerformanceMetric) {
    if (!this.reportingEnabled) return;

    // In a real app, send to your analytics service
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Performance Metric - ${metric.name}:`, metric.value);
    }
  }

  /**
   * Get performance summary
   */
  public getPerformanceSummary() {
    const webVitalsSummary = this.webVitalsBuffer.reduce((acc, metric) => {
      acc[metric.name] = {
        value: metric.value,
        rating: metric.rating,
        timestamp: metric.timestamp
      };
      return acc;
    }, {} as Record<string, { value: number; rating: string; timestamp: number }>);

    const customMetrics = this.metrics.reduce((acc, metric) => {
      if (!acc[metric.name]) acc[metric.name] = [];
      acc[metric.name].push(metric.value);
      return acc;
    }, {} as Record<string, number[]>);

    return {
      webVitals: webVitalsSummary,
      customMetrics,
      totalMetrics: this.metrics.length,
      reportingEnabled: this.reportingEnabled
    };
  }

  /**
   * Clear all metrics (useful for testing)
   */
  public clearMetrics() {
    this.metrics = [];
    this.webVitalsBuffer = [];
  }
}

// Singleton instance
let performanceMonitor: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!performanceMonitor) {
    performanceMonitor = new PerformanceMonitor();
  }
  return performanceMonitor;
}

// React hook for performance monitoring
export function usePerformanceMonitor() {
  const monitor = getPerformanceMonitor();

  const trackRender = (componentName: string) => {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      monitor.trackComponentRender(componentName, duration);
    };
  };

  const trackAsyncOperation = async <T>(
    operation: string,
    asyncFn: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now();
    try {
      const result = await asyncFn();
      const duration = performance.now() - startTime;
      monitor.trackMetric(`ASYNC_${operation.toUpperCase()}`, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      monitor.trackMetric(`ASYNC_${operation.toUpperCase()}_ERROR`, duration);
      throw error;
    }
  };

  return {
    trackMetric: (name: string, value: number) => monitor.trackMetric(name, value),
    trackTaskOperation: (operation: 'create' | 'update' | 'delete' | 'fetch', duration: number, count?: number) => 
      monitor.trackTaskOperation(operation, duration, count),
    trackRender,
    trackAsyncOperation,
    getPerformanceSummary: () => monitor.getPerformanceSummary()
  };
}

export default PerformanceMonitor;
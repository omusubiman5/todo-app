// エラー監視システム
export interface ErrorInfo {
  message: string;
  stack?: string;
  timestamp: string;
  url: string;
  userAgent: string;
  userId?: string;
  sessionId?: string;
  errorBoundary?: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'network' | 'auth' | 'data' | 'ui' | 'unknown';
  metadata?: Record<string, unknown>;
}

export interface ErrorMetrics {
  count: number;
  lastOccurrence: string;
  frequency: number; // errors per hour
  affectedUsers: number;
  resolved: boolean;
}

class ErrorMonitoring {
  private static instance: ErrorMonitoring;
  private errorQueue: ErrorInfo[] = [];
  private errorCounts = new Map<string, ErrorMetrics>();
  private isOnline = true;
  private batchSize = 10;
  private flushInterval = 5000; // 5 seconds
  private maxQueueSize = 100;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): ErrorMonitoring {
    if (!ErrorMonitoring.instance) {
      ErrorMonitoring.instance = new ErrorMonitoring();
    }
    return ErrorMonitoring.instance;
  }

  private initialize(): void {
    // グローバルエラーハンドラーを設定
    if (typeof window !== 'undefined') {
      window.addEventListener('error', this.handleGlobalError.bind(this));
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
      
      // オンライン/オフライン状態の監視
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.flushErrors();
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }

    // 定期的にエラーをフラッシュ
    setInterval(() => {
      this.flushErrors();
    }, this.flushInterval);
  }

  private handleGlobalError(event: ErrorEvent): void {
    const errorInfo: ErrorInfo = {
      message: event.message,
      stack: event.error?.stack,
      timestamp: new Date().toISOString(),
      url: event.filename || window.location.href,
      userAgent: navigator.userAgent,
      severity: 'high',
      category: 'unknown',
      metadata: {
        lineno: event.lineno,
        colno: event.colno,
        source: 'global-error-handler'
      }
    };

    this.captureError(errorInfo);
  }

  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    const errorInfo: ErrorInfo = {
      message: event.reason?.message || 'Unhandled Promise Rejection',
      stack: event.reason?.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      severity: 'high',
      category: 'unknown',
      metadata: {
        reason: event.reason,
        source: 'unhandled-rejection'
      }
    };

    this.captureError(errorInfo);
  }

  public captureError(errorInfo: Partial<ErrorInfo>): void {
    const fullErrorInfo: ErrorInfo = {
      message: errorInfo.message || 'Unknown error',
      stack: errorInfo.stack,
      timestamp: errorInfo.timestamp || new Date().toISOString(),
      url: errorInfo.url || (typeof window !== 'undefined' ? window.location.href : 'unknown'),
      userAgent: errorInfo.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'),
      userId: errorInfo.userId,
      sessionId: errorInfo.sessionId || this.generateSessionId(),
      errorBoundary: errorInfo.errorBoundary || false,
      severity: errorInfo.severity || 'medium',
      category: this.categorizeError(errorInfo.message || ''),
      metadata: errorInfo.metadata
    };

    // エラー統計を更新
    this.updateErrorMetrics(fullErrorInfo);

    // キューに追加
    this.errorQueue.push(fullErrorInfo);

    // キューサイズ制限
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue = this.errorQueue.slice(-this.maxQueueSize);
    }

    // 重要なエラーは即座に送信
    if (fullErrorInfo.severity === 'critical') {
      this.flushErrors();
    }

    // コンソールにログ出力（開発環境のみ）
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error Captured (${fullErrorInfo.severity})`);
      console.error('Message:', fullErrorInfo.message);
      console.error('Category:', fullErrorInfo.category);
      console.error('Stack:', fullErrorInfo.stack);
      console.error('Metadata:', fullErrorInfo.metadata);
      console.groupEnd();
    }
  }

  private categorizeError(message: string): ErrorInfo['category'] {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || 
        lowerMessage.includes('cors') || lowerMessage.includes('connection')) {
      return 'network';
    }
    
    if (lowerMessage.includes('auth') || lowerMessage.includes('token') || 
        lowerMessage.includes('login') || lowerMessage.includes('permission')) {
      return 'auth';
    }
    
    if (lowerMessage.includes('data') || lowerMessage.includes('database') || 
        lowerMessage.includes('query') || lowerMessage.includes('supabase')) {
      return 'data';
    }
    
    if (lowerMessage.includes('render') || lowerMessage.includes('component') || 
        lowerMessage.includes('element') || lowerMessage.includes('dom')) {
      return 'ui';
    }

    return 'unknown';
  }

  private updateErrorMetrics(errorInfo: ErrorInfo): void {
    const key = `${errorInfo.message}-${errorInfo.category}`;
    const existing = this.errorCounts.get(key);

    if (existing) {
      existing.count++;
      existing.lastOccurrence = errorInfo.timestamp;
      existing.frequency = this.calculateFrequency(existing.count, existing.lastOccurrence);
      
      if (errorInfo.userId && !existing.affectedUsers) {
        existing.affectedUsers++;
      }
    } else {
      this.errorCounts.set(key, {
        count: 1,
        lastOccurrence: errorInfo.timestamp,
        frequency: 1,
        affectedUsers: errorInfo.userId ? 1 : 0,
        resolved: false
      });
    }
  }

  private calculateFrequency(count: number, lastOccurrence: string): number {
    const now = new Date().getTime();
    const last = new Date(lastOccurrence).getTime();
    const hoursDiff = (now - last) / (1000 * 60 * 60);
    return hoursDiff > 0 ? count / hoursDiff : count;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async flushErrors(): Promise<void> {
    if (!this.isOnline || this.errorQueue.length === 0) {
      return;
    }

    const batch = this.errorQueue.splice(0, this.batchSize);

    try {
      // 本来はここで外部監視サービス（Sentry、LogRocket等）に送信
      // 現在はローカルストレージとコンソールログで対応
      await this.sendToMonitoringService(batch);
    } catch (error) {
      // 送信失敗時はキューに戻す
      this.errorQueue.unshift(...batch);
      console.warn('Failed to send error batch to monitoring service:', error);
    }
  }

  private async sendToMonitoringService(errors: ErrorInfo[]): Promise<void> {
    // 本番環境では外部サービスのAPIを呼び出し
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry, LogRocket,或いは独自のエラー収集エンドポイント
      // await fetch('/api/errors', { method: 'POST', body: JSON.stringify(errors) });
      console.info('📊 Error batch sent to monitoring service:', errors.length);
    }

    // 開発環境ではローカルストレージに保存
    if (typeof window !== 'undefined') {
      const existingErrors = JSON.parse(localStorage.getItem('error-logs') || '[]');
      const updatedErrors = [...existingErrors, ...errors].slice(-500); // 最新500件を保持
      localStorage.setItem('error-logs', JSON.stringify(updatedErrors));
    }
  }

  public getErrorMetrics(): Map<string, ErrorMetrics> {
    return new Map(this.errorCounts);
  }

  public getErrorHistory(limit: number = 100): ErrorInfo[] {
    if (typeof window === 'undefined') return [];
    
    const errors = JSON.parse(localStorage.getItem('error-logs') || '[]');
    return errors.slice(-limit);
  }

  public clearErrorHistory(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('error-logs');
    }
    this.errorCounts.clear();
    this.errorQueue = [];
  }

  public markErrorAsResolved(errorKey: string): void {
    const metrics = this.errorCounts.get(errorKey);
    if (metrics) {
      metrics.resolved = true;
    }
  }

  // React Error Boundary統合用
  public captureReactError(error: Error, errorInfo: { componentStack?: string }, userId?: string): void {
    this.captureError({
      message: error.message,
      stack: error.stack,
      severity: 'high',
      category: 'ui',
      errorBoundary: true,
      userId,
      metadata: {
        componentStack: errorInfo.componentStack,
        source: 'react-error-boundary'
      }
    });
  }

  // 手動でのエラー報告用
  public reportError(message: string, metadata?: Record<string, unknown>, severity: ErrorInfo['severity'] = 'medium'): void {
    this.captureError({
      message,
      severity,
      metadata: {
        ...metadata,
        source: 'manual-report'
      }
    });
  }

  // ユーザーセッション情報の設定
  public setUserContext(userId: string, sessionId?: string): void {
    // 既存のエラーにユーザー情報を追加
    this.errorQueue.forEach(error => {
      error.userId = userId;
      if (sessionId) {
        error.sessionId = sessionId;
      }
    });
  }

  // パフォーマンス関連のエラー監視
  public monitorPerformance(): void {
    if (typeof window === 'undefined') return;

    // Long Task API
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: PerformanceEntry) => {
            if (entry.duration > 50) { // 50ms以上のロングタスク
              this.captureError({
                message: `Long task detected: ${entry.duration}ms`,
                severity: 'low',
                category: 'ui',
                metadata: {
                  duration: entry.duration,
                  startTime: entry.startTime,
                  source: 'performance-observer'
                }
              });
            }
          });
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        // PerformanceObserver not supported
      }
    }

    // メモリ使用量監視
    if ('performance' in window && 'memory' in (performance as unknown as { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } })) {
      setInterval(() => {
        const memory = (performance as unknown as { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
        const usedPercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        
        if (usedPercent > 90) {
          this.captureError({
            message: `High memory usage: ${usedPercent.toFixed(2)}%`,
            severity: 'medium',
            category: 'ui',
            metadata: {
              usedJSHeapSize: memory.usedJSHeapSize,
              totalJSHeapSize: memory.totalJSHeapSize,
              jsHeapSizeLimit: memory.jsHeapSizeLimit,
              source: 'memory-monitor'
            }
          });
        }
      }, 30000); // 30秒間隔
    }
  }
}

// React Error Boundary用のコンポーネント
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; userId?: string },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; userId?: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string }) {
    const monitor = ErrorMonitoring.getInstance();
    monitor.captureReactError(error, errorInfo, this.props.userId);
  }

  render() {
    if (this.state.hasError) {
      return React.createElement('div', {
        className: 'error-boundary-fallback p-6 bg-red-50 border border-red-200 rounded-lg'
      }, [
        React.createElement('h2', {
          key: 'title',
          className: 'text-lg font-semibold text-red-800 mb-2'
        }, '申し訳ございません。エラーが発生しました。'),
        React.createElement('p', {
          key: 'message',
          className: 'text-red-600 mb-4'
        }, 'ページを再読み込みしてもう一度お試しください。'),
        React.createElement('button', {
          key: 'reload',
          className: 'px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700',
          onClick: () => window.location.reload()
        }, 'ページを再読み込み')
      ]);
    }

    return this.props.children;
  }
}

// シングルトンインスタンスをエクスポート
export const errorMonitor = ErrorMonitoring.getInstance();

// React hooks
export const useErrorMonitoring = (userId?: string) => {
  React.useEffect(() => {
    const monitor = ErrorMonitoring.getInstance();
    
    if (userId) {
      monitor.setUserContext(userId);
    }
    
    monitor.monitorPerformance();
    
    return () => {
      // cleanup if needed
    };
  }, [userId]);

  const reportError = React.useCallback((message: string, metadata?: Record<string, unknown>, severity?: ErrorInfo['severity']) => {
    errorMonitor.reportError(message, metadata, severity);
  }, []);

  const getErrorHistory = React.useCallback((limit?: number) => {
    return errorMonitor.getErrorHistory(limit);
  }, []);

  const getErrorMetrics = React.useCallback(() => {
    return errorMonitor.getErrorMetrics();
  }, []);

  return {
    reportError,
    getErrorHistory,
    getErrorMetrics
  };
};

// ユーティリティ関数
export const withErrorHandling = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  errorMessage?: string
): T => {
  return ((...args: Parameters<T>) => {
    try {
      const result = fn(...args);
      
      // Promise を返す関数の場合
      if (result && typeof result.catch === 'function') {
        return result.catch((error: Error) => {
          errorMonitor.reportError(
            errorMessage || `Error in ${fn.name || 'anonymous function'}`,
            { originalError: error.message, args },
            'medium'
          );
          throw error;
        });
      }
      
      return result;
    } catch (error) {
      errorMonitor.reportError(
        errorMessage || `Error in ${fn.name || 'anonymous function'}`,
        { originalError: (error as Error).message, args },
        'medium'
      );
      throw error;
    }
  }) as T;
};

// 型定義をエクスポート
export type { ErrorInfo, ErrorMetrics };

import React from 'react';
import * as Sentry from '@sentry/nextjs';

// カスタムエラー報告関数
export const reportError = (error: Error, context?: Record<string, any>) => {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext('additional', context);
    }
    Sentry.captureException(error);
  });
};

// パフォーマンス測定
export const measurePerformance = (name: string) => {
  return Sentry.startTransaction({ name });
};

// ユーザーコンテキスト設定
export const setUserContext = (user: { id: string; email: string; username?: string }) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
};

// カスタムタグ設定
export const setCustomTags = (tags: Record<string, string>) => {
  Sentry.setTags(tags);
};

// パンくずリスト追加
export const addBreadcrumb = (message: string, category: string, level: 'info' | 'error' | 'warning' = 'info') => {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    timestamp: Date.now() / 1000,
  });
};

// API エラー報告
export const reportApiError = (
  error: Error,
  endpoint: string,
  method: string,
  statusCode?: number
) => {
  Sentry.withScope((scope) => {
    scope.setTag('errorType', 'api');
    scope.setContext('api', {
      endpoint,
      method,
      statusCode,
    });
    scope.setLevel('error');
    Sentry.captureException(error);
  });
};

// データベースエラー報告
export const reportDatabaseError = (
  error: Error,
  query?: string,
  table?: string
) => {
  Sentry.withScope((scope) => {
    scope.setTag('errorType', 'database');
    scope.setContext('database', {
      query: query ? query.substring(0, 100) : undefined, // 最初の100文字のみ
      table,
    });
    scope.setLevel('error');
    Sentry.captureException(error);
  });
};

// 認証エラー報告
export const reportAuthError = (error: Error, action: string) => {
  Sentry.withScope((scope) => {
    scope.setTag('errorType', 'auth');
    scope.setContext('auth', { action });
    scope.setLevel('warning');
    Sentry.captureException(error);
  });
};

// カスタムメトリクス送信
export const sendCustomMetric = (name: string, value: number, tags?: Record<string, string>) => {
  // 無料プランでは制限があるため、重要なメトリクスのみ送信
  addBreadcrumb(`Metric: ${name} = ${value}`, 'metric', 'info');
};

// スローダウン検出
export const detectSlowOperation = (operationName: string, duration: number, threshold = 3000) => {
  if (duration > threshold) {
    Sentry.withScope((scope) => {
      scope.setTag('performanceIssue', 'slow');
      scope.setContext('performance', {
        operation: operationName,
        duration,
        threshold,
      });
      scope.setLevel('warning');
      Sentry.captureMessage(`Slow operation detected: ${operationName} took ${duration}ms`);
    });
  }
};
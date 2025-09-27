import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // パフォーマンストレーシング設定
  tracesSampleRate: 1.0,

  // デバッグモード（開発時のみ）
  debug: process.env.NODE_ENV === 'development',

  // エラー前後のパンくずリスト数
  beforeBreadcrumb(breadcrumb, hint) {
    // コンソールログは記録しない（ノイズ削減）
    if (breadcrumb.category === 'console') {
      return null;
    }
    return breadcrumb;
  },

  // エラーフィルタリング
  beforeSend(event, hint) {
    // 開発環境では送信しない
    if (process.env.NODE_ENV === 'development') {
      console.log('Sentry event (dev):', event);
      return null;
    }

    // 特定のエラーを除外
    if (event.exception) {
      const error = hint.originalException;
      // ネットワークエラーやキャンセルされたリクエストを除外
      if (error?.name === 'AbortError' || error?.name === 'NetworkError') {
        return null;
      }
    }

    return event;
  },

  // リリース情報
  release: process.env.NEXT_PUBLIC_APP_VERSION || 'development',

  // 環境情報
  environment: process.env.NODE_ENV || 'development',

  // ユーザーコンテキスト自動設定
  initialScope: {
    tags: {
      component: 'frontend',
    },
  },
});

// Next.js 15 required: Router transition tracking
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
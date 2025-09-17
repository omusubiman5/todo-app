import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { setUserContext, addBreadcrumb } from '@/lib/sentry-utils';

// Sentryモニタリング用フック
export function useSentryMonitoring() {
  const { user } = useAuth();

  useEffect(() => {
    // ユーザーログイン時にコンテキスト設定
    if (user) {
      setUserContext({
        id: user.id,
        email: user.email || '',
        username: user.email?.split('@')[0] || '',
      });

      addBreadcrumb('User logged in', 'auth', 'info');
    }
  }, [user]);

  // ページビュー追跡
  useEffect(() => {
    const trackPageView = () => {
      addBreadcrumb(`Page view: ${window.location.pathname}`, 'navigation', 'info');
    };

    trackPageView();

    // ルート変更を監視
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      trackPageView();
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      trackPageView();
    };

    window.addEventListener('popstate', trackPageView);

    return () => {
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', trackPageView);
    };
  }, []);
}

// API呼び出し監視用フック
export function useApiMonitoring() {
  const trackApiCall = (endpoint: string, method: string) => {
    const start = performance.now();

    return {
      finish: (success: boolean, statusCode?: number) => {
        const duration = performance.now() - start;

        addBreadcrumb(
          `API ${method} ${endpoint} - ${success ? 'success' : 'error'} (${duration.toFixed(0)}ms)`,
          'http',
          success ? 'info' : 'error'
        );

        // 遅いAPIコールを検出
        if (duration > 5000) {
          addBreadcrumb(
            `Slow API call detected: ${method} ${endpoint} took ${duration.toFixed(0)}ms`,
            'performance',
            'warning'
          );
        }
      }
    };
  };

  return { trackApiCall };
}
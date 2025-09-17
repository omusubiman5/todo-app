import React from 'react';
import * as Sentry from '@sentry/nextjs';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Sentryにエラーを送信
    Sentry.withScope((scope) => {
      // コンテキスト情報を追加
      scope.setTag('errorBoundary', true);
      scope.setContext('errorBoundary', {
        componentStack: errorInfo.componentStack,
      });

      // ユーザー情報があれば追加
      const user = this.getUserInfo();
      if (user) {
        scope.setUser(user);
      }

      // カスタムフィンガープリント
      scope.setFingerprint(['error-boundary', error.name]);

      // エラーレベル設定
      scope.setLevel('error');

      Sentry.captureException(error);
    });

    console.error('Error caught by boundary:', error, errorInfo);
  }

  getUserInfo() {
    // ユーザー情報を取得（認証コンテキストから）
    try {
      // localStorage または認証コンテキストからユーザー情報を取得
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return {
          id: user.id,
          email: user.email,
        };
      }
    } catch {
      // エラーは無視
    }
    return null;
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      // カスタムフォールバックがあれば使用
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error!}
            resetError={this.resetError}
          />
        );
      }

      // デフォルトのエラー画面
      return (
        <div className="error-boundary">
          <div className="error-content">
            <h2>予期しないエラーが発生しました</h2>
            <p>申し訳ございません。アプリケーションでエラーが発生しました。</p>
            <details className="error-details">
              <summary>エラー詳細</summary>
              <pre>{this.state.error?.message}</pre>
            </details>
            <div className="error-actions">
              <button onClick={this.resetError} className="retry-button">
                再試行
              </button>
              <button onClick={() => window.location.reload()} className="reload-button">
                ページを再読み込み
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// カスタムエラーフォールバックコンポーネント
export function TaskErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  return (
    <div className="task-error-fallback">
      <h3>タスクの読み込みに失敗しました</h3>
      <p>タスクデータの取得中にエラーが発生しました。</p>
      <button onClick={resetError}>再試行</button>
    </div>
  );
}

export default ErrorBoundary;
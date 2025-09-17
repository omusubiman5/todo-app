import React from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useApiMonitoring } from '@/hooks/useSentryMonitoring';
import { reportApiError, reportDatabaseError, detectSlowOperation } from '@/lib/sentry-utils';
import { TaskErrorFallback } from './ErrorBoundary';
import ErrorBoundary from './ErrorBoundary';

export function TaskWithMonitoring({ userId }: { userId: string }) {
  const { tasks, error, isLoading } = useTasks(userId);
  const { trackApiCall } = useApiMonitoring();

  // エラーハンドリングの例
  const handleTaskAction = async (action: string, taskId?: string) => {
    const tracker = trackApiCall('/api/tasks', 'POST');
    const start = performance.now();

    try {
      // 実際のAPI呼び出し
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, taskId }),
      });

      const duration = performance.now() - start;

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      tracker.finish(true, response.status);
      detectSlowOperation('task-action', duration);

      return await response.json();

    } catch (error) {
      const duration = performance.now() - start;

      tracker.finish(false);
      detectSlowOperation('task-action', duration);

      // エラーの種類に応じて適切な報告
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          reportApiError(error, '/api/tasks', 'POST');
        } else if (error.message.includes('database')) {
          reportDatabaseError(error, 'tasks', 'tasks');
        }
      }

      throw error;
    }
  };

  if (error) {
    return <TaskErrorFallback error={error} resetError={() => window.location.reload()} />;
  }

  return (
    <ErrorBoundary fallback={TaskErrorFallback}>
      <div className="task-list">
        {isLoading ? (
          <div>Loading tasks...</div>
        ) : (
          tasks?.map(task => (
            <div key={task.id} className="task-item">
              <h3>{task.title}</h3>
              <button onClick={() => handleTaskAction('complete', task.id)}>
                Complete
              </button>
            </div>
          ))
        )}
      </div>
    </ErrorBoundary>
  );
}

// テスト用エラー発生ボタン
export function ErrorTestButtons() {
  const testError = () => {
    throw new Error('Test error for Sentry');
  };

  const testAsyncError = async () => {
    try {
      const response = await fetch('/api/nonexistent');
      if (!response.ok) throw new Error('API not found');
    } catch (error) {
      reportApiError(error as Error, '/api/nonexistent', 'GET', 404);
    }
  };

  return (
    <div className="error-test-buttons">
      <button onClick={testError}>Test Sync Error</button>
      <button onClick={testAsyncError}>Test Async Error</button>
    </div>
  );
}
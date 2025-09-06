import { useState, useEffect, useCallback, useMemo } from 'react';
import { SharedTask, WorkspaceContext } from '@/lib/types';
import { SharedTaskService } from '@/lib/sharedTaskService';
import { useAuth } from '@/components/AuthProvider';
import { useWorkspace } from '@/components/WorkspaceProvider';

interface UseOptimizedTasksOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  batchSize?: number;
  enableRealtime?: boolean;
}

interface TaskFilters {
  priority?: string;
  completed?: boolean;
  assignedTo?: string;
  searchText?: string;
}

export function useOptimizedTasks(options: UseOptimizedTasksOptions = {}) {
  const {
    autoRefresh = false,
    refreshInterval = 30000,
    batchSize = 50,
    enableRealtime = true
  } = options;

  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();

  // 状態管理
  const [tasks, setTasks] = useState<SharedTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TaskFilters>({});
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  // タスク取得の最適化されたコールバック
  const fetchTasks = useCallback(async (
    reset = false,
    customFilters?: TaskFilters,
    cursor?: string
  ) => {
    if (!user) return;

    try {
      if (reset) {
        setIsLoading(true);
        setError(null);
      }

      const appliedFilters = customFilters || filters;
      const response = await SharedTaskService.getTasks(
        currentWorkspace,
        user?.id || ''
      );

      if (reset) {
        setTasks(response);
        setNextCursor(null);
        setHasMore(false);
      } else {
        setTasks(prev => [...prev, ...response]);
        setNextCursor(null);
        setHasMore(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'タスクの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [user, currentWorkspace, filters, batchSize]);

  // フィルタリングされたタスクの計算をメモ化
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (filters.priority && task.priority !== filters.priority) return false;
      if (filters.completed !== undefined && task.completed !== filters.completed) return false;
      if (filters.assignedTo && task.assigned_to !== filters.assignedTo) return false;
      if (filters.searchText && !task.text.toLowerCase().includes(filters.searchText.toLowerCase())) return false;
      return true;
    });
  }, [tasks, filters]);

  // 統計情報の計算をメモ化
  const taskStats = useMemo(() => {
    const total = filteredTasks.length;
    const completed = filteredTasks.filter(task => task.completed).length;
    const pending = total - completed;
    
    const priorityStats = filteredTasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      completed,
      pending,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      priorityStats
    };
  }, [filteredTasks]);

  // タスク作成の最適化
  const createTask = useCallback(async (taskData: Partial<SharedTask>) => {
    if (!user) return;

    try {
      const newTask = await SharedTaskService.createTask({
        text: taskData.text || '',
        user_id: user.id,
        team_id: currentWorkspace.type === 'team' ? currentWorkspace.team_id : null,
        completed: false,
        priority: taskData.priority || '中',
        ...taskData
      }, currentWorkspace);

      // 楽観的更新
      setTasks(prev => [newTask, ...prev]);
      return newTask;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'タスクの作成に失敗しました');
      throw err;
    }
  }, [user, currentWorkspace]);

  // タスク更新の最適化
  const updateTask = useCallback(async (taskId: string, updates: Partial<SharedTask>) => {
    try {
      // 楽観的更新
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, ...updates, updated_at: new Date().toISOString() } : task
      ));

      const updatedTask = await SharedTaskService.updateTask(taskId, updates);
      
      // 実際のレスポンスで同期
      setTasks(prev => prev.map(task => 
        task.id === taskId ? updatedTask : task
      ));

      return updatedTask;
    } catch (err) {
      // 楽観的更新の取り消し
      await fetchTasks(true);
      setError(err instanceof Error ? err.message : 'タスクの更新に失敗しました');
      throw err;
    }
  }, [fetchTasks]);

  // タスク削除の最適化
  const deleteTask = useCallback(async (taskId: string) => {
    try {
      // 楽観的更新
      const originalTasks = tasks;
      setTasks(prev => prev.filter(task => task.id !== taskId));

      await SharedTaskService.deleteTask(taskId);
    } catch (err) {
      // 楽観的更新の取り消し
      setTasks(tasks);
      setError(err instanceof Error ? err.message : 'タスクの削除に失敗しました');
      throw err;
    }
  }, [tasks]);

  // バルク操作の最適化
  const bulkUpdateTasks = useCallback(async (
    taskIds: string[], 
    updates: Partial<SharedTask>
  ) => {
    try {
      // 楽観的更新
      const updatedAt = new Date().toISOString();
      setTasks(prev => prev.map(task => 
        taskIds.includes(task.id) 
          ? { ...task, ...updates, updated_at: updatedAt }
          : task
      ));

      // 個別更新の代替実装
      for (const taskId of taskIds) {
        await SharedTaskService.updateTask(taskId, updates);
      }
    } catch (err) {
      // エラー時は再取得
      await fetchTasks(true);
      setError(err instanceof Error ? err.message : 'タスクの一括更新に失敗しました');
      throw err;
    }
  }, [fetchTasks]);

  // フィルター更新
  const updateFilters = useCallback((newFilters: Partial<TaskFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // ページング読み込み
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading || !nextCursor) return;
    await fetchTasks(false, filters, nextCursor);
  }, [hasMore, isLoading, nextCursor, fetchTasks, filters]);

  // 初期読み込み
  useEffect(() => {
    if (user) {
      fetchTasks(true);
    }
  }, [user, currentWorkspace, fetchTasks]);

  // 自動更新
  useEffect(() => {
    if (!autoRefresh || !user) return;

    const interval = setInterval(() => {
      fetchTasks(true);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, user, fetchTasks]);

  // リアルタイム購読
  useEffect(() => {
    if (!enableRealtime || !user) return;

    const channel = SharedTaskService.subscribeToTasks(currentWorkspace, (payload) => {
      const { eventType, old: oldRecord, new: newRecord } = payload as {
        eventType: string;
        old?: SharedTask;
        new?: SharedTask;
      };

      setTasks(prev => {
        switch (eventType) {
          case 'INSERT':
            return newRecord ? [newRecord, ...prev] : prev;
          
          case 'UPDATE':
            return newRecord 
              ? prev.map(task => task.id === newRecord.id ? newRecord : task)
              : prev;
          
          case 'DELETE':
            return oldRecord 
              ? prev.filter(task => task.id !== oldRecord.id)
              : prev;
          
          default:
            return prev;
        }
      });
    });

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [enableRealtime, user, currentWorkspace]);

  return {
    tasks: filteredTasks,
    allTasks: tasks,
    isLoading,
    error,
    hasMore,
    taskStats,
    filters,
    
    // 操作関数
    createTask,
    updateTask,
    deleteTask,
    bulkUpdateTasks,
    updateFilters,
    loadMore,
    refetch: () => fetchTasks(true),
    
    // ユーティリティ
    clearError: () => setError(null)
  };
}
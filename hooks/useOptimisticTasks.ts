// 🚀 楽観的更新を実装するカスタムフック
"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { SharedTask, WorkspaceContext } from '@/lib/types';
import { SharedTaskService } from '@/lib/sharedTaskService';

interface OptimisticUpdate {
  id: string;
  type: 'update' | 'delete' | 'create';
  task: Partial<SharedTask>;
  timestamp: number;
  rollback?: () => void;
}

interface UseOptimisticTasksReturn {
  tasks: SharedTask[];
  isLoading: boolean;
  error: string | null;
  addTask: (task: Omit<SharedTask, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<SharedTask>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  refetchTasks: () => Promise<void>;
  clearError: () => void;
}

export function useOptimisticTasks(
  workspace: WorkspaceContext,
  userId: string
): UseOptimisticTasksReturn {
  const [tasks, setTasks] = useState<SharedTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 楽観的更新の管理
  const pendingUpdatesRef = useRef<Map<string, OptimisticUpdate>>(new Map());
  const rollbackTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // エラークリア
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // タスク取得
  const refetchTasks = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const data = await SharedTaskService.getTasks(workspace, userId);
      setTasks(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '不明なエラー';
      setError(`タスクの取得に失敗しました: ${errorMessage}`);
      console.error('タスク取得エラー:', err);
    } finally {
      setIsLoading(false);
    }
  }, [workspace, userId]);

  // 初期読み込み
  useEffect(() => {
    refetchTasks();
  }, [refetchTasks]);

  // 楽観的更新のヘルパー関数
  const applyOptimisticUpdate = useCallback((
    id: string,
    type: OptimisticUpdate['type'],
    updates: Partial<SharedTask>
  ) => {
    const optimisticId = `optimistic-${Date.now()}`;
    const updateId = type === 'create' ? optimisticId : id;

    setTasks(prevTasks => {
      switch (type) {
        case 'create':
          const newTask: SharedTask = {
            id: optimisticId,
            text: updates.text || '',
            completed: false,
            priority: updates.priority || '中',
            user_id: userId,
            team_id: workspace.type === 'team' ? workspace.team_id : null,
            assigned_to: updates.assigned_to || null,
            created_by: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            assignee: null,
            ...updates
          };
          return [...prevTasks, newTask];

        case 'update':
          return prevTasks.map(task => 
            task.id === id 
              ? { 
                  ...task, 
                  ...updates, 
                  updated_at: new Date().toISOString() 
                }
              : task
          );

        case 'delete':
          return prevTasks.filter(task => task.id !== id);

        default:
          return prevTasks;
      }
    });

    return updateId;
  }, [userId, workspace]);

  // ロールバック処理
  const rollbackUpdate = useCallback((updateId: string) => {
    const update = pendingUpdatesRef.current.get(updateId);
    if (!update) return;

    setTasks(prevTasks => {
      switch (update.type) {
        case 'create':
          return prevTasks.filter(task => task.id !== updateId);
        
        case 'delete':
          // 削除をロールバック（復元）
          if (update.rollback) {
            update.rollback();
          }
          return prevTasks;
        
        case 'update':
          // 更新をロールバック
          if (update.rollback) {
            update.rollback();
          }
          return prevTasks;
        
        default:
          return prevTasks;
      }
    });

    pendingUpdatesRef.current.delete(updateId);
    
    // タイムアウトをクリア
    const timeoutId = rollbackTimeoutRef.current.get(updateId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      rollbackTimeoutRef.current.delete(updateId);
    }
  }, []);

  // タスク作成
  const addTask = useCallback(async (
    taskData: Omit<SharedTask, 'id' | 'created_at' | 'updated_at'>
  ) => {
    const optimisticId = applyOptimisticUpdate('', 'create', taskData);

    // 楽観的更新の記録
    const rollback = () => {
      setTasks(prev => prev.filter(task => task.id !== optimisticId));
    };

    pendingUpdatesRef.current.set(optimisticId, {
      id: optimisticId,
      type: 'create',
      task: taskData,
      timestamp: Date.now(),
      rollback
    });

    try {
      const newTask = await SharedTaskService.createTask(taskData, workspace, userId);
      
      // 成功時: 楽観的更新を実際のデータで置き換え
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === optimisticId ? newTask : task
        )
      );
      
      pendingUpdatesRef.current.delete(optimisticId);
    } catch (err) {
      // 失敗時: ロールバック
      rollbackUpdate(optimisticId);
      const errorMessage = err instanceof Error ? err.message : '不明なエラー';
      setError(`タスクの作成に失敗しました: ${errorMessage}`);
      throw err;
    }
  }, [applyOptimisticUpdate, rollbackUpdate, workspace, userId]);

  // タスク更新
  const updateTask = useCallback(async (id: string, updates: Partial<SharedTask>) => {
    // 現在の値を保存（ロールバック用）
    const currentTask = tasks.find(task => task.id === id);
    if (!currentTask) return;

    const rollback = () => {
      setTasks(prev => 
        prev.map(task => task.id === id ? currentTask : task)
      );
    };

    // 楽観的更新を適用
    applyOptimisticUpdate(id, 'update', updates);

    // 楽観的更新の記録
    pendingUpdatesRef.current.set(id, {
      id,
      type: 'update',
      task: updates,
      timestamp: Date.now(),
      rollback
    });

    // 5秒後にロールバック（タイムアウト）
    const timeoutId = setTimeout(() => rollbackUpdate(id), 5000);
    rollbackTimeoutRef.current.set(id, timeoutId);

    try {
      await SharedTaskService.updateTask(id, updates);
      
      // 成功時: pending状態をクリア
      pendingUpdatesRef.current.delete(id);
      const timeoutId = rollbackTimeoutRef.current.get(id);
      if (timeoutId) {
        clearTimeout(timeoutId);
        rollbackTimeoutRef.current.delete(id);
      }
    } catch (err) {
      // 失敗時: ロールバック
      rollbackUpdate(id);
      const errorMessage = err instanceof Error ? err.message : '不明なエラー';
      setError(`タスクの更新に失敗しました: ${errorMessage}`);
      throw err;
    }
  }, [tasks, applyOptimisticUpdate, rollbackUpdate]);

  // タスク削除
  const deleteTask = useCallback(async (id: string) => {
    // 削除するタスクを保存（ロールバック用）
    const taskToDelete = tasks.find(task => task.id === id);
    if (!taskToDelete) return;

    const rollback = () => {
      setTasks(prev => [...prev, taskToDelete]);
    };

    // 楽観的削除を適用
    applyOptimisticUpdate(id, 'delete', {});

    // 楽観的更新の記録
    pendingUpdatesRef.current.set(id, {
      id,
      type: 'delete',
      task: taskToDelete,
      timestamp: Date.now(),
      rollback
    });

    try {
      await SharedTaskService.deleteTask(id);
      
      // 成功時: pending状態をクリア
      pendingUpdatesRef.current.delete(id);
    } catch (err) {
      // 失敗時: ロールバック
      rollbackUpdate(id);
      const errorMessage = err instanceof Error ? err.message : '不明なエラー';
      setError(`タスクの削除に失敗しました: ${errorMessage}`);
      throw err;
    }
  }, [tasks, applyOptimisticUpdate, rollbackUpdate]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      // タイムアウトをすべてクリア
      rollbackTimeoutRef.current.forEach(timeoutId => clearTimeout(timeoutId));
      rollbackTimeoutRef.current.clear();
      pendingUpdatesRef.current.clear();
    };
  }, []);

  return {
    tasks,
    isLoading,
    error,
    addTask,
    updateTask,
    deleteTask,
    refetchTasks,
    clearError
  };
}
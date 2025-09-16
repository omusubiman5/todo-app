import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { SharedTask, WorkspaceContext } from '@/lib/types';
import { SharedTaskService } from '@/lib/sharedTaskService';

// 🚀 パフォーマンス最適化されたカスタムフック
export function useOptimizedTasks(
  currentWorkspace: WorkspaceContext | null,
  userId: string | undefined
) {
  const [tasks, setTasks] = useState<SharedTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🚀 最新の値を保持するref（クロージャ問題を解決）
  const currentWorkspaceRef = useRef(currentWorkspace);
  const userIdRef = useRef(userId);

  // refを更新
  currentWorkspaceRef.current = currentWorkspace;
  userIdRef.current = userId;

  // 🚀 fetchTasks関数を最適化
  const fetchTasks = useCallback(async () => {
    const workspace = currentWorkspaceRef.current;
    const uid = userIdRef.current;

    if (!workspace || !uid) {
      setTasks([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await SharedTaskService.getTasks(workspace, uid);
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'タスクの取得に失敗しました');
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, []); // 依存配列を空にしてref経由でアクセス

  // 🚀 楽観的更新関数群
  const toggleTask = useCallback(async (taskId: string) => {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const originalTask = tasks[taskIndex];
    const updatedTask = { ...originalTask, completed: !originalTask.completed };

    // 楽観的更新
    setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));

    try {
      await SharedTaskService.updateTask(taskId, { completed: updatedTask.completed });
    } catch (error) {
      // エラー時ロールバック
      setTasks(prev => prev.map(t => t.id === taskId ? originalTask : t));
      throw error;
    }
  }, [tasks]);

  const addTask = useCallback(async (
    text: string,
    priority: '高' | '中' | '低' = '中'
  ) => {
    const workspace = currentWorkspaceRef.current;
    const uid = userIdRef.current;

    if (!workspace || !uid) return;

    const tempId = `temp-${Date.now()}`;
    const tempTask: SharedTask = {
      id: tempId,
      text,
      priority,
      completed: false,
      user_id: uid,
      team_id: workspace.type === 'team' ? workspace.team_id : null,
      assigned_to: null,
      created_by: uid,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 楽観的更新
    setTasks(prev => [tempTask, ...prev]);

    try {
      const newTask = await SharedTaskService.createTask(tempTask, workspace);
      setTasks(prev => prev.map(t => t.id === tempId ? newTask : t));
    } catch (error) {
      // エラー時は一時タスクを削除
      setTasks(prev => prev.filter(t => t.id !== tempId));
      throw error;
    }
  }, []);

  const updateTask = useCallback(async (taskId: string, updates: Partial<SharedTask>) => {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const originalTask = tasks[taskIndex];
    const updatedTask = { ...originalTask, ...updates };

    // 楽観的更新
    setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));

    try {
      await SharedTaskService.updateTask(taskId, updates);
    } catch (error) {
      // エラー時ロールバック
      setTasks(prev => prev.map(t => t.id === taskId ? originalTask : t));
      throw error;
    }
  }, [tasks]);

  const deleteTask = useCallback(async (taskId: string) => {
    const originalTasks = tasks;

    // 楽観的更新
    setTasks(prev => prev.filter(t => t.id !== taskId));

    try {
      await SharedTaskService.deleteTask(taskId);
    } catch (error) {
      // エラー時ロールバック
      setTasks(originalTasks);
      throw error;
    }
  }, [tasks]);

  // 🚀 計算値のメモ化
  const taskStats = useMemo(() => ({
    total: tasks.length,
    completed: tasks.filter(t => t.completed).length,
    pending: tasks.filter(t => !t.completed).length,
    byPriority: {
      high: tasks.filter(t => t.priority === '高').length,
      medium: tasks.filter(t => t.priority === '中').length,
      low: tasks.filter(t => t.priority === '低').length,
    }
  }), [tasks]);

  const sortedTasks = useMemo(() => {
    const priorityOrder = { '高': 3, '中': 2, '低': 1 };
    return [...tasks].sort((a, b) => {
      // 完了状態でまずソート
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      // 優先度でソート
      return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    });
  }, [tasks]);

  // 🚀 データ取得の効果
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks, currentWorkspace, userId]);

  return {
    tasks: sortedTasks,
    isLoading,
    error,
    taskStats,
    actions: {
      fetchTasks,
      toggleTask,
      addTask,
      updateTask,
      deleteTask
    }
  };
}

// 🚀 さらなる最適化: タスクフィルタリング用フック
export function useTaskFilters(tasks: SharedTask[]) {
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | '高' | '中' | '低'>('all');

  const filteredTasks = useMemo(() => {
    let result = tasks;

    // ステータスフィルター
    if (filter === 'completed') {
      result = result.filter(task => task.completed);
    } else if (filter === 'pending') {
      result = result.filter(task => !task.completed);
    }

    // 検索クエリフィルター
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(task =>
        task.text.toLowerCase().includes(query)
      );
    }

    // 優先度フィルター
    if (priorityFilter !== 'all') {
      result = result.filter(task => task.priority === priorityFilter);
    }

    return result;
  }, [tasks, filter, searchQuery, priorityFilter]);

  return {
    filteredTasks,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    priorityFilter,
    setPriorityFilter
  };
}
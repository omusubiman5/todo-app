// 🚀 OptimizedTaskBoard - パフォーマンス最適化版タスクボード
// OptimizedTaskServiceを使用してデータベースパフォーマンスを大幅改善

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthProvider';
import { useWorkspace } from './WorkspaceProvider';
import { SharedTask, PaginationOptions } from '@/lib/types';
import { OptimizedTaskService } from '@/lib/optimizedTaskService';
import { TaskList } from './optimized/TaskList';
import { TaskForm } from './TaskForm';

interface OptimizedTaskBoardProps {
  showLegacyComparison?: boolean; // 最適化前後の比較表示
}

export default function OptimizedTaskBoard({ showLegacyComparison = false }: OptimizedTaskBoardProps) {
  const { user } = useAuth();
  const { currentWorkspace, switchWorkspace } = useWorkspace();

  // 状態管理
  const [tasks, setTasks] = useState<SharedTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // フィルタ状態
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [showCompleted, setShowCompleted] = useState(true);
  const [assignedFilter, setAssignedFilter] = useState<string>('all');

  // 編集状態
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editingPriority, setEditingPriority] = useState('中');

  // パフォーマンス測定
  const [performanceMetrics, setPerformanceMetrics] = useState<{
    loadTime: number;
    taskCount: number;
    cacheHits: number;
  } | null>(null);

  // ページネーション設定のメモ化
  const paginationOptions = useMemo((): PaginationOptions => ({
    page: currentPage,
    limit: 50,
    status: showCompleted ? undefined : 'active',
    priority: filterPriority === 'all' ? undefined : filterPriority,
    assigned_to: assignedFilter === 'all' ? undefined : assignedFilter
  }), [currentPage, showCompleted, filterPriority, assignedFilter]);

  // 最適化されたタスク取得
  const loadTasksOptimized = useCallback(async (resetPage = false) => {
    if (!user || !currentWorkspace) return;

    const pageToLoad = resetPage ? 1 : currentPage;
    const options = { ...paginationOptions, page: pageToLoad };

    try {
      setIsLoading(true);
      setError(null);

      const startTime = performance.now();

      console.log('🚀 OptimizedTaskBoard: 最適化タスク取得開始', {
        workspace: currentWorkspace,
        options
      });

      // 最適化されたサービスを使用
      const result = await OptimizedTaskService.getTasksOptimized(
        currentWorkspace,
        user.id,
        options
      );

      const endTime = performance.now();
      const loadTime = Math.round(endTime - startTime);

      // パフォーマンス測定結果を保存
      setPerformanceMetrics({
        loadTime,
        taskCount: result.tasks.length,
        cacheHits: 0 // 実装時にキャッシュヒット数を追加
      });

      if (resetPage) {
        setTasks(result.tasks);
        setCurrentPage(1);
      } else if (pageToLoad === 1) {
        setTasks(result.tasks);
      } else {
        // ページネーション時は追加
        setTasks(prev => [...prev, ...result.tasks]);
      }

      setHasMore(result.hasMore);
      setTotalCount(result.totalCount);

      console.log('✅ OptimizedTaskBoard: タスク取得完了', {
        loadTime: `${loadTime}ms`,
        taskCount: result.tasks.length,
        totalCount: result.totalCount,
        hasMore: result.hasMore
      });

    } catch (error) {
      console.error('❌ OptimizedTaskBoard: タスク取得エラー', error);
      setError(error instanceof Error ? error.message : 'タスクの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [user, currentWorkspace, paginationOptions, currentPage]);

  // 初期読み込み
  useEffect(() => {
    loadTasksOptimized(true);
  }, [currentWorkspace, filterPriority, showCompleted, assignedFilter]);

  // プリフェッチング（ユーザーデータの先読み）
  useEffect(() => {
    if (user && currentWorkspace?.type === 'team' && currentWorkspace.team_id) {
      console.log('🚀 プリフェッチング開始');
      OptimizedTaskService.prefetchUserData(user.id, [currentWorkspace.team_id]);
    }
  }, [user, currentWorkspace]);

  // タスク作成
  const handleCreateTask = useCallback(async (taskData: Omit<SharedTask, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user || !currentWorkspace) return;

    try {
      const newTask = {
        ...taskData,
        user_id: user.id,
        team_id: currentWorkspace.type === 'team' ? currentWorkspace.team_id : null,
        assigned_to: taskData.assigned_to || null,
        created_by: user.id
      };

      console.log('🆕 最適化タスク作成:', newTask);

      // 楽観的更新
      const tempId = `temp-${Date.now()}`;
      const tempTask = {
        ...newTask,
        id: tempId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as SharedTask;

      setTasks(prev => [tempTask, ...prev]);

      // データベースに保存
      const { createTask } = await import('@/lib/sharedTaskService');
      const createdTask = await createTask(newTask, currentWorkspace);

      // 実際のタスクで置換
      setTasks(prev => prev.map(task =>
        task.id === tempId ? createdTask : task
      ));

      // キャッシュクリア
      OptimizedTaskService.clearCache(`task_stats_${currentWorkspace.type}`);

    } catch (error) {
      console.error('❌ タスク作成エラー:', error);
      // エラー時は楽観的更新をロールバック
      setTasks(prev => prev.filter(task => !task.id.startsWith('temp-')));
      setError('タスクの作成に失敗しました');
    }
  }, [user, currentWorkspace]);

  // タスク更新
  const handleUpdateTask = useCallback(async (taskId: string, updates: Partial<SharedTask>) => {
    try {
      console.log('🔄 最適化タスク更新:', { taskId, updates });

      // 楽観的更新
      setTasks(prev => prev.map(task =>
        task.id === taskId ? { ...task, ...updates } : task
      ));

      // データベースに保存
      const { updateTask } = await import('@/lib/sharedTaskService');
      const updatedTask = await updateTask(taskId, updates);

      // 実際のデータで更新
      setTasks(prev => prev.map(task =>
        task.id === taskId ? updatedTask : task
      ));

      // 編集状態をクリア
      if (editingTaskId === taskId) {
        setEditingTaskId(null);
        setEditingText('');
        setEditingPriority('中');
      }

      // キャッシュクリア
      OptimizedTaskService.clearCache(`task_stats_${currentWorkspace?.type}`);

    } catch (error) {
      console.error('❌ タスク更新エラー:', error);
      // エラー時は元のデータを再取得
      loadTasksOptimized(true);
      setError('タスクの更新に失敗しました');
    }
  }, [editingTaskId, currentWorkspace?.type, loadTasksOptimized]);

  // タスク削除
  const handleDeleteTask = useCallback(async (taskId: string) => {
    try {
      console.log('🗑️ 最適化タスク削除:', taskId);

      // 楽観的更新
      setTasks(prev => prev.filter(task => task.id !== taskId));

      // データベースから削除
      const { deleteTask } = await import('@/lib/sharedTaskService');
      await deleteTask(taskId);

      // キャッシュクリア
      OptimizedTaskService.clearCache(`task_stats_${currentWorkspace?.type}`);

    } catch (error) {
      console.error('❌ タスク削除エラー:', error);
      // エラー時は元のデータを再取得
      loadTasksOptimized(true);
      setError('タスクの削除に失敗しました');
    }
  }, [currentWorkspace?.type, loadTasksOptimized]);

  // ページ読み込み
  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      setCurrentPage(prev => prev + 1);
      loadTasksOptimized(false);
    }
  }, [isLoading, hasMore, loadTasksOptimized]);

  // フィルタ変更ハンドラ
  const handleFilterChange = useCallback((filterType: string, value: string) => {
    setCurrentPage(1);

    switch (filterType) {
      case 'priority':
        setFilterPriority(value);
        break;
      case 'completion':
        setShowCompleted(value === 'all');
        break;
      case 'assignee':
        setAssignedFilter(value);
        break;
    }

    // キャッシュクリア（フィルタ変更時）
    OptimizedTaskService.clearCache();
  }, []);

  // 編集状態管理
  const handleEditStart = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setEditingTaskId(taskId);
      setEditingText(task.text);
      setEditingPriority(task.priority);
    }
  }, [tasks]);

  const handleEditCancel = useCallback(() => {
    setEditingTaskId(null);
    setEditingText('');
    setEditingPriority('中');
  }, []);

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">ログインしてください</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* パフォーマンス表示 */}
      {performanceMetrics && showLegacyComparison && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            🚀 最適化パフォーマンス
          </h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">読み込み時間:</span>
              <span className="ml-2 text-green-700">{performanceMetrics.loadTime}ms</span>
            </div>
            <div>
              <span className="font-medium">取得件数:</span>
              <span className="ml-2 text-green-700">{performanceMetrics.taskCount}件</span>
            </div>
            <div>
              <span className="font-medium">総件数:</span>
              <span className="ml-2 text-green-700">{totalCount}件</span>
            </div>
          </div>
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => {
              setError(null);
              loadTasksOptimized(true);
            }}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            再試行
          </button>
        </div>
      )}

      {/* タスク作成フォーム */}
      <div className="mb-6">
        <TaskForm onCreateTask={handleCreateTask} />
      </div>

      {/* フィルタコントロール */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              優先度
            </label>
            <select
              value={filterPriority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">すべて</option>
              <option value="高">高優先度</option>
              <option value="中">中優先度</option>
              <option value="低">低優先度</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              完了状態
            </label>
            <select
              value={showCompleted ? 'all' : 'active'}
              onChange={(e) => handleFilterChange('completion', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">すべて</option>
              <option value="active">未完了のみ</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              担当者
            </label>
            <select
              value={assignedFilter}
              onChange={(e) => handleFilterChange('assignee', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">すべて</option>
              <option value={user.id}>自分のタスク</option>
            </select>
          </div>
        </div>
      </div>

      {/* タスクリスト */}
      <TaskList
        tasks={tasks}
        isLoading={isLoading}
        editingTaskId={editingTaskId}
        editingText={editingText}
        editingPriority={editingPriority}
        currentUserId={user.id}
        onTaskUpdate={handleUpdateTask}
        onTaskDelete={handleDeleteTask}
        onEditStart={handleEditStart}
        onEditCancel={handleEditCancel}
        onEditingTextChange={setEditingText}
        onEditingPriorityChange={setEditingPriority}
        filterPriority={filterPriority}
        showCompleted={showCompleted}
      />

      {/* ページネーション */}
      {hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={handleLoadMore}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? '読み込み中...' : 'さらに読み込む'}
          </button>
        </div>
      )}

      {/* 統計表示 */}
      <div className="mt-6 text-center text-sm text-gray-600">
        {totalCount > 0 && (
          <p>
            {tasks.length} / {totalCount} 件表示
            {hasMore && ' (さらに読み込み可能)'}
          </p>
        )}
      </div>
    </div>
  );
}
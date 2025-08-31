"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { useAuth } from '../AuthProvider';
import { useWorkspace } from '../WorkspaceProvider';
import { useOptimizedTasks } from '@/hooks/useOptimizedTasks';
import { TaskList } from './TaskList';
import { TaskFilters } from './TaskFilters';
import { TaskForm } from './TaskForm';
import { TaskStats } from './TaskStats';

interface OptimizedSharedTaskBoardProps {
  darkMode?: boolean;
}

export default function OptimizedSharedTaskBoard({ 
  darkMode = false 
}: OptimizedSharedTaskBoardProps) {
  const { user } = useAuth();
  const { workspace } = useWorkspace();

  // 編集状態管理
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editingPriority, setEditingPriority] = useState('中');
  
  // フィルター状態
  const [filterPriority, setFilterPriority] = useState('all');
  const [showCompleted, setShowCompleted] = useState(true);
  const [sortBy, setSortBy] = useState<'created' | 'priority' | 'updated'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 最適化されたタスクフック
  const {
    tasks,
    isLoading,
    error,
    taskStats,
    createTask,
    updateTask,
    deleteTask,
    bulkUpdateTasks,
    clearError
  } = useOptimizedTasks({
    autoRefresh: true,
    refreshInterval: 30000,
    enableRealtime: true,
    batchSize: 50
  });

  // フィルタリングとソートの最適化
  const processedTasks = useMemo(() => {
    let filtered = tasks;

    // 優先度フィルタ
    if (filterPriority !== 'all') {
      filtered = filtered.filter(task => task.priority === filterPriority);
    }

    // 完了状態フィルタ
    if (!showCompleted) {
      filtered = filtered.filter(task => !task.completed);
    }

    // ソート
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'created':
          comparison = new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime();
          break;
        case 'updated':
          comparison = new Date(a.updated_at || '').getTime() - new Date(b.updated_at || '').getTime();
          break;
        case 'priority':
          const priorityOrder = { '高': 3, '中': 2, '低': 1 };
          comparison = (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [tasks, filterPriority, showCompleted, sortBy, sortOrder]);

  // タスク作成ハンドラー
  const handleCreateTask = useCallback(async (taskData: {
    text: string;
    priority: '高' | '中' | '低';
  }) => {
    if (!user || !taskData.text.trim()) return;

    try {
      await createTask({
        text: taskData.text.trim(),
        priority: taskData.priority,
        user_id: user.id,
        team_id: workspace.type === 'team' ? workspace.team_id : null
      });
    } catch (err) {
      console.error('タスク作成エラー:', err);
    }
  }, [user, workspace, createTask]);

  // タスク更新ハンドラー
  const handleUpdateTask = useCallback(async (
    taskId: string, 
    updates: Partial<Parameters<typeof updateTask>[1]>
  ) => {
    try {
      await updateTask(taskId, updates);
    } catch (err) {
      console.error('タスク更新エラー:', err);
    }
  }, [updateTask]);

  // タスク削除ハンドラー
  const handleDeleteTask = useCallback(async (taskId: string) => {
    try {
      await deleteTask(taskId);
    } catch (err) {
      console.error('タスク削除エラー:', err);
    }
  }, [deleteTask]);

  // 編集開始
  const handleEditStart = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setEditingTaskId(taskId);
      setEditingText(task.text);
      setEditingPriority(task.priority);
    }
  }, [tasks]);

  // 編集キャンセル
  const handleEditCancel = useCallback(() => {
    setEditingTaskId(null);
    setEditingText('');
    setEditingPriority('中');
  }, []);

  // バルク操作ハンドラー
  const handleBulkComplete = useCallback(async (taskIds: string[]) => {
    try {
      await bulkUpdateTasks(taskIds, { completed: true });
    } catch (err) {
      console.error('一括完了エラー:', err);
    }
  }, [bulkUpdateTasks]);

  const handleBulkDelete = useCallback(async (taskIds: string[]) => {
    try {
      await Promise.all(taskIds.map(id => deleteTask(id)));
    } catch (err) {
      console.error('一括削除エラー:', err);
    }
  }, [deleteTask]);

  // フィルター操作
  const handleShowCompletedToggle = useCallback(() => {
    setShowCompleted(prev => !prev);
  }, []);

  const handleSortOrderToggle = useCallback(() => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  }, []);

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
      }`}>
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">認証が必要です</h2>
          <p className="text-gray-600">タスクを管理するにはログインしてください。</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${
      darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {workspace.type === 'team' ? `${workspace.team_name} のタスク` : 'マイタスク'}
          </h1>
          <p className="text-gray-600">
            効率的なタスク管理で生産性を向上させましょう
          </p>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-red-800">{error}</p>
              <button
                onClick={clearError}
                className="text-red-600 hover:text-red-800"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* 統計表示 */}
        <TaskStats
          stats={taskStats}
          darkMode={darkMode}
          workspace={workspace}
        />

        {/* タスク作成フォーム */}
        <TaskForm
          onSubmit={handleCreateTask}
          darkMode={darkMode}
          isLoading={isLoading}
        />

        {/* フィルターコントロール */}
        <TaskFilters
          filterPriority={filterPriority}
          showCompleted={showCompleted}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onFilterPriorityChange={setFilterPriority}
          onShowCompletedToggle={handleShowCompletedToggle}
          onSortChange={setSortBy}
          onSortOrderToggle={handleSortOrderToggle}
        />

        {/* バルクアクション */}
        {processedTasks.some(task => !task.completed) && (
          <div className="mb-6 flex gap-2">
            <button
              onClick={() => {
                const incompleteTasks = processedTasks
                  .filter(task => !task.completed)
                  .map(task => task.id);
                handleBulkComplete(incompleteTasks);
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              すべて完了にする
            </button>
          </div>
        )}

        {/* タスクリスト */}
        <TaskList
          tasks={processedTasks}
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
      </div>
    </div>
  );
}
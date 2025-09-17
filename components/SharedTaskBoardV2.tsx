"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { FaPlus, FaSort, FaEye, FaEyeSlash, FaUser, FaComment, FaHistory } from 'react-icons/fa';
import { SharedTask } from '@/lib/types';
import { useWorkspace } from './WorkspaceProvider';
import { useAuth } from './AuthProvider';
import TaskAssignmentModal from './TaskAssignmentModal';
import TaskCommentsModal from './TaskCommentsModal';
import TaskHistoryModal from './TaskHistoryModal';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import AccessibleTaskItem from './accessibility/AccessibleTaskItem';
import ScreenReaderAnnouncements, { 
  useScreenReaderAnnouncements, 
  ScreenReaderNavigationHelp,
  ScreenReaderProgress 
} from './accessibility/ScreenReaderAnnouncements';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/useTaskQueries';

// 🚀 Phase 3 Stage 2: React Query統合とキーボードナビゲーション完全対応

interface SharedTaskBoardV2Props {
  darkMode?: boolean;
}

const SharedTaskBoardV2: React.FC<SharedTaskBoardV2Props> = ({ darkMode = false }) => {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  
  // 🚀 Phase 3 Stage 2: React Query統合とサーバー状態管理
  const { tasks, isLoading } = useTasks(currentWorkspace!, user?.id || '', { 
    enabled: !!user && !!currentWorkspace 
  });
  
  const createTaskMutation = useCreateTask(currentWorkspace!, user?.id || '');
  const updateTaskMutation = useUpdateTask(currentWorkspace!, user?.id || '');
  const deleteTaskMutation = useDeleteTask(currentWorkspace!, user?.id || '');
  
  // 🚀 Phase 3 Stage 2: スクリーンリーダー最適化
  const screenReader = useScreenReaderAnnouncements();
  
  // ローカル状態管理
  const [task, setTask] = useState('');
  const [priority, setPriority] = useState<"高" | "中" | "低">('中');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [editPriority, setEditPriority] = useState<"高" | "中" | "低">('中');
  const [sortByPriority, setSortByPriority] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);
  
  // モーダル状態
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  // 🚀 Phase 3 Stage 2: タスク操作ハンドラ
  const handleToggleComplete = useCallback(async (taskId: string, completed: boolean) => {
    updateTaskMutation.mutate({ taskId, updates: { completed } });
  }, [updateTaskMutation]);
  
  const handleDeleteTask = useCallback(async (taskId: string) => {
    deleteTaskMutation.mutate(taskId);
  }, [deleteTaskMutation]);
  
  const handleAddTask = useCallback(async () => {
    if (!user || task.trim() === '') return;
    
    createTaskMutation.mutate({
      text: task.trim(),
      priority,
      user_id: user.id
    });
    
    setTask('');
  }, [user, task, priority, createTaskMutation]);
  
  // 編集ハンドラ
  const handleEditStart = useCallback((index: number) => {
    setEditingIndex(index);
    setEditText(tasks[index].text);
    setEditPriority(tasks[index].priority);
  }, [tasks]);
  
  const handleEditSave = useCallback(async (index: number) => {
    const taskToUpdate = tasks[index];
    updateTaskMutation.mutate({
      taskId: taskToUpdate.id,
      updates: { text: editText, priority: editPriority }
    });
    setEditingIndex(null);
  }, [tasks, editText, editPriority, updateTaskMutation]);
  
  const handleEditCancel = useCallback(() => {
    setEditingIndex(null);
  }, []);
  
  // モーダルハンドラ
  const handleAssignmentClick = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
    setShowAssignmentModal(true);
  }, []);

  const handleCommentsClick = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
    setShowCommentsModal(true);
  }, []);

  const handleHistoryClick = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
    setShowHistoryModal(true);
  }, []);
  
  // 🚀 Phase 3 Stage 2: キーボードナビゲーション統合
  const keyboardNav = useKeyboardNavigation({
    enabled: true,
    tasks,
    onTaskToggle: handleToggleComplete,
    onTaskDelete: handleDeleteTask,
    onTaskEdit: handleEditStart,
    onTaskSelect: (index) => {
      // タスク選択ロジック
    },
    onAddTask: () => {
      const addButton = document.getElementById('add-task-button');
      addButton?.focus();
    },
  });
  
  // フィルタリングとソート
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = hideCompleted ? tasks.filter(t => !t.completed) : tasks;
    
    if (sortByPriority) {
      const priorityOrder = { '高': 3, '中': 2, '低': 1 };
      filtered = [...filtered].sort((a, b) => 
        priorityOrder[b.priority] - priorityOrder[a.priority]
      );
    }
    
    return filtered;
  }, [tasks, hideCompleted, sortByPriority]);
  
  // 入力キーイベント
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddTask();
    }
  }, [handleAddTask]);
  
  if (!user || !currentWorkspace) {
    return (
      <div className={`text-center py-12 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
        ユーザー認証またはワークスペースの選択が必要です
      </div>
    );
  }

  return (
    <div 
      ref={keyboardNav.containerRef}
      className="max-w-4xl mx-auto p-6 space-y-6"
      role="application"
      aria-label="タスク管理ボード"
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            {currentWorkspace.type === 'team' ? currentWorkspace.team_name : 'マイタスク'}
          </h1>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {currentWorkspace.type === 'team' ? 'チームタスクボード' : '個人タスクボード'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <KeyboardShortcutsHelp darkMode={darkMode} compact />
          {keyboardNav.stats.selectedCount > 0 && (
            <div className={`px-3 py-1 rounded-full text-sm ${
              darkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'
            }`}>
              {keyboardNav.stats.selectedCount}件選択中
            </div>
          )}
        </div>
      </div>
      
      {/* タスク追加フォーム */}
      <div className={`rounded-xl p-4 border ${
        darkMode 
          ? 'bg-gray-800/50 border-gray-700' 
          : 'bg-white/80 border-gray-200'
      }`}>
        <div className="flex gap-3">
          <input
            type="text"
            className={`flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            }`}
            placeholder="新しいタスクを入力..."
            value={task}
            onChange={e => setTask(e.target.value)}
            onKeyDown={handleInputKeyDown}
            aria-label="新しいタスク"
          />
          <select
            className={`border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            value={priority}
            onChange={e => setPriority(e.target.value as "高" | "中" | "低")}
            aria-label="優先度"
          >
            <option value="高">高</option>
            <option value="中">中</option>
            <option value="低">低</option>
          </select>
          <button
            id="add-task-button"
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              darkMode 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
            onClick={handleAddTask}
            disabled={createTaskMutation.isPending}
            aria-label="タスクを追加"
          >
            <FaPlus />
            追加
          </button>
        </div>
      </div>

      {/* フィルタ・ソートボタン */}
      <div className="flex gap-3">
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            sortByPriority 
              ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
              : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')
          }`}
          onClick={() => setSortByPriority(v => !v)}
          aria-pressed={sortByPriority}
        >
          <FaSort />
          優先度順
        </button>
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            hideCompleted 
              ? (darkMode ? 'bg-green-600 text-white' : 'bg-green-500 text-white')
              : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')
          }`}
          onClick={() => setHideCompleted(v => !v)}
          aria-pressed={hideCompleted}
        >
          {hideCompleted ? <FaEye /> : <FaEyeSlash />}
          {hideCompleted ? '完了タスクを表示' : '完了タスクを隠す'}
        </button>
      </div>

      {/* タスクリスト */}
      <div className={`rounded-xl p-4 border ${
        darkMode 
          ? 'bg-gray-800/50 border-gray-700' 
          : 'bg-white/80 border-gray-200'
      }`}>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="text-2xl mb-2">⏳</div>
            <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
              読み込み中...
            </p>
          </div>
        ) : filteredAndSortedTasks.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📝</div>
            <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
              {hideCompleted ? '表示できるタスクがありません' : 'タスクがありません'}
            </p>
          </div>
        ) : (
          <div 
            className="space-y-2"
            role="list"
            aria-label={`${filteredAndSortedTasks.length}件のタスク`}
          >
            {filteredAndSortedTasks.map((taskItem, index) => (
              <AccessibleTaskItem
                key={taskItem.id}
                ref={el => keyboardNav.setTaskRef(index, el)}
                task={taskItem}
                index={index}
                darkMode={darkMode}
                isSelected={keyboardNav.selectedIndices.has(index)}
                onToggleComplete={handleToggleComplete}
                onDeleteTask={handleDeleteTask}
                onEditTask={handleEditStart}
                onAssignTask={handleAssignmentClick}
                onViewComments={handleCommentsClick}
                onViewHistory={handleHistoryClick}
                onFocus={(idx) => keyboardNav.focusTask(idx)}
                onSelect={(idx) => keyboardNav.toggleSelection(idx)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 統計情報 */}
      <div className={`text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        合計: {tasks.length}件 | 
        完了: {tasks.filter(t => t.completed).length}件 | 
        未完了: {tasks.filter(t => !t.completed).length}件
        {keyboardNav.stats.selectedCount > 0 && (
          <> | 選択中: {keyboardNav.stats.selectedCount}件</>
        )}
      </div>

      {/* モーダル */}
      {showAssignmentModal && selectedTaskId && (
        <TaskAssignmentModal
          taskId={selectedTaskId}
          isOpen={showAssignmentModal}
          onClose={() => setShowAssignmentModal(false)}
          darkMode={darkMode}
        />
      )}

      {showCommentsModal && selectedTaskId && (
        <TaskCommentsModal
          taskId={selectedTaskId}
          isOpen={showCommentsModal}
          onClose={() => setShowCommentsModal(false)}
          darkMode={darkMode}
        />
      )}

      {showHistoryModal && selectedTaskId && (
        <TaskHistoryModal
          taskId={selectedTaskId}
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          darkMode={darkMode}
        />
      )}
    </div>
  );
};

export default SharedTaskBoardV2;
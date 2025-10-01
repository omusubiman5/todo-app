"use client";

import React, { memo, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { FaTrash, FaEdit, FaCheck, FaTimes, FaUser, FaComment, FaHistory } from 'react-icons/fa';
import { SharedTask } from '@/lib/types';

// 🚀 Phase 3: 仮想化されたタスクリストコンポーネント

interface VirtualTaskListProps {
  tasks: SharedTask[];
  darkMode?: boolean;
  hideCompleted?: boolean;
  onToggleComplete: (taskId: string, completed: boolean) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (index: number) => void;
  onAssignTask?: (taskId: string) => void;
  onViewComments?: (taskId: string) => void;
  onViewHistory?: (taskId: string) => void;
  height?: number;
  itemHeight?: number;
}

interface TaskItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    tasks: SharedTask[];
    darkMode: boolean;
    onToggleComplete: (taskId: string, completed: boolean) => void;
    onDeleteTask: (taskId: string) => void;
    onEditTask: (index: number) => void;
    onAssignTask?: (taskId: string) => void;
    onViewComments?: (taskId: string) => void;
    onViewHistory?: (taskId: string) => void;
  };
}

// メモ化されたタスクアイテム
const VirtualTaskItem = memo<TaskItemProps>(({ index, style, data }) => {
  const {
    tasks,
    darkMode,
    onToggleComplete,
    onDeleteTask,
    onEditTask,
    onAssignTask,
    onViewComments,
    onViewHistory
  } = data;

  const task = tasks[index];

  // 優先度色の取得（メモ化）
  const priorityColor = useMemo(() => {
    if (!task) return '';
    const colors = {
      '高': darkMode ? 'text-red-400 border-red-400/50' : 'text-red-600 border-red-500/50',
      '中': darkMode ? 'text-yellow-400 border-yellow-400/50' : 'text-yellow-600 border-yellow-500/50',
      '低': darkMode ? 'text-green-400 border-green-400/50' : 'text-green-600 border-green-500/50'
    };
    return colors[task.priority];
  }, [task?.priority, darkMode]);

  // 完了状態スタイル（メモ化）
  const completedStyle = useMemo(() => {
    if (!task) return '';
    return task.completed 
      ? darkMode 
        ? 'bg-gray-800/50 opacity-75'
        : 'bg-gray-100/50 opacity-75'
      : darkMode 
        ? 'bg-gray-800/80 hover:bg-gray-700/80'
        : 'bg-white/20 hover:bg-white/30';
  }, [task?.completed, darkMode]);

  // イベントハンドラー（メモ化）
  const handleToggleComplete = useCallback(() => {
    if (task) onToggleComplete(task.id, !task.completed);
  }, [task?.id, task?.completed, onToggleComplete]);

  const handleDelete = useCallback(() => {
    if (task) onDeleteTask(task.id);
  }, [task?.id, onDeleteTask]);

  const handleEdit = useCallback(() => {
    if (task) onEditTask(index);
  }, [index, onEditTask, task]);

  const handleAssign = useCallback(() => {
    if (task) onAssignTask?.(task.id);
  }, [task?.id, onAssignTask]);

  const handleViewComments = useCallback(() => {
    if (task) onViewComments?.(task.id);
  }, [task?.id, onViewComments]);

  const handleViewHistory = useCallback(() => {
    if (task) onViewHistory?.(task.id);
  }, [task?.id, onViewHistory]);
  
  if (!task) return null;

  return (
    <div style={style} className="px-2 py-1">
      <div
        className={`rounded-lg p-4 transition-all duration-200 backdrop-blur-sm border ${completedStyle} border-white/10 shadow-lg hover:shadow-xl transform hover:scale-[1.02]`}
      >
        <div className="flex items-center justify-between">
          {/* タスク内容 */}
          <div className="flex items-center flex-1 min-w-0">
            <button
              onClick={handleToggleComplete}
              className={`mr-3 p-2 rounded-full transition-all duration-200 ${
                task.completed
                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  : darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-white/30 text-gray-600 hover:bg-white/50'
              }`}
              title={task.completed ? 'タスクを未完了に戻す' : 'タスクを完了にする'}
            >
              {task.completed ? <FaCheck size={14} /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-current" />}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`text-lg truncate ${
                    task.completed 
                      ? 'line-through text-gray-500' 
                      : darkMode 
                        ? 'text-white' 
                        : 'text-gray-800'
                  }`}
                  title={task.text}
                >
                  {task.text}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${priorityColor}`}>
                  {task.priority}
                </span>
              </div>

              {/* メタデータ */}
              <div className={`text-xs mt-2 flex items-center gap-4 ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                <span>作成: {new Date(task.created_at || '').toLocaleDateString('ja-JP')}</span>
                {task.assigned_to && (
                  <span className="flex items-center gap-1">
                    <FaUser size={10} />
                    担当者割り当て済み
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex items-center gap-2 ml-4">
            {onAssignTask && (
              <button
                onClick={handleAssign}
                className={`p-2 rounded-full transition-colors duration-200 ${
                  darkMode
                    ? 'text-blue-400 hover:bg-blue-500/20'
                    : 'text-blue-600 hover:bg-blue-100/50'
                }`}
                title="担当者を割り当て"
              >
                <FaUser size={14} />
              </button>
            )}
            
            {onViewComments && (
              <button
                onClick={handleViewComments}
                className={`p-2 rounded-full transition-colors duration-200 ${
                  darkMode
                    ? 'text-purple-400 hover:bg-purple-500/20'
                    : 'text-purple-600 hover:bg-purple-100/50'
                }`}
                title="コメントを表示"
              >
                <FaComment size={14} />
              </button>
            )}

            {onViewHistory && (
              <button
                onClick={handleViewHistory}
                className={`p-2 rounded-full transition-colors duration-200 ${
                  darkMode
                    ? 'text-green-400 hover:bg-green-500/20'
                    : 'text-green-600 hover:bg-green-100/50'
                }`}
                title="履歴を表示"
              >
                <FaHistory size={14} />
              </button>
            )}

            <button
              onClick={handleEdit}
              className={`p-2 rounded-full transition-colors duration-200 ${
                darkMode
                  ? 'text-yellow-400 hover:bg-yellow-500/20'
                  : 'text-yellow-600 hover:bg-yellow-100/50'
              }`}
              title="編集"
            >
              <FaEdit size={14} />
            </button>

            <button
              onClick={handleDelete}
              className={`p-2 rounded-full transition-colors duration-200 ${
                darkMode
                  ? 'text-red-400 hover:bg-red-500/20'
                  : 'text-red-600 hover:bg-red-100/50'
              }`}
              title="削除"
            >
              <FaTrash size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

VirtualTaskItem.displayName = 'VirtualTaskItem';

// メイン仮想リストコンポーネント
const VirtualTaskList = memo<VirtualTaskListProps>(({
  tasks,
  darkMode = false,
  hideCompleted = false,
  onToggleComplete,
  onDeleteTask,
  onEditTask,
  onAssignTask,
  onViewComments,
  onViewHistory,
  height = 600,
  itemHeight = 100
}) => {
  // フィルタリングされたタスク（メモ化）
  const filteredTasks = useMemo(() => {
    return hideCompleted ? tasks.filter(task => !task.completed) : tasks;
  }, [tasks, hideCompleted]);

  // リストデータ（メモ化）
  const listData = useMemo(() => ({
    tasks: filteredTasks,
    darkMode,
    onToggleComplete,
    onDeleteTask,
    onEditTask,
    onAssignTask,
    onViewComments,
    onViewHistory
  }), [
    filteredTasks,
    darkMode,
    onToggleComplete,
    onDeleteTask,
    onEditTask,
    onAssignTask,
    onViewComments,
    onViewHistory
  ]);

  // 空状態の表示
  if (filteredTasks.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📝</div>
          <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {hideCompleted ? '完了していないタスクはありません' : 'タスクがありません'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden">
      <List
        height={height}
        itemCount={filteredTasks.length}
        itemSize={itemHeight}
        itemData={listData}
        className="scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-transparent"
      >
        {VirtualTaskItem}
      </List>
    </div>
  );
});

VirtualTaskList.displayName = 'VirtualTaskList';

export default VirtualTaskList;
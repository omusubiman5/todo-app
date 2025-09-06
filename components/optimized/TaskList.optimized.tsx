// 🚀 最適化されたTaskListコンポーネント
"use client";

import React, { memo, useMemo, useCallback } from 'react';
import { SharedTask } from '@/lib/types';
import TaskItem from './TaskItem.optimized';

interface TaskListProps {
  tasks: SharedTask[];
  onTaskUpdate: (id: string, updates: Partial<SharedTask>) => void;
  onTaskDelete: (id: string) => void;
  onTaskEdit: (index: number) => void;
  onTaskAssign: (taskId: string) => void;
  onTaskComment: (taskId: string) => void;
  onTaskHistory: (taskId: string) => void;
  darkMode?: boolean;
  hideCompleted?: boolean;
  sortByPriority?: boolean;
  className?: string;
}

const TaskList = memo<TaskListProps>(({
  tasks,
  onTaskUpdate,
  onTaskDelete,
  onTaskEdit,
  onTaskAssign,
  onTaskComment,
  onTaskHistory,
  darkMode = false,
  hideCompleted = false,
  sortByPriority = false,
  className = ''
}) => {
  // フィルタリング・ソート済みタスクリスト（メモ化）
  const processedTasks = useMemo(() => {
    let filteredTasks = tasks;

    // 完了タスクのフィルタリング
    if (hideCompleted) {
      filteredTasks = filteredTasks.filter(task => !task.completed);
    }

    // 優先度順ソート
    if (sortByPriority) {
      const priorityOrder = { '高': 3, '中': 2, '低': 1 };
      filteredTasks = [...filteredTasks].sort((a, b) => {
        const aPriority = priorityOrder[a.priority] || 0;
        const bPriority = priorityOrder[b.priority] || 0;
        return bPriority - aPriority;
      });
    }

    return filteredTasks;
  }, [tasks, hideCompleted, sortByPriority]);


  // 通常表示（少数のタスク）
  const renderNormalList = useCallback(() => {
    return (
      <div className={`space-y-4 ${className}`} role="list">
        {processedTasks.map((task, index) => (
          <TaskItem
            key={task.id}
            task={task}
            onUpdate={onTaskUpdate}
            onDelete={onTaskDelete}
            onEdit={onTaskEdit}
            onAssign={onTaskAssign}
            onComment={onTaskComment}
            onHistory={onTaskHistory}
            darkMode={darkMode}
            index={index}
          />
        ))}
      </div>
    );
  }, [
    processedTasks,
    onTaskUpdate,
    onTaskDelete,
    onTaskEdit,
    onTaskAssign,
    onTaskComment,
    onTaskHistory,
    darkMode,
    className
  ]);


  // 空状態の表示
  if (processedTasks.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className={`text-lg font-medium mb-2 ${
          darkMode ? 'text-gray-300' : 'text-gray-600'
        }`}>
          {hideCompleted ? '未完了のタスクはありません' : 'タスクがありません'}
        </div>
        <div className={`text-sm ${
          darkMode ? 'text-gray-400' : 'text-gray-500'
        }`}>
          {hideCompleted 
            ? '完了済みタスクを表示するにはフィルターを変更してください' 
            : '新しいタスクを追加して始めましょう！'
          }
        </div>
      </div>
    );
  }

  return (
    <div className="task-list-container">
      {/* タスク数の表示 */}
      <div className={`text-sm mb-4 ${
        darkMode ? 'text-gray-400' : 'text-gray-600'
      }`}>
        {processedTasks.length}個のタスク
        {hideCompleted && (
          <span className="ml-2">（完了済みタスクを非表示）</span>
        )}
        {sortByPriority && (
          <span className="ml-2">（優先度順）</span>
        )}
      </div>

      {/* タスクリスト */}
      {renderNormalList()}
    </div>
  );
});

TaskList.displayName = 'TaskList';

export default TaskList;
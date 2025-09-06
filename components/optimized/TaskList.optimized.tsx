// 🚀 仮想化対応の最適化されたTaskListコンポーネント
"use client";

import React, { memo, useMemo, useState, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
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

  // 仮想化設定
  const ITEM_HEIGHT = 120; // タスクアイテムの高さ
  const LIST_HEIGHT = Math.min(600, processedTasks.length * ITEM_HEIGHT); // 最大600px

  // 仮想化用のRowコンポーネント
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const task = processedTasks[index];
    if (!task) return null;

    return (
      <div style={style}>
        <div className="px-2 pb-4">
          <TaskItem
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
        </div>
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
    darkMode
  ]);

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

  // 仮想化表示（大量のタスク）
  const renderVirtualizedList = useCallback(() => {
    return (
      <div className={className} role="list">
        <List
          height={LIST_HEIGHT}
          itemCount={processedTasks.length}
          itemSize={ITEM_HEIGHT}
          width="100%"
        >
          {Row}
        </List>
      </div>
    );
  }, [LIST_HEIGHT, processedTasks.length, Row, className]);

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

  // パフォーマンス最適化: 20個以上のタスクで仮想化を使用
  const useVirtualization = processedTasks.length > 20;

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
      {useVirtualization ? renderVirtualizedList() : renderNormalList()}
    </div>
  );
});

TaskList.displayName = 'TaskList';

export default TaskList;
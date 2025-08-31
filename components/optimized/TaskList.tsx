import React, { memo, useMemo } from 'react';
import { SharedTask } from '@/lib/types';
import { TaskItem } from './TaskItem';

interface TaskListProps {
  tasks: SharedTask[];
  isLoading: boolean;
  editingTaskId: string | null;
  editingText: string;
  editingPriority: string;
  currentUserId?: string;
  onTaskUpdate: (taskId: string, updates: Partial<SharedTask>) => void;
  onTaskDelete: (taskId: string) => void;
  onEditStart: (taskId: string) => void;
  onEditCancel: () => void;
  onEditingTextChange: (text: string) => void;
  onEditingPriorityChange: (priority: string) => void;
  filterPriority?: string;
  showCompleted?: boolean;
}

export const TaskList = memo<TaskListProps>(({
  tasks,
  isLoading,
  editingTaskId,
  editingText,
  editingPriority,
  currentUserId,
  onTaskUpdate,
  onTaskDelete,
  onEditStart,
  onEditCancel,
  onEditingTextChange,
  onEditingPriorityChange,
  filterPriority = 'all',
  showCompleted = true
}) => {
  // タスクフィルタリングのメモ化
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // 完了状態フィルタ
      if (!showCompleted && task.completed) {
        return false;
      }
      
      // 優先度フィルタ
      if (filterPriority !== 'all' && task.priority !== filterPriority) {
        return false;
      }
      
      return true;
    });
  }, [tasks, showCompleted, filterPriority]);

  // タスクの統計情報をメモ化
  const taskStats = useMemo(() => {
    const total = filteredTasks.length;
    const completed = filteredTasks.filter(task => task.completed).length;
    const pending = total - completed;
    
    return { total, completed, pending };
  }, [filteredTasks]);

  // 優先度別グループ化（オプション）
  const groupedTasks = useMemo(() => {
    const groups: Record<string, SharedTask[]> = {
      '高': [],
      '中': [],
      '低': []
    };
    
    filteredTasks.forEach(task => {
      if (groups[task.priority]) {
        groups[task.priority].push(task);
      }
    });
    
    return groups;
  }, [filteredTasks]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">タスクを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (filteredTasks.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">📝</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">タスクがありません</h3>
        <p className="text-gray-600">
          {tasks.length === 0 
            ? '新しいタスクを追加してください。'
            : 'フィルター条件に一致するタスクがありません。'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 統計表示 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex space-x-4">
            <span>全体: {taskStats.total}件</span>
            <span>完了: {taskStats.completed}件</span>
            <span>未完了: {taskStats.pending}件</span>
          </div>
          {taskStats.total > 0 && (
            <div className="text-right">
              進捗率: {Math.round((taskStats.completed / taskStats.total) * 100)}%
            </div>
          )}
        </div>
      </div>

      {/* タスクリスト */}
      <ul className="space-y-3">
        {filteredTasks.map(task => (
          <TaskItem
            key={task.id}
            task={task}
            isEditing={editingTaskId === task.id}
            editingText={editingText}
            editingPriority={editingPriority}
            currentUserId={currentUserId}
            onEdit={(updatedTask) => onTaskUpdate(updatedTask.id, updatedTask)}
            onUpdate={onTaskUpdate}
            onDelete={onTaskDelete}
            onEditStart={onEditStart}
            onEditCancel={onEditCancel}
            onEditingTextChange={onEditingTextChange}
            onEditingPriorityChange={onEditingPriorityChange}
          />
        ))}
      </ul>

      {/* 優先度別表示（オプション - 必要に応じて使用） */}
      {/* 
      <div className="space-y-6">
        {Object.entries(groupedTasks).map(([priority, tasks]) => (
          tasks.length > 0 && (
            <div key={priority} className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                {priority}優先度 ({tasks.length}件)
              </h3>
              <ul className="space-y-2">
                {tasks.map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    isEditing={editingTaskId === task.id}
                    editingText={editingText}
                    editingPriority={editingPriority}
                    currentUserId={currentUserId}
                    onEdit={(updatedTask) => onTaskUpdate(updatedTask.id, updatedTask)}
                    onUpdate={onTaskUpdate}
                    onDelete={onTaskDelete}
                    onEditStart={onEditStart}
                    onEditCancel={onEditCancel}
                    onEditingTextChange={onEditingTextChange}
                    onEditingPriorityChange={onEditingPriorityChange}
                  />
                ))}
              </ul>
            </div>
          )
        ))}
      </div>
      */}
    </div>
  );
});

TaskList.displayName = 'TaskList';
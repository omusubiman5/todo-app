import React, { memo, useCallback } from 'react';
import { FaTrash, FaEdit, FaCheck, FaTimes, FaUser } from 'react-icons/fa';
import { SharedTask } from '@/lib/types';

interface TaskItemProps {
  task: SharedTask;
  isEditing: boolean;
  onEdit: (task: SharedTask) => void;
  onUpdate: (taskId: string, updates: Partial<SharedTask>) => void;
  onDelete: (taskId: string) => void;
  onEditStart: (taskId: string) => void;
  onEditCancel: () => void;
  editingText: string;
  onEditingTextChange: (text: string) => void;
  editingPriority: string;
  onEditingPriorityChange: (priority: string) => void;
  currentUserId?: string;
}

export const TaskItem = memo<TaskItemProps>(({
  task,
  isEditing,
  onEdit,
  onUpdate,
  onDelete,
  onEditStart,
  onEditCancel,
  editingText,
  onEditingTextChange,
  editingPriority,
  onEditingPriorityChange,
  currentUserId
}) => {
  const handleToggleComplete = useCallback(() => {
    onUpdate(task.id, { completed: !task.completed });
  }, [task.id, task.completed, onUpdate]);

  const handleEditSave = useCallback(() => {
    onUpdate(task.id, { 
      text: editingText, 
      priority: editingPriority as "高" | "中" | "低"
    });
    onEditCancel();
  }, [task.id, editingText, editingPriority, onUpdate, onEditCancel]);

  const handleDelete = useCallback(() => {
    onDelete(task.id);
  }, [task.id, onDelete]);

  const handleEditStart = useCallback(() => {
    onEditStart(task.id);
  }, [task.id, onEditStart]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case '高': return 'bg-red-100 text-red-800 border-red-300';
      case '中': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case '低': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isEditing) {
    return (
      <li className="p-4 border rounded-lg bg-blue-50 border-blue-200">
        <div className="space-y-3">
          <div className="flex flex-col space-y-2">
            <input
              type="text"
              value={editingText}
              onChange={(e) => onEditingTextChange(e.target.value)}
              className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="タスク内容を入力..."
              autoFocus
            />
            
            <select
              value={editingPriority}
              onChange={(e) => onEditingPriorityChange(e.target.value)}
              className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="高">高優先度</option>
              <option value="中">中優先度</option>
              <option value="低">低優先度</option>
            </select>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={handleEditSave}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center space-x-1"
            >
              <FaCheck className="text-sm" />
              <span>保存</span>
            </button>
            <button
              onClick={onEditCancel}
              className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors flex items-center space-x-1"
            >
              <FaTimes className="text-sm" />
              <span>キャンセル</span>
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className={`p-4 border rounded-lg transition-all duration-200 ${
      task.completed 
        ? 'bg-gray-50 border-gray-200 opacity-75' 
        : 'bg-white border-gray-300 hover:border-blue-300 hover:shadow-md'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-grow">
          <input
            type="checkbox"
            checked={task.completed}
            onChange={handleToggleComplete}
            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
          />
          
          <div className="flex-grow">
            <div className="flex items-center space-x-2 mb-1">
              <span className={`${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                {task.text}
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded border ${getPriorityColor(task.priority)}`}>
                {task.priority}
              </span>
            </div>
            
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              {task.assignee && (
                <div className="flex items-center space-x-1">
                  <FaUser />
                  <span>
                    {task.assignee.user_metadata?.full_name || task.assignee.email}
                  </span>
                </div>
              )}
              
              <span>作成: {formatDate(task.created_at)}</span>
              {task.updated_at !== task.created_at && (
                <span>更新: {formatDate(task.updated_at)}</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={handleEditStart}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="編集"
          >
            <FaEdit />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="削除"
          >
            <FaTrash />
          </button>
        </div>
      </div>
    </li>
  );
}, (prevProps, nextProps) => {
  // カスタム比較関数で不必要な再レンダリングを防ぐ
  return (
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.text === nextProps.task.text &&
    prevProps.task.completed === nextProps.task.completed &&
    prevProps.task.priority === nextProps.task.priority &&
    prevProps.task.updated_at === nextProps.task.updated_at &&
    prevProps.isEditing === nextProps.isEditing &&
    prevProps.editingText === nextProps.editingText &&
    prevProps.editingPriority === nextProps.editingPriority &&
    prevProps.currentUserId === nextProps.currentUserId
  );
});

TaskItem.displayName = 'TaskItem';
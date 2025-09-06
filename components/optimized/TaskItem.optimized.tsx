// 🚀 最適化されたTaskItemコンポーネント
"use client";

import React, { memo, useCallback, useMemo } from 'react';
import { FaTrash, FaEdit, FaUser, FaComment, FaHistory } from 'react-icons/fa';
import { SharedTask } from '@/lib/types';

interface TaskItemProps {
  task: SharedTask;
  onUpdate: (id: string, updates: Partial<SharedTask>) => void;
  onDelete: (id: string) => void;
  onEdit: (index: number) => void;
  onAssign: (taskId: string) => void;
  onComment: (taskId: string) => void;
  onHistory: (taskId: string) => void;
  darkMode?: boolean;
  index: number;
}

const TaskItem = memo<TaskItemProps>(({
  task,
  onUpdate,
  onDelete,
  onEdit,
  onAssign,
  onComment,
  onHistory,
  darkMode = false,
  index
}) => {
  // 🎨 Priority color calculation (memoized)
  const priorityStyles = useMemo(() => {
    const baseStyles = "px-3 py-1 rounded-full text-xs font-bold";
    switch (task.priority) {
      case "高":
        return `${baseStyles} ${darkMode ? 'bg-red-500 text-white' : 'bg-red-400 text-white'}`;
      case "中":
        return `${baseStyles} ${darkMode ? 'bg-yellow-500 text-white' : 'bg-yellow-400 text-white'}`;
      default:
        return `${baseStyles} ${darkMode ? 'bg-blue-500 text-white' : 'bg-blue-400 text-white'}`;
    }
  }, [task.priority, darkMode]);

  // 🎨 Task container styles (memoized)
  const containerStyles = useMemo(() => {
    const baseStyles = `relative p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-pointer`;
    const completedStyle = task.completed ? 'opacity-60' : '';
    const themeStyles = darkMode 
      ? 'bg-gray-700 border-gray-600 hover:border-gray-500 text-white'
      : 'bg-white/80 border-white/50 backdrop-blur-sm hover:bg-white/90 hover:border-white/70';
    
    return `${baseStyles} ${themeStyles} ${completedStyle}`;
  }, [task.completed, darkMode]);

  // ⚡ Optimized event handlers
  const handleToggle = useCallback(() => {
    onUpdate(task.id, { completed: !task.completed });
  }, [task.id, task.completed, onUpdate]);

  const handleDelete = useCallback(() => {
    onDelete(task.id);
  }, [task.id, onDelete]);

  const handleEdit = useCallback(() => {
    onEdit(index);
  }, [index, onEdit]);

  const handleAssign = useCallback(() => {
    onAssign(task.id);
  }, [task.id, onAssign]);

  const handleComment = useCallback(() => {
    onComment(task.id);
  }, [task.id, onComment]);

  const handleHistory = useCallback(() => {
    onHistory(task.id);
  }, [task.id, onHistory]);

  // 📅 Formatted date (memoized)
  const formattedDate = useMemo(() => {
    return task.created_at ? new Date(task.created_at).toLocaleString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : '不明';
  }, [task.created_at]);

  // 👤 Assignee display (memoized)
  const assigneeDisplay = useMemo(() => {
    if (!task.assignee) return null;
    return task.assignee.user_metadata?.full_name || 
           task.assignee.email?.split('@')[0] || 
           '未設定';
  }, [task.assignee]);

  return (
    <div 
      className={containerStyles}
      data-testid={`task-${task.id}`}
      role="listitem"
      aria-label={`タスク: ${task.text}`}
    >
      {/* Main content row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Checkbox */}
          <input
            type="checkbox"
            checked={task.completed}
            onChange={handleToggle}
            className={`w-5 h-5 cursor-pointer transition-all duration-200 ${
              darkMode ? 'accent-blue-400' : 'accent-yellow-400'
            }`}
            aria-label={`タスクを${task.completed ? '未完了' : '完了'}にする`}
          />
          
          {/* Priority badge */}
          <span className={priorityStyles}>
            {task.priority}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleAssign}
            className={`p-1 rounded-full text-sm transition-colors duration-200 ${
              darkMode 
                ? 'hover:bg-blue-600 text-blue-400 hover:text-white' 
                : 'hover:bg-blue-100 text-blue-600'
            }`}
            aria-label="担当者を設定"
            title="担当者を設定"
          >
            <FaUser size={14} />
          </button>
          
          <button
            onClick={handleComment}
            className={`p-1 rounded-full text-sm transition-colors duration-200 ${
              darkMode 
                ? 'hover:bg-green-600 text-green-400 hover:text-white' 
                : 'hover:bg-green-100 text-green-600'
            }`}
            aria-label="コメントを見る"
            title="コメントを見る"
          >
            <FaComment size={14} />
          </button>
          
          <button
            onClick={handleHistory}
            className={`p-1 rounded-full text-sm transition-colors duration-200 ${
              darkMode 
                ? 'hover:bg-purple-600 text-purple-400 hover:text-white' 
                : 'hover:bg-purple-100 text-purple-600'
            }`}
            aria-label="変更履歴を見る"
            title="変更履歴を見る"
          >
            <FaHistory size={14} />
          </button>
          
          <button
            onClick={handleEdit}
            className={`p-1 rounded-full text-sm transition-colors duration-200 ${
              darkMode 
                ? 'hover:bg-yellow-600 text-yellow-400 hover:text-white' 
                : 'hover:bg-yellow-100 text-yellow-600'
            }`}
            aria-label="編集"
            title="編集"
          >
            <FaEdit size={14} />
          </button>
          
          <button
            onClick={handleDelete}
            className={`p-1 rounded-full text-sm transition-colors duration-200 ${
              darkMode 
                ? 'hover:bg-red-600 text-red-400 hover:text-white' 
                : 'hover:bg-red-100 text-red-600'
            }`}
            aria-label="削除"
            title="削除"
          >
            <FaTrash size={14} />
          </button>
        </div>
      </div>

      {/* Task text */}
      <div className="mb-3">
        <p className={`text-base font-medium break-words ${
          task.completed 
            ? `line-through ${darkMode ? 'text-gray-400' : 'text-gray-500'}`
            : darkMode ? 'text-white' : 'text-gray-800'
        }`}>
          {task.text}
        </p>
      </div>

      {/* Footer info */}
      <div className={`flex items-center justify-between text-xs ${
        darkMode ? 'text-gray-400' : 'text-gray-600'
      }`}>
        <div className="flex items-center gap-4">
          {assigneeDisplay && (
            <span className="flex items-center gap-1">
              <FaUser size={10} />
              {assigneeDisplay}
            </span>
          )}
        </div>
        
        <span>
          {formattedDate}
        </span>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // カスタム比較関数: 本当に必要な変更のみ再レンダリング
  return (
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.text === nextProps.task.text &&
    prevProps.task.completed === nextProps.task.completed &&
    prevProps.task.priority === nextProps.task.priority &&
    prevProps.task.updated_at === nextProps.task.updated_at &&
    prevProps.darkMode === nextProps.darkMode &&
    prevProps.task.assignee?.id === nextProps.task.assignee?.id
  );
});

TaskItem.displayName = 'TaskItem';

export default TaskItem;
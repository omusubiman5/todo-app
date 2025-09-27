"use client";

import React, { useRef, useCallback } from 'react';
import { FaTrash, FaEdit, FaCheck, FaUser, FaComment, FaHistory } from 'react-icons/fa';
import { SharedTask } from '@/lib/types';

// 🚀 Phase 3 Stage 2: WCAG 2.1 AA準拠のアクセシブルタスクアイテム

interface AccessibleTaskItemProps {
  task: SharedTask;
  index: number;
  darkMode?: boolean;
  isSelected?: boolean;
  onToggleComplete: (taskId: string, completed: boolean) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (index: number) => void;
  onAssignTask?: (taskId: string) => void;
  onViewComments?: (taskId: string) => void;
  onViewHistory?: (taskId: string) => void;
  onFocus?: (index: number) => void;
  onSelect?: (index: number) => void;
}

const AccessibleTaskItem = React.forwardRef<HTMLDivElement, AccessibleTaskItemProps>(({
  task,
  index,
  darkMode = false,
  isSelected = false,
  onToggleComplete,
  onDeleteTask,
  onEditTask,
  onAssignTask,
  onViewComments,
  onViewHistory,
  onFocus,
  onSelect
}, ref) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // 優先度の色とアクセシビリティ設定
  const getPriorityConfig = useCallback(() => {
    const configs = {
      '高': {
        color: darkMode ? 'text-red-400 border-red-400/50' : 'text-red-600 border-red-500/50',
        bgColor: darkMode ? 'bg-red-500/10' : 'bg-red-50',
        label: '高優先度',
        ariaLabel: '高優先度のタスクです'
      },
      '中': {
        color: darkMode ? 'text-yellow-400 border-yellow-400/50' : 'text-yellow-600 border-yellow-500/50',
        bgColor: darkMode ? 'bg-yellow-500/10' : 'bg-yellow-50',
        label: '中優先度',
        ariaLabel: '中優先度のタスクです'
      },
      '低': {
        color: darkMode ? 'text-green-400 border-green-400/50' : 'text-green-600 border-green-500/50',
        bgColor: darkMode ? 'bg-green-500/10' : 'bg-green-50',
        label: '低優先度',
        ariaLabel: '低優先度のタスクです'
      }
    };
    return configs[task.priority];
  }, [task.priority, darkMode]);

  // 完了状態のアクセシビリティ設定
  const getCompletionConfig = useCallback(() => {
    if (task.completed) {
      return {
        style: darkMode 
          ? 'bg-gray-800/50 opacity-75 border-green-500/30'
          : 'bg-gray-100/50 opacity-75 border-green-400/30',
        ariaLabel: '完了済みタスク',
        ariaPressed: 'true',
        statusText: '完了済み'
      };
    }
    return {
      style: darkMode 
        ? 'bg-gray-800/80 hover:bg-gray-700/80 border-white/10'
        : 'bg-white/20 hover:bg-white/30 border-gray-200/30',
      ariaLabel: '未完了タスク',
      ariaPressed: 'false',
      statusText: '未完了'
    };
  }, [task.completed, darkMode]);

  // フォーカス管理
  const handleFocus = useCallback(() => {
    onFocus?.(index);
  }, [index, onFocus]);

  const handleClick = useCallback(() => {
    onSelect?.(index);
  }, [index, onSelect]);

  // キーボードナビゲーション
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case ' ':
      case 'Enter':
        e.preventDefault();
        if (e.target === itemRef.current) {
          onToggleComplete(task.id, !task.completed);
        }
        break;
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        onDeleteTask(task.id);
        break;
      case 'e':
      case 'E':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          onEditTask(index);
        }
        break;
    }
  }, [task.id, task.completed, index, onToggleComplete, onDeleteTask, onEditTask]);

  const priorityConfig = getPriorityConfig();
  const completionConfig = getCompletionConfig();
  
  // 日付のフォーマット（アクセシブル）
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '不明';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    }).format(date);
  };

  return (
    <div
      ref={ref || itemRef}
      role="listitem"
      tabIndex={0}
      aria-label={`${task.text}、${priorityConfig.ariaLabel}、${completionConfig.statusText}、作成日${formatDate(task.created_at)}`}
      data-selected={isSelected}
      aria-describedby={`task-${task.id}-details`}
      className={`
        rounded-lg p-4 transition-all duration-200 backdrop-blur-sm border shadow-lg
        transform hover:scale-[1.02] focus:scale-[1.02] focus:outline-none
        focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${completionConfig.style}
        ${isSelected ? 'ring-2 ring-blue-400' : ''}
      `}
      onFocus={handleFocus}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* メイン領域 */}
      <div className="flex items-center justify-between">
        {/* タスク内容セクション */}
        <div className="flex items-center flex-1 min-w-0">
          {/* 完了ステータストグルボタン */}
          <button
            ref={toggleRef}
            onClick={(e) => {
              e.stopPropagation();
              onToggleComplete(task.id, !task.completed);
            }}
            aria-pressed={completionConfig.ariaPressed === 'true'}
            aria-label={`タスク「${task.text}」を${task.completed ? '未完了' : '完了'}にする`}
            className={`
              mr-3 p-2 rounded-full transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-blue-500
              ${task.completed
                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                : darkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-white/30 text-gray-600 hover:bg-white/50'
              }
            `}
          >
            <span className="sr-only">
              {task.completed ? '完了マークを外す' : '完了にする'}
            </span>
            {task.completed ? (
              <FaCheck size={14} aria-hidden="true" />
            ) : (
              <div 
                className="w-3.5 h-3.5 rounded-full border-2 border-current" 
                aria-hidden="true"
              />
            )}
          </button>

          <div className="flex-1 min-w-0">
            {/* タスクテキストと優先度 */}
            <div className="flex items-center gap-2 mb-2">
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
              
              <span 
                className={`px-2 py-1 text-xs font-medium rounded-full border ${priorityConfig.color} ${priorityConfig.bgColor}`}
                aria-label={priorityConfig.ariaLabel}
                role="status"
              >
                {priorityConfig.label}
              </span>
            </div>

            {/* 詳細情報 - アクセシブルな形式 */}
            <div 
              id={`task-${task.id}-details`}
              className={`text-xs flex flex-wrap items-center gap-4 ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}
              aria-label="タスクの詳細情報"
            >
              <span aria-label={`作成日: ${formatDate(task.created_at)}`}>
                📅 {formatDate(task.created_at)}
              </span>
              
              {task.assigned_to && (
                <span 
                  className="flex items-center gap-1"
                  aria-label="担当者が割り当てられています"
                >
                  <FaUser size={10} aria-hidden="true" />
                  <span>担当者割り当て済み</span>
                </span>
              )}
              
              {task.team_id && (
                <span aria-label="チームタスク">
                  👥 チームタスク
                </span>
              )}
            </div>
          </div>
        </div>

        {/* アクションボタン群 */}
        <div 
          className="flex items-center gap-2 ml-4"
          role="group"
          aria-label="タスクアクション"
        >
          {onAssignTask && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAssignTask(task.id);
              }}
              aria-label="担当者を割り当て"
              className={`
                p-2 rounded-full transition-colors duration-200
                focus:outline-none focus:ring-2 focus:ring-blue-500
                ${darkMode
                  ? 'text-blue-400 hover:bg-blue-500/20'
                  : 'text-blue-600 hover:bg-blue-100/50'
                }
              `}
            >
              <FaUser size={14} aria-hidden="true" />
            </button>
          )}
          
          {onViewComments && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewComments(task.id);
              }}
              aria-label="コメントを表示"
              className={`
                p-2 rounded-full transition-colors duration-200
                focus:outline-none focus:ring-2 focus:ring-blue-500
                ${darkMode
                  ? 'text-purple-400 hover:bg-purple-500/20'
                  : 'text-purple-600 hover:bg-purple-100/50'
                }
              `}
            >
              <FaComment size={14} aria-hidden="true" />
            </button>
          )}

          {onViewHistory && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewHistory(task.id);
              }}
              aria-label="履歴を表示"
              className={`
                p-2 rounded-full transition-colors duration-200
                focus:outline-none focus:ring-2 focus:ring-blue-500
                ${darkMode
                  ? 'text-green-400 hover:bg-green-500/20'
                  : 'text-green-600 hover:bg-green-100/50'
                }
              `}
            >
              <FaHistory size={14} aria-hidden="true" />
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditTask(index);
            }}
            aria-label="タスクを編集"
            className={`
              p-2 rounded-full transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-blue-500
              ${darkMode
                ? 'text-yellow-400 hover:bg-yellow-500/20'
                : 'text-yellow-600 hover:bg-yellow-100/50'
              }
            `}
          >
            <FaEdit size={14} aria-hidden="true" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteTask(task.id);
            }}
            aria-label="タスクを削除"
            className={`
              p-2 rounded-full transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-red-500
              ${darkMode
                ? 'text-red-400 hover:bg-red-500/20'
                : 'text-red-600 hover:bg-red-100/50'
              }
            `}
          >
            <FaTrash size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* スクリーンリーダー用の追加情報 */}
      <div className="sr-only">
        タスク {index + 1}。
        キーボードショートカット: 
        スペースキーまたはEnterで完了状態を切り替え、
        Deleteキーで削除、
        Ctrl+Eで編集
      </div>
    </div>
  );
});

AccessibleTaskItem.displayName = 'AccessibleTaskItem';

export default AccessibleTaskItem;
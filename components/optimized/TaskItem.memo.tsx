import React, { memo } from 'react';
import { SharedTask } from '@/lib/types';

interface TaskItemProps {
  task: SharedTask;
  darkMode: boolean;
  onToggle: (index: number) => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onAssign?: (id: string) => void;
  onComment?: (id: string) => void;
  onHistory?: (id: string) => void;
  index: number;
}

// 🚀 React.memoでプロパティが同じ場合の再描画を防止
const TaskItem = memo<TaskItemProps>(({ 
  task, 
  darkMode, 
  onToggle, 
  onEdit, 
  onDelete, 
  onAssign,
  onComment,
  onHistory,
  index 
}) => {
  // Priority色の計算を最適化
  const priorityStyles = React.useMemo(() => {
    switch (task.priority) {
      case "高":
        return darkMode 
          ? "border-red-500 bg-red-500/10" 
          : "border-red-400 bg-red-400/20";
      case "中":
        return darkMode 
          ? "border-yellow-500 bg-yellow-500/10" 
          : "border-yellow-400 bg-yellow-400/20";
      default:
        return darkMode 
          ? "border-blue-500 bg-blue-500/10" 
          : "border-blue-400 bg-blue-400/20";
    }
  }, [task.priority, darkMode]);

  const priorityBadgeStyles = React.useMemo(() => {
    switch (task.priority) {
      case "高":
        return darkMode ? "bg-red-500 text-white" : "bg-red-400 text-white";
      case "中":
        return darkMode ? "bg-yellow-500 text-white" : "bg-yellow-400 text-white";
      default:
        return darkMode ? "bg-blue-500 text-white" : "bg-blue-400 text-white";
    }
  }, [task.priority, darkMode]);

  return (
    <div
      className={`group relative p-4 rounded-lg border transition-all duration-300 hover:scale-[1.02] ${
        darkMode 
          ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-600/50' 
          : 'bg-white/20 border-white/30 hover:bg-white/30'
      } ${priorityStyles} ${task.completed ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* 🚀 チェックボックス：楽観的更新対応 */}
          <input
            type="checkbox"
            checked={task.completed}
            onChange={() => onToggle(index)}
            className={`w-5 h-5 cursor-pointer transition-all duration-200 ${
              darkMode ? 'accent-blue-400' : 'accent-yellow-400'
            }`}
          />
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${priorityBadgeStyles}`}>
            {task.priority}
          </span>
        </div>
        
        {/* アクションボタン群 */}
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {onAssign && (
            <button
              onClick={() => onAssign(task.id)}
              className={`p-2 rounded-full transition-all duration-300 transform hover:scale-110 ${
                darkMode 
                  ? 'text-green-400 hover:bg-green-400/20' 
                  : 'text-green-300 hover:bg-green-500/30'
              }`}
              title="担当者設定"
            >
              👤
            </button>
          )}
          <button
            onClick={() => onEdit(index)}
            className={`p-2 rounded-full transition-all duration-300 transform hover:scale-110 ${
              darkMode 
                ? 'text-blue-400 hover:bg-blue-400/20' 
                : 'text-blue-300 hover:bg-blue-500/30'
            }`}
            title="編集"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(index)}
            className={`p-2 rounded-full transition-all duration-300 transform hover:scale-110 ${
              darkMode 
                ? 'text-red-400 hover:bg-red-400/20' 
                : 'text-red-300 hover:bg-red-500/30'
            }`}
            title="削除"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* タスクテキスト */}
      <div className={`text-sm break-words ${task.completed ? 'line-through' : ''} ${
        darkMode ? 'text-gray-300' : 'text-gray-800'
      }`}>
        {task.text}
      </div>

      {/* 担当者情報 */}
      {task.assigned_to && (
        <div className={`mt-2 text-xs ${
          darkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          担当: {task.assigned_to}
        </div>
      )}

      {/* 作成日時 */}
      <div className={`mt-2 text-xs ${
        darkMode ? 'text-gray-500' : 'text-gray-500'
      }`}>
        {new Date(task.created_at).toLocaleDateString('ja-JP')}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // 🔥 カスタム比較関数：深い比較で不要な再描画を防止
  return (
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.text === nextProps.task.text &&
    prevProps.task.completed === nextProps.task.completed &&
    prevProps.task.priority === nextProps.task.priority &&
    prevProps.task.assigned_to === nextProps.task.assigned_to &&
    prevProps.darkMode === nextProps.darkMode &&
    prevProps.index === nextProps.index
  );
});

TaskItem.displayName = 'TaskItem';

export default TaskItem;
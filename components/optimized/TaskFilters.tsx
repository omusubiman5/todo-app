import React, { memo, useCallback } from 'react';
import { FaEye, FaEyeSlash, FaSort } from 'react-icons/fa';

interface TaskFiltersProps {
  filterPriority: string;
  showCompleted: boolean;
  sortBy: 'created' | 'priority' | 'updated';
  sortOrder: 'asc' | 'desc';
  onFilterPriorityChange: (priority: string) => void;
  onShowCompletedToggle: () => void;
  onSortChange: (sortBy: 'created' | 'priority' | 'updated') => void;
  onSortOrderToggle: () => void;
}

export const TaskFilters = memo<TaskFiltersProps>(({
  filterPriority,
  showCompleted,
  sortBy,
  sortOrder,
  onFilterPriorityChange,
  onShowCompletedToggle,
  onSortChange,
  onSortOrderToggle
}) => {
  const handlePriorityChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterPriorityChange(e.target.value);
  }, [onFilterPriorityChange]);

  const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onSortChange(e.target.value as 'created' | 'priority' | 'updated');
  }, [onSortChange]);

  return (
    <div className="bg-white border rounded-lg p-4 mb-6">
      <div className="flex flex-wrap items-center gap-4">
        {/* 優先度フィルタ */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">優先度:</label>
          <select
            value={filterPriority}
            onChange={handlePriorityChange}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">すべて</option>
            <option value="高">高優先度</option>
            <option value="中">中優先度</option>
            <option value="低">低優先度</option>
          </select>
        </div>

        {/* 完了タスク表示切り替え */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onShowCompletedToggle}
            className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm transition-colors ${
              showCompleted
                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
            }`}
          >
            {showCompleted ? <FaEye /> : <FaEyeSlash />}
            <span>{showCompleted ? '完了済み表示中' : '完了済み非表示'}</span>
          </button>
        </div>

        {/* ソート設定 */}
        <div className="flex items-center space-x-2">
          <FaSort className="text-gray-400" />
          <label className="text-sm font-medium text-gray-700">並び順:</label>
          <select
            value={sortBy}
            onChange={handleSortChange}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="created">作成日時</option>
            <option value="updated">更新日時</option>
            <option value="priority">優先度</option>
          </select>
          
          <button
            onClick={onSortOrderToggle}
            className="px-2 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition-colors"
            title={`${sortOrder === 'asc' ? '昇順' : '降順'}でソート中`}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>
    </div>
  );
});

TaskFilters.displayName = 'TaskFilters';
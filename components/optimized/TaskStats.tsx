import React, { memo } from 'react';
import { FaCheckCircle, FaClock, FaExclamationTriangle, FaUsers } from 'react-icons/fa';
import { WorkspaceContext } from '@/lib/types';

interface TaskStatsProps {
  stats: {
    total: number;
    completed: number;
    pending: number;
    completionRate: number;
    priorityStats?: Record<string, number>;
  };
  darkMode?: boolean;
  workspace: WorkspaceContext;
}

export const TaskStats = memo<TaskStatsProps>(({
  stats,
  darkMode = false,
  workspace
}) => {
  const { total, completed, pending, completionRate, priorityStats = {} } = stats;

  const statCards = [
    {
      title: '全タスク',
      value: total,
      icon: FaUsers,
      color: 'blue',
      bgColor: darkMode ? 'bg-blue-900' : 'bg-blue-50',
      textColor: darkMode ? 'text-blue-300' : 'text-blue-600',
      borderColor: darkMode ? 'border-blue-700' : 'border-blue-200'
    },
    {
      title: '完了済み',
      value: completed,
      icon: FaCheckCircle,
      color: 'green',
      bgColor: darkMode ? 'bg-green-900' : 'bg-green-50',
      textColor: darkMode ? 'text-green-300' : 'text-green-600',
      borderColor: darkMode ? 'border-green-700' : 'border-green-200'
    },
    {
      title: '未完了',
      value: pending,
      icon: FaClock,
      color: 'yellow',
      bgColor: darkMode ? 'bg-yellow-900' : 'bg-yellow-50',
      textColor: darkMode ? 'text-yellow-300' : 'text-yellow-600',
      borderColor: darkMode ? 'border-yellow-700' : 'border-yellow-200'
    },
    {
      title: '高優先度',
      value: priorityStats['高'] || 0,
      icon: FaExclamationTriangle,
      color: 'red',
      bgColor: darkMode ? 'bg-red-900' : 'bg-red-50',
      textColor: darkMode ? 'text-red-300' : 'text-red-600',
      borderColor: darkMode ? 'border-red-700' : 'border-red-200'
    }
  ];

  return (
    <div className="mb-8">
      {/* タイトル */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">
          {workspace.type === 'team' ? 'チーム統計' : 'タスク統計'}
        </h2>
        {total > 0 && (
          <div className="flex items-center space-x-4">
            <div className={`w-full bg-gray-200 rounded-full h-3 ${
              darkMode ? 'bg-gray-700' : 'bg-gray-200'
            }`}>
              <div
                className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <span className="text-sm font-medium whitespace-nowrap">
              {Math.round(completionRate)}%
            </span>
          </div>
        )}
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card, index) => {
          const IconComponent = card.icon;
          return (
            <div
              key={index}
              className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-lg ${
                card.bgColor
              } ${card.borderColor}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${card.textColor}`}>
                  <IconComponent className="text-xl" />
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${card.textColor}`}>
                    {card.value.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className={`text-sm font-medium ${card.textColor}`}>
                {card.title}
              </div>
              
              {/* パーセンテージ表示 */}
              {total > 0 && (
                <div className="mt-2 text-xs text-gray-500">
                  {Math.round((card.value / total) * 100)}% of total
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 詳細統計（優先度別） */}
      {Object.keys(priorityStats).length > 0 && (
        <div className={`mt-4 p-4 rounded-lg ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
        } border`}>
          <h3 className="text-sm font-medium mb-3">優先度別内訳</h3>
          <div className="flex space-x-6 text-sm">
            {Object.entries(priorityStats).map(([priority, count]) => (
              <div key={priority} className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  priority === '高' ? 'bg-red-500' :
                  priority === '中' ? 'bg-yellow-500' :
                  'bg-green-500'
                }`} />
                <span>{priority}: {count}件</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 今日の目標（オプション） */}
      {pending > 0 && (
        <div className={`mt-4 p-3 rounded-lg ${
          darkMode ? 'bg-blue-900 border-blue-700' : 'bg-blue-50 border-blue-200'
        } border`}>
          <div className="flex items-center space-x-2 text-sm">
            <FaClock className={darkMode ? 'text-blue-300' : 'text-blue-600'} />
            <span className={darkMode ? 'text-blue-300' : 'text-blue-600'}>
              今日の目標: あと {Math.min(3, pending)} タスクを完了させましょう！
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

TaskStats.displayName = 'TaskStats';
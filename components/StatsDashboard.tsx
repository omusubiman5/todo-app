"use client";
import { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  ResponsiveContainer
} from 'recharts';
import { FaChartPie, FaChartBar, FaChartLine, FaTasks, FaCheck, FaCalendarWeek, FaCalendarAlt, FaSpinner } from 'react-icons/fa';
import { useTaskStats } from '@/hooks/useTaskStats';

type StatsDashboardProps = {
  darkMode?: boolean;
};

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    color?: string;
  }>;
  label?: string;
  darkMode?: boolean;
}

const CustomTooltip = ({ active, payload, label, darkMode }: TooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className={`p-3 rounded-lg shadow-lg ${
        darkMode ? 'bg-gray-800 border border-gray-700 text-white' : 'bg-white border border-gray-300 text-gray-800'
      }`}>
        <p className="font-medium">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="font-bold">
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function StatsDashboard({ darkMode = false }: StatsDashboardProps) {
  const { stats, loading, error } = useTaskStats();
  const [activeChart, setActiveChart] = useState<'pie' | 'bar' | 'line'>('pie');

  if (loading) {
    return (
      <div className={`backdrop-blur-md rounded-2xl p-6 border ${
        darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white/10 border-white/20'
      }`}>
        <div className="flex items-center justify-center py-12">
          <FaSpinner className={`animate-spin text-4xl ${darkMode ? 'text-gray-400' : 'text-white/60'}`} />
          <span className={`ml-3 text-lg ${darkMode ? 'text-gray-400' : 'text-white/60'}`}>
            統計データを読み込み中...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`backdrop-blur-md rounded-2xl p-6 border ${
        darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white/10 border-white/20'
      }`}>
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📊</div>
          <p className={`text-lg ${darkMode ? 'text-red-400' : 'text-red-300'}`}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`backdrop-blur-md rounded-2xl p-6 border ${
        darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white/10 border-white/20'
      }`}
      role="region"
      aria-labelledby="stats-dashboard-title"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 id="stats-dashboard-title" className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-white'}`}>
          📊 統計ダッシュボード
        </h2>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <div className={`rounded-xl p-4 ${
          darkMode ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-blue-400/20 border border-blue-400/30'
        }`}>
          <div className="flex items-center gap-3 mb-2">
            <FaTasks className={`${darkMode ? 'text-blue-400' : 'text-blue-300'}`} />
            <span className={`text-sm font-medium ${darkMode ? 'text-blue-400' : 'text-blue-300'}`}>
              総タスク数
            </span>
          </div>
          <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-white'}`}>
            {stats.totalTasks}
          </p>
        </div>

        <div className={`rounded-xl p-4 ${
          darkMode ? 'bg-green-500/20 border border-green-500/30' : 'bg-green-400/20 border border-green-400/30'
        }`}>
          <div className="flex items-center gap-3 mb-2">
            <FaCheck className={`${darkMode ? 'text-green-400' : 'text-green-300'}`} />
            <span className={`text-sm font-medium ${darkMode ? 'text-green-400' : 'text-green-300'}`}>
              完了率
            </span>
          </div>
          <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-white'}`}>
            {stats.completionRate}%
          </p>
        </div>

        <div className={`rounded-xl p-4 ${
          darkMode ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-yellow-400/20 border border-yellow-400/30'
        }`}>
          <div className="flex items-center gap-3 mb-2">
            <FaCalendarWeek className={`${darkMode ? 'text-yellow-400' : 'text-yellow-300'}`} />
            <span className={`text-sm font-medium ${darkMode ? 'text-yellow-400' : 'text-yellow-300'}`}>
              今週完了
            </span>
          </div>
          <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-white'}`}>
            {stats.thisWeekCompleted}
          </p>
        </div>

        <div className={`rounded-xl p-4 ${
          darkMode ? 'bg-purple-500/20 border border-purple-500/30' : 'bg-purple-400/20 border border-purple-400/30'
        }`}>
          <div className="flex items-center gap-3 mb-2">
            <FaCalendarAlt className={`${darkMode ? 'text-purple-400' : 'text-purple-300'}`} />
            <span className={`text-sm font-medium ${darkMode ? 'text-purple-400' : 'text-purple-300'}`}>
              今月完了
            </span>
          </div>
          <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-white'}`}>
            {stats.thisMonthCompleted}
          </p>
        </div>
      </div>

      {/* チャート切替ボタン */}
      <div className="flex flex-wrap justify-center gap-2 mb-6 px-2">
        <button
          onClick={() => setActiveChart('pie')}
          aria-pressed={activeChart === 'pie'}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
            activeChart === 'pie'
              ? (darkMode ? 'bg-blue-500 text-white' : 'bg-blue-400 text-white')
              : (darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-white/20 hover:bg-white/30 text-white')
          }`}
        >
          <FaChartPie aria-hidden="true" /> 完了率
        </button>
        <button
          onClick={() => setActiveChart('bar')}
          aria-pressed={activeChart === 'bar'}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-400 ${
            activeChart === 'bar'
              ? (darkMode ? 'bg-green-500 text-white' : 'bg-green-400 text-white')
              : (darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-white/20 hover:bg-white/30 text-white')
          }`}
        >
          <FaChartBar aria-hidden="true" /> 優先度別
        </button>
        <button
          onClick={() => setActiveChart('line')}
          aria-pressed={activeChart === 'line'}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 ${
            activeChart === 'line'
              ? (darkMode ? 'bg-yellow-500 text-white' : 'bg-yellow-400 text-white')
              : (darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-white/20 hover:bg-white/30 text-white')
          }`}
        >
          <FaChartLine aria-hidden="true" /> 7日間活動
        </button>
      </div>

      {/* チャート表示エリア */}
      <div className={`rounded-xl p-4 ${darkMode ? 'bg-gray-700/50' : 'bg-white/10'}`}>
        <div className="h-80 sm:h-96 w-full overflow-hidden">
          {activeChart === 'pie' && (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: '完了', value: stats.completedTasks, color: darkMode ? '#10b981' : '#34d399' },
                    { name: '未完了', value: stats.totalTasks - stats.completedTasks, color: darkMode ? '#6b7280' : '#9ca3af' }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => {
                    const percentage = ((percent || 0) * 100).toFixed(0);
                    return percentage !== '0' ? `${name} ${percentage}%` : '';
                  }}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    { name: '完了', value: stats.completedTasks, color: darkMode ? '#10b981' : '#34d399' },
                    { name: '未完了', value: stats.totalTasks - stats.completedTasks, color: darkMode ? '#6b7280' : '#9ca3af' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip darkMode={darkMode} />} />
              </PieChart>
            </ResponsiveContainer>
          )}

          {activeChart === 'bar' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.priorityDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#ffffff40'} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: darkMode ? '#d1d5db' : '#ffffff' }}
                  axisLine={{ stroke: darkMode ? '#6b7280' : '#ffffff60' }}
                />
                <YAxis 
                  tick={{ fill: darkMode ? '#d1d5db' : '#ffffff' }}
                  axisLine={{ stroke: darkMode ? '#6b7280' : '#ffffff60' }}
                />
                <Tooltip content={<CustomTooltip darkMode={darkMode} />} />
                <Bar dataKey="value">
                  {stats.priorityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {activeChart === 'line' && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.last7DaysActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#ffffff40'} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: darkMode ? '#d1d5db' : '#ffffff' }}
                  axisLine={{ stroke: darkMode ? '#6b7280' : '#ffffff60' }}
                />
                <YAxis 
                  tick={{ fill: darkMode ? '#d1d5db' : '#ffffff' }}
                  axisLine={{ stroke: darkMode ? '#6b7280' : '#ffffff60' }}
                />
                <Tooltip content={<CustomTooltip darkMode={darkMode} />} />
                <Line 
                  type="monotone" 
                  dataKey="completed" 
                  stroke={darkMode ? '#f59e0b' : '#fbbf24'}
                  strokeWidth={3}
                  dot={{ fill: darkMode ? '#f59e0b' : '#fbbf24', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* データが空の場合の表示 */}
      {stats.totalTasks === 0 && (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">📊</div>
          <h3 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-white'}`}>
            統計データがありません
          </h3>
          <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-white/60'}`}>
            タスクを追加すると統計が表示されます
          </p>
          <div className="mt-4 p-4 rounded-xl bg-blue-500/20 border border-blue-400/30">
            <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-200'}`}>
              💡 タスクを作成して、進捗を可視化しましょう！
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
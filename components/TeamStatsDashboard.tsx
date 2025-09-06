"use client";
import { useState, useEffect, useMemo } from 'react';
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
import { FaChartPie, FaChartBar, FaChartLine, FaTasks, FaCheck, FaUsers, FaCrown, FaSpinner } from 'react-icons/fa';
import { useAuth } from './AuthProvider';
import { useWorkspace } from './WorkspaceProvider';
import { SharedTaskService } from '@/lib/sharedTaskService';

type TeamStatsDashboardProps = {
  darkMode?: boolean;
};

interface TeamStats {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  memberStats: Array<{
    user_id: string;
    user_name: string;
    total_tasks: number;
    completed_tasks: number;
    completion_rate: number;
  }>;
  priorityDistribution: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  teamActivity: Array<{
    date: string;
    completed: number;
    created: number;
  }>;
}

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

export default function TeamStatsDashboard({ darkMode = false }: TeamStatsDashboardProps) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChart, setActiveChart] = useState<'pie' | 'bar' | 'line' | 'members'>('pie');

  // チーム統計データを取得（メモ化でちらつき防止）
  const fetchTeamStats = useMemo(() => {
    return async () => {
      if (!user || currentWorkspace.type !== 'team' || !currentWorkspace.team_id) {
        setStats(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // チームタスクを取得
        const tasks = await SharedTaskService.getTasks(currentWorkspace, user.id);
        
        // 統計データを計算
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.completed).length;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // 優先度別分布
        const priorityCounts = tasks.reduce((acc, task) => {
          acc[task.priority] = (acc[task.priority] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const priorityDistribution = [
          {
            name: '高優先度',
            value: priorityCounts['高'] || 0,
            color: darkMode ? '#ef4444' : '#f87171'
          },
          {
            name: '中優先度',
            value: priorityCounts['中'] || 0,
            color: darkMode ? '#f59e0b' : '#fbbf24'
          },
          {
            name: '低優先度',
            value: priorityCounts['低'] || 0,
            color: darkMode ? '#3b82f6' : '#60a5fa'
          }
        ];

        // メンバー別統計（仮データ - 実際のメンバー情報が必要）
        const memberStats = [
          {
            user_id: user.id,
            user_name: user.user_metadata?.full_name || user.email || '現在のユーザー',
            total_tasks: tasks.filter(t => t.user_id === user.id).length,
            completed_tasks: tasks.filter(t => t.user_id === user.id && t.completed).length,
            completion_rate: (() => {
              const userTasks = tasks.filter(t => t.user_id === user.id);
              const userCompleted = userTasks.filter(t => t.completed).length;
              return userTasks.length > 0 ? Math.round((userCompleted / userTasks.length) * 100) : 0;
            })()
          }
        ];

        // 直近7日間のアクティビティ（固定データ - ランダム値でのちらつきを防止）
        const teamActivity = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          const dateStr = date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
          
          return {
            date: dateStr,
            completed: Math.floor((i + 1) * 1.5), // 固定データ
            created: Math.floor((i + 1) * 0.8) // 固定データ
          };
        });

        setStats({
          totalTasks,
          completedTasks,
          completionRate,
          memberStats,
          priorityDistribution,
          teamActivity
        });

      } catch (err) {
        console.error('Failed to fetch team stats:', err);
        setError('チーム統計の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };
  }, [user?.id, currentWorkspace.type, currentWorkspace.team_id, darkMode]);

  useEffect(() => {
    fetchTeamStats();
  }, [fetchTeamStats]);

  // 非チーム環境では表示しない
  if (currentWorkspace.type !== 'team') {
    return (
      <div className={`backdrop-blur-md rounded-2xl p-6 border ${
        darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white/10 border-white/20'
      }`}>
        <div className="text-center py-12">
          <div className="text-4xl mb-4">👥</div>
          <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-white/60'}`}>
            チーム統計はチームモードでのみ利用できます
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`backdrop-blur-md rounded-2xl p-6 border ${
        darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white/10 border-white/20'
      }`}>
        <div className="flex items-center justify-center py-12">
          <FaSpinner className={`animate-spin text-4xl ${darkMode ? 'text-gray-400' : 'text-white/60'}`} />
          <span className={`ml-3 text-lg ${darkMode ? 'text-gray-400' : 'text-white/60'}`}>
            チーム統計を読み込み中...
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
          <div className="text-4xl mb-4">❌</div>
          <p className={`text-lg ${darkMode ? 'text-red-400' : 'text-red-300'}`}>{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div 
      className={`backdrop-blur-md rounded-2xl p-6 border ${
        darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white/10 border-white/20'
      }`}
      role="region"
      aria-labelledby="team-stats-dashboard-title"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 id="team-stats-dashboard-title" className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-white'}`}>
            👥 チーム統計ダッシュボード
          </h2>
          {currentWorkspace.team_name && (
            <p className={`text-sm mt-1 ${darkMode ? 'text-blue-400' : 'text-blue-300'}`}>
              {currentWorkspace.team_name}
            </p>
          )}
        </div>
      </div>

      {/* チーム統計カード */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <div className={`rounded-xl p-4 ${
          darkMode ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-blue-400/20 border border-blue-400/30'
        }`}>
          <div className="flex items-center gap-3 mb-2">
            <FaTasks className={`${darkMode ? 'text-blue-400' : 'text-blue-300'}`} />
            <span className={`text-sm font-medium ${darkMode ? 'text-blue-400' : 'text-blue-300'}`}>
              チーム総タスク数
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
              チーム完了率
            </span>
          </div>
          <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-white'}`}>
            {stats.completionRate}%
          </p>
        </div>

        <div className={`rounded-xl p-4 ${
          darkMode ? 'bg-purple-500/20 border border-purple-500/30' : 'bg-purple-400/20 border border-purple-400/30'
        }`}>
          <div className="flex items-center gap-3 mb-2">
            <FaUsers className={`${darkMode ? 'text-purple-400' : 'text-purple-300'}`} />
            <span className={`text-sm font-medium ${darkMode ? 'text-purple-400' : 'text-purple-300'}`}>
              アクティブメンバー
            </span>
          </div>
          <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-white'}`}>
            {stats.memberStats.length}
          </p>
        </div>

        <div className={`rounded-xl p-4 ${
          darkMode ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-yellow-400/20 border border-yellow-400/30'
        }`}>
          <div className="flex items-center gap-3 mb-2">
            <FaCrown className={`${darkMode ? 'text-yellow-400' : 'text-yellow-300'}`} />
            <span className={`text-sm font-medium ${darkMode ? 'text-yellow-400' : 'text-yellow-300'}`}>
              トップパフォーマー
            </span>
          </div>
          <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-white'}`}>
            {stats.memberStats.reduce((top, member) => 
              member.completion_rate > top.completion_rate ? member : top
            ).user_name.split('@')[0].slice(0, 8)}...
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
          <FaChartLine aria-hidden="true" /> チーム活動
        </button>
        <button
          onClick={() => setActiveChart('members')}
          aria-pressed={activeChart === 'members'}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-400 ${
            activeChart === 'members'
              ? (darkMode ? 'bg-purple-500 text-white' : 'bg-purple-400 text-white')
              : (darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-white/20 hover:bg-white/30 text-white')
          }`}
        >
          <FaUsers aria-hidden="true" /> メンバー別
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
              <LineChart data={stats.teamActivity}>
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
                  stroke={darkMode ? '#10b981' : '#34d399'}
                  strokeWidth={3}
                  dot={{ fill: darkMode ? '#10b981' : '#34d399', strokeWidth: 2, r: 4 }}
                  name="完了タスク"
                />
                <Line 
                  type="monotone" 
                  dataKey="created" 
                  stroke={darkMode ? '#f59e0b' : '#fbbf24'}
                  strokeWidth={3}
                  dot={{ fill: darkMode ? '#f59e0b' : '#fbbf24', strokeWidth: 2, r: 4 }}
                  name="作成タスク"
                />
              </LineChart>
            </ResponsiveContainer>
          )}

          {activeChart === 'members' && (
            <div className="space-y-4 overflow-y-auto h-full p-4">
              {stats.memberStats.map((member, index) => (
                <div 
                  key={member.user_id}
                  className={`p-4 rounded-xl border ${
                    darkMode ? 'bg-gray-600/50 border-gray-500' : 'bg-white/20 border-white/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        darkMode ? 'bg-blue-500 text-white' : 'bg-blue-400 text-white'
                      }`}>
                        {member.user_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className={`font-semibold ${darkMode ? 'text-white' : 'text-white'}`}>
                          {member.user_name.split('@')[0]}
                        </p>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-white/70'}`}>
                          {member.total_tasks} タスク中 {member.completed_tasks} 完了
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-white'}`}>
                        {member.completion_rate}%
                      </p>
                      <div className={`w-16 h-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-white/20'}`}>
                        <div 
                          className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-500"
                          style={{ width: `${member.completion_rate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* データが空の場合の表示 */}
      {stats.totalTasks === 0 && (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">👥</div>
          <h3 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-white'}`}>
            チーム統計データがありません
          </h3>
          <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-white/60'}`}>
            チームでタスクを追加すると統計が表示されます
          </p>
          <div className="mt-4 p-4 rounded-xl bg-blue-500/20 border border-blue-400/30">
            <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-200'}`}>
              💡 チームメンバーと協力して、プロジェクトを進めましょう！
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
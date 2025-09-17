'use client';

import { useState, useEffect } from 'react';
import {
  getDailyStats,
  getPeriodStats,
  getFeatureUsageStats,
  getTaskCreationTrend,
  getTaskCompletionRate,
  getSessionTime,
} from '@/lib/todoAnalytics';

interface DashboardData {
  todayStats: any;
  weekStats: any;
  featureUsage: Array<{ feature: string; count: number }>;
  taskTrend: Record<string, number>;
  completionRate: number;
  sessionInfo: { activeTime: number; totalTime: number };
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 14 | 30>(7);

  useEffect(() => {
    loadAnalyticsData();

    // 5分ごとにデータを更新
    const interval = setInterval(loadAnalyticsData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedPeriod]);

  const loadAnalyticsData = () => {
    try {
      const todayStats = getDailyStats();
      const weekStats = getPeriodStats(selectedPeriod);
      const featureUsage = getFeatureUsageStats(selectedPeriod);
      const taskTrend = getTaskCreationTrend(selectedPeriod);
      const completionRate = getTaskCompletionRate(selectedPeriod);
      const sessionInfo = getSessionTime();

      setData({
        todayStats,
        weekStats,
        featureUsage,
        taskTrend,
        completionRate,
        sessionInfo,
      });
    } catch (error) {
      console.error('Analytics data loading failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (milliseconds: number): string => {
    const minutes = Math.floor(milliseconds / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}時間${remainingMinutes}分`;
    }
    return `${remainingMinutes}分`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 bg-white rounded-lg shadow text-center">
        <p className="text-gray-500">分析データの読み込みに失敗しました</p>
        <button
          onClick={loadAnalyticsData}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          再読み込み
        </button>
      </div>
    );
  }

  const todayTasksCreated = data.todayStats.task_created?.length || 0;
  const todayTasksCompleted = data.todayStats.task_completed?.length || 0;
  const todayFeaturesUsed = data.todayStats.feature_used?.length || 0;

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">📊 アナリティクス</h2>
        <div className="flex gap-2">
          {[7, 14, 30].map(days => (
            <button
              key={days}
              onClick={() => setSelectedPeriod(days as 7 | 14 | 30)}
              className={`px-3 py-1 rounded text-sm ${
                selectedPeriod === days
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {days}日間
            </button>
          ))}
        </div>
      </div>

      {/* 今日の概要 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="今日のタスク作成"
          value={todayTasksCreated}
          icon="📝"
          color="blue"
        />
        <MetricCard
          title="今日のタスク完了"
          value={todayTasksCompleted}
          icon="✅"
          color="green"
        />
        <MetricCard
          title="機能使用回数"
          value={todayFeaturesUsed}
          icon="🔧"
          color="purple"
        />
        <MetricCard
          title="完了率"
          value={`${data.completionRate}%`}
          icon="📈"
          color="orange"
        />
      </div>

      {/* セッション情報 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">⏱️ セッション情報</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">アクティブ時間</p>
            <p className="text-xl font-bold text-blue-600">
              {formatTime(data.sessionInfo.activeTime)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">総滞在時間</p>
            <p className="text-xl font-bold text-gray-800">
              {formatTime(data.sessionInfo.totalTime)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">エンゲージメント率</p>
            <p className="text-xl font-bold text-green-600">
              {data.sessionInfo.totalTime > 0
                ? Math.round((data.sessionInfo.activeTime / data.sessionInfo.totalTime) * 100)
                : 0}%
            </p>
          </div>
        </div>
      </div>

      {/* タスク作成トレンド */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">📈 タスク作成トレンド</h3>
        <div className="space-y-2">
          {Object.entries(data.taskTrend)
            .sort(([a], [b]) => b.localeCompare(a))
            .slice(0, 7)
            .map(([date, count]) => (
              <div key={date} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{formatDate(date)}</span>
                <div className="flex items-center gap-2">
                  <div
                    className="bg-blue-200 h-4 rounded"
                    style={{ width: `${Math.max((count / Math.max(...Object.values(data.taskTrend))) * 100, 5)}px` }}
                  ></div>
                  <span className="text-sm font-medium w-6 text-right">{count}</span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* 機能使用頻度 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">🔧 機能使用頻度</h3>
        {data.featureUsage.length > 0 ? (
          <div className="space-y-3">
            {data.featureUsage.slice(0, 10).map(({ feature, count }) => (
              <div key={feature} className="flex items-center justify-between">
                <span className="text-sm capitalize">
                  {getFeatureDisplayName(feature)}
                </span>
                <div className="flex items-center gap-2">
                  <div
                    className="bg-purple-200 h-4 rounded"
                    style={{
                      width: `${Math.max((count / data.featureUsage[0].count) * 100, 10)}px`
                    }}
                  ></div>
                  <span className="text-sm font-medium w-6 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">まだデータがありません</p>
        )}
      </div>

      {/* 最近のアクティビティ */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">📋 最近のアクティビティ</h3>
        <RecentActivity data={data.todayStats} />
      </div>
    </div>
  );
}

// メトリックカードコンポーネント
function MetricCard({ title, value, icon, color }: {
  title: string;
  value: string | number;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colorClasses = {
    blue: 'border-blue-200 bg-blue-50',
    green: 'border-green-200 bg-green-50',
    purple: 'border-purple-200 bg-purple-50',
    orange: 'border-orange-200 bg-orange-50',
  };

  return (
    <div className={`p-4 rounded-lg border-2 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}

// 最近のアクティビティコンポーネント
function RecentActivity({ data }: { data: any }) {
  const activities = [];

  // タスク作成
  if (data.task_created?.length > 0) {
    data.task_created.slice(-3).forEach((task: any) => {
      activities.push({
        type: 'task_created',
        time: task.event_timestamp,
        description: `タスク「${task.title?.substring(0, 30)}...」を作成`,
        icon: '📝',
      });
    });
  }

  // タスク完了
  if (data.task_completed?.length > 0) {
    data.task_completed.slice(-3).forEach((task: any) => {
      activities.push({
        type: 'task_completed',
        time: task.completedAt,
        description: `タスクを完了 (${task.timeToComplete || 0}分で完了)`,
        icon: '✅',
      });
    });
  }

  // 機能使用
  if (data.feature_used?.length > 0) {
    data.feature_used.slice(-3).forEach((usage: any) => {
      activities.push({
        type: 'feature_used',
        time: usage.timestamp,
        description: `${getFeatureDisplayName(usage.feature)}を使用`,
        icon: '🔧',
      });
    });
  }

  // 時間順にソート
  activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  if (activities.length === 0) {
    return <p className="text-gray-500 text-center py-4">今日はまだアクティビティがありません</p>;
  }

  return (
    <div className="space-y-3">
      {activities.slice(0, 5).map((activity, index) => (
        <div key={index} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
          <span className="text-lg">{activity.icon}</span>
          <div className="flex-1">
            <p className="text-sm">{activity.description}</p>
            <p className="text-xs text-gray-500">
              {new Date(activity.time).toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// 機能名の日本語表示
function getFeatureDisplayName(feature: string): string {
  const displayNames: Record<string, string> = {
    'task_create': 'タスク作成',
    'task_edit': 'タスク編集',
    'task_delete': 'タスク削除',
    'task_complete': 'タスク完了',
    'team_create': 'チーム作成',
    'team_join': 'チーム参加',
    'team_invite': 'チーム招待',
    'workspace_switch': 'ワークスペース切り替え',
    'filter_tasks': 'タスクフィルター',
    'search_tasks': 'タスク検索',
    'export_tasks': 'データエクスポート',
    'import_tasks': 'データインポート',
  };

  return displayNames[feature] || feature;
}
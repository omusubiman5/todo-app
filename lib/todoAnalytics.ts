/**
 * Todo アプリ専用アナリティクス
 * GA4との連携で詳細な指標を測定
 */

import { trackTaskEvent, trackTeamEvent, trackUserEvent } from './analytics';

// タスク関連の詳細イベント
export interface TaskAnalyticsData {
  taskId?: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  workspaceType: 'personal' | 'team';
  teamId?: string;
  assignedTo?: string;
  createdAt: string;
  completedAt?: string;
  timeToComplete?: number; // 分単位
  complexity?: 'simple' | 'medium' | 'complex';
}

// セッション滞在時間管理
class SessionTimeTracker {
  private startTime: number;
  private lastActivityTime: number;
  private totalActiveTime: number = 0;
  private isActive: boolean = true;

  constructor() {
    this.startTime = Date.now();
    this.lastActivityTime = Date.now();
    this.setupActivityListeners();
  }

  private setupActivityListeners() {
    if (typeof window === 'undefined') return;

    // ユーザーアクティビティを監視
    const activityEvents = ['click', 'keydown', 'mousemove', 'scroll'];

    activityEvents.forEach(event => {
      document.addEventListener(event, () => {
        this.recordActivity();
      });
    });

    // ページの非表示/表示を監視
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.pauseTracking();
      } else {
        this.resumeTracking();
      }
    });

    // ページ離脱時の処理
    window.addEventListener('beforeunload', () => {
      this.endSession();
    });
  }

  private recordActivity() {
    const now = Date.now();

    if (this.isActive) {
      // 前回のアクティビティから5分以内の場合のみアクティブ時間に追加
      if (now - this.lastActivityTime < 5 * 60 * 1000) {
        this.totalActiveTime += (now - this.lastActivityTime);
      }
    } else {
      // 非アクティブから復帰
      this.isActive = true;
    }

    this.lastActivityTime = now;
  }

  private pauseTracking() {
    this.isActive = false;
  }

  private resumeTracking() {
    this.isActive = true;
    this.lastActivityTime = Date.now();
  }

  public getActiveTime(): number {
    const now = Date.now();
    if (this.isActive && now - this.lastActivityTime < 5 * 60 * 1000) {
      return this.totalActiveTime + (now - this.lastActivityTime);
    }
    return this.totalActiveTime;
  }

  public getTotalTime(): number {
    return Date.now() - this.startTime;
  }

  private endSession() {
    const activeTime = this.getActiveTime();
    const totalTime = this.getTotalTime();

    // GA4にセッションデータを送信
    trackUserEvent('session_end', {
      feature: 'session_tracking',
      duration: Math.round(activeTime / 1000), // 秒単位
      total_duration: Math.round(totalTime / 1000),
      engagement_rate: Math.round((activeTime / totalTime) * 100),
    });
  }
}

// グローバルセッショントラッカー
let sessionTracker: SessionTimeTracker | null = null;

export const initSessionTracking = () => {
  if (typeof window !== 'undefined' && !sessionTracker) {
    sessionTracker = new SessionTimeTracker();
  }
};

export const getSessionTime = () => {
  return sessionTracker ? {
    activeTime: sessionTracker.getActiveTime(),
    totalTime: sessionTracker.getTotalTime()
  } : { activeTime: 0, totalTime: 0 };
};

// タスク作成の詳細トラッキング
export const trackTaskCreation = (data: Partial<TaskAnalyticsData>) => {
  const eventData = {
    ...data,
    event_timestamp: new Date().toISOString(),
    session_info: getSessionTime(),
  };

  // GA4にカスタムイベント送信
  trackTaskEvent('task_create_detailed', {
    taskTitle: data.title?.substring(0, 50), // プライバシー配慮
    priority: data.priority,
    workspaceType: data.workspaceType,
    complexity: data.complexity,
    // カスタムディメンション
    task_creation_time: new Date().getHours(), // 作成時間帯
    workspace_context: data.workspaceType,
  });

  // ローカルストレージに日別統計を保存
  saveDailyStats('task_created', eventData);
};

// タスク完了の詳細トラッキング
export const trackTaskCompletion = (data: Partial<TaskAnalyticsData>) => {
  const completionTime = new Date();
  const createdTime = data.createdAt ? new Date(data.createdAt) : completionTime;
  const timeToComplete = Math.round((completionTime.getTime() - createdTime.getTime()) / (1000 * 60));

  const eventData = {
    ...data,
    completedAt: completionTime.toISOString(),
    timeToComplete,
    completion_hour: completionTime.getHours(),
  };

  trackTaskEvent('task_complete_detailed', {
    priority: data.priority,
    workspaceType: data.workspaceType,
    timeToComplete,
    completion_time_category: getTimeCategory(timeToComplete),
  });

  saveDailyStats('task_completed', eventData);
};

// 機能使用トラッキング
export const trackFeatureUsage = (feature: string, context?: Record<string, unknown>) => {
  const featureData = {
    feature,
    context,
    timestamp: new Date().toISOString(),
    session_info: getSessionTime(),
  };

  trackUserEvent('feature_usage_detailed', {
    feature,
    feature_category: getFeatureCategory(feature),
    usage_context: context?.source,
    user_journey_stage: context?.stage,
  });

  saveDailyStats('feature_used', featureData);
};

// 機能カテゴリの分類
const getFeatureCategory = (feature: string): string => {
  const categories: Record<string, string> = {
    'task_create': 'Task Management',
    'task_edit': 'Task Management',
    'task_delete': 'Task Management',
    'task_complete': 'Task Management',
    'team_create': 'Team Collaboration',
    'team_join': 'Team Collaboration',
    'team_invite': 'Team Collaboration',
    'workspace_switch': 'Navigation',
    'filter_tasks': 'Data Management',
    'search_tasks': 'Data Management',
    'export_tasks': 'Data Export',
    'import_tasks': 'Data Import',
  };

  // Validate feature to prevent object injection
  const validFeatures = Object.keys(categories) as Array<keyof typeof categories>;
  return validFeatures.includes(feature as any) ? categories[feature as keyof typeof categories] : 'Other';
};

// 完了時間のカテゴリ分類
const getTimeCategory = (minutes: number): string => {
  if (minutes < 60) return 'quick'; // 1時間以内
  if (minutes < 24 * 60) return 'same_day'; // 24時間以内
  if (minutes < 7 * 24 * 60) return 'week'; // 1週間以内
  return 'long_term'; // 1週間以上
};

// 日別統計の保存
const saveDailyStats = (eventType: string, data: Record<string, unknown>) => {
  if (typeof window === 'undefined') return;

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const storageKey = `todo_analytics_${today}`;

  try {
    const existingData = localStorage.getItem(storageKey);
    const dailyStats = existingData ? JSON.parse(existingData) : {};

    // Validate eventType to prevent object injection
    const safeEventType = String(eventType).replace(/[^a-zA-Z0-9_-]/g, '_');
    if (!dailyStats[safeEventType]) {
      dailyStats[safeEventType] = [];
    }

    dailyStats[safeEventType].push(data);

    // 最新100件のみ保持
    if (dailyStats[safeEventType] && dailyStats[safeEventType].length > 100) {
      dailyStats[safeEventType] = dailyStats[safeEventType].slice(-100);
    }

    localStorage.setItem(storageKey, JSON.stringify(dailyStats));
  } catch (error) {
    console.warn('Failed to save analytics data:', error);
  }
};

// 日別統計の取得
export const getDailyStats = (date?: string) => {
  if (typeof window === 'undefined') return null;

  const targetDate = date || new Date().toISOString().split('T')[0];
  const storageKey = `todo_analytics_${targetDate}`;

  try {
    const data = localStorage.getItem(storageKey);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.warn('Failed to load analytics data:', error);
    return {};
  }
};

// 期間別統計の取得
export const getPeriodStats = (days: number = 7) => {
  if (typeof window === 'undefined') return {};

  const stats: Record<string, any> = {};
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // Validate dateStr format before using as key
    if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      stats[dateStr] = getDailyStats(dateStr);
    }
  }

  return stats;
};

// 機能使用頻度の集計
export const getFeatureUsageStats = (days: number = 7) => {
  const periodStats = getPeriodStats(days);
  const featureStats: Record<string, number> = {};

  Object.values(periodStats).forEach((dayData: any) => {
    if (dayData.feature_used && Array.isArray(dayData.feature_used)) {
      dayData.feature_used.forEach((usage: any) => {
        if (usage && typeof usage.feature === 'string') {
          const safeFeature = String(usage.feature).replace(/[^a-zA-Z0-9_-]/g, '_');
          featureStats[safeFeature] = (featureStats[safeFeature] || 0) + 1;
        }
      });
    }
  });

  return Object.entries(featureStats)
    .map(([feature, count]) => ({ feature, count }))
    .sort((a, b) => b.count - a.count);
};

// タスク作成トレンドの取得
export const getTaskCreationTrend = (days: number = 7) => {
  const periodStats = getPeriodStats(days);
  const trendData: Record<string, number> = {};

  Object.entries(periodStats).forEach(([date, dayData]: [string, any]) => {
    // Validate date format before using as key
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      trendData[date] = (dayData.task_created && Array.isArray(dayData.task_created)) ? dayData.task_created.length : 0;
    }
  });

  return trendData;
};

// タスク完了率の計算
export const getTaskCompletionRate = (days: number = 7) => {
  const periodStats = getPeriodStats(days);
  let totalCreated = 0;
  let totalCompleted = 0;

  Object.values(periodStats).forEach((dayData: any) => {
    if (dayData.task_created && Array.isArray(dayData.task_created)) totalCreated += dayData.task_created.length;
    if (dayData.task_completed && Array.isArray(dayData.task_completed)) totalCompleted += dayData.task_completed.length;
  });

  return totalCreated > 0 ? Math.round((totalCompleted / totalCreated) * 100) : 0;
};
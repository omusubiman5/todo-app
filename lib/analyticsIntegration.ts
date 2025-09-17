/**
 * 既存のタスクサービスとアナリティクスの統合
 */

import { SharedTask, WorkspaceContext } from './types';
import {
  trackTaskCreation,
  trackTaskCompletion,
  trackFeatureUsage,
  initSessionTracking,
} from './todoAnalytics';

// アナリティクス機能付きタスク作成
export const createTaskWithAnalytics = async (
  taskData: Partial<SharedTask>,
  workspace: WorkspaceContext,
  originalCreateFunction: Function
) => {
  // 分析用のメタデータを準備
  const analyticsData = {
    title: taskData.text || '',
    priority: taskData.priority || 'medium',
    status: 'pending' as const,
    workspaceType: workspace.type === 'personal' ? 'personal' as const : 'team' as const,
    teamId: workspace.team_id,
    createdAt: new Date().toISOString(),
    complexity: getTaskComplexity(taskData.text || ''),
  };

  // 元の関数を実行
  const result = await originalCreateFunction(taskData);

  // 成功時のみアナリティクスを送信
  if (result) {
    trackTaskCreation(analyticsData);
    trackFeatureUsage('task_create', {
      source: 'task_form',
      workspace: workspace.type,
      priority: analyticsData.priority,
    });
  }

  return result;
};

// アナリティクス機能付きタスク完了
export const completeTaskWithAnalytics = async (
  task: SharedTask,
  workspace: WorkspaceContext,
  originalCompleteFunction: Function
) => {
  const startTime = task.created_at ? new Date(task.created_at) : new Date();
  const completionTime = new Date();

  // 元の関数を実行
  const result = await originalCompleteFunction(task);

  // 成功時のみアナリティクスを送信
  if (result) {
    trackTaskCompletion({
      title: task.text,
      priority: task.priority || 'medium',
      status: 'completed',
      workspaceType: workspace.type === 'personal' ? 'personal' : 'team',
      teamId: workspace.team_id,
      createdAt: task.created_at,
      completedAt: completionTime.toISOString(),
      timeToComplete: Math.round((completionTime.getTime() - startTime.getTime()) / (1000 * 60)),
    });

    trackFeatureUsage('task_complete', {
      source: 'task_list',
      workspace: workspace.type,
      completion_method: 'checkbox',
    });
  }

  return result;
};

// タスクの複雑度判定
const getTaskComplexity = (text: string): 'simple' | 'medium' | 'complex' => {
  if (text.length < 20) return 'simple';
  if (text.length < 100) return 'medium';
  return 'complex';
};

// ワークスペース切り替えの追跡
export const trackWorkspaceSwitch = (fromWorkspace: WorkspaceContext, toWorkspace: WorkspaceContext) => {
  trackFeatureUsage('workspace_switch', {
    from: fromWorkspace.type,
    to: toWorkspace.type,
    from_team_id: fromWorkspace.team_id,
    to_team_id: toWorkspace.team_id,
  });
};

// フィルター・検索機能の追跡
export const trackTaskFilter = (filterType: string, filterValue: any) => {
  trackFeatureUsage('filter_tasks', {
    filter_type: filterType,
    filter_value: typeof filterValue === 'object' ? JSON.stringify(filterValue) : filterValue,
  });
};

export const trackTaskSearch = (searchQuery: string, resultCount: number) => {
  trackFeatureUsage('search_tasks', {
    query_length: searchQuery.length,
    result_count: resultCount,
    has_results: resultCount > 0,
  });
};

// セッション初期化（アプリ起動時に1回だけ実行）
export const initializeAnalytics = () => {
  if (typeof window !== 'undefined') {
    initSessionTracking();

    // ページ離脱時の最終データ送信
    window.addEventListener('beforeunload', () => {
      trackFeatureUsage('session_end', {
        final_event: true,
      });
    });

    console.log('📊 Todo Analytics initialized');
  }
};

// カスタムイベントの追跡（プラグイン的に使用）
export const trackCustomEvent = (eventName: string, properties: any) => {
  trackFeatureUsage(eventName, properties);
};
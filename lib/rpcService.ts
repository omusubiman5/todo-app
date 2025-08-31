// RPC関数を使用するためのサービスクラス
import { supabase } from './supabase';

export interface TaskStatistics {
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  in_progress_tasks: number;
  completion_rate: number;
  this_week_created: number;
  this_week_completed: number;
  last_week_completed: number;
  overdue_tasks: number;
  due_today: number;
  priority_breakdown: Record<string, number>;
  recent_activity: Array<{
    date: string;
    completed_count: number;
    created_count: number;
  }>;
  productivity_score: number;
}

export interface BulkUpdateResult {
  success: boolean;
  updated_count: number;
  failed_count: number;
  total_requested: number;
  message: string;
}

export interface TaskFilter {
  search_text?: string;
  status?: string[];
  priority?: string[];
  assigned_to?: string;
  date_from?: string;
  date_to?: string;
  due_from?: string;
  due_to?: string;
  has_due_date?: boolean;
  limit?: number;
  offset?: number;
}

export interface FilteredTasksResult {
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    due_date?: string;
    created_at: string;
    updated_at: string;
    creator_name?: string;
    assignee_name?: string;
    team_name?: string;
    comment_count: number;
    days_until_due?: number;
  }>;
  total_count: number;
  has_more: boolean;
  filters_applied: Record<string, unknown>;
}

export interface CleanupResult {
  success: boolean;
  dry_run: boolean;
  cleanup_count: number;
  archived_count: number;
  error_count: number;
  cutoff_date: string;
  message: string;
  recommendations: string[];
}

export class RPCService {
  /**
   * ユーザーのタスク統計を取得
   */
  static async getUserTaskStatistics(userId: string): Promise<TaskStatistics> {
    const { data, error } = await supabase.rpc('get_user_task_statistics', {
      p_user_id: userId
    });

    if (error) {
      console.error('統計取得エラー:', error);
      throw new Error(`統計を取得できませんでした: ${error.message}`);
    }

    return data;
  }

  /**
   * 複数タスクの一括更新
   */
  static async bulkUpdateTasks(
    taskIds: string[],
    userId: string,
    updates: Record<string, unknown>
  ): Promise<BulkUpdateResult> {
    const { data, error } = await supabase.rpc('bulk_update_tasks', {
      p_task_ids: taskIds,
      p_user_id: userId,
      p_updates: updates
    });

    if (error) {
      console.error('一括更新エラー:', error);
      throw new Error(`タスクを更新できませんでした: ${error.message}`);
    }

    return data;
  }

  /**
   * 高度な検索・フィルター機能
   */
  static async getTasksWithFilters(
    userId: string,
    filters: TaskFilter & { team_id?: string } = {}
  ): Promise<FilteredTasksResult> {
    const { data, error } = await supabase.rpc('get_tasks_with_filters', {
      p_user_id: userId,
      p_team_id: filters.team_id || null,
      p_search_text: filters.search_text || null,
      p_status: filters.status || null,
      p_priority: filters.priority || null,
      p_assigned_to: filters.assigned_to || null,
      p_date_from: filters.date_from || null,
      p_date_to: filters.date_to || null,
      p_due_from: filters.due_from || null,
      p_due_to: filters.due_to || null,
      p_has_due_date: filters.has_due_date ?? null,
      p_limit: filters.limit || 50,
      p_offset: filters.offset || 0
    });

    if (error) {
      console.error('検索エラー:', error);
      throw new Error(`タスクを検索できませんでした: ${error.message}`);
    }

    return data;
  }

  /**
   * 完了済みタスクの整理
   */
  static async cleanupCompletedTasks(
    userId?: string,
    options: {
      teamId?: string;
      daysOld?: number;
      keepImportant?: boolean;
      dryRun?: boolean;
    } = {}
  ): Promise<CleanupResult> {
    const { data, error } = await supabase.rpc('cleanup_completed_tasks', {
      p_user_id: userId || null,
      p_team_id: options.teamId || null,
      p_days_old: options.daysOld || 180,
      p_keep_important: options.keepImportant ?? true,
      p_dry_run: options.dryRun ?? false
    });

    if (error) {
      console.error('クリーンアップエラー:', error);
      throw new Error(`タスクを整理できませんでした: ${error.message}`);
    }

    return data;
  }
}

// Reactフック用のカスタムフック
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthProvider';

export const useTaskStatistics = () => {
  const { user } = useAuth();
  const [statistics, setStatistics] = useState<TaskStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatistics = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await RPCService.getUserTaskStatistics(user.id);
      setStatistics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
  }, [user?.id]);

  return { statistics, isLoading, error, refetch: fetchStatistics };
};

export const useAdvancedTaskSearch = () => {
  const { user } = useAuth();
  const [results, setResults] = useState<FilteredTasksResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async (filters: TaskFilter & { team_id?: string }) => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await RPCService.getTasksWithFilters(user.id, filters);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return { results, isLoading, error, search };
};
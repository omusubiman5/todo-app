// 統合版タスクサービス - 全機能対応
import { supabase } from './supabase';

// ============================================================================= 
// 型定義の拡張
// =============================================================================

export interface Priority {
  id: number;
  name: string;
  display_name: string;
  sort_order: number;
  color_code: string;
  icon: string;
  description: string;
  is_active: boolean;
}

export interface EnhancedTask {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority?: Priority;
  user_id: string;
  team_id?: string | null;
  assigned_to?: string | null;
  created_by?: string;
  due_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  custom_fields: Record<string, string | number | boolean | null>;
  
  // 関連情報
  creator?: {
    id: string;
    email: string;
    display_name: string;
  };
  assignee?: {
    id: string;
    email: string;
    display_name: string;
  } | null;
  team?: {
    id: string;
    name: string;
  } | null;
  comment_count: number;
  days_until_due?: number;
}

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
  custom_field_usage: Record<string, number>;
}

export interface TaskFilter {
  search_text?: string;
  status?: string[];
  priority_ids?: number[];
  assigned_to?: string;
  date_from?: string;
  date_to?: string;
  due_from?: string;
  due_to?: string;
  has_due_date?: boolean;
  custom_field_filters?: Record<string, string | number | boolean | null>;
  limit?: number;
  offset?: number;
}

export interface FilteredTasksResult {
  tasks: EnhancedTask[];
  total_count: number;
  has_more: boolean;
}

export interface CustomFieldDefinition {
  id: string;
  field_name: string;
  field_type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multi_select' | 'url' | 'email';
  display_name: string;
  description?: string;
  is_required: boolean;
  default_value?: unknown;
  validation_rules: Record<string, unknown>;
  options: unknown[];
  sort_order: number;
}

// =============================================================================
// 統合サービスクラス
// =============================================================================

export class EnhancedTaskService {
  
  // -------------------------------------------------------------------------
  // 基本的なタスク操作
  // -------------------------------------------------------------------------
  
  /**
   * タスク一覧取得（高度フィルター対応）
   */
  static async getTasks(
    userId: string,
    teamId?: string,
    filters: TaskFilter = {}
  ): Promise<FilteredTasksResult> {
    const { data, error } = await supabase.rpc('get_tasks_with_filters_v2', {
      p_user_id: userId,
      p_team_id: teamId || null,
      p_search_text: filters.search_text || null,
      p_status: filters.status || null,
      p_priority_ids: filters.priority_ids || null,
      p_assigned_to: filters.assigned_to || null,
      p_date_from: filters.date_from || null,
      p_date_to: filters.date_to || null,
      p_due_from: filters.due_from || null,
      p_due_to: filters.due_to || null,
      p_has_due_date: filters.has_due_date ?? null,
      p_custom_field_filters: filters.custom_field_filters || null,
      p_limit: filters.limit || 50,
      p_offset: filters.offset || 0
    });

    if (error) {
      console.error('タスク取得エラー:', error);
      throw new Error(`タスクを取得できませんでした: ${error.message}`);
    }

    return data;
  }

  /**
   * タスク作成（カスタムフィールド対応）
   */
  static async createTask(task: {
    title: string;
    description?: string;
    priority_id?: number;
    team_id?: string;
    assigned_to?: string;
    due_date?: string;
    custom_fields?: Record<string, string | number | boolean | null>;
  }, userId: string): Promise<EnhancedTask> {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...task,
        user_id: userId,
        created_by: userId,
        status: 'pending',
        custom_fields: task.custom_fields || {}
      })
      .select(`
        *,
        priority:task_priorities(*),
        creator:profiles!tasks_user_id_fkey(*),
        assignee:profiles!tasks_assigned_to_fkey(*),
        team:teams(*)
      `)
      .single();

    if (error) {
      console.error('タスク作成エラー:', error);
      throw new Error(`タスクを作成できませんでした: ${error.message}`);
    }

    return this.normalizeTask(data);
  }

  /**
   * タスク更新
   */
  static async updateTask(
    taskId: string,
    updates: Partial<EnhancedTask>,
    userId: string
  ): Promise<EnhancedTask> {
    const updateData: Record<string, unknown> = { ...updates };
    
    // completed_atの自動設定
    if (updates.status === 'completed' && !updateData.completed_at) {
      updateData.completed_at = new Date().toISOString();
    } else if (updates.status !== 'completed') {
      updateData.completed_at = null;
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select(`
        *,
        priority:task_priorities(*),
        creator:profiles!tasks_user_id_fkey(*),
        assignee:profiles!tasks_assigned_to_fkey(*),
        team:teams(*)
      `)
      .single();

    if (error) {
      console.error('タスク更新エラー:', error);
      throw new Error(`タスクを更新できませんでした: ${error.message}`);
    }

    return this.normalizeTask(data);
  }

  // -------------------------------------------------------------------------
  // 一括操作
  // -------------------------------------------------------------------------

  /**
   * 一括更新（拡張版）
   */
  static async bulkUpdateTasks(
    taskIds: string[],
    updates: Record<string, unknown>,
    userId: string
  ): Promise<{
    success: boolean;
    updated_count: number;
    failed_count: number;
    message: string;
  }> {
    const { data, error } = await supabase.rpc('bulk_update_tasks_v2', {
      p_task_ids: taskIds,
      p_user_id: userId,
      p_updates: updates
    });

    if (error) {
      console.error('一括更新エラー:', error);
      throw new Error(`一括更新に失敗しました: ${error.message}`);
    }

    return data;
  }

  // -------------------------------------------------------------------------
  // 統計・分析
  // -------------------------------------------------------------------------

  /**
   * ユーザー統計取得（拡張版）
   */
  static async getUserStatistics(userId: string): Promise<TaskStatistics> {
    const { data, error } = await supabase.rpc('get_user_task_statistics_v2', {
      p_user_id: userId
    });

    if (error) {
      console.error('統計取得エラー:', error);
      throw new Error(`統計を取得できませんでした: ${error.message}`);
    }

    return data;
  }

  // -------------------------------------------------------------------------
  // アーカイブ機能
  // -------------------------------------------------------------------------

  /**
   * タスクアーカイブ
   */
  static async archiveTask(
    taskId: string,
    userId: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    const { data, error } = await supabase.rpc('archive_task', {
      p_task_id: taskId,
      p_user_id: userId,
      p_reason: reason || null
    });

    if (error) {
      console.error('アーカイブエラー:', error);
      throw new Error(`アーカイブに失敗しました: ${error.message}`);
    }

    return data;
  }

  /**
   * アーカイブされたタスク一覧取得
   */
  static async getArchivedTasks(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ tasks: unknown[]; total_count: number }> {
    const { data, count, error } = await supabase
      .from('tasks_archive')
      .select('*', { count: 'exact' })
      .or(`user_id.eq.${userId},assigned_to.eq.${userId}`)
      .order('archived_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('アーカイブ取得エラー:', error);
      throw new Error(`アーカイブを取得できませんでした: ${error.message}`);
    }

    return {
      tasks: data || [],
      total_count: count || 0
    };
  }

  // -------------------------------------------------------------------------
  // カスタムフィールド管理
  // -------------------------------------------------------------------------

  /**
   * カスタムフィールド設定
   */
  static async setCustomField(
    taskId: string,
    fieldName: string,
    fieldValue: unknown,
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    const { data, error } = await supabase.rpc('set_task_custom_field', {
      p_task_id: taskId,
      p_field_name: fieldName,
      p_field_value: JSON.stringify(fieldValue),
      p_user_id: userId
    });

    if (error) {
      console.error('カスタムフィールド設定エラー:', error);
      throw new Error(`カスタムフィールドを設定できませんでした: ${error.message}`);
    }

    return data;
  }

  /**
   * チームのフィールド定義取得
   */
  static async getFieldDefinitions(teamId?: string): Promise<CustomFieldDefinition[]> {
    const { data, error } = await supabase
      .from('task_field_definitions')
      .select('*')
      .or(teamId ? `team_id.eq.${teamId},team_id.is.null` : 'team_id.is.null')
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      console.error('フィールド定義取得エラー:', error);
      throw new Error(`フィールド定義を取得できませんでした: ${error.message}`);
    }

    return data || [];
  }

  /**
   * カスタムフィールド定義作成
   */
  static async createFieldDefinition(
    fieldDef: Omit<CustomFieldDefinition, 'id'>,
    userId: string
  ): Promise<CustomFieldDefinition> {
    const { data, error } = await supabase
      .from('task_field_definitions')
      .insert({
        ...fieldDef,
        created_by: userId
      })
      .select()
      .single();

    if (error) {
      console.error('フィールド定義作成エラー:', error);
      throw new Error(`フィールド定義を作成できませんでした: ${error.message}`);
    }

    return data;
  }

  // -------------------------------------------------------------------------
  // 優先度管理
  // -------------------------------------------------------------------------

  /**
   * 優先度一覧取得
   */
  static async getPriorities(): Promise<Priority[]> {
    const { data, error } = await supabase
      .from('task_priorities')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      console.error('優先度取得エラー:', error);
      throw new Error(`優先度を取得できませんでした: ${error.message}`);
    }

    return data || [];
  }

  // -------------------------------------------------------------------------
  // リアルタイム機能
  // -------------------------------------------------------------------------

  /**
   * タスク変更のリアルタイム購読
   */
  static subscribeToTaskChanges(
    callback: (payload: unknown) => void,
    filters?: { team_id?: string; user_id?: string }
  ) {
    let channel = supabase.channel('task-changes');

    if (filters?.team_id) {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `team_id=eq.${filters.team_id}`
        },
        callback
      );
    } else if (filters?.user_id) {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${filters.user_id}`
        },
        callback
      );
    } else {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        callback
      );
    }

    channel.subscribe();
    return channel;
  }

  // -------------------------------------------------------------------------
  // ユーティリティ
  // -------------------------------------------------------------------------

  /**
   * タスクデータの正規化
   */
  private static normalizeTask(rawTask: unknown): EnhancedTask {
    const task = rawTask as Record<string, unknown>; // Type assertion to access properties
    return {
      id: task.id as string,
      title: task.title as string,
      description: task.description as string,
      status: (task.status as "completed" | "pending" | "in_progress") || "pending",
      priority: task.priority as Priority,
      user_id: task.user_id as string,
      team_id: task.team_id as string,
      assigned_to: (task.assigned_to as string | null | undefined) || null,
      created_by: task.created_by as string | undefined,
      due_date: task.due_date as string | undefined,
      completed_at: (task.completed_at as string | null | undefined) || undefined,
      created_at: task.created_at as string,
      updated_at: task.updated_at as string,
      custom_fields: (task.custom_fields as Record<string, string | number | boolean | null>) || {},
      
      creator: task.creator ? {
        id: (task.creator as Record<string, unknown>).id as string,
        email: ((task.creator as Record<string, unknown>).email as string) || 'unknown@example.com',
        display_name: ((task.creator as Record<string, unknown>).display_name as string) || ((task.creator as Record<string, unknown>).email as string) || 'Unknown User'
      } : undefined,
      
      assignee: task.assignee ? {
        id: (task.assignee as Record<string, unknown>).id as string,
        email: ((task.assignee as Record<string, unknown>).email as string) || 'unknown@example.com',
        display_name: ((task.assignee as Record<string, unknown>).display_name as string) || ((task.assignee as Record<string, unknown>).email as string) || 'Unknown User'
      } : null,
      
      team: task.team ? {
        id: (task.team as Record<string, unknown>).id as string,
        name: (task.team as Record<string, unknown>).name as string
      } : null,
      
      comment_count: (task.comment_count as number) || 0,
      days_until_due: task.days_until_due as number | undefined
    };
  }

  /**
   * 検索条件の構築ヘルパー
   */
  static buildSearchFilters(params: {
    searchText?: string;
    status?: string[];
    priorityIds?: number[];
    assignedTo?: string;
    dateRange?: { from?: Date; to?: Date };
    dueRange?: { from?: Date; to?: Date };
    customFields?: Record<string, string | number | boolean | null>;
  }): TaskFilter {
    const filters: TaskFilter = {};

    if (params.searchText?.trim()) {
      filters.search_text = params.searchText.trim();
    }

    if (params.status?.length) {
      filters.status = params.status;
    }

    if (params.priorityIds?.length) {
      filters.priority_ids = params.priorityIds;
    }

    if (params.assignedTo) {
      filters.assigned_to = params.assignedTo;
    }

    if (params.dateRange?.from) {
      filters.date_from = params.dateRange.from.toISOString();
    }

    if (params.dateRange?.to) {
      filters.date_to = params.dateRange.to.toISOString();
    }

    if (params.dueRange?.from) {
      filters.due_from = params.dueRange.from.toISOString().split('T')[0];
    }

    if (params.dueRange?.to) {
      filters.due_to = params.dueRange.to.toISOString().split('T')[0];
    }

    if (params.customFields && Object.keys(params.customFields).length > 0) {
      filters.custom_field_filters = params.customFields;
    }

    return filters;
  }
}
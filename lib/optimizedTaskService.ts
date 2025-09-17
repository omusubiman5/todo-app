// 🚀 最適化されたタスクサービス
// データベースクエリの大幅なパフォーマンス改善を実装

import { supabase } from './supabase';
import { SharedTask, WorkspaceContext, PaginationOptions, PaginatedTasksResult } from './types';

export class OptimizedTaskService {
  // メモリキャッシュ（本格的にはRedisを使用）
  private static cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private static readonly CACHE_TTL = {
    TEAM_MEMBERS: 300000,      // 5分
    TASK_STATS: 60000,         // 1分
    USER_PROFILE: 600000,      // 10分
    NOTIFICATIONS: 30000       // 30秒
  };

  /**
   * 🚀 最適化されたタスク取得メソッド
   * - 単一クエリでカウントとデータを同時取得
   * - インデックスを活用した条件順序
   * - JOINによる関連データの一括取得
   */
  static async getTasksOptimized(
    workspace: WorkspaceContext,
    userId: string,
    options: PaginationOptions = {}
  ): Promise<PaginatedTasksResult> {
    const { limit = 50, offset = 0, status, priority, assigned_to } = options;

    console.log('🚀 OptimizedTaskService.getTasksOptimized 開始:', { workspace, userId, options });

    // JOINを使用してタスクと関連情報を一括取得
    let query = supabase
      .from('tasks')
      .select(`
        id,
        text,
        completed,
        priority,
        user_id,
        team_id,
        assigned_to,
        created_by,
        created_at,
        updated_at,
        assignee:profiles!tasks_assigned_to_fkey(
          id,
          display_name,
          avatar_url
        ),
        creator:profiles!tasks_created_by_fkey(
          id,
          display_name,
          avatar_url
        )
      `, { count: 'exact' });

    // インデックス効率を考慮した条件順序
    if (workspace.type === 'personal') {
      // 個人タスク：user_id が最も選択的
      query = query
        .eq('user_id', userId)
        .is('team_id', null);
    } else if (workspace.type === 'team' && workspace.team_id) {
      // チームタスク：team_id が最も選択的
      query = query
        .eq('team_id', workspace.team_id);
    } else {
      console.warn('⚠️ 無効なワークスペース設定:', workspace);
      return {
        tasks: [],
        hasMore: false,
        totalCount: 0,
        currentPage: Math.floor(offset / limit) + 1
      };
    }

    // 追加フィルタ（インデックス順序に従って適用）
    if (status !== undefined) {
      const completed = status === 'completed';
      query = query.eq('completed', completed);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    if (assigned_to) {
      query = query.eq('assigned_to', assigned_to);
    }

    // ソート + ページネーション（created_at DESC インデックスを活用）
    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    console.log('📊 最適化クエリ実行結果:', {
      dataCount: data?.length || 0,
      totalCount: count,
      error: error?.message || null
    });

    if (error) {
      console.error('🚨 最適化クエリエラー:', error);
      throw error;
    }

    // データ変換（JOIN結果を適切な形式に変換）
    const tasks = (data || []).map(task => ({
      ...task,
      assignee: task.assignee ? {
        id: task.assigned_to,
        email: `${task.assignee.display_name || 'user'}@example.com`,
        user_metadata: {
          full_name: task.assignee.display_name,
          avatar_url: task.assignee.avatar_url
        }
      } : null,
      creator: task.creator ? {
        id: task.created_by || task.user_id,
        email: `${task.creator.display_name || 'user'}@example.com`,
        user_metadata: {
          full_name: task.creator.display_name,
          avatar_url: task.creator.avatar_url
        }
      } : null
    }));

    const totalCount = count || 0;
    const currentPage = Math.floor(offset / limit) + 1;
    const hasMore = totalCount > offset + limit;

    console.log('✅ 最適化タスク取得完了:', {
      tasksCount: tasks.length,
      totalCount,
      currentPage,
      hasMore
    });

    return {
      tasks,
      totalCount,
      hasMore,
      currentPage,
      nextCursor: hasMore ? `page-${currentPage + 1}` : undefined
    };
  }

  /**
   * 🚀 キャッシュ付きチームメンバー取得
   * - メモリキャッシュでN+1問題を完全回避
   * - プロフィール情報の一括取得
   */
  static async getCachedTeamMembers(teamId: string) {
    const cacheKey = `team_members_${teamId}`;
    const cached = this.cache.get(cacheKey);

    // キャッシュヒットチェック
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      console.log('💾 キャッシュからチームメンバー取得:', teamId);
      return cached.data;
    }

    console.log('🔍 データベースからチームメンバー取得:', teamId);

    // JOINを使用してメンバー情報とプロフィールを一括取得
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        user_id,
        role,
        joined_at,
        invited_by,
        profiles!team_members_user_id_fkey (
          id,
          display_name,
          avatar_url
        )
      `)
      .eq('team_id', teamId);

    if (error) {
      console.error('🚨 チームメンバー取得エラー:', error);
      throw error;
    }

    // データ変換
    const members = (data || []).map(member => ({
      user_id: member.user_id,
      role: member.role,
      joined_at: member.joined_at,
      invited_by: member.invited_by,
      user: {
        id: member.user_id,
        email: `${member.profiles?.display_name || 'user'}@example.com`,
        user_metadata: {
          full_name: member.profiles?.display_name || null,
          avatar_url: member.profiles?.avatar_url || null
        }
      }
    }));

    // キャッシュに保存
    this.cache.set(cacheKey, {
      data: members,
      timestamp: Date.now(),
      ttl: this.CACHE_TTL.TEAM_MEMBERS
    });

    console.log('✅ チームメンバー取得完了（キャッシュ保存済み）:', {
      teamId,
      memberCount: members.length
    });

    return members;
  }

  /**
   * 🚀 単一クエリによるチーム詳細取得
   * - 複数ラウンドトリップを削減
   * - JOINによる関連データの一括取得
   */
  static async getTeamDetailsOptimized(teamId: string) {
    console.log('🚀 最適化チーム詳細取得開始:', teamId);

    // 単一クエリでチーム情報、メンバー、プロフィールを同時取得
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        team_members (
          user_id,
          role,
          joined_at,
          invited_by,
          profiles!team_members_user_id_fkey (
            id,
            display_name,
            avatar_url
          )
        )
      `)
      .eq('id', teamId)
      .single();

    if (error) {
      console.error('🚨 最適化チーム詳細取得エラー:', error);
      throw error;
    }

    if (!data) {
      throw new Error('チームが見つかりません');
    }

    // 現在のユーザー情報を取得
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    // データ変換
    const membersWithUser = data.team_members.map(member => ({
      user_id: member.user_id,
      role: member.role,
      joined_at: member.joined_at,
      invited_by: member.invited_by,
      user: {
        id: member.user_id,
        email: member.user_id === currentUser?.id && currentUser?.email
          ? currentUser.email
          : `${member.profiles?.display_name || 'user'}@example.com`,
        user_metadata: {
          full_name: member.profiles?.display_name || null,
          avatar_url: member.profiles?.avatar_url || null
        }
      }
    }));

    const isOwner = data.created_by === currentUser?.id;
    const userRole = membersWithUser.find(member => member.user_id === currentUser?.id)?.role || null;

    const result = {
      ...data,
      members: membersWithUser,
      member_count: membersWithUser.length,
      current_user_is_owner: isOwner,
      current_user_role: userRole
    };

    console.log('✅ 最適化チーム詳細取得完了:', {
      teamId,
      memberCount: result.member_count,
      isOwner,
      userRole
    });

    return result;
  }

  /**
   * 🚀 キャッシュ付き通知取得
   * - 未読通知の高速取得
   * - メモリキャッシュによる重複アクセス防止
   */
  static async getCachedNotifications(userId: string) {
    const cacheKey = `notifications_${userId}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      console.log('💾 キャッシュから通知取得:', userId);
      return cached.data;
    }

    console.log('🔍 データベースから通知取得:', userId);

    // インデックス活用：user_id + created_at DESC + read_at IS NULL
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('🚨 通知取得エラー:', error);
      throw error;
    }

    // キャッシュに保存（TTLは短く設定）
    this.cache.set(cacheKey, {
      data: data || [],
      timestamp: Date.now(),
      ttl: this.CACHE_TTL.NOTIFICATIONS
    });

    console.log('✅ 通知取得完了:', {
      userId,
      notificationCount: data?.length || 0
    });

    return data || [];
  }

  /**
   * 🚀 バッチ処理によるタスク統計取得
   * - 集約クエリによる効率的な統計計算
   * - キャッシュによる重複計算防止
   */
  static async getTaskStatsOptimized(workspace: WorkspaceContext, userId: string) {
    const cacheKey = `task_stats_${workspace.type}_${workspace.team_id || userId}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      console.log('💾 キャッシュからタスク統計取得');
      return cached.data;
    }

    console.log('🔍 データベースからタスク統計取得');

    // 集約クエリで統計を一括取得
    let query = supabase.from('tasks').select('completed, priority', { count: 'exact' });

    if (workspace.type === 'personal') {
      query = query.eq('user_id', userId).is('team_id', null);
    } else if (workspace.type === 'team' && workspace.team_id) {
      query = query.eq('team_id', workspace.team_id);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error('🚨 タスク統計取得エラー:', error);
      throw error;
    }

    // 統計計算
    const stats = {
      total: count || 0,
      completed: data?.filter(task => task.completed).length || 0,
      pending: data?.filter(task => !task.completed).length || 0,
      high_priority: data?.filter(task => task.priority === '高').length || 0,
      medium_priority: data?.filter(task => task.priority === '中').length || 0,
      low_priority: data?.filter(task => task.priority === '低').length || 0,
      completion_rate: count ? Math.round((data?.filter(task => task.completed).length || 0) / count * 100) : 0
    };

    // キャッシュに保存
    this.cache.set(cacheKey, {
      data: stats,
      timestamp: Date.now(),
      ttl: this.CACHE_TTL.TASK_STATS
    });

    console.log('✅ タスク統計取得完了:', stats);

    return stats;
  }

  /**
   * 🔧 キャッシュ管理メソッド
   */
  static clearCache(pattern?: string) {
    if (pattern) {
      // パターンマッチングで特定のキャッシュをクリア
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
      console.log('🧹 キャッシュクリア完了（パターン）:', pattern);
    } else {
      // 全キャッシュクリア
      this.cache.clear();
      console.log('🧹 全キャッシュクリア完了');
    }
  }

  static getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      memory_usage: JSON.stringify(Array.from(this.cache.entries())).length
    };
  }

  /**
   * 🚀 プリフェッチングによる先読み最適化
   */
  static async prefetchUserData(userId: string, teamIds: string[] = []) {
    console.log('🚀 ユーザーデータプリフェッチ開始:', { userId, teamIds });

    const promises = [
      // 個人タスク統計をプリフェッチ
      this.getTaskStatsOptimized({ type: 'personal', team_id: null }, userId),

      // 通知をプリフェッチ
      this.getCachedNotifications(userId),
    ];

    // 各チームのメンバー情報をプリフェッチ
    teamIds.forEach(teamId => {
      promises.push(this.getCachedTeamMembers(teamId));
    });

    try {
      await Promise.all(promises);
      console.log('✅ ユーザーデータプリフェッチ完了');
    } catch (error) {
      console.warn('⚠️ プリフェッチ中にエラー（継続）:', error);
    }
  }
}

export default OptimizedTaskService;
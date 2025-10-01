import { supabase } from './supabase';
import { SharedTask, TaskComment, TaskHistory, Notification, WorkspaceContext, PaginationOptions, PaginatedTasksResult } from './types';

export class SharedTaskService {
  // タスク取得（個人 or チーム）- 旧インターフェース
  static async getTasks(workspace: WorkspaceContext, userId: string): Promise<SharedTask[]>;
  
  // タスク取得（ページング対応）- 新インターフェース
  static async getTasks(workspace: WorkspaceContext, userId: string, options: PaginationOptions): Promise<PaginatedTasksResult>;
  
  // 実装
  static async getTasks(
    workspace: WorkspaceContext, 
    userId: string, 
    options?: PaginationOptions
  ): Promise<SharedTask[] | PaginatedTasksResult> {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const offset = (page - 1) * limit;

    // Count query for pagination
    let countQuery = supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true });

    // Data query
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
        updated_at
      `)
      .order('created_at', { ascending: false });

    // Apply workspace filtering to both queries
    if (workspace.type === 'personal') {
      countQuery = countQuery.eq('user_id', userId).is('team_id', null);
      query = query.eq('user_id', userId).is('team_id', null);
      console.log('🔍 個人タスクフィルター適用:', { userId, workspace });
    } else if (workspace.type === 'team' && workspace.team_id) {
      countQuery = countQuery.eq('team_id', workspace.team_id);
      query = query.eq('team_id', workspace.team_id);
      console.log('🔍 チームタスクフィルター適用:', { team_id: workspace.team_id, workspace });
    } else {
      console.warn('⚠️ 無効なワークスペース設定:', workspace);
      // 無効な場合は空の結果を返す
      return options ? {
        tasks: [],
        hasMore: false,
        totalCount: 0,
        currentPage: page
      } : [];
    }

    // Apply additional filters if provided
    if (options?.status) {
      const completed = options.status === 'completed';
      countQuery = countQuery.eq('completed', completed);
      query = query.eq('completed', completed);
    }

    if (options?.priority) {
      countQuery = countQuery.eq('priority', options.priority);
      query = query.eq('priority', options.priority);
    }

    if (options?.assigned_to) {
      countQuery = countQuery.eq('assigned_to', options.assigned_to);
      query = query.eq('assigned_to', options.assigned_to);
    }

    // Apply pagination only for paginated requests
    if (options) {
      query = query.range(offset, offset + limit - 1);
    }

    // Execute queries
    console.log('🔄 SQLクエリ実行開始...', {
      workspace,
      userId,
      queryFilters: workspace.type === 'personal' ? 
        `user_id=${userId}, team_id=null` : 
        `team_id=${workspace.team_id}`
    });
    
    const [{ count, error: countError }, { data, error }] = await Promise.all([
      countQuery,
      query
    ]);

    console.log('📊 SQLクエリ実行結果:', { 
      dataCount: data?.length || 0, 
      error: error?.message || null, 
      count, 
      countError: countError?.message || null 
    });

    if (error) {
      console.error('🚨 データクエリエラー詳細:', error);
      throw error;
    }
    if (countError) {
      console.error('🚨 カウントクエリエラー詳細:', countError);
      throw countError;
    }

    // Transform tasks
    const tasks = (data || []).map(task => ({
      ...task,
      text: task.text,
      created_by: task.created_by || task.user_id,
      assignee: task.assigned_to ? { 
        id: task.assigned_to, 
        email: `user-${task.assigned_to.slice(0, 8)}@example.com`,
        user_metadata: { full_name: null, avatar_url: null }
      } : null,
      creator: (task.created_by || task.user_id) ? { 
        id: task.created_by || task.user_id, 
        email: `user-${(task.created_by || task.user_id).slice(0, 8)}@example.com`,
        user_metadata: { full_name: null, avatar_url: null }
      } : null
    }));

    // Return based on whether pagination was requested
    if (options) {
      const totalCount = count || 0;
      const hasMore = offset + limit < totalCount;
      const nextCursor = hasMore ? `page-${page + 1}` : undefined;

      return {
        tasks,
        hasMore,
        totalCount,
        nextCursor,
        currentPage: page
      };
    }

    return tasks;
  }

  // タスク作成
  static async createTask(
    task: Omit<SharedTask, 'id' | 'created_at' | 'updated_at'>,
    workspace: WorkspaceContext
  ): Promise<SharedTask> {
    console.log('🆕 SharedTaskService.createTask 開始:', { task, workspace });
    
    // ワークスペース詳細ログ
    console.log('📋 ワークスペース判定詳細:', {
      workspaceType: workspace.type,
      workspaceTeamId: workspace.team_id,
      workspaceTeamName: workspace.team_name,
      isTeam: workspace.type === 'team',
      computedTeamId: workspace.type === 'team' ? workspace.team_id : null
    });
    
    const taskData = {
      // textフィールドのみ設定（titleは存在しない）
      text: task.text,
      completed: task.completed || false,
      priority: task.priority || '中',
      user_id: task.user_id,
      team_id: workspace.type === 'team' ? workspace.team_id : null,
      assigned_to: task.assigned_to || null,
      created_by: task.user_id // created_byを確実に設定
    };

    console.log('🆕 挿入するタスクデータ:', taskData);
    console.log('🔍 team_id設定確認:', {
      rawTeamId: workspace.team_id,
      workspaceType: workspace.type,
      condition: workspace.type === 'team',
      result: taskData.team_id
    });

    const { data, error } = await supabase
      .from('tasks')
      .insert(taskData)
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
        updated_at
      `)
      .single();

    console.log('💾 データベース挿入結果:', { data, error, insertedData: taskData });

    if (error) {
      console.error('❌ SharedTaskService.createTask エラー:', error);
      console.error('❌ エラー詳細:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }
    
    console.log('✅ SharedTaskService.createTask 成功:', data);
    console.log('🔍 返却されたteam_id確認:', {
      insertedTeamId: taskData.team_id,
      returnedTeamId: data.team_id,
      teamIdMatch: taskData.team_id === data.team_id
    });
    
    // 簡易版のユーザー情報を追加
    const result = {
      ...data,
      // textフィールドをそのまま使用（titleは存在しない）
      text: data.text,
      created_by: data.created_by || data.user_id,
      assignee: data.assigned_to ? { 
        id: data.assigned_to, 
        email: `user-${data.assigned_to.slice(0, 8)}@example.com`,
        user_metadata: { full_name: null, avatar_url: null }
      } : null,
      creator: (data.created_by || data.user_id) ? { 
        id: data.created_by || data.user_id, 
        email: `user-${(data.created_by || data.user_id).slice(0, 8)}@example.com`,
        user_metadata: { full_name: null, avatar_url: null }
      } : null
    };
    
    console.log('✅ 作成されたタスク（変換後）:', result);
    return result;
  }

  // タスク更新
  static async updateTask(
    taskId: string,
    updates: Partial<SharedTask>
  ): Promise<SharedTask> {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select('id, text, completed, priority, user_id, team_id, assigned_to, created_by, created_at, updated_at')
      .single();

    if (error) throw error;
    
    // 簡易版のユーザー情報を追加
    return {
      ...data,
      assignee: data.assigned_to ? { 
        id: data.assigned_to, 
        email: `user-${data.assigned_to.slice(0, 8)}@example.com`,
        user_metadata: { full_name: null, avatar_url: null }
      } : null,
      creator: data.created_by ? { 
        id: data.created_by, 
        email: `user-${data.created_by.slice(0, 8)}@example.com`,
        user_metadata: { full_name: null, avatar_url: null }
      } : null
    };
  }

  // タスク削除
  static async deleteTask(taskId: string): Promise<void> {
    console.log('🗑️ SharedTaskService.deleteTask 開始:', { taskId });
    
    // 現在のユーザー情報を取得
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ 認証エラー:', authError);
      throw new Error('認証が必要です');
    }

    // タスクの所有者確認
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select(`
        id, 
        text, 
        user_id, 
        team_id, 
        created_by, 
        assigned_to
      `)
      .eq('id', taskId)
      .single();

    if (fetchError) {
      console.error('❌ タスク取得エラー:', fetchError);
      throw fetchError;
    }

    if (!task) {
      throw new Error('タスクが見つかりません');
    }

    // 削除権限チェック (created_byが未設定の場合はuser_idで代替)
    const effectiveCreatedBy = task.created_by || task.user_id;
    const canDelete = task.user_id === user.id || effectiveCreatedBy === user.id;
    console.log('🔐 削除権限チェック:', {
      taskId,
      taskText: task.text,
      taskUserId: task.user_id,
      taskCreatedBy: task.created_by,
      effectiveCreatedBy,
      currentUserId: user.id,
      canDelete
    });

    if (!canDelete) {
      throw new Error('このタスクを削除する権限がありません');
    }

    // シンプルな削除アプローチ（CASCADE設定を前提）
    console.log('🗑️ タスク削除開始（シンプル削除）');
    
    try {
      // まずタスクの存在確認
      const { data: existingTask } = await supabase
        .from('tasks')
        .select('id, text')
        .eq('id', taskId)
        .single();
      
      if (!existingTask) {
        console.log('⚠️ タスクが既に削除済みまたは存在しません:', taskId);
        return; // エラーではなく正常終了
      }
      
      console.log('🎯 削除対象タスク確認完了:', { taskId, taskText: existingTask.text });
      
      // Supabaseのトランザクション内で削除（関連データは自動削除されるはず）
      console.log('🗑️ メインタスク削除実行:', { taskId });
      const { data, error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .select();

      console.log('🗑️ SharedTaskService.deleteTask 結果:', { data, error, taskId });

      if (error) {
        console.error('❌ SharedTaskService.deleteTask エラー:', error);
        
        // エラーコード23503は外部キー制約違反
        if (error.code === '23503') {
          console.log('🔧 外部キー制約エラーを検出。関連データを先に削除します。');
          
          // 関連データを先に削除してリトライ
          await this.deleteRelatedDataFirst(taskId);
          
          // 再度メインタスクを削除
          const { data: retryData, error: retryError } = await supabase
            .from('tasks')
            .delete()
            .eq('id', taskId)
            .select();
            
          if (retryError) {
            console.error('❌ リトライ後もタスク削除失敗:', retryError);
            throw retryError;
          }
          
          console.log('✅ リトライでタスク削除成功:', { deletedData: retryData, taskId });
          return;
        }
        
        throw error;
      }
      
      console.log('✅ SharedTaskService.deleteTask 成功:', { deletedData: data, taskId });
      
    } catch (deleteError) {
      console.error('❌ タスク削除処理でエラー:', deleteError);
      throw deleteError;
    }
  }

  // 関連データの手動削除メソッド
  private static async deleteRelatedDataFirst(taskId: string): Promise<void> {
    console.log('🧹 関連データの手動削除開始:', { taskId });
    
    try {
      // 1. コメント削除
      const { error: commentsError } = await supabase
        .from('task_comments')
        .delete()
        .eq('task_id', taskId);
      
      if (commentsError && commentsError.code !== 'PGRST116') {
        console.warn('⚠️ コメント削除警告:', commentsError);
      }
      
      // 2. 履歴削除  
      const { error: historyError } = await supabase
        .from('task_history')
        .delete()
        .eq('task_id', taskId);
      
      if (historyError && historyError.code !== 'PGRST116') {
        console.warn('⚠️ 履歴削除警告:', historyError);
      }
      
      // 3. 通知削除
      const { error: notificationsError } = await supabase
        .from('notifications')
        .delete()
        .filter('data', 'cs', `{"task_id":"${taskId}"}`);
      
      if (notificationsError && notificationsError.code !== 'PGRST116') {
        console.warn('⚠️ 通知削除警告:', notificationsError);
      }
      
      console.log('✅ 関連データの手動削除完了');
      
    } catch (error) {
      console.warn('⚠️ 関連データ削除で警告（継続）:', error);
    }
  }

  // タスク担当者設定
  static async assignTask(taskId: string, assigneeId: string | null): Promise<SharedTask> {
    return this.updateTask(taskId, { assigned_to: assigneeId });
  }

  // チームメンバー取得
  static async getTeamMembers(teamId: string) {
    const { data: members, error } = await supabase
      .from('team_members')
      .select('user_id, role')
      .eq('team_id', teamId);

    if (error) throw error;
    if (!members) return [];

    // プロフィール情報を一括取得（N+1クエリ問題修正）
    const memberUserIds = members.map(member => member.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', memberUserIds);

    // プロフィール情報をマップ化
    const profilesMap = new Map();
    if (profiles) {
      profiles.forEach(profile => {
        profilesMap.set(profile.id, profile);
      });
    }

    // メンバー情報にプロフィールを結合
    const memberWithProfiles = members.map((member) => {
      const profile = profilesMap.get(member.user_id);
      
      return {
        user_id: member.user_id,
        role: member.role,
        user: {
          id: member.user_id,
          email: `user-${member.user_id.slice(0, 8)}@example.com`, // プレースホルダー
          user_metadata: {
            full_name: profile?.display_name || null,
            avatar_url: profile?.avatar_url || null
          }
        }
      };
    });

    return memberWithProfiles;
  }

  // タスクコメント取得
  static async getTaskComments(taskId: string): Promise<TaskComment[]> {
    const { data, error } = await supabase
      .from('task_comments')
      .select('id, task_id, user_id, content, mentions, created_at, updated_at')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    // 簡易版のユーザー情報を追加
    const comments = (data || []).map(comment => ({
      ...comment,
      user: {
        id: comment.user_id,
        email: `user-${comment.user_id.slice(0, 8)}@example.com`,
        user_metadata: { full_name: null, avatar_url: null }
      }
    }));
    
    return comments;
  }

  // コメント作成
  static async createComment(
    taskId: string,
    userId: string,
    content: string,
    mentions: string[] = []
  ): Promise<TaskComment> {
    const { data, error } = await supabase
      .from('task_comments')
      .insert({
        task_id: taskId,
        user_id: userId,
        content,
        mentions
      })
      .select('id, task_id, user_id, content, mentions, created_at, updated_at')
      .single();

    if (error) throw error;
    
    return {
      ...data,
      user: {
        id: data.user_id,
        email: `user-${data.user_id.slice(0, 8)}@example.com`,
        user_metadata: { full_name: null, avatar_url: null }
      }
    };
  }

  // コメント更新
  static async updateComment(
    commentId: string,
    content: string,
    mentions: string[] = []
  ): Promise<TaskComment> {
    const { data, error } = await supabase
      .from('task_comments')
      .update({ content, mentions, updated_at: new Date().toISOString() })
      .eq('id', commentId)
      .select('id, task_id, user_id, content, mentions, created_at, updated_at')
      .single();

    if (error) throw error;
    
    return {
      ...data,
      user: {
        id: data.user_id,
        email: `user-${data.user_id.slice(0, 8)}@example.com`,
        user_metadata: { full_name: null, avatar_url: null }
      }
    };
  }

  // コメント削除
  static async deleteComment(commentId: string): Promise<void> {
    const { error } = await supabase
      .from('task_comments')
      .delete()
      .eq('id', commentId);

    if (error) throw error;
  }

  // タスク履歴取得
  static async getTaskHistory(taskId: string): Promise<TaskHistory[]> {
    const { data, error } = await supabase
      .from('task_history')
      .select('id, task_id, user_id, action, changes, created_at')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // 簡易版のユーザー情報を追加
    const history = (data || []).map(item => ({
      ...item,
      user: {
        id: item.user_id,
        email: `user-${item.user_id.slice(0, 8)}@example.com`,
        user_metadata: { full_name: null, avatar_url: null }
      }
    }));
    
    return history;
  }

  // 通知取得
  static async getNotifications(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  }

  // 通知を既読にする
  static async markNotificationAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) throw error;
  }

  // 全通知を既読にする
  static async markAllNotificationsAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null);

    if (error) throw error;
  }

  // リアルタイムサブスクリプション（タスク）
  static subscribeToTasks(workspace: WorkspaceContext, callback: (payload: unknown) => void) {
    const channelName = `tasks-${workspace.type}-${workspace.team_id || 'personal'}`;
    
    const channel = supabase.channel(channelName);
    
    if (workspace.type === 'team' && workspace.team_id) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `team_id=eq.${workspace.team_id}`
        },
        callback
      );
    } else {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: 'team_id=is.null'
        },
        callback
      );
    }

    channel.subscribe();
    return channel;
  }

  // リアルタイムサブスクリプション（コメント）
  static subscribeToComments(taskId: string, callback: (payload: unknown) => void) {
    const channel = supabase
      .channel(`comments-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_comments',
          filter: `task_id=eq.${taskId}`
        },
        callback
      );
    
    channel.subscribe();
    return channel;
  }

  // リアルタイムサブスクリプション（通知）
  static subscribeToNotifications(userId: string, callback: (payload: unknown) => void) {
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        callback
      );
    
    channel.subscribe();
    return channel;
  }

  // @メンションの解析
  static parseMentions(content: string, teamMembers: Array<{ user_id: string; user?: { email?: string; user_metadata?: { full_name?: string } } }>): string[] {
    const mentionPattern = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionPattern.exec(content)) !== null) {
      const mentionedName = match[1].toLowerCase();
      const member = teamMembers.find(m => 
        m.user?.email?.toLowerCase().includes(mentionedName) ||
        m.user?.user_metadata?.full_name?.toLowerCase().includes(mentionedName)
      );
      
      if (member && !mentions.includes(member.user_id)) {
        mentions.push(member.user_id);
      }
    }

    return mentions;
  }

  // ワークスペース切り替えのためのユーザーチーム取得
  static async getUserWorkspaces(userId: string) {
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        team_id, role,
        team:team_id(id, name, description, avatar_url)
      `)
      .eq('user_id', userId);

    if (error) throw error;
    
    return {
      personal: { type: 'personal' as const, team_id: null, team_name: '個人タスク' },
      teams: (data || []).map(item => ({
        type: 'team' as const,
        team_id: item.team_id,
        team_name: (item.team as { name?: string })?.name || '',
        role: item.role
      }))
    };
  }
}
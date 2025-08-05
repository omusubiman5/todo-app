import { supabase } from './supabase';
import { SharedTask, TaskComment, TaskHistory, Notification, WorkspaceContext } from './types';

export class SharedTaskService {
  // タスク取得（個人 or チーム）
  static async getTasks(workspace: WorkspaceContext, userId: string): Promise<SharedTask[]> {
    let query = supabase
      .from('tasks')
      .select('id, text, completed, priority, user_id, team_id, assigned_to, created_by, created_at, updated_at')
      .order('created_at', { ascending: true });

    if (workspace.type === 'personal') {
      query = query.eq('user_id', userId).is('team_id', null);
    } else if (workspace.type === 'team' && workspace.team_id) {
      query = query.eq('team_id', workspace.team_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    // 担当者・作成者情報を後から取得（簡易版）
    const tasks = (data || []).map(task => ({
      ...task,
      assignee: task.assigned_to ? { 
        id: task.assigned_to, 
        email: `user-${task.assigned_to.slice(0, 8)}@example.com`,
        user_metadata: { full_name: null, avatar_url: null }
      } : null,
      creator: task.created_by ? { 
        id: task.created_by, 
        email: `user-${task.created_by.slice(0, 8)}@example.com`,
        user_metadata: { full_name: null, avatar_url: null }
      } : null
    }));

    return tasks;
  }

  // タスク作成
  static async createTask(
    task: Omit<SharedTask, 'id' | 'created_at' | 'updated_at'>,
    workspace: WorkspaceContext
  ): Promise<SharedTask> {
    const taskData = {
      ...task,
      team_id: workspace.type === 'team' ? workspace.team_id : null,
      created_by: task.user_id
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert(taskData)
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
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;
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

    // プロフィール情報を別途取得
    const memberWithProfiles = await Promise.all(
      members.map(async (member) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .eq('id', member.user_id)
          .single();

        // auth.usersからメール取得（簡易版）
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
      })
    );

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
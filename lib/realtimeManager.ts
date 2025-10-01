import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface RealtimeEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  record: any;
  oldRecord?: any;
}

export interface WorkspaceContext {
  type: 'personal' | 'team';
  team_id: string | null;
  team_name?: string | null;
}

export class RealtimeManager {
  private static instance: RealtimeManager;
  private subscriptions = new Map<string, RealtimeChannel>();
  private eventCallbacks = new Map<string, (event: RealtimeEvent) => void>();
  private throttleTimers = new Map<string, NodeJS.Timeout>();

  static getInstance(): RealtimeManager {
    if (!RealtimeManager.instance) {
      RealtimeManager.instance = new RealtimeManager();
    }
    return RealtimeManager.instance;
  }

  private constructor() {}

  /**
   * タスクの購読を開始 (SharedTaskBoard互換)
   */
  subscribeToTasks(
    workspace: WorkspaceContext,
    userId: string,
    callback: (event: RealtimeEvent) => void
  ): string {
    const channelId = workspace.type === 'team' && workspace.team_id 
      ? `team-tasks-${workspace.team_id}` 
      : `personal-tasks-${userId}`;
    
    // 既存の購読があれば削除
    this.unsubscribe(channelId);

    try {
      const filter = workspace.type === 'team' && workspace.team_id
        ? `team_id=eq.${workspace.team_id}`
        : `user_id=eq.${userId}`;
      
      const channel = supabase
        .channel(channelId)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
            filter: filter
          },
          (payload) => {
            this.handleRealtimeEvent(channelId, payload, callback);
          }
        )
        .subscribe();

      this.subscriptions.set(channelId, channel);
      this.eventCallbacks.set(channelId, callback);
      
      return channelId; // subscriptionIdを返す
    } catch (error) {
      console.error('Failed to subscribe to tasks:', error);
      return channelId; // エラーでもIDは返す
    }
  }

  /**
   * 購読の解除 (SharedTaskBoard互換)
   */
  unsubscribe(subscriptionId: string): void {
    const channel = this.subscriptions.get(subscriptionId);
    if (channel) {
      channel.unsubscribe();
      this.subscriptions.delete(subscriptionId);
    }

    this.eventCallbacks.delete(subscriptionId);
    
    // スロットリングタイマーがあればクリア
    const timer = this.throttleTimers.get(subscriptionId);
    if (timer) {
      clearTimeout(timer);
      this.throttleTimers.delete(subscriptionId);
    }
  }

  /**
   * タスクの購読を解除 (旧API互換)
   */
  unsubscribeFromTasks(userId: string, teamId: string | null): void {
    const channelId = teamId ? `team-tasks-${teamId}` : `personal-tasks-${userId}`;
    this.unsubscribe(channelId);
  }

  /**
   * 購読の更新（古い購読を解除して新しい購読を開始）
   */
  updateSubscription(
    userId: string,
    teamId: string | null,
    callback: (event: RealtimeEvent) => void
  ): void {
    // 既存の全ての購読を解除
    for (const [channelId] of this.subscriptions) {
      if (channelId.includes(userId)) {
        const channel = this.subscriptions.get(channelId);
        if (channel) {
          channel.unsubscribe();
          this.subscriptions.delete(channelId);
        }
        this.eventCallbacks.delete(channelId);
      }
    }

    // 新しい購読を開始
    this.subscribeToTasks(userId, teamId, callback);
  }

  /**
   * リアルタイムイベントの処理（スロットリング付き）
   */
  private handleRealtimeEvent(
    channelId: string,
    payload: any,
    callback: (event: RealtimeEvent) => void
  ): void {
    try {
      const event: RealtimeEvent = {
        type: payload.eventType,
        record: payload.eventType === 'DELETE' ? payload.old : payload.new,
        ...(payload.eventType === 'UPDATE' && { oldRecord: payload.old })
      };

      // スロットリング処理（200ms）
      const existingTimer = this.throttleTimers.get(channelId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timer = setTimeout(() => {
        callback(event);
        this.throttleTimers.delete(channelId);
      }, 200);

      this.throttleTimers.set(channelId, timer);
    } catch (error) {
      console.error('Error handling realtime event:', error);
    }
  }

  /**
   * 接続状態を取得
   */
  isConnected(): boolean {
    // Supabaseのリアルタイム接続状態を確認
    // 簡易実装として、購読があるかどうかで判定
    return this.subscriptions.size > 0;
  }

  /**
   * アクティブな購読数を取得
   */
  getActiveSubscriptions(): number {
    return this.subscriptions.size;
  }

  /**
   * 全ての購読をクリーンアップ
   */
  cleanup(): void {
    for (const [channelId, channel] of this.subscriptions) {
      channel.unsubscribe();
    }
    this.subscriptions.clear();
    this.eventCallbacks.clear();

    // 全てのスロットリングタイマーをクリア
    for (const timer of this.throttleTimers.values()) {
      clearTimeout(timer);
    }
    this.throttleTimers.clear();
  }
}

// シングルトンインスタンスをエクスポート
export const realtimeManager = RealtimeManager.getInstance();
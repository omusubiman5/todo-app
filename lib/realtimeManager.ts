import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { WorkspaceContext } from './types';
import { logger } from './logger';

interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: Record<string, unknown>;
  old?: Record<string, unknown>;
  table: string;
  schema: string;
}

interface SubscriptionConfig {
  id: string;
  table: string;
  filter?: string;
  callback: (payload: RealtimePayload | { type: 'batch'; updates: RealtimePayload[] }) => void;
  reconnectAttempts?: number;
  maxReconnectAttempts?: number;
}

export class RealtimeManager {
  private static instance: RealtimeManager;
  private subscriptions = new Map<string, RealtimeChannel>();
  private reconnectTimers = new Map<string, NodeJS.Timeout>();
  private isConnected = true;

  static getInstance(): RealtimeManager {
    if (!RealtimeManager.instance) {
      RealtimeManager.instance = new RealtimeManager();
    }
    return RealtimeManager.instance;
  }

  private constructor() {
    this.setupConnectionMonitoring();
  }

  /**
   * 接続状態の監視
   */
  private setupConnectionMonitoring() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isConnected = true;
        logger.info('Network connection restored, reconnecting subscriptions');
        this.reconnectAllSubscriptions();
      });

      window.addEventListener('offline', () => {
        this.isConnected = false;
        logger.warn('Network connection lost');
      });
    }
  }

  /**
   * タスクの購読
   */
  subscribeToTasks(
    workspace: WorkspaceContext,
    callback: (payload: RealtimePayload | { type: 'batch'; updates: RealtimePayload[] }) => void,
    options: { enableBatching?: boolean; batchDelay?: number } = {}
  ): string {
    const { enableBatching = true, batchDelay = 100 } = options;
    
    const subscriptionId = `tasks_${workspace.type}_${workspace.team_id || 'personal'}`;
    
    // 既存の購読がある場合は削除
    this.unsubscribe(subscriptionId);

    const filter = workspace.type === 'team' && workspace.team_id
      ? `team_id=eq.${workspace.team_id}`
      : `team_id=is.null`;

    let batchedUpdates: RealtimePayload[] = [];
    let batchTimer: NodeJS.Timeout | null = null;

    const processCallback = enableBatching 
      ? (payload: RealtimePayload) => {
          batchedUpdates.push(payload);
          
          if (batchTimer) clearTimeout(batchTimer);
          
          batchTimer = setTimeout(() => {
            if (batchedUpdates.length > 0) {
              callback({ type: 'batch', updates: [...batchedUpdates] });
              batchedUpdates = [];
            }
          }, batchDelay);
        }
      : callback;

    const config: SubscriptionConfig = {
      id: subscriptionId,
      table: 'tasks',
      filter,
      callback: processCallback,
      reconnectAttempts: 0,
      maxReconnectAttempts: 5
    };

    this.createSubscription(config);
    return subscriptionId;
  }

  /**
   * 通知の購読
   */
  subscribeToNotifications(
    userId: string,
    callback: (payload: RealtimePayload) => void
  ): string {
    const subscriptionId = `notifications_${userId}`;
    
    this.unsubscribe(subscriptionId);

    const config: SubscriptionConfig = {
      id: subscriptionId,
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
      callback,
      reconnectAttempts: 0,
      maxReconnectAttempts: 3
    };

    this.createSubscription(config);
    return subscriptionId;
  }

  /**
   * チーム情報の購読
   */
  subscribeToTeam(
    teamId: string,
    callback: (payload: RealtimePayload) => void
  ): string {
    const subscriptionId = `team_${teamId}`;
    
    this.unsubscribe(subscriptionId);

    const config: SubscriptionConfig = {
      id: subscriptionId,
      table: 'teams',
      filter: `id=eq.${teamId}`,
      callback,
      reconnectAttempts: 0,
      maxReconnectAttempts: 3
    };

    this.createSubscription(config);
    return subscriptionId;
  }

  /**
   * 購読の作成
   */
  private createSubscription(config: SubscriptionConfig) {
    try {
      const channel = supabase
        .channel(`realtime:${config.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: config.table,
            filter: config.filter
          },
          (payload) => {
            logger.debug('Realtime event received', {
              subscriptionId: config.id,
              eventType: payload.eventType,
              table: payload.table
            });
            
            config.callback(payload);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            logger.info(`Successfully subscribed to ${config.id}`);
            // 再接続試行回数をリセット
            config.reconnectAttempts = 0;
          } else if (status === 'CHANNEL_ERROR') {
            logger.error(`Subscription error for ${config.id}`);
            this.handleSubscriptionError(config);
          } else if (status === 'TIMED_OUT') {
            logger.warn(`Subscription timeout for ${config.id}`);
            this.handleSubscriptionError(config);
          }
        });

      this.subscriptions.set(config.id, channel);
      
      // 接続状態の監視
      this.monitorSubscription(config.id, channel);

    } catch (error) {
      logger.error(`Failed to create subscription ${config.id}`, error as Error);
      this.handleSubscriptionError(config);
    }
  }

  /**
   * 購読エラーの処理
   */
  private handleSubscriptionError(config: SubscriptionConfig) {
    if (!config.maxReconnectAttempts || !this.isConnected) return;

    config.reconnectAttempts = (config.reconnectAttempts || 0) + 1;

    if (config.reconnectAttempts <= config.maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, config.reconnectAttempts - 1), 30000);
      
      logger.info(`Attempting to reconnect ${config.id} (${config.reconnectAttempts}/${config.maxReconnectAttempts}) in ${delay}ms`);

      const timer = setTimeout(() => {
        this.createSubscription(config);
        this.reconnectTimers.delete(config.id);
      }, delay);

      this.reconnectTimers.set(config.id, timer);
    } else {
      logger.error(`Max reconnection attempts reached for ${config.id}`);
    }
  }

  /**
   * 購読の監視
   */
  private monitorSubscription(subscriptionId: string, channel: RealtimeChannel) {
    // ヘルスチェック（30秒間隔）
    const healthCheck = setInterval(() => {
      if (!this.isConnected) return;

      // チャンネルの状態確認
      const currentChannel = this.subscriptions.get(subscriptionId);
      if (currentChannel !== channel) {
        clearInterval(healthCheck);
        return;
      }

      // 必要に応じてping的な処理を実装
      // supabaseのリアルタイム接続は自動でヘルスチェックされるため、
      // ここでは基本的な状態確認のみ
      
    }, 30000);

    // クリーンアップ処理
    const originalUnsubscribe = channel.unsubscribe.bind(channel);
    channel.unsubscribe = () => {
      clearInterval(healthCheck);
      return originalUnsubscribe();
    };
  }

  /**
   * 特定の購読を削除
   */
  unsubscribe(subscriptionId: string): void {
    const channel = this.subscriptions.get(subscriptionId);
    if (channel) {
      channel.unsubscribe();
      this.subscriptions.delete(subscriptionId);
    }

    const timer = this.reconnectTimers.get(subscriptionId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(subscriptionId);
    }

    logger.debug(`Unsubscribed from ${subscriptionId}`);
  }

  /**
   * 全ての購読を削除
   */
  unsubscribeAll(): void {
    for (const [subscriptionId] of this.subscriptions) {
      this.unsubscribe(subscriptionId);
    }
    logger.info('All subscriptions unsubscribed');
  }

  /**
   * 全ての購読を再接続
   */
  private reconnectAllSubscriptions(): void {
    logger.info(`Reconnecting ${this.subscriptions.size} subscriptions`);
    
    // Note: 実際の再接続ロジックは、元の購読設定を保持する必要がある
    // この実装では基本的な構造のみ示している
    for (const [subscriptionId, channel] of this.subscriptions) {
      try {
        // チャンネルの再購読
        channel.subscribe();
      } catch (error) {
        logger.error(`Failed to reconnect subscription ${subscriptionId}`, error as Error);
      }
    }
  }

  /**
   * 購読数の取得
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  /**
   * 接続状態の取得
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * デバッグ情報の取得
   */
  getDebugInfo(): Record<string, unknown> {
    return {
      subscriptionCount: this.subscriptions.size,
      isConnected: this.isConnected,
      subscriptionIds: Array.from(this.subscriptions.keys()),
      activeReconnectTimers: this.reconnectTimers.size
    };
  }
}

// シングルトンインスタンスをエクスポート
export const realtimeManager = RealtimeManager.getInstance();
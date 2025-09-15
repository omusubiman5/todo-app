"use client";

import { supabase } from './supabase';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { WorkspaceContext } from './types';

// 🚀 Phase 3: リアルタイム接続統合管理システム

interface ConnectionConfig {
  channel: string;
  table: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
}

interface SubscriptionCallback {
  id: string;
  callback: (payload: RealtimePostgresChangesPayload<any>) => void;
  workspace: WorkspaceContext;
  userId: string;
}

interface ConnectionPoolItem {
  channel: RealtimeChannel;
  subscribers: Map<string, SubscriptionCallback>;
  lastActivity: number;
  debounceTimer?: NodeJS.Timeout;
}

export class RealtimeConnectionManager {
  private static instance: RealtimeConnectionManager;
  private connectionPool: Map<string, ConnectionPoolItem> = new Map();
  private readonly DEBOUNCE_DELAY = 150; // 150ms debounce
  private readonly CONNECTION_TIMEOUT = 300000; // 5分でタイムアウト
  private readonly MAX_CONNECTIONS = 10; // 最大接続数制限
  
  private constructor() {
    // ガベージコレクション（5分ごと）
    setInterval(() => {
      this.cleanupInactiveConnections();
    }, 300000);
  }

  public static getInstance(): RealtimeConnectionManager {
    if (!RealtimeConnectionManager.instance) {
      RealtimeConnectionManager.instance = new RealtimeConnectionManager();
    }
    return RealtimeConnectionManager.instance;
  }

  /**
   * タスク変更のリアルタイム監視を開始
   */
  public subscribeToTasks(
    workspace: WorkspaceContext,
    userId: string,
    callback: (payload: RealtimePostgresChangesPayload<any>) => void
  ): string {
    const channelKey = this.getTaskChannelKey(workspace);
    const subscriptionId = `${channelKey}_${userId}_${Date.now()}`;
    
    const subscription: SubscriptionCallback = {
      id: subscriptionId,
      callback: this.createDebouncedCallback(callback),
      workspace,
      userId
    };

    this.addSubscription(channelKey, subscription, {
      channel: channelKey,
      table: 'tasks',
      filter: this.getTaskFilter(workspace, userId),
      event: '*'
    });

    return subscriptionId;
  }

  /**
   * チーム変更のリアルタイム監視を開始
   */
  public subscribeToTeams(
    userId: string,
    callback: (payload: RealtimePostgresChangesPayload<any>) => void
  ): string {
    const channelKey = `teams_${userId}`;
    const subscriptionId = `${channelKey}_${Date.now()}`;
    
    const subscription: SubscriptionCallback = {
      id: subscriptionId,
      callback: this.createDebouncedCallback(callback),
      workspace: { type: 'personal' },
      userId
    };

    this.addSubscription(channelKey, subscription, {
      channel: channelKey,
      table: 'team_members',
      filter: `user_id=eq.${userId}`,
      event: '*'
    });

    return subscriptionId;
  }

  /**
   * 通知変更のリアルタイム監視を開始
   */
  public subscribeToNotifications(
    userId: string,
    callback: (payload: RealtimePostgresChangesPayload<any>) => void
  ): string {
    const channelKey = `notifications_${userId}`;
    const subscriptionId = `${channelKey}_${Date.now()}`;
    
    const subscription: SubscriptionCallback = {
      id: subscriptionId,
      callback: this.createDebouncedCallback(callback),
      workspace: { type: 'personal' },
      userId
    };

    this.addSubscription(channelKey, subscription, {
      channel: channelKey,
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
      event: '*'
    });

    return subscriptionId;
  }

  /**
   * 購読解除
   */
  public unsubscribe(subscriptionId: string): void {
    for (const [channelKey, poolItem] of this.connectionPool) {
      if (poolItem.subscribers.has(subscriptionId)) {
        poolItem.subscribers.delete(subscriptionId);
        
        // 購読者がいなくなった場合は接続を閉じる
        if (poolItem.subscribers.size === 0) {
          if (poolItem.debounceTimer) {
            clearTimeout(poolItem.debounceTimer);
          }
          poolItem.channel.unsubscribe();
          this.connectionPool.delete(channelKey);
          console.log(`🔌 Closed unused connection: ${channelKey}`);
        }
        return;
      }
    }
  }

  /**
   * 全ての接続をクリーンアップ
   */
  public cleanup(): void {
    for (const [channelKey, poolItem] of this.connectionPool) {
      if (poolItem.debounceTimer) {
        clearTimeout(poolItem.debounceTimer);
      }
      poolItem.channel.unsubscribe();
    }
    this.connectionPool.clear();
    console.log('🧹 All realtime connections cleaned up');
  }

  /**
   * 接続状態の監視情報を取得
   */
  public getConnectionStats(): {
    activeConnections: number;
    totalSubscribers: number;
    connections: Array<{
      channel: string;
      subscribers: number;
      lastActivity: string;
    }>;
  } {
    let totalSubscribers = 0;
    const connections = Array.from(this.connectionPool.entries()).map(([key, poolItem]) => {
      totalSubscribers += poolItem.subscribers.size;
      return {
        channel: key,
        subscribers: poolItem.subscribers.size,
        lastActivity: new Date(poolItem.lastActivity).toISOString()
      };
    });

    return {
      activeConnections: this.connectionPool.size,
      totalSubscribers,
      connections
    };
  }

  // Private Methods

  private addSubscription(
    channelKey: string,
    subscription: SubscriptionCallback,
    config: ConnectionConfig
  ): void {
    let poolItem = this.connectionPool.get(channelKey);

    if (!poolItem) {
      // 新しい接続を作成
      if (this.connectionPool.size >= this.MAX_CONNECTIONS) {
        console.warn('⚠️ Maximum connection limit reached, cleaning up oldest connections');
        this.cleanupOldestConnections();
      }

      const channel = supabase
        .channel(config.channel)
        .on(
          'postgres_changes',
          {
            event: config.event || '*',
            schema: 'public',
            table: config.table,
            filter: config.filter
          },
          (payload) => this.handleRealtimeEvent(channelKey, payload)
        )
        .subscribe();

      poolItem = {
        channel,
        subscribers: new Map(),
        lastActivity: Date.now()
      };

      this.connectionPool.set(channelKey, poolItem);
      console.log(`🔌 Created new connection: ${channelKey}`);
    }

    poolItem.subscribers.set(subscription.id, subscription);
    poolItem.lastActivity = Date.now();
  }

  private handleRealtimeEvent(
    channelKey: string,
    payload: RealtimePostgresChangesPayload<any>
  ): void {
    const poolItem = this.connectionPool.get(channelKey);
    if (!poolItem) return;

    poolItem.lastActivity = Date.now();

    // デバウンス処理
    if (poolItem.debounceTimer) {
      clearTimeout(poolItem.debounceTimer);
    }

    poolItem.debounceTimer = setTimeout(() => {
      // 各購読者にイベントを配信
      for (const subscription of poolItem.subscribers.values()) {
        try {
          subscription.callback(payload);
        } catch (error) {
          console.error('Error in subscription callback:', error);
        }
      }
    }, this.DEBOUNCE_DELAY);
  }

  private createDebouncedCallback(
    originalCallback: (payload: RealtimePostgresChangesPayload<any>) => void
  ): (payload: RealtimePostgresChangesPayload<any>) => void {
    let debounceTimer: NodeJS.Timeout;
    
    return (payload: RealtimePostgresChangesPayload<any>) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        originalCallback(payload);
      }, this.DEBOUNCE_DELAY);
    };
  }

  private getTaskChannelKey(workspace: WorkspaceContext): string {
    return workspace.type === 'team' 
      ? `tasks_team_${workspace.team_id}`
      : 'tasks_personal';
  }

  private getTaskFilter(workspace: WorkspaceContext, userId: string): string {
    return workspace.type === 'team' 
      ? `team_id=eq.${workspace.team_id}`
      : `user_id=eq.${userId}`;
  }

  private cleanupInactiveConnections(): void {
    const now = Date.now();
    const connectionsToRemove: string[] = [];

    for (const [channelKey, poolItem] of this.connectionPool) {
      if (now - poolItem.lastActivity > this.CONNECTION_TIMEOUT) {
        connectionsToRemove.push(channelKey);
      }
    }

    connectionsToRemove.forEach(channelKey => {
      const poolItem = this.connectionPool.get(channelKey);
      if (poolItem) {
        if (poolItem.debounceTimer) {
          clearTimeout(poolItem.debounceTimer);
        }
        poolItem.channel.unsubscribe();
        this.connectionPool.delete(channelKey);
        console.log(`🧹 Cleaned up inactive connection: ${channelKey}`);
      }
    });
  }

  private cleanupOldestConnections(): void {
    const connections = Array.from(this.connectionPool.entries())
      .sort((a, b) => a[1].lastActivity - b[1].lastActivity)
      .slice(0, 2); // 最古の2つを削除

    connections.forEach(([channelKey, poolItem]) => {
      if (poolItem.debounceTimer) {
        clearTimeout(poolItem.debounceTimer);
      }
      poolItem.channel.unsubscribe();
      this.connectionPool.delete(channelKey);
      console.log(`🧹 Cleaned up old connection: ${channelKey}`);
    });
  }
}

// シングルトンインスタンスをエクスポート
export const realtimeManager = RealtimeConnectionManager.getInstance();
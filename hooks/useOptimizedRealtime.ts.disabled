import { useEffect, useRef, useCallback } from 'react';
import { realtimeManager } from '@/lib/realtimeManager';
import { WorkspaceContext } from '@/lib/types';
import { logger } from '@/lib/logger';

interface UseOptimizedRealtimeOptions {
  enabled?: boolean;
  enableBatching?: boolean;
  batchDelay?: number;
  throttleMs?: number;
}

/**
 * 最適化されたリアルタイムフック
 */
export function useOptimizedRealtime(
  workspace: WorkspaceContext,
  onTaskUpdate: (payload: any) => void,
  options: UseOptimizedRealtimeOptions = {}
) {
  const {
    enabled = true,
    enableBatching = true,
    batchDelay = 100,
    throttleMs = 50
  } = options;

  const subscriptionRef = useRef<string | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const pendingUpdatesRef = useRef<any[]>([]);
  const processTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // スロットル処理付きのコールバック
  const throttledCallback = useCallback((payload: any) => {
    const now = Date.now();
    
    if (now - lastUpdateRef.current < throttleMs) {
      // スロットル中の場合はペンディングに追加
      pendingUpdatesRef.current.push(payload);
      
      if (processTimeoutRef.current) {
        clearTimeout(processTimeoutRef.current);
      }
      
      processTimeoutRef.current = setTimeout(() => {
        if (pendingUpdatesRef.current.length > 0) {
          const updates = [...pendingUpdatesRef.current];
          pendingUpdatesRef.current = [];
          
          // バッチとして処理
          onTaskUpdate({
            type: 'throttled_batch',
            updates
          });
        }
        processTimeoutRef.current = null;
      }, throttleMs);
      
      return;
    }

    lastUpdateRef.current = now;
    onTaskUpdate(payload);
  }, [onTaskUpdate, throttleMs]);

  // 購読の開始
  useEffect(() => {
    if (!enabled) return;

    logger.debug('Setting up optimized realtime subscription', {
      workspace: workspace.type,
      teamId: workspace.team_id
    });

    try {
      const subscriptionId = realtimeManager.subscribeToTasks(
        workspace,
        throttledCallback,
        {
          enableBatching,
          batchDelay
        }
      );

      subscriptionRef.current = subscriptionId;

      return () => {
        if (subscriptionRef.current) {
          realtimeManager.unsubscribe(subscriptionRef.current);
          subscriptionRef.current = null;
        }
        
        if (processTimeoutRef.current) {
          clearTimeout(processTimeoutRef.current);
          processTimeoutRef.current = null;
        }
        
        pendingUpdatesRef.current = [];
      };
    } catch (error) {
      logger.error('Failed to setup realtime subscription', error as Error);
    }
  }, [workspace, throttledCallback, enabled, enableBatching, batchDelay]);

  return {
    isSubscribed: subscriptionRef.current !== null,
    subscriptionId: subscriptionRef.current
  };
}

/**
 * 通知用の最適化されたリアルタイムフック
 */
export function useOptimizedNotificationRealtime(
  userId: string | undefined,
  onNotificationUpdate: (payload: any) => void,
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options;
  const subscriptionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !userId) return;

    logger.debug('Setting up notification realtime subscription', { userId });

    try {
      const subscriptionId = realtimeManager.subscribeToNotifications(
        userId,
        onNotificationUpdate
      );

      subscriptionRef.current = subscriptionId;

      return () => {
        if (subscriptionRef.current) {
          realtimeManager.unsubscribe(subscriptionRef.current);
          subscriptionRef.current = null;
        }
      };
    } catch (error) {
      logger.error('Failed to setup notification subscription', error as Error);
    }
  }, [userId, onNotificationUpdate, enabled]);

  return {
    isSubscribed: subscriptionRef.current !== null,
    subscriptionId: subscriptionRef.current
  };
}

/**
 * チーム用の最適化されたリアルタイムフック
 */
export function useOptimizedTeamRealtime(
  teamId: string | undefined,
  onTeamUpdate: (payload: any) => void,
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options;
  const subscriptionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !teamId) return;

    logger.debug('Setting up team realtime subscription', { teamId });

    try {
      const subscriptionId = realtimeManager.subscribeToTeam(
        teamId,
        onTeamUpdate
      );

      subscriptionRef.current = subscriptionId;

      return () => {
        if (subscriptionRef.current) {
          realtimeManager.unsubscribe(subscriptionRef.current);
          subscriptionRef.current = null;
        }
      };
    } catch (error) {
      logger.error('Failed to setup team subscription', error as Error);
    }
  }, [teamId, onTeamUpdate, enabled]);

  return {
    isSubscribed: subscriptionRef.current !== null,
    subscriptionId: subscriptionRef.current
  };
}

/**
 * リアルタイム接続状態の監視フック
 */
export function useRealtimeStatus() {
  const getStatus = useCallback(() => ({
    isConnected: realtimeManager.getConnectionStatus(),
    subscriptionCount: realtimeManager.getSubscriptionCount(),
    debugInfo: realtimeManager.getDebugInfo()
  }), []);

  return getStatus;
}
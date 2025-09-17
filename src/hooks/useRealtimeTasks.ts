import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { mutate } from 'swr';
import { cacheKeys } from '@/lib/swr-config';

// リアルタイム更新を有効化するフック
export function useRealtimeTasks(userId?: string) {
  useEffect(() => {
    if (!userId) return;

    // Supabaseのリアルタイムサブスクリプション
    const channel = supabase
      .channel('tasks-channel')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE すべてを監視
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Realtime update:', payload);

          // イベントタイプに応じてキャッシュを更新
          switch (payload.eventType) {
            case 'INSERT':
            case 'UPDATE':
            case 'DELETE':
              // 関連するキャッシュを無効化して再取得
              mutate(cacheKeys.tasks(userId));

              // 個別タスクのキャッシュも更新
              if (payload.old?.id) {
                mutate(cacheKeys.task(payload.old.id));
              }
              if (payload.new?.id) {
                mutate(cacheKeys.task(payload.new.id));
              }
              break;
          }
        }
      )
      .subscribe();

    // クリーンアップ
    return () => {
      channel.unsubscribe();
    };
  }, [userId]);
}

// 使用例
export function TaskListWithRealtime() {
  const { user } = useAuth();
  const { tasks, isLoading, error } = useTasks(user?.id);

  // リアルタイム更新を有効化
  useRealtimeTasks(user?.id);

  // ... rest of component
}
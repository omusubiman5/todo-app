import useSWR, { mutate } from 'swr';
import { supabase } from '@/lib/supabase';
import { cacheKeys, supabaseFetcher } from '@/lib/swr-config';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  user_id: string;
  created_at: string;
  updated_at: string;
}

// タスク一覧を取得するフック
export function useTasks(userId?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? cacheKeys.tasks(userId) : null,
    () => supabaseFetcher(
      () => supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    ),
    {
      // 個別の設定（オプション）
      revalidateOnMount: true, // マウント時に必ず最新データを取得
      refreshInterval: 60000, // 1分ごとに自動更新
      dedupingInterval: 5000, // 5秒間は重複リクエストを防ぐ
    }
  );

  return {
    tasks: data as Task[] | undefined,
    isLoading,
    error,
    mutate,
  };
}

// 特定のタスクを取得するフック
export function useTask(taskId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    taskId ? cacheKeys.task(taskId) : null,
    () => supabaseFetcher(
      () => supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single()
    ),
    {
      revalidateOnMount: false, // キャッシュがあれば使用
      refreshInterval: 0, // 自動更新なし
    }
  );

  return {
    task: data as Task | undefined,
    isLoading,
    error,
    mutate,
  };
}

// ステータス別タスクを取得するフック
export function useTasksByStatus(userId: string, status: string) {
  const { data, error, isLoading } = useSWR(
    userId && status ? cacheKeys.tasksByStatus(userId, status) : null,
    () => supabaseFetcher(
      () => supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('status', status)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
    ),
    {
      refreshInterval: 30000, // 30秒ごとに更新
      revalidateOnFocus: true, // フォーカス時に再検証
    }
  );

  return {
    tasks: data as Task[] | undefined,
    isLoading,
    error,
  };
}

// キャッシュ操作ヘルパー関数
export const taskCacheMutations = {
  // タスク作成後のキャッシュ更新
  async createTask(newTask: Partial<Task>, userId: string) {
    // 楽観的更新
    await mutate(
      cacheKeys.tasks(userId),
      async (tasks: Task[] = []) => {
        const { data, error } = await supabase
          .from('tasks')
          .insert(newTask)
          .select()
          .single();

        if (error) throw error;
        return [data, ...tasks];
      },
      {
        revalidate: false, // サーバー再検証をスキップ
        optimisticData: (tasks: Task[] = []) => [
          { ...newTask, id: 'temp-id', created_at: new Date().toISOString() } as Task,
          ...tasks
        ],
      }
    );
  },

  // タスク更新後のキャッシュ更新
  async updateTask(taskId: string, updates: Partial<Task>, userId: string) {
    // 複数のキャッシュキーを更新
    const keys = [
      cacheKeys.tasks(userId),
      cacheKeys.task(taskId),
    ];

    await Promise.all(
      keys.map(key =>
        mutate(
          key,
          async (current: any) => {
            const { data, error } = await supabase
              .from('tasks')
              .update(updates)
              .eq('id', taskId)
              .select()
              .single();

            if (error) throw error;

            // タスク一覧の場合は配列を更新
            if (Array.isArray(current)) {
              return current.map(task =>
                task.id === taskId ? data : task
              );
            }
            // 単一タスクの場合はそのまま返す
            return data;
          },
          {
            revalidate: false,
          }
        )
      )
    );
  },

  // タスク削除後のキャッシュ更新
  async deleteTask(taskId: string, userId: string) {
    await mutate(
      cacheKeys.tasks(userId),
      async (tasks: Task[] = []) => {
        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', taskId);

        if (error) throw error;
        return tasks.filter(task => task.id !== taskId);
      },
      {
        revalidate: false,
        optimisticData: (tasks: Task[] = []) =>
          tasks.filter(task => task.id !== taskId),
      }
    );
  },

  // 手動でキャッシュを無効化
  invalidateAll(userId: string) {
    mutate(cacheKeys.tasks(userId));
  },

  // 特定のタスクのキャッシュを無効化
  invalidateTask(taskId: string) {
    mutate(cacheKeys.task(taskId));
  },
};
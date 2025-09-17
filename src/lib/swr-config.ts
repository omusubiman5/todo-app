import { SWRConfig } from 'swr';
import { supabase } from './supabase';

// デフォルトのフェッチャー関数
export const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('An error occurred while fetching the data.');
  }
  return response.json();
};

// Supabase専用フェッチャー
export const supabaseFetcher = async (query: () => Promise<any>) => {
  const { data, error } = await query();
  if (error) throw error;
  return data;
};

// SWRのグローバル設定
export const swrConfig = {
  // キャッシュの再検証設定
  revalidateOnFocus: false, // フォーカス時の再検証を無効化
  revalidateOnReconnect: true, // ネットワーク再接続時に再検証
  refreshInterval: 0, // 自動更新間隔（0は無効）

  // エラーハンドリング
  onError: (error: Error, key: string) => {
    console.error(`SWR Error for ${key}:`, error);
  },

  // キャッシュ設定
  dedupingInterval: 2000, // 重複リクエストを防ぐ間隔（ミリ秒）
  focusThrottleInterval: 5000, // フォーカス時の再検証スロットル
  loadingTimeout: 3000, // ローディングタイムアウト

  // デフォルトフェッチャー
  fetcher: fetcher,
};

// キャッシュキー生成ヘルパー
export const cacheKeys = {
  tasks: (userId?: string) => userId ? ['tasks', userId] : ['tasks'],
  task: (taskId: string) => ['task', taskId],
  tasksByStatus: (userId: string, status: string) => ['tasks', userId, status],
  userProfile: (userId: string) => ['user', userId],
};
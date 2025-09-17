"use client";

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// 🚀 Phase 3 Stage 2: 最適化されたReact Query設定

const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // キャッシュ戦略
        staleTime: 5 * 60 * 1000, // 5分間は新鮮なデータと見なす
        gcTime: 10 * 60 * 1000,   // 10分間キャッシュを保持
        retry: (failureCount, error: any) => {
          // ネットワークエラー以外は再試行しない
          if (error?.status === 401 || error?.status === 403) {
            return false;
          }
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        
        // バックグラウンド更新設定
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: true,
        
        // ネットワーク最適化
        networkMode: 'online',
      },
      mutations: {
        // 楽観的更新の設定
        retry: (failureCount, error: any) => {
          // 楽観的更新の失敗は基本的に再試行しない
          if (error?.status >= 400 && error?.status < 500) {
            return false;
          }
          return failureCount < 2;
        },
        networkMode: 'online',
      },
    },
  });
};

// シングルトンクライアント（SSR対応）
let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // SSR環境では毎回新しいクライアントを作成
    return createQueryClient();
  } else {
    // ブラウザ環境ではシングルトンを使用
    if (!browserQueryClient) {
      browserQueryClient = createQueryClient();
    }
    return browserQueryClient;
  }
}

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // この方法でSSRとハイドレーションの問題を回避
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* 開発環境のみDevToolsを表示 */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools 
          initialIsOpen={false}
          position="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}

// フック用のキー生成関数
export const queryKeys = {
  // タスク関連
  tasks: {
    all: ['tasks'] as const,
    workspace: (workspaceId: string | number) => ['tasks', 'workspace', workspaceId] as const,
    personal: (userId: string) => ['tasks', 'personal', userId] as const,
    team: (teamId: string) => ['tasks', 'team', teamId] as const,
    filters: (workspaceId: string | number, filters: any) => 
      ['tasks', 'workspace', workspaceId, 'filters', filters] as const,
  },
  
  // チーム関連
  teams: {
    all: ['teams'] as const,
    user: (userId: string) => ['teams', 'user', userId] as const,
    detail: (teamId: string) => ['teams', 'detail', teamId] as const,
    members: (teamId: string) => ['teams', teamId, 'members'] as const,
    stats: (teamId: string) => ['teams', teamId, 'stats'] as const,
  },
  
  // 統計関連
  stats: {
    tasks: (workspaceId: string | number) => ['stats', 'tasks', workspaceId] as const,
    team: (teamId: string) => ['stats', 'team', teamId] as const,
    personal: (userId: string) => ['stats', 'personal', userId] as const,
  },
  
  // 通知関連
  notifications: {
    user: (userId: string) => ['notifications', 'user', userId] as const,
    unread: (userId: string) => ['notifications', 'user', userId, 'unread'] as const,
  },
  
  // プロフィール関連
  profile: {
    user: (userId: string) => ['profile', 'user', userId] as const,
  }
} as const;

// キャッシュ無効化ヘルパー
export const invalidateQueries = {
  tasks: (queryClient: QueryClient, workspaceId?: string | number) => {
    if (workspaceId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.workspace(workspaceId) });
    } else {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    }
  },
  
  teams: (queryClient: QueryClient, userId?: string) => {
    if (userId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.user(userId) });
    } else {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
    }
  },
  
  stats: (queryClient: QueryClient, workspaceId?: string | number) => {
    if (workspaceId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.tasks(workspaceId) });
    }
  }
};
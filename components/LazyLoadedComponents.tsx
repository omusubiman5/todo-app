"use client";

import dynamic from 'next/dynamic';
import React, { Suspense } from 'react';

// 🚀 スケルトンローダー
const SkeletonLoader = ({ className = "h-4 bg-gray-300 rounded animate-pulse" }) => (
  <div className={className}></div>
);

// 🚀 チャート用スケルトン
const ChartSkeleton = () => (
  <div className="w-full h-64 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
    <div className="text-gray-500">📊 チャートを読み込み中...</div>
  </div>
);

// 🚀 モーダル用スケルトン
const ModalSkeleton = () => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <div className="h-6 bg-gray-300 rounded mb-4 animate-pulse"></div>
      <div className="space-y-3">
        <div className="h-4 bg-gray-300 rounded animate-pulse"></div>
        <div className="h-4 bg-gray-300 rounded animate-pulse"></div>
      </div>
    </div>
  </div>
);

// 🚀 1. 重いチャートコンポーネントの遅延読み込み
export const LazyTaskStatsDashboard = dynamic(
  () => import('./TaskStatsDashboard'),
  {
    loading: ChartSkeleton,
    ssr: false // チャートはクライアントサイドでのみレンダリング
  }
);

export const LazyEnhancedTaskDashboard = dynamic(
  () => import('./EnhancedTaskDashboard'),
  {
    loading: ChartSkeleton,
    ssr: false
  }
);

export const LazyTeamStatsDashboard = dynamic(
  () => import('./TeamStatsDashboard'),
  {
    loading: ChartSkeleton,
    ssr: false
  }
);

// 🚀 2. モーダルコンポーネントの遅延読み込み（表示時のみ）
export const LazyTaskCommentsModal = dynamic(
  () => import('./TaskCommentsModal'),
  {
    loading: ModalSkeleton,
    ssr: false
  }
);

export const LazyTaskHistoryModal = dynamic(
  () => import('./TaskHistoryModal'),
  {
    loading: ModalSkeleton,
    ssr: false
  }
);

export const LazyTaskAssignmentModal = dynamic(
  () => import('./TaskAssignmentModal'),
  {
    loading: ModalSkeleton,
    ssr: false
  }
);

export const LazyInviteMemberModal = dynamic(
  () => import('./InviteMemberModal'),
  {
    loading: ModalSkeleton,
    ssr: false
  }
);

export const LazyCreateTeamModal = dynamic(
  () => import('./CreateTeamModal'),
  {
    loading: ModalSkeleton,
    ssr: false
  }
);

// 🚀 3. 設定・管理系コンポーネント（管理者のみ）
export const LazyNotificationCenter = dynamic(
  () => import('./NotificationCenter'),
  {
    loading: () => (
      <div className="w-6 h-6 bg-gray-300 rounded-full animate-pulse"></div>
    ),
    ssr: false
  }
);

// 🚀 4. アクセシビリティ関連（必要時のみ）
export const LazyKeyboardShortcutsHelp = dynamic(
  () => import('./KeyboardShortcutsHelp'),
  {
    loading: ModalSkeleton,
    ssr: false
  }
);

export const LazyAccessibleTaskItem = dynamic(
  () => import('./accessibility/AccessibleTaskItem'),
  {
    loading: () => (
      <div className="p-4 bg-gray-100 rounded animate-pulse">
        <div className="h-4 bg-gray-300 rounded"></div>
      </div>
    )
  }
);

// 🚀 5. 仮想化リスト（大量データ時のみ）
export const LazyVirtualTaskList = dynamic(
  () => import('./VirtualTaskList'),
  {
    loading: () => (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonLoader key={i} className="h-16 bg-gray-300 rounded" />
        ))}
      </div>
    ),
    ssr: false
  }
);

// 🚀 6. 条件付き遅延読み込みフック
export const useLazyComponent = <T extends any>(
  importFn: () => Promise<{ default: React.ComponentType<T> }>,
  condition: boolean
) => {
  const [Component, setComponent] = React.useState<React.ComponentType<T> | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (condition && !Component && !isLoading) {
      setIsLoading(true);
      importFn()
        .then((module) => {
          setComponent(() => module.default);
        })
        .catch((error) => {
          console.error('Failed to load component:', error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [condition, Component, isLoading, importFn]);

  return { Component, isLoading };
};

// 🚀 7. 使用例のラッパーコンポーネント
export const ConditionalDashboard = ({ showStats }: { showStats: boolean }) => {
  const { Component: DashboardComponent, isLoading } = useLazyComponent(
    () => import('./TaskStatsDashboard'),
    showStats
  );

  if (!showStats) return null;

  if (isLoading) return <ChartSkeleton />;

  if (!DashboardComponent) return null;

  return (
    <Suspense fallback={<ChartSkeleton />}>
      <DashboardComponent />
    </Suspense>
  );
};

// 🚀 8. バンドル分析用のコンポーネント情報
export const COMPONENT_SIZES = {
  TaskStatsDashboard: '~45KB (recharts含む)',
  EnhancedTaskDashboard: '~38KB',
  TeamStatsDashboard: '~42KB',
  TaskCommentsModal: '~8KB',
  TaskHistoryModal: '~7KB',
  TaskAssignmentModal: '~12KB',
  InviteMemberModal: '~15KB',
  CreateTeamModal: '~18KB',
  NotificationCenter: '~22KB',
  KeyboardShortcutsHelp: '~5KB',
  AccessibleTaskItem: '~6KB',
  VirtualTaskList: '~25KB (react-window含む)',
};

// 🚀 9. パフォーマンス測定用フック
export const useComponentLoadTime = (componentName: string) => {
  const startTime = React.useRef(performance.now());

  React.useEffect(() => {
    const loadTime = performance.now() - startTime.current;
    console.log(`⚡ ${componentName} loaded in ${loadTime.toFixed(2)}ms`);
  }, [componentName]);
};

// 🚀 10. プリロード関数（重要なコンポーネント用）
export const preloadCriticalComponents = async () => {
  // ユーザーがダッシュボードページに移動する前にプリロード
  const preloadPromises = [
    import('./TaskStatsDashboard'),
    import('./NotificationCenter'),
  ];

  try {
    await Promise.all(preloadPromises);
    console.log('🚀 Critical components preloaded');
  } catch (error) {
    console.warn('⚠️ Failed to preload some components:', error);
  }
};

export default {
  LazyTaskStatsDashboard,
  LazyEnhancedTaskDashboard,
  LazyTeamStatsDashboard,
  LazyTaskCommentsModal,
  LazyTaskHistoryModal,
  LazyTaskAssignmentModal,
  LazyInviteMemberModal,
  LazyCreateTeamModal,
  LazyNotificationCenter,
  LazyKeyboardShortcutsHelp,
  LazyAccessibleTaskItem,
  LazyVirtualTaskList,
  ConditionalDashboard,
  useLazyComponent,
  useComponentLoadTime,
  preloadCriticalComponents,
};
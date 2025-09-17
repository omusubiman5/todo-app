"use client";

import { lazy, Suspense, ComponentType } from 'react';

// 重いダッシュボードコンポーネントの遅延読み込み
const TaskStatsDashboard = lazy(() => import('./TaskStatsDashboard'));
const TeamStatsDashboard = lazy(() => import('./TeamStatsDashboard'));
const TaskStatisticsDashboard = lazy(() => import('./TaskStatisticsDashboard'));
const NotificationCenter = lazy(() => import('./NotificationCenter'));

// Loading Skeleton Components
const DashboardSkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-8 bg-gray-200 rounded-lg w-1/3"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="h-32 bg-gray-200 rounded-lg"></div>
      <div className="h-32 bg-gray-200 rounded-lg"></div>
      <div className="h-32 bg-gray-200 rounded-lg"></div>
    </div>
    <div className="h-24 bg-gray-200 rounded-lg"></div>
  </div>
);

const NotificationSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
    <div className="space-y-2">
      <div className="h-4 bg-gray-200 rounded"></div>
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
  </div>
);

// Higher Order Component for lazy loading with error boundary
const withLazyLoading = <P extends object>(
  LazyComponent: ComponentType<P>,
  fallback: React.ReactNode = <DashboardSkeleton />
) => {
  return function LazyWrapper(props: P) {
    return (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
};

// Export lazy-loaded components
export const LazyTaskStatsDashboard = withLazyLoading(TaskStatsDashboard);
export const LazyTeamStatsDashboard = withLazyLoading(TeamStatsDashboard);
export const LazyTaskStatisticsDashboard = withLazyLoading(TaskStatisticsDashboard);
export const LazyNotificationCenter = withLazyLoading(
  NotificationCenter, 
  <NotificationSkeleton />
);

// 📊 Chart components lazy loading (Recharts is heavy)
export const LazyChartDashboard = lazy(() => 
  import('./TaskStatisticsDashboard').then(module => ({
    default: module.default
  }))
);

// 🎨 Icon lazy loading for non-critical icons
export const LazyIcons = {
  FaChartLine: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaChartLine }))),
  FaUsers: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaUsers }))),
  FaBell: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaBell }))),
  FaDownload: lazy(() => import('react-icons/fa').then(mod => ({ default: mod.FaDownload }))),
};

// Export the skeleton components for reuse
export { DashboardSkeleton, NotificationSkeleton };
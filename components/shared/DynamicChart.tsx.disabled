"use client";

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Chartsライブラリを動的にインポート
const RechartsComponents = dynamic(() => 
  import('recharts').then(mod => ({
    PieChart: mod.PieChart,
    Pie: mod.Pie,
    Cell: mod.Cell,
    BarChart: mod.BarChart,
    Bar: mod.Bar,
    XAxis: mod.XAxis,
    YAxis: mod.YAxis,
    CartesianGrid: mod.CartesianGrid,
    Tooltip: mod.Tooltip,
    LineChart: mod.LineChart,
    Line: mod.Line,
    ResponsiveContainer: mod.ResponsiveContainer
  })), 
  {
    loading: () => (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">チャートを読み込み中...</p>
        </div>
      </div>
    ),
    ssr: false
  }
);

// 統計ダッシュボードコンポーネントの動的インポート
const TeamStatsDashboard = dynamic(() => import('@/components/TeamStatsDashboard'), {
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 text-lg">統計ダッシュボードを読み込み中...</p>
      </div>
    </div>
  ),
  ssr: false
});

export { RechartsComponents, TeamStatsDashboard };

export default function DynamicChartWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">チャートを読み込み中...</p>
        </div>
      </div>
    }>
      {children}
    </Suspense>
  );
}
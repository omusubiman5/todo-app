"use client";

import { useMemo } from 'react';

// チャートデータ最適化用の型
interface TeamStats {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  memberStats: Array<{
    user_id: string;
    user_name: string;
    total_tasks: number;
    completed_tasks: number;
    completion_rate: number;
  }>;
  priorityDistribution: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  teamActivity: Array<{
    date: string;
    completed: number;
    created: number;
  }>;
}

// 🚀 Phase 3: 最適化されたチャートデータフック
export function useOptimizedChartData(stats: TeamStats | null, darkMode: boolean) {
  
  // 1. 優先度分布チャートデータ（最適化）
  const pieChartData = useMemo(() => {
    if (!stats?.priorityDistribution) return [];
    
    return stats.priorityDistribution.map(item => ({
      name: item.name,
      value: item.value,
      color: darkMode ? adjustColorForDarkMode(item.color) : item.color
    }));
  }, [stats?.priorityDistribution, darkMode]);

  // 2. メンバー完了率バーチャートデータ（最適化）
  const barChartData = useMemo(() => {
    if (!stats?.memberStats) return [];
    
    return stats.memberStats
      .map(member => ({
        name: member.user_name.length > 10 ? `${member.user_name.slice(0, 8)}...` : member.user_name,
        completed: member.completed_tasks,
        total: member.total_tasks,
        rate: Math.round(member.completion_rate)
      }))
      .sort((a, b) => b.rate - a.rate) // 完了率でソート
      .slice(0, 8); // 最大8名表示
  }, [stats?.memberStats]);

  // 3. アクティビティライン チャートデータ（最適化）
  const lineChartData = useMemo(() => {
    if (!stats?.teamActivity) return [];
    
    return stats.teamActivity.map(day => ({
      date: day.date,
      completed: day.completed,
      created: day.created,
      net: day.completed - day.created // 純増減
    }));
  }, [stats?.teamActivity]);

  // 4. メンバー統計データ（最適化）
  const memberStatsData = useMemo(() => {
    if (!stats?.memberStats) return [];
    
    return stats.memberStats
      .map(member => ({
        ...member,
        efficiency: member.total_tasks > 0 ? (member.completed_tasks / member.total_tasks) * 100 : 0,
        rank: 0 // 後で計算
      }))
      .sort((a, b) => b.efficiency - a.efficiency)
      .map((member, index) => ({
        ...member,
        rank: index + 1
      }));
  }, [stats?.memberStats]);

  // 5. サマリー統計（最適化）
  const summaryStats = useMemo(() => {
    if (!stats) return null;
    
    return {
      totalTasks: stats.totalTasks,
      completedTasks: stats.completedTasks,
      completionRate: Math.round(stats.completionRate * 10) / 10,
      averageTasksPerMember: stats.memberStats.length > 0 
        ? Math.round(stats.totalTasks / stats.memberStats.length * 10) / 10
        : 0,
      mostActiveUser: stats.memberStats.reduce((prev, current) => 
        (current.total_tasks > prev.total_tasks) ? current : prev,
        stats.memberStats[0] || null
      ),
      recentTrend: calculateTrend(stats.teamActivity)
    };
  }, [stats]);

  // 6. チャート色テーマ（ダークモード対応）
  const chartColors = useMemo(() => {
    const baseColors = {
      primary: darkMode ? '#60A5FA' : '#3B82F6',
      secondary: darkMode ? '#34D399' : '#10B981',
      accent: darkMode ? '#F59E0B' : '#F59E0B',
      danger: darkMode ? '#F87171' : '#EF4444',
      muted: darkMode ? '#9CA3AF' : '#6B7280'
    };

    return {
      ...baseColors,
      gradient: darkMode 
        ? ['#1F2937', '#374151', '#4B5563', '#6B7280']
        : ['#F8FAFC', '#E2E8F0', '#CBD5E1', '#94A3B8']
    };
  }, [darkMode]);

  return {
    pieChartData,
    barChartData,
    lineChartData,
    memberStatsData,
    summaryStats,
    chartColors,
    // 追加の最適化ヘルパー
    isDataReady: !!stats,
    isEmpty: !stats || stats.totalTasks === 0
  };
}

// ヘルパー関数
function adjustColorForDarkMode(color: string): string {
  // ダークモード用の色調整
  const colorMap: Record<string, string> = {
    '#FF6B6B': '#FF8A80', // 高優先度
    '#4ECDC4': '#64FFDA', // 中優先度  
    '#45B7D1': '#81D4FA'  // 低優先度
  };
  
  return colorMap[color] || color;
}

function calculateTrend(activity: Array<{ completed: number; created: number }>): 'up' | 'down' | 'stable' {
  if (activity.length < 2) return 'stable';
  
  const recent = activity.slice(-3).reduce((sum, day) => sum + day.completed, 0);
  const previous = activity.slice(-6, -3).reduce((sum, day) => sum + day.completed, 0);
  
  if (recent > previous * 1.1) return 'up';
  if (recent < previous * 0.9) return 'down';
  return 'stable';
}
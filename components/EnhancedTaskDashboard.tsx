'use client';

import React, { useState, useEffect } from 'react';
import { EnhancedTaskService, TaskStatistics, Priority } from '@/lib/enhancedTaskService';
import { useAuth } from '@/components/AuthProvider';
import { useWorkspace } from '@/components/WorkspaceProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  TrendingUp,
  Calendar,
  Target,
  Archive,
  Settings,
  Zap,
  BarChart3
} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  colorScheme?: 'default' | 'success' | 'warning' | 'danger';
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon, 
  description, 
  trend, 
  colorScheme = 'default' 
}) => {
  const colorClasses = {
    default: 'border-gray-200 bg-white',
    success: 'border-green-200 bg-green-50',
    warning: 'border-yellow-200 bg-yellow-50',
    danger: 'border-red-200 bg-red-50'
  };

  return (
    <Card className={colorClasses[colorScheme]}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <div className="text-gray-400">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
        {trend && (
          <div className="flex items-center mt-2">
            <TrendingUp 
              className={`h-4 w-4 mr-1 ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}
            />
            <span className={`text-xs ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isPositive ? '+' : ''}{trend.value}% 先週比
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function EnhancedTaskDashboard() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  
  const [statistics, setStatistics] = useState<TaskStatistics | null>(null);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      // 統計とマスターデータを並行取得
      const [statsData, prioritiesData] = await Promise.all([
        EnhancedTaskService.getUserStatistics(user.id),
        EnhancedTaskService.getPriorities()
      ]);

      setStatistics(statsData);
      setPriorities(prioritiesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
      console.error('Dashboard data fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id, fetchData]);

  const handleArchiveOldTasks = async () => {
    try {
      // 6ヶ月以上古い完了タスクのアーカイブ実行
      const result = await EnhancedTaskService.archiveTask(
        '', // 一括アーカイブの場合は別のRPC関数が必要
        user!.id,
        '自動アーカイブ: 6ヶ月以上経過'
      );
      
      if (result.success) {
        await fetchData(); // データ再取得
      }
    } catch (error) {
      console.error('Archive error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
          <p className="font-semibold">ダッシュボードの読み込みに失敗しました</p>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
          <Button onClick={fetchData} className="mt-4">
            再試行
          </Button>
        </div>
      </Card>
    );
  }

  if (!statistics) return null;

  // 週間成長率計算
  const weeklyGrowth = statistics.last_week_completed > 0 
    ? Math.round(((statistics.this_week_completed - statistics.last_week_completed) / statistics.last_week_completed) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* 概要統計 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="完了率"
          value={`${statistics.completion_rate}%`}
          icon={<Target className="h-4 w-4" />}
          description={`${statistics.completed_tasks}/${statistics.total_tasks} タスク完了`}
          colorScheme={statistics.completion_rate >= 80 ? 'success' : statistics.completion_rate >= 60 ? 'default' : 'warning'}
        />
        
        <StatCard
          title="今週の完了数"
          value={statistics.this_week_completed}
          icon={<CheckCircle className="h-4 w-4" />}
          description="今週作成したタスクも含む"
          trend={{
            value: weeklyGrowth,
            isPositive: weeklyGrowth >= 0
          }}
          colorScheme="success"
        />
        
        <StatCard
          title="期限切れ"
          value={statistics.overdue_tasks}
          icon={<AlertTriangle className="h-4 w-4" />}
          description="早急な対応が必要"
          colorScheme={statistics.overdue_tasks > 0 ? 'danger' : 'default'}
        />
        
        <StatCard
          title="今日が期限"
          value={statistics.due_today}
          icon={<Calendar className="h-4 w-4" />}
          description="本日中に完了予定"
          colorScheme={statistics.due_today > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* 詳細分析 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* 進捗状況 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              タスクの進捗状況
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>完了済み</span>
                <span>{statistics.completed_tasks}件</span>
              </div>
              <Progress 
                value={(statistics.completed_tasks / statistics.total_tasks) * 100} 
                className="h-2"
              />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>進行中</span>
                <span>{statistics.in_progress_tasks}件</span>
              </div>
              <Progress 
                value={(statistics.in_progress_tasks / statistics.total_tasks) * 100} 
                className="h-2"
              />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>未着手</span>
                <span>{statistics.pending_tasks}件</span>
              </div>
              <Progress 
                value={(statistics.pending_tasks / statistics.total_tasks) * 100} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* 優先度別内訳（マスターデータ対応） */}
        <Card>
          <CardHeader>
            <CardTitle>優先度別未完了タスク</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(statistics.priority_breakdown || {}).map(([priorityName, count]) => {
              const priority = priorities.find(p => p.display_name === priorityName);
              return (
                <div key={priorityName} className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    {priority && (
                      <span 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: priority.color_code }}
                      />
                    )}
                    <span className="text-sm">{priority?.icon} {priorityName}</span>
                  </div>
                  <span className="font-semibold">{count}件</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* 生産性スコア */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="h-5 w-5 mr-2" />
              生産性スコア
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="text-3xl font-bold text-blue-600">
                {statistics.productivity_score}/100
              </div>
              <div className="flex-1">
                <Progress value={statistics.productivity_score} className="h-3" />
              </div>
            </div>
            <div className="mt-4 text-sm">
              <div className="text-gray-600">
                {statistics.productivity_score >= 80 ? '🎉 素晴らしい成果です！' :
                 statistics.productivity_score >= 60 ? '👍 良好なペースです' :
                 statistics.productivity_score >= 40 ? '📈 改善の余地があります' : '💪 もう少し頑張りましょう'}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                完了タスク、進行中タスク、新規作成などを総合的に評価
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 週間アクティビティ */}
      <Card>
        <CardHeader>
          <CardTitle>週間アクティビティ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {statistics.recent_activity?.map((day, index) => (
              <div key={index} className="text-center">
                <div className="text-xs text-gray-500 mb-2">
                  {new Date(day.date).toLocaleDateString('ja-JP', { weekday: 'short' })}
                </div>
                <div className="space-y-1">
                  <div 
                    className="bg-green-100 rounded p-1 text-xs border border-green-200"
                    title={`完了: ${day.completed_count}件`}
                  >
                    ✓ {day.completed_count}
                  </div>
                  <div 
                    className="bg-blue-100 rounded p-1 text-xs border border-blue-200"
                    title={`作成: ${day.created_count}件`}
                  >
                    + {day.created_count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* カスタムフィールド使用状況 */}
      {statistics.custom_field_usage && Object.keys(statistics.custom_field_usage).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              カスタムフィールド使用状況
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(statistics.custom_field_usage).map(([fieldName, count]) => (
                <div key={fieldName} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="font-semibold text-lg">{count}</div>
                  <div className="text-sm text-gray-600">{fieldName}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* アクションパネル */}
      <Card>
        <CardHeader>
          <CardTitle>クイックアクション</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleArchiveOldTasks}>
              <Archive className="h-4 w-4 mr-2" />
              古いタスクをアーカイブ
            </Button>
            <Button variant="outline" onClick={fetchData}>
              <TrendingUp className="h-4 w-4 mr-2" />
              データを更新
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
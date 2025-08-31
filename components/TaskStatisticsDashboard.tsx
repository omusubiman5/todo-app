'use client';

import { useTaskStatistics } from '@/lib/rpcService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  TrendingUp,
  Calendar,
  Target
} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, description, trend }) => (
  <Card>
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

export default function TaskStatisticsDashboard() {
  const { statistics, isLoading, error, refetch } = useTaskStatistics();

  if (isLoading) {
    return (
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
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
          <p className="font-semibold">統計の読み込みに失敗しました</p>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
          <button 
            onClick={refetch}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            再試行
          </button>
        </div>
      </Card>
    );
  }

  if (!statistics) return null;

  // 先週との比較計算
  const weeklyGrowth = statistics.last_week_completed > 0 
    ? Math.round(((statistics.this_week_completed - statistics.last_week_completed) / statistics.last_week_completed) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* メイン統計カード */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="完了率"
          value={statistics.completion_rate}
          icon={<Target className="h-4 w-4" />}
          description={`${statistics.completed_tasks}/${statistics.total_tasks} タスク完了`}
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
        />
        
        <StatCard
          title="期限切れ"
          value={statistics.overdue_tasks}
          icon={<AlertTriangle className="h-4 w-4" />}
          description="早急な対応が必要"
        />
        
        <StatCard
          title="今日が期限"
          value={statistics.due_today}
          icon={<Calendar className="h-4 w-4" />}
          description="本日中に完了予定"
        />
      </div>

      {/* 詳細統計 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* 進捗状況 */}
        <Card>
          <CardHeader>
            <CardTitle>タスクの進捗状況</CardTitle>
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
                className="h-2 bg-blue-100"
              />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>未着手</span>
                <span>{statistics.pending_tasks}件</span>
              </div>
              <Progress 
                value={(statistics.pending_tasks / statistics.total_tasks) * 100} 
                className="h-2 bg-gray-100"
              />
            </div>
          </CardContent>
        </Card>

        {/* 優先度別内訳 */}
        <Card>
          <CardHeader>
            <CardTitle>優先度別未完了タスク</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(statistics.priority_breakdown).map(([priority, count]) => (
              <div key={priority} className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={priority === '高' ? 'destructive' : priority === '中' ? 'default' : 'secondary'}
                  >
                    {priority}
                  </Badge>
                  <span className="text-sm">{priority}優先度</span>
                </div>
                <span className="font-semibold">{count}件</span>
              </div>
            ))}
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
            {statistics.recent_activity.map((day, index) => (
              <div key={index} className="text-center">
                <div className="text-xs text-gray-500 mb-2">
                  {new Date(day.date).toLocaleDateString('ja-JP', { weekday: 'short' })}
                </div>
                <div className="space-y-1">
                  <div 
                    className="bg-green-100 rounded p-1 text-xs"
                    title={`完了: ${day.completed_count}件`}
                  >
                    ✓ {day.completed_count}
                  </div>
                  <div 
                    className="bg-blue-100 rounded p-1 text-xs"
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

      {/* 生産性スコア */}
      <Card>
        <CardHeader>
          <CardTitle>生産性スコア</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="text-3xl font-bold text-blue-600">
              {statistics.productivity_score}/100
            </div>
            <div className="flex-1">
              <Progress value={statistics.productivity_score} className="h-3" />
            </div>
            <div className="text-sm text-gray-500">
              {statistics.productivity_score >= 80 ? '素晴らしい!' :
               statistics.productivity_score >= 60 ? '良好' :
               statistics.productivity_score >= 40 ? '普通' : '改善の余地あり'}
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            完了タスク、進行中タスク、新規作成などを総合的に評価
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
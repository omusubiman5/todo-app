import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

type Task = {
  id: string;
  text: string;
  completed: boolean;
  priority: "高" | "中" | "低";
  user_id: string;
  created_at: string;
  updated_at: string;
};

export type TaskStats = {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  thisWeekCompleted: number;
  thisMonthCompleted: number;
  priorityDistribution: {
    name: string;
    value: number;
    color: string;
  }[];
  last7DaysActivity: {
    date: string;
    completed: number;
  }[];
};

export const useTaskStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<TaskStats>({
    totalTasks: 0,
    completedTasks: 0,
    completionRate: 0,
    thisWeekCompleted: 0,
    thisMonthCompleted: 0,
    priorityDistribution: [],
    last7DaysActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setStats({
        totalTasks: 0,
        completedTasks: 0,
        completionRate: 0,
        thisWeekCompleted: 0,
        thisMonthCompleted: 0,
        priorityDistribution: [],
        last7DaysActivity: []
      });
      setLoading(false);
      return;
    }

    const fetchTaskStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: tasks, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id);

        if (error) {
          throw error;
        }

        const calculatedStats = calculateStats(tasks || []);
        setStats(calculatedStats);
      } catch (err) {
        console.error('Error fetching task stats:', err);
        setError('統計データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchTaskStats();

    // リアルタイム更新の設定
    const channel = supabase
      .channel('realtime-stats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchTaskStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const calculateStats = (tasks: Task[]): TaskStats => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completed).length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // 今週の完了数
    const thisWeekCompleted = tasks.filter(task => 
      task.completed && new Date(task.updated_at) >= startOfWeek
    ).length;

    // 今月の完了数
    const thisMonthCompleted = tasks.filter(task => 
      task.completed && new Date(task.updated_at) >= startOfMonth
    ).length;

    // 優先度別分布
    const priorityCount = tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const priorityDistribution = [
      { name: '高', value: priorityCount['高'] || 0, color: '#ef4444' },
      { name: '中', value: priorityCount['中'] || 0, color: '#f59e0b' },
      { name: '低', value: priorityCount['低'] || 0, color: '#3b82f6' }
    ];

    // 直近7日間の活動
    const last7DaysActivity = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);
      
      const completedOnDate = tasks.filter(task => {
        if (!task.completed) return false;
        const taskDate = new Date(task.updated_at);
        return taskDate >= date && taskDate < nextDate;
      }).length;

      last7DaysActivity.push({
        date: date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
        completed: completedOnDate
      });
    }

    return {
      totalTasks,
      completedTasks,
      completionRate,
      thisWeekCompleted,
      thisMonthCompleted,
      priorityDistribution,
      last7DaysActivity
    };
  };

  return { stats, loading, error };
};
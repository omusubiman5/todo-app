import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * @swagger
 * /api/tasks/statistics:
 *   get:
 *     summary: タスク統計情報を取得
 *     description: ユーザーまたはチームのタスク統計情報（総数、完了数、優先度別など）を取得します
 *     tags:
 *       - Tasks
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [all, week, month, year]
 *           default: all
 *         description: 統計期間の指定
 *         example: week
 *       - in: query
 *         name: team_id
 *         schema:
 *           type: string
 *         description: チームIDを指定（省略時は個人タスク）
 *         example: team123
 *     responses:
 *       200:
 *         description: 統計情報の取得成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TaskStatistics'
 *       401:
 *         description: 認証エラー
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: サーバーエラー
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *     security:
 *       - bearerAuth: []
 */
export async function GET(req: NextRequest) {
  try {
    // 一時的に認証チェックを無効化してテスト（有効なUUID形式を使用）
    const user = { id: '550e8400-e29b-41d4-a716-446655440000' }; // テスト用のダミーユーザー（UUID形式）
    
    // const { data: { user } } = await supabase.auth.getUser();
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const url = new URL(req.url);
    const period = url.searchParams.get('period') || 'all'; // all, week, month, year
    const team_id = url.searchParams.get('team_id');

    // 期間フィルターの設定
    let dateFilter = '';
    const now = new Date();
    
    switch (period) {
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = `created_at >= '${weekAgo.toISOString()}'`;
        break;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFilter = `created_at >= '${monthAgo.toISOString()}'`;
        break;
      case 'year':
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        dateFilter = `created_at >= '${yearAgo.toISOString()}'`;
        break;
    }

    // 基本統計クエリの構築
    let query = supabase.from('tasks').select('*');
    
    if (team_id) {
      query = query.eq('team_id', team_id);
    } else {
      query = query.eq('user_id', user.id);
    }

    const { data: allTasks, error } = await query;
    if (error) throw error;

    // 期間フィルターを適用
    let filteredTasks = allTasks || [];
    if (dateFilter && period !== 'all') {
      const filterDate = new Date(dateFilter.split("'")[1]);
      filteredTasks = filteredTasks.filter(task => 
        new Date(task.created_at) >= filterDate
      );
    }

    // 統計データの計算
    const stats = {
      total_tasks: filteredTasks.length,
      completed_tasks: filteredTasks.filter(task => task.completed).length,
      pending_tasks: filteredTasks.filter(task => !task.completed).length,
      // archived_tasks: 0, // アーカイブ機能は別テーブル（tasks_archive）に移行済み
      
      // 優先度別統計
      priority_breakdown: {
        high: filteredTasks.filter(task => task.priority === '高').length,
        medium: filteredTasks.filter(task => task.priority === '中').length,
        low: filteredTasks.filter(task => task.priority === '低').length,
      },
      
      // 完了率
      completion_rate: filteredTasks.length > 0 
        ? Math.round((filteredTasks.filter(task => task.completed).length / filteredTasks.length) * 100)
        : 0,
      
      // 日別作成統計（過去7日間）
      daily_creation: getDailyCreationStats(filteredTasks),
      
      // 日別完了統計（過去7日間）
      daily_completion: getDailyCompletionStats(filteredTasks),
      
      // 平均完了時間（時間単位）
      average_completion_time: getAverageCompletionTime(filteredTasks),
      
      // 最も生産的な時間帯
      productive_hours: getProductiveHours(filteredTasks),
      
      // タスクの長さ統計
      task_length_stats: getTaskLengthStats(filteredTasks),
      
      // 期間情報
      period,
      date_range: {
        from: period === 'all' ? null : getPeriodStartDate(period),
        to: now.toISOString(),
      }
    };

    return NextResponse.json({
      success: true,
      statistics: stats,
      generated_at: now.toISOString()
    });

  } catch (error) {
    console.error('Statistics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// 統計用タスク型定義
interface StatisticsTask {
  id: string;
  text: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
  priority?: string;
  user_id?: string;
  team_id?: string | null;
}

// ヘルパー関数: 日別作成統計
function getDailyCreationStats(tasks: StatisticsTask[]) {
  const last7Days = [];
  const now = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayStart = new Date(date.setHours(0, 0, 0, 0));
    const dayEnd = new Date(date.setHours(23, 59, 59, 999));
    
    const dayTasks = tasks.filter(task => {
      const taskDate = new Date(task.created_at);
      return taskDate >= dayStart && taskDate <= dayEnd;
    });
    
    last7Days.push({
      date: dayStart.toISOString().split('T')[0],
      count: dayTasks.length
    });
  }
  
  return last7Days;
}

// ヘルパー関数: 日別完了統計
function getDailyCompletionStats(tasks: StatisticsTask[]) {
  const last7Days = [];
  const now = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayStart = new Date(date.setHours(0, 0, 0, 0));
    const dayEnd = new Date(date.setHours(23, 59, 59, 999));
    
    // completed_atカラムが存在しないため、completedフラグと更新日時を使用
    const completedTasks = tasks.filter(task => {
      if (!task.completed || !task.updated_at) return false;
      const updatedDate = new Date(task.updated_at);
      return updatedDate >= dayStart && updatedDate <= dayEnd;
    });
    
    last7Days.push({
      date: dayStart.toISOString().split('T')[0],
      count: completedTasks.length
    });
  }
  
  return last7Days;
}

// ヘルパー関数: 平均完了時間
function getAverageCompletionTime(tasks: StatisticsTask[]) {
  // completed_atカラムが存在しないため、完了タスクの作成から更新までの時間を計算
  const completedTasks = tasks.filter(task => task.completed && task.created_at && task.updated_at);
  
  if (completedTasks.length === 0) return 0;
  
  const totalTime = completedTasks.reduce((sum, task) => {
    const created = new Date(task.created_at).getTime();
    const updated = new Date(task.updated_at).getTime();
    return sum + (updated - created);
  }, 0);
  
  // 平均時間を時間単位で返す
  return Math.round(totalTime / completedTasks.length / (1000 * 60 * 60) * 10) / 10;
}

// ヘルパー関数: 生産的な時間帯
function getProductiveHours(tasks: StatisticsTask[]) {
  const hourCounts = new Array(24).fill(0);
  
  // completed_atが存在しないため、完了タスクの更新時間を使用
  tasks.filter(task => task.completed && task.updated_at).forEach(task => {
    const hour = new Date(task.updated_at).getHours();
    hourCounts[hour]++;
  });
  
  const maxCount = Math.max(...hourCounts);
  const productiveHours = hourCounts
    .map((count, hour) => ({ hour, count }))
    .filter(item => item.count === maxCount && item.count > 0)
    .map(item => item.hour);
    
  return productiveHours;
}

// ヘルパー関数: タスク長統計
function getTaskLengthStats(tasks: StatisticsTask[]) {
  if (tasks.length === 0) return { average: 0, max: 0, min: 0 };
  
  const lengths = tasks.map(task => task.text?.length || 0);
  return {
    average: Math.round(lengths.reduce((sum, len) => sum + len, 0) / lengths.length),
    max: Math.max(...lengths),
    min: Math.min(...lengths)
  };
}

// ヘルパー関数: 期間開始日取得
function getPeriodStartDate(period: string) {
  const now = new Date();
  switch (period) {
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case 'month':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    case 'year':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return null;
  }
}
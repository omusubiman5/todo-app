import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * データベースインデックス作成API
 * 使用方法: POST /api/admin/create-indexes
 */

const indexes = [
  {
    name: 'idx_tasks_user_id',
    sql: 'CREATE INDEX CONCURRENTLY idx_tasks_user_id ON tasks(user_id);',
    description: '個人タスク検索の高速化'
  },
  {
    name: 'idx_tasks_team_id',
    sql: 'CREATE INDEX CONCURRENTLY idx_tasks_team_id ON tasks(team_id);',
    description: 'チームタスク検索の高速化'
  },
  {
    name: 'idx_tasks_completed',
    sql: 'CREATE INDEX CONCURRENTLY idx_tasks_completed ON tasks(completed);',
    description: '完了状態フィルターの高速化'
  },
  {
    name: 'idx_tasks_priority',
    sql: 'CREATE INDEX CONCURRENTLY idx_tasks_priority ON tasks(priority);',
    description: '優先度フィルターの高速化'
  }
];

export async function GET() {
  try {
    // 既存インデックスの確認
    const { data, error } = await supabase
      .from('pg_indexes')
      .select('indexname')
      .eq('tablename', 'tasks')
      .like('indexname', 'idx_tasks_%');

    if (error) {
      console.log('インデックス確認エラー（継続）:', error);
    }

    const existingIndexes = data?.map((row: { indexname: string }) => row.indexname) || [];

    return NextResponse.json({
      success: true,
      message: 'インデックス情報を取得しました',
      existing_indexes: existingIndexes,
      planned_indexes: indexes,
      instructions: {
        step1: 'Supabaseダッシュボードを開く',
        step2: 'SQL Editorに移動',
        step3: '以下のSQLを1つずつ実行',
        sqls: indexes.filter(idx => !existingIndexes.includes(idx.name)).map(idx => idx.sql)
      }
    });

  } catch (error) {
    console.error('API エラー:', error);
    return NextResponse.json({
      success: false,
      error: 'インデックス情報の取得に失敗しました',
      message: 'Supabaseダッシュボードでの直接実行をお勧めします'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'check_performance') {
      // パフォーマンス測定クエリ
      const testQueries = [
        {
          name: '個人タスク取得',
          sql: `
            EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) 
            SELECT id, text, completed, priority, created_at 
            FROM tasks 
            WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
            ORDER BY created_at DESC 
            LIMIT 20;
          `
        }
      ];

      return NextResponse.json({
        success: true,
        message: 'パフォーマンステスト用SQL',
        test_queries: testQueries,
        instructions: [
          '1. Supabaseダッシュボード > SQL Editor',
          '2. 上記SQLを実行',
          '3. "Index Scan" が使われているか確認',
          '4. Execution Timeの値を記録'
        ]
      });
    }

    return NextResponse.json({
      success: false,
      error: '無効なアクション',
      available_actions: ['check_performance']
    }, { status: 400 });

  } catch (error) {
    console.error('POST エラー:', error);
    return NextResponse.json({
      success: false,
      error: 'リクエスト処理に失敗しました'
    }, { status: 500 });
  }
}
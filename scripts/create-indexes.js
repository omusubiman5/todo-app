#!/usr/bin/env node

/**
 * Supabaseインデックス作成スクリプト
 * 使用方法: node scripts/create-indexes.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 環境変数を読み込み
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // サービスロールキーが必要

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 環境変数が設定されていません');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

// Supabaseクライアント作成（管理者権限）
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// インデックス作成SQLリスト
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

/**
 * 既存インデックスを確認
 */
async function checkExistingIndexes() {
  console.log('🔍 既存インデックスを確認中...');
  
  const { data, error } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'tasks' 
        AND indexname LIKE 'idx_tasks_%'
        ORDER BY indexname;
      `
    });

  if (error) {
    console.error('❌ インデックス確認エラー:', error);
    return [];
  }

  const existing = data?.map(row => row.indexname) || [];
  console.log('✅ 既存インデックス:', existing);
  return existing;
}

/**
 * インデックスを作成
 */
async function createIndex(index) {
  console.log(`\n🚀 ${index.description} を作成中...`);
  console.log(`SQL: ${index.sql}`);

  try {
    // exec_sqlが使用できない場合の代替方法
    const { data, error } = await supabase
      .from('tasks')
      .select('id')
      .limit(1); // 接続テスト

    if (error) {
      throw new Error(`接続エラー: ${error.message}`);
    }

    console.log('⚠️  注意: 直接SQLの実行はSupabaseダッシュボードで行ってください');
    console.log(`   ${index.sql}`);
    
    return { success: true, message: 'SQLを表示しました' };

  } catch (error) {
    console.error(`❌ ${index.name} 作成エラー:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * メイン実行関数
 */
async function main() {
  console.log('🗄️  Supabaseインデックス作成スクリプト');
  console.log('=====================================\n');

  try {
    // 既存インデックス確認
    const existingIndexes = await checkExistingIndexes();

    console.log('\n📋 実行予定のインデックス:');
    console.log('=====================================');

    // インデックス作成
    for (const index of indexes) {
      if (existingIndexes.includes(index.name)) {
        console.log(`⏭️  ${index.name} は既に存在します - スキップ`);
        continue;
      }

      const result = await createIndex(index);
      
      if (result.success) {
        console.log(`✅ ${index.name} - ${result.message}`);
      } else {
        console.error(`❌ ${index.name} - ${result.error}`);
      }

      // 間隔を空ける
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n🎉 スクリプト完了！');
    console.log('\n📝 次の手順:');
    console.log('1. 上記のSQLをSupabaseダッシュボードのSQL Editorで実行');
    console.log('2. 各SQLを1つずつ実行して結果を確認');
    console.log('3. 完了後、アプリでパフォーマンス改善を確認');

  } catch (error) {
    console.error('❌ スクリプト実行エラー:', error);
    process.exit(1);
  }
}

// スクリプト実行
main().catch(console.error);
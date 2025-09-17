#!/usr/bin/env node

/**
 * 🔍 データベースインデックス作成確認スクリプト
 *
 * Supabaseでインデックス作成後の状況を確認し、
 * パフォーマンス改善効果を検証します。
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('⚠️ Supabase環境変数が設定されていません');
  console.log('環境変数設定後に再実行するか、');
  console.log('Supabaseコンソールで直接確認してください。');
  console.log('\n📋 Supabaseコンソールでの確認手順:');
  console.log('1. https://supabase.com/dashboard にアクセス');
  console.log('2. プロジェクトを選択');
  console.log('3. SQL Editor で以下を実行:');

  console.log('\n-- インデックス一覧確認');
  console.log(`SELECT
    indexname,
    tablename,
    CASE
      WHEN indexname LIKE '%personal%' THEN '🚀 個人タスク高速化'
      WHEN indexname LIKE '%team%' THEN '🚀 チームタスク高速化'
      WHEN indexname LIKE '%status%' THEN '🚀 フィルタ高速化'
      WHEN indexname LIKE '%notification%' THEN '🚀 通知高速化'
      ELSE '🚀 その他最適化'
    END as optimization_type
  FROM pg_indexes
  WHERE tablename IN ('tasks', 'notifications', 'task_comments', 'task_history', 'team_members')
    AND indexname LIKE 'idx_%'
  ORDER BY tablename, indexname;`);

  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 データベースインデックス作成確認開始');
console.log('==========================================');

/**
 * インデックス確認メイン関数
 */
async function verifyIndexes() {
  try {
    console.log('📊 Supabase接続確認...');

    // 基本的な接続テスト
    const { data: testData, error: testError } = await supabase
      .from('tasks')
      .select('count', { count: 'exact', head: true })
      .limit(1);

    if (testError) {
      console.error('❌ Supabase接続エラー:', testError.message);
      console.log('\n💡 解決策:');
      console.log('1. .env.local ファイルのSupabase設定を確認');
      console.log('2. Supabaseプロジェクトのアクセス権限を確認');
      console.log('3. Supabaseコンソールで直接確認することをお勧めします');
      return false;
    }

    console.log('✅ Supabase接続成功');
    console.log(`📊 tasks テーブル総件数: ${testData || 0}件`);

    // インデックス使用状況の間接的確認（クエリパフォーマンステスト）
    await performanceTest();

    return true;

  } catch (error) {
    console.error('❌ 確認処理エラー:', error.message);
    console.log('\n💡 この場合はSupabaseコンソールで直接確認してください:');
    console.log('1. https://supabase.com/dashboard');
    console.log('2. SQL Editor で下記のクエリを実行');
    console.log('\nSELECT indexname FROM pg_indexes WHERE tablename = \'tasks\' AND indexname LIKE \'idx_%\';');
    return false;
  }
}

/**
 * パフォーマンステスト（インデックス効果の間接的確認）
 */
async function performanceTest() {
  console.log('\n⚡ インデックス効果のパフォーマンステスト');
  console.log('==========================================');

  const tests = [
    {
      name: '個人タスク検索',
      description: 'idx_tasks_personal_main の効果確認',
      testFunc: testPersonalTasks
    },
    {
      name: 'チームタスク検索',
      description: 'idx_tasks_team_main の効果確認',
      testFunc: testTeamTasks
    },
    {
      name: 'フィルタリング',
      description: 'idx_tasks_status_filter の効果確認',
      testFunc: testFilteredTasks
    },
    {
      name: '通知検索',
      description: 'idx_notifications_unread_main の効果確認',
      testFunc: testNotifications
    }
  ];

  const results = [];

  for (const test of tests) {
    console.log(`\n🧪 ${test.name}テスト実行中...`);

    try {
      const result = await test.testFunc();
      results.push({
        name: test.name,
        description: test.description,
        success: true,
        duration: result.duration,
        recordCount: result.recordCount
      });

      // パフォーマンス評価
      let performance = '';
      if (result.duration < 100) {
        performance = '🚀 優秀 (インデックス効果大)';
      } else if (result.duration < 300) {
        performance = '✅ 良好 (インデックス効果中)';
      } else if (result.duration < 1000) {
        performance = '⚠️ 普通 (インデックス確認要)';
      } else {
        performance = '🚨 要改善 (インデックス未適用?)';
      }

      console.log(`  ✅ ${test.name}: ${result.duration}ms (${result.recordCount}件) - ${performance}`);

    } catch (error) {
      console.log(`  ❌ ${test.name}: エラー - ${error.message}`);
      results.push({
        name: test.name,
        description: test.description,
        success: false,
        error: error.message
      });
    }
  }

  // 結果サマリー
  console.log('\n📈 パフォーマンステスト結果サマリー');
  console.log('==========================================');

  const successfulTests = results.filter(r => r.success);
  const averageDuration = successfulTests.length > 0
    ? Math.round(successfulTests.reduce((sum, r) => sum + (r.duration || 0), 0) / successfulTests.length)
    : 0;

  console.log(`成功テスト: ${successfulTests.length}/${results.length}`);
  console.log(`平均実行時間: ${averageDuration}ms`);

  if (averageDuration < 200) {
    console.log('🎉 インデックスが正常に作成され、優秀なパフォーマンスです！');
  } else if (averageDuration < 500) {
    console.log('✅ 良好なパフォーマンスですが、更なる最適化の余地があります');
  } else {
    console.log('⚠️ パフォーマンス改善が必要です。インデックス作成を確認してください');
  }

  return results;
}

/**
 * 個人タスク検索テスト
 */
async function testPersonalTasks() {
  const startTime = performance.now();

  const { data, error } = await supabase
    .from('tasks')
    .select('id, text, completed, priority, created_at')
    .is('team_id', null)
    .order('created_at', { ascending: false })
    .limit(50);

  const endTime = performance.now();

  if (error) throw error;

  return {
    duration: Math.round(endTime - startTime),
    recordCount: data?.length || 0
  };
}

/**
 * チームタスク検索テスト
 */
async function testTeamTasks() {
  const startTime = performance.now();

  const { data, error } = await supabase
    .from('tasks')
    .select('id, text, priority, created_at')
    .not('team_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50);

  const endTime = performance.now();

  if (error) throw error;

  return {
    duration: Math.round(endTime - startTime),
    recordCount: data?.length || 0
  };
}

/**
 * フィルタリングテスト
 */
async function testFilteredTasks() {
  const startTime = performance.now();

  const { data, error } = await supabase
    .from('tasks')
    .select('id, text, priority')
    .eq('completed', false)
    .in('priority', ['高', '中'])
    .order('created_at', { ascending: false })
    .limit(30);

  const endTime = performance.now();

  if (error) throw error;

  return {
    duration: Math.round(endTime - startTime),
    recordCount: data?.length || 0
  };
}

/**
 * 通知検索テスト
 */
async function testNotifications() {
  const startTime = performance.now();

  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  const endTime = performance.now();

  if (error) throw error;

  return {
    duration: Math.round(endTime - startTime),
    recordCount: data?.length || 0
  };
}

/**
 * 推奨アクション表示
 */
function showRecommendations(averageDuration) {
  console.log('\n💡 推奨アクション');
  console.log('==========================================');

  if (averageDuration < 100) {
    console.log('🎉 素晴らしい！次のステップ:');
    console.log('1. OptimizedTaskBoard のテスト運用開始');
    console.log('2. 本格的なパフォーマンステストの実行');
    console.log('3. エンドユーザーでのUX改善確認');
  } else if (averageDuration < 300) {
    console.log('✅ 良好！更なる改善のために:');
    console.log('1. Supabaseコンソールでインデックス一覧確認');
    console.log('2. 実行計画 (EXPLAIN ANALYZE) での詳細確認');
    console.log('3. 追加インデックスの検討');
  } else {
    console.log('⚠️ 改善が必要！以下を確認:');
    console.log('1. supabase-critical-indexes.sql の実行確認');
    console.log('2. Supabaseコンソールでのインデックス存在確認');
    console.log('3. データ量が多い場合のインデックス作成完了待ち');
  }

  console.log('\n📚 詳細確認方法:');
  console.log('- Supabaseコンソール → SQL Editor');
  console.log('- SUPABASE_INDEX_CREATION_GUIDE.md を参照');
  console.log('- npm run db:benchmark で詳細測定');
}

// メイン実行
async function main() {
  try {
    const success = await verifyIndexes();

    if (success) {
      console.log('\n✅ インデックス確認完了');
    }

    console.log('\n🚀 次のステップ:');
    console.log('1. OptimizedTaskBoard のテスト導入');
    console.log('2. npm run db:benchmark で詳細パフォーマンス測定');
    console.log('3. 本格運用開始の準備');

  } catch (error) {
    console.error('❌ 確認処理エラー:', error);
    console.log('\nSupabaseコンソールでの手動確認をお勧めします');
  }
}

// 実行開始
if (require.main === module) {
  main();
}

module.exports = { verifyIndexes, performanceTest };
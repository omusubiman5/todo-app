#!/usr/bin/env node

/**
 * 🔬 データベースパフォーマンスベンチマークテスト
 *
 * インデックス作成前後のクエリ実行時間を測定し、
 * 最適化効果を定量的に評価します。
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔬 データベースパフォーマンスベンチマーク開始');
console.log('==========================================');

/**
 * ベンチマークテスト実行関数
 */
async function runBenchmark() {
  const results = [];

  try {
    // 現在のユーザーを取得（テスト用）
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('⚠️ 認証されていません。テストデータで実行します。');
    }

    const testUserId = user?.id || 'test-user-id';
    console.log(`🧪 テスト対象ユーザー: ${testUserId}`);

    // テスト1: 個人タスク一覧取得（最頻出クエリ）
    console.log('\n📊 テスト1: 個人タスク一覧取得');
    const personalTasksResult = await measureQuery(
      '個人タスク一覧',
      () => supabase
        .from('tasks')
        .select('id, text, completed, priority, created_at')
        .eq('user_id', testUserId)
        .is('team_id', null)
        .order('created_at', { ascending: false })
        .limit(50)
    );
    results.push(personalTasksResult);

    // テスト2: チーム内アクティブタスク検索
    console.log('\n📊 テスト2: チーム内アクティブタスク検索');
    const teamTasksResult = await measureQuery(
      'チーム内アクティブタスク',
      () => supabase
        .from('tasks')
        .select('id, text, priority, assigned_to, created_at')
        .not('team_id', 'is', null)
        .eq('completed', false)
        .order('created_at', { ascending: false })
        .limit(50)
    );
    results.push(teamTasksResult);

    // テスト3: 担当者の未完了タスク検索
    console.log('\n📊 テスト3: 担当者の未完了タスク検索');
    const assignedTasksResult = await measureQuery(
      '担当者の未完了タスク',
      () => supabase
        .from('tasks')
        .select('id, text, priority, created_at')
        .eq('assigned_to', testUserId)
        .eq('completed', false)
        .order('priority')
        .order('created_at', { ascending: false })
    );
    results.push(assignedTasksResult);

    // テスト4: 未読通知取得
    console.log('\n📊 テスト4: 未読通知取得');
    const notificationsResult = await measureQuery(
      '未読通知',
      () => supabase
        .from('notifications')
        .select('id, type, data, created_at')
        .eq('user_id', testUserId)
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(20)
    );
    results.push(notificationsResult);

    // テスト5: タスクコメント取得
    console.log('\n📊 テスト5: タスクコメント取得');
    const commentsResult = await measureQuery(
      'タスクコメント',
      () => supabase
        .from('task_comments')
        .select('id, user_id, content, created_at')
        .order('created_at', { ascending: true })
        .limit(100)
    );
    results.push(commentsResult);

    // テスト6: 複合クエリ（JOIN相当）
    console.log('\n📊 テスト6: 複合クエリ（プロフィール情報付き）');
    const joinResult = await measureQuery(
      '複合クエリ（プロフィール付き）',
      () => supabase
        .from('tasks')
        .select(`
          id, text, completed, priority, assigned_to, created_at,
          profiles!tasks_assigned_to_fkey(display_name, avatar_url)
        `)
        .eq('user_id', testUserId)
        .order('created_at', { ascending: false })
        .limit(30)
    );
    results.push(joinResult);

  } catch (error) {
    console.error('❌ ベンチマーク実行エラー:', error);
  }

  // 結果まとめ
  console.log('\n📈 ベンチマーク結果サマリー');
  console.log('==========================================');

  let totalTime = 0;
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    const timing = result.executionTime ? `${result.executionTime}ms` : 'N/A';
    const records = result.recordCount !== undefined ? `(${result.recordCount}件)` : '';

    console.log(`${status} ${result.name}: ${timing} ${records}`);

    if (result.executionTime) {
      totalTime += result.executionTime;
    }
  });

  console.log(`\n🕒 総実行時間: ${totalTime}ms`);
  console.log(`📊 平均クエリ時間: ${Math.round(totalTime / results.filter(r => r.success).length)}ms`);

  // パフォーマンス評価
  console.log('\n🎯 パフォーマンス評価:');
  results.forEach(result => {
    if (result.success && result.executionTime) {
      let rating, recommendation;

      if (result.executionTime < 100) {
        rating = '🚀 優秀';
        recommendation = '最適化済み';
      } else if (result.executionTime < 300) {
        rating = '✅ 良好';
        recommendation = '問題なし';
      } else if (result.executionTime < 1000) {
        rating = '⚠️ 注意';
        recommendation = 'インデックス要検討';
      } else {
        rating = '🚨 要改善';
        recommendation = '緊急最適化が必要';
      }

      console.log(`  ${result.name}: ${rating} (${recommendation})`);
    }
  });

  // 改善提案
  const slowQueries = results.filter(r => r.success && r.executionTime > 300);
  if (slowQueries.length > 0) {
    console.log('\n💡 改善提案:');
    slowQueries.forEach(query => {
      console.log(`  • ${query.name}: インデックス作成を推奨`);
    });
    console.log('  詳細: supabase-critical-indexes.sql を実行してください');
  } else {
    console.log('\n🎉 全クエリが良好なパフォーマンスです！');
  }

  return results;
}

/**
 * クエリ実行時間測定関数
 */
async function measureQuery(name, queryFunction) {
  const iterations = 3; // 3回実行して平均を取る
  const times = [];
  let lastResult = null;
  let success = true;

  try {
    console.log(`  実行中... (${iterations}回平均)`);

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      const result = await queryFunction();
      const endTime = performance.now();

      if (result.error) {
        console.error(`    ❌ エラー (${i + 1}/${iterations}):`, result.error.message);
        success = false;
        break;
      }

      times.push(endTime - startTime);
      lastResult = result;

      // 実行間隔を空ける
      if (i < iterations - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    if (success && times.length > 0) {
      const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      const recordCount = lastResult?.data?.length || 0;

      console.log(`    ✅ 平均実行時間: ${avgTime}ms (${recordCount}件取得)`);

      return {
        name,
        success: true,
        executionTime: avgTime,
        recordCount,
        rawTimes: times
      };
    } else {
      return {
        name,
        success: false,
        executionTime: null,
        recordCount: 0
      };
    }

  } catch (error) {
    console.error(`    ❌ 実行エラー:`, error.message);
    return {
      name,
      success: false,
      executionTime: null,
      recordCount: 0,
      error: error.message
    };
  }
}

/**
 * インデックス状況確認
 */
async function checkIndexes() {
  console.log('\n🔍 インデックス状況確認');
  console.log('==========================================');

  try {
    // PostgreSQLのインデックス情報を取得（RPC関数が必要）
    console.log('📋 作成済みインデックス:');
    console.log('  • この情報を確認するにはSupabaseコンソールの');
    console.log('    SQL Editorで以下を実行してください:');
    console.log('');
    console.log('    SELECT indexname, tablename');
    console.log('    FROM pg_indexes');
    console.log('    WHERE tablename IN (\'tasks\', \'notifications\', \'task_comments\')');
    console.log('      AND indexname LIKE \'idx_%\';');

  } catch (error) {
    console.log('⚠️ インデックス情報の取得にはSupabaseコンソールを使用してください');
  }
}

// メイン実行
async function main() {
  try {
    await checkIndexes();
    const results = await runBenchmark();

    console.log('\n✅ ベンチマーク完了');
    console.log('\n次のステップ:');
    console.log('1. パフォーマンスが遅い場合: supabase-critical-indexes.sql を実行');
    console.log('2. インデックス作成後: 再度このベンチマークを実行');
    console.log('3. OptimizedTaskService の導入を検討');

  } catch (error) {
    console.error('❌ ベンチマーク実行エラー:', error);
    process.exit(1);
  }
}

// 実行開始
if (require.main === module) {
  main();
}

module.exports = { runBenchmark, measureQuery };
/**
 * 緊急テストデータクリーンアップスクリプト
 * 
 * 本番データベースに蓄積されたテストデータを安全に削除します
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// .env.localファイルを手動で読み込み
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const TEST_DATA_PATTERNS = [
  '%テスト%',
  '%ベンチマーク%', 
  '%大量データ%',
  '%高速テスト%',
  '%改良版テスト%',
  '%E2Eテスト%',
  '%最終テスト%',
  '%編集前タスク%',
  '%test%',
  '%benchmark%',
  '%debug%',
  '%temp%'
];

async function identifyTestData() {
  console.log('🔍 テストデータを特定中...');
  
  let allTestTasks = [];
  
  for (const pattern of TEST_DATA_PATTERNS) {
    const { data, error } = await supabase
      .from('tasks')
      .select('id, text, created_at')
      .ilike('text', pattern);
      
    if (error) {
      console.error(`パターン ${pattern} でエラー:`, error);
      continue;
    }
    
    if (data && data.length > 0) {
      console.log(`📝 パターン "${pattern}": ${data.length}件見つかりました`);
      allTestTasks.push(...data);
    }
  }
  
  // 重複除去
  const uniqueTestTasks = allTestTasks.reduce((acc, task) => {
    if (!acc.find(t => t.id === task.id)) {
      acc.push(task);
    }
    return acc;
  }, []);
  
  console.log(`\n📊 合計テストデータ: ${uniqueTestTasks.length}件`);
  
  return uniqueTestTasks;
}

async function deleteTestData(testTasks) {
  if (testTasks.length === 0) {
    console.log('✅ 削除するテストデータがありません');
    return;
  }
  
  console.log(`\n🗑️  ${testTasks.length}件のテストデータを削除中...`);
  
  const taskIds = testTasks.map(task => task.id);
  
  const { error } = await supabase
    .from('tasks')
    .delete()
    .in('id', taskIds);
    
  if (error) {
    console.error('❌ 削除エラー:', error);
    throw error;
  }
  
  console.log('✅ テストデータ削除完了');
}

async function verifyCleanup() {
  console.log('\n🔍 クリーンアップ確認中...');
  
  const { data, error } = await supabase
    .from('tasks')
    .select('count')
    .or(TEST_DATA_PATTERNS.map(pattern => `text.ilike.${pattern}`).join(','));
    
  if (error) {
    console.error('確認エラー:', error);
    return;
  }
  
  const remainingCount = data?.length || 0;
  
  if (remainingCount === 0) {
    console.log('✅ テストデータクリーンアップ完了');
  } else {
    console.log(`⚠️  ${remainingCount}件のテストデータが残っています`);
  }
}

async function main() {
  console.log('🚨 緊急テストデータクリーンアップ開始\n');
  
  try {
    // 1. テストデータ特定
    const testTasks = await identifyTestData();
    
    if (testTasks.length > 0) {
      console.log('\n📋 削除予定のテストデータ:');
      testTasks.slice(0, 10).forEach(task => {
        console.log(`  - ${task.text.substring(0, 50)}...`);
      });
      
      if (testTasks.length > 10) {
        console.log(`  ... 他 ${testTasks.length - 10}件`);
      }
      
      // 2. テストデータ削除
      await deleteTestData(testTasks);
      
      // 3. 確認
      await verifyCleanup();
    }
    
    console.log('\n🎯 クリーンアップ処理完了');
    
  } catch (error) {
    console.error('❌ クリーンアップ失敗:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { identifyTestData, deleteTestData, verifyCleanup };
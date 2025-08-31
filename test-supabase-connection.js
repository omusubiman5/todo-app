// Supabase接続テスト用スクリプト
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testSupabaseConnection() {
  console.log('🔍 Supabase接続テストを開始します...\n');
  
  // 環境変数の確認
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log('📋 環境変数チェック:');
  console.log(`- SUPABASE_URL: ${supabaseUrl ? '✅ 設定済み' : '❌ 未設定'}`);
  console.log(`- SUPABASE_ANON_KEY: ${supabaseKey ? '✅ 設定済み' : '❌ 未設定'}\n`);
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ 環境変数が設定されていません。');
    console.log('📝 .env.localファイルに以下を追加してください:');
    console.log('NEXT_PUBLIC_SUPABASE_URL=your_supabase_url');
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key');
    return;
  }
  
  try {
    // Supabaseクライアント作成
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 1. 基本的な接続テスト
    console.log('🔗 基本接続テスト...');
    const { data, error } = await supabase
      .from('tasks')
      .select('count', { count: 'exact', head: true });
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    console.log('✅ データベースに接続できました！');
    
    // 2. テーブル存在確認
    console.log('\n📊 テーブル存在確認:');
    const tables = ['tasks', 'teams', 'team_members', 'profiles', 'task_comments', 'task_history', 'notifications'];
    
    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('count', { count: 'exact', head: true });
        
        if (error && error.code === 'PGRST116') {
          console.log(`- ${table}: ❌ テーブルが存在しません`);
        } else if (error) {
          console.log(`- ${table}: ⚠️ エラー: ${error.message}`);
        } else {
          console.log(`- ${table}: ✅ 存在します`);
        }
      } catch (err) {
        console.log(`- ${table}: ❌ アクセスできません`);
      }
    }
    
    // 3. RPC関数存在確認
    console.log('\n⚡ RPC関数存在確認:');
    const rpcFunctions = [
      'get_user_task_statistics',
      'bulk_update_tasks', 
      'get_tasks_with_filters',
      'cleanup_completed_tasks'
    ];
    
    for (const func of rpcFunctions) {
      try {
        // ダミーパラメータでテスト（エラー内容で存在確認）
        const { error } = await supabase.rpc(func);
        
        if (error && error.message.includes('function') && error.message.includes('does not exist')) {
          console.log(`- ${func}: ❌ 関数が存在しません`);
        } else {
          console.log(`- ${func}: ✅ 関数が存在します`);
        }
      } catch (err) {
        console.log(`- ${func}: ✅ 関数が存在します（パラメータエラー）`);
      }
    }
    
    // 4. 認証テスト
    console.log('\n🔐 認証テスト:');
    const { data: user, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('- 認証: ❌ 未認証（正常）');
    } else {
      console.log(`- 認証: ✅ ログイン済み - ${user.user?.email || 'ユーザー'}`);
    }
    
    console.log('\n🎉 接続テスト完了！');
    
  } catch (error) {
    console.error('\n❌ 接続エラー:', error);
    
    // エラー別の対処法
    if (error.message.includes('Invalid API key')) {
      console.log('\n💡 対処法: SUPABASE_ANON_KEYが間違っています');
    } else if (error.message.includes('Invalid URL')) {
      console.log('\n💡 対処法: SUPABASE_URLが間違っています');  
    } else if (error.message.includes('network')) {
      console.log('\n💡 対処法: インターネット接続を確認してください');
    }
  }
}

// テスト実行
if (require.main === module) {
  testSupabaseConnection();
}

module.exports = { testSupabaseConnection };
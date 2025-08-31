const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function implementRLSPolicies() {
  console.log('🔧 Supabase API経由でRLSポリシーを実装...');
  console.log('=' * 60);

  // 環境変数確認
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase環境変数が設定されていません');
    return;
  }

  // Admin clientを使用（可能な場合）
  const supabase = createClient(
    supabaseUrl, 
    serviceRoleKey || supabaseKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  try {
    console.log('🔍 現在のRLS状態を確認...');
    
    // 1. tasksテーブルのRLS確認
    console.log('\n📊 テーブル一覧とRLS状態確認...');
    
    // RPC関数でRLS状態を確認
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_table_info')
      .catch(() => ({ data: null, error: 'RPC function not available' }));
      
    if (tablesError) {
      console.log('⚠️ RPC経由でのテーブル情報取得不可:', tablesError);
      console.log('💡 代替方法でRLS設定を試行します...');
    }

    // 2. 各テーブルでRLS有効化を試行
    const targetTables = ['tasks', 'profiles', 'teams', 'team_members', 'notifications'];
    
    for (const tableName of targetTables) {
      console.log(`\n🔧 ${tableName}テーブルのRLS設定...`);
      
      try {
        // RLS有効化試行
        const { error: rlsError } = await supabase
          .rpc('enable_rls_if_exists', { table_name: tableName })
          .catch(() => ({ error: 'RPC not available' }));
          
        if (rlsError && rlsError !== 'RPC not available') {
          console.log(`⚠️ ${tableName}: RLS有効化エラー -`, rlsError.message);
        }
        
        // テーブル存在確認
        const { data: testData, error: testError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
          
        if (testError) {
          if (testError.code === 'PGRST116') {
            console.log(`❌ ${tableName}: テーブルが存在しません`);
          } else if (testError.code === 'PGRST301') {
            console.log(`✅ ${tableName}: RLS保護が有効`);
          } else {
            console.log(`⚠️ ${tableName}: ${testError.message}`);
          }
        } else {
          console.log(`🚨 ${tableName}: RLS保護なし - 未認証アクセス可能`);
        }
        
      } catch (e) {
        console.log(`❌ ${tableName}: 設定エラー -`, e.message);
      }
    }

    console.log('\n🛠️ SQLファイル経由での設定を推奨...');
    
    // SQLファイルの内容を表示
    const sqlFilePath = path.join(__dirname, 'fix-rls-policies.sql');
    if (fs.existsSync(sqlFilePath)) {
      console.log('\n📄 以下のSQLをSupabaseダッシュボードで実行してください:');
      console.log('=' * 60);
      console.log('https://supabase.com/dashboard → SQL Editor');
      console.log('=' * 60);
      
      const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
      // 最初の100行のみ表示
      const lines = sqlContent.split('\n');
      const previewLines = lines.slice(0, 50);
      console.log(previewLines.join('\n'));
      
      if (lines.length > 50) {
        console.log(`\n... (残り ${lines.length - 50} 行)`);
      }
      
      console.log('\n=' * 60);
    }
    
    console.log('\n🎯 次のステップ:');
    console.log('1. https://supabase.com/dashboard にアクセス');
    console.log('2. プロジェクトを選択');
    console.log('3. SQL Editor に移動');
    console.log('4. fix-rls-policies.sql の内容をコピー&ペースト');
    console.log('5. "Run" ボタンをクリック');
    console.log('6. verify-rls-fix.js で確認実行');
    
  } catch (error) {
    console.error('💥 RLS実装エラー:', error.message);
    
    console.log('\n🔄 代替手段:');
    console.log('- Supabase Dashboard での手動実行');
    console.log('- Service Role Key の設定');
    console.log('- ローカル Supabase CLI の使用');
  }
}

// Supabase接続テスト
async function testSupabaseConnection() {
  console.log('🔍 Supabase接続テスト...');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error && error.message !== 'Auth session missing!') {
      throw error;
    }
    console.log('✅ Supabase接続正常');
    return true;
  } catch (e) {
    console.log('❌ Supabase接続エラー:', e.message);
    return false;
  }
}

// メイン実行
async function main() {
  const connected = await testSupabaseConnection();
  if (connected) {
    await implementRLSPolicies();
  }
}

main().catch(console.error);
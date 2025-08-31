const { createClient } = require('@supabase/supabase-js');

async function rlsImplementationAssistant() {
  console.log('🤖 RLS実装アシスタント起動...');
  console.log('=' * 60);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. 現在の状態確認
  console.log('🔍 Step 1: 現在のRLS状態確認');
  const currentStatus = await checkCurrentRLSStatus(supabase);
  
  // 2. 実装手順の案内
  console.log('\n📋 Step 2: 実装手順');
  showImplementationSteps();
  
  // 3. SQLプレビュー
  console.log('\n📄 Step 3: 実行するSQL (プレビュー)');
  showSQLPreview();
  
  // 4. 実行後の検証方法
  console.log('\n✅ Step 4: 実行後の検証');
  showVerificationSteps();
  
  // 5. トラブルシューティング
  console.log('\n🔧 Step 5: トラブルシューティング');
  showTroubleshooting();
  
  return currentStatus;
}

async function checkCurrentRLSStatus(supabase) {
  const tables = ['tasks', 'profiles', 'teams', 'team_members', 'notifications'];
  const status = {};
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      
      if (error?.code === 'PGRST301') {
        status[table] = '✅ RLS有効';
      } else if (error?.code === 'PGRST116') {
        status[table] = '❌ 未存在';
      } else if (error) {
        status[table] = '⚠️ エラー';
      } else {
        status[table] = '🚨 RLS無効';
      }
    } catch (e) {
      status[table] = '❌ 接続エラー';
    }
  }
  
  Object.entries(status).forEach(([table, state]) => {
    console.log(`${state}: ${table}`);
  });
  
  const needsRLS = Object.values(status).filter(s => s === '🚨 RLS無効').length;
  if (needsRLS > 0) {
    console.log(`\n🚨 ${needsRLS}個のテーブルでRLS設定が必要です`);
  } else {
    console.log('\n🎉 全テーブルでRLS設定済み！');
  }
  
  return status;
}

function showImplementationSteps() {
  console.log('┌─────────────────────────────────────────────────────────┐');
  console.log('│                    実装手順                              │');
  console.log('├─────────────────────────────────────────────────────────┤');
  console.log('│ 1. https://supabase.com/dashboard にアクセス            │');
  console.log('│ 2. プロジェクト "zmxnsfjmusgmapxbcbpn" を選択           │');
  console.log('│ 3. 左メニュー "SQL Editor" をクリック                  │');
  console.log('│ 4. "New query" をクリック                              │');
  console.log('│ 5. 下記のSQLをコピー&ペースト                          │');
  console.log('│ 6. "Run" ボタンをクリック                              │');
  console.log('│ 7. 実行完了を確認                                      │');
  console.log('│ 8. node verify-rls-fix.js で検証                      │');
  console.log('└─────────────────────────────────────────────────────────┘');
}

function showSQLPreview() {
  console.log('-- 🔒 RLS設定SQL (コピー&ペースト用)');
  console.log('-- ===================================');
  console.log('');
  
  const sql = `-- Step 1: 全テーブルでRLS有効化
ALTER TABLE IF EXISTS public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;  
ALTER TABLE IF EXISTS public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

-- Step 2: tasksテーブルのポリシー設定
CREATE POLICY "Users can view own tasks" ON public.tasks
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can create own tasks" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update own tasks" ON public.tasks
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY "Users can delete own tasks" ON public.tasks
  FOR DELETE USING (auth.uid() = user_id);

-- Step 3: profilesテーブルのポリシー設定
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
  
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Step 4: notificationsテーブルのポリシー設定
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- 完了: RLS設定適用完了`;
  
  console.log(sql);
  console.log('');
  console.log('-- ===================================');
  console.log('-- 📄 上記SQLをSupabaseで実行してください');
}

function showVerificationSteps() {
  console.log('🔍 実行後の確認方法:');
  console.log('');
  console.log('1. 以下のコマンドで検証:');
  console.log('   node verify-rls-fix.js');
  console.log('');
  console.log('2. 期待される結果:');
  console.log('   ✅ tasks: RLS正常 - 未認証アクセス拒否');
  console.log('   ✅ profiles: RLS正常 - 未認証アクセス拒否');
  console.log('   ✅ teams: RLS正常 - 未認証アクセス拒否');
  console.log('   ✅ team_members: RLS正常 - 未認証アクセス拒否');
  console.log('   ✅ notifications: RLS正常 - 未認証アクセス拒否');
  console.log('');
  console.log('3. セキュリティテスト実行:');
  console.log('   node security-test.js');
}

function showTroubleshooting() {
  console.log('🔧 よくある問題と解決法:');
  console.log('');
  console.log('❌ "relation does not exist" エラー');
  console.log('   → テーブルが存在しない可能性。アプリケーションで作成してください');
  console.log('');
  console.log('❌ "insufficient privileges" エラー');
  console.log('   → 管理者権限が必要。プロジェクトオーナーで実行してください');
  console.log('');
  console.log('❌ ポリシーが適用されない');
  console.log('   → ブラウザキャッシュをクリアしてから再テストしてください');
  console.log('');
  console.log('🆘 サポート:');
  console.log('   - Supabase Discord: https://discord.supabase.com/');
  console.log('   - Documentation: https://supabase.com/docs/guides/auth/row-level-security');
}

// 進行状況の追跡
function trackProgress() {
  console.log('\n📊 実装進行状況:');
  console.log('');
  console.log('Phase 1: 準備 ✅');
  console.log('  └ SQL生成完了');
  console.log('  └ 手順書作成完了');
  console.log('  └ 検証ツール準備完了');
  console.log('');
  console.log('Phase 2: 実装 🔄');
  console.log('  └ Supabaseダッシュボードアクセス');
  console.log('  └ SQL実行');
  console.log('');
  console.log('Phase 3: 検証 ⏳');
  console.log('  └ RLS動作確認');
  console.log('  └ セキュリティテスト');
  console.log('');
  console.log('🎯 現在: Phase 2 (実装)');
  console.log('📍 次のアクション: SupabaseダッシュボードでのSQL実行');
}

// メイン実行
async function main() {
  try {
    await rlsImplementationAssistant();
    trackProgress();
    
    console.log('\n🚀 準備完了！');
    console.log('📋 次は Supabase Dashboard でのSQL実行です');
    console.log('🔗 https://supabase.com/dashboard');
    
  } catch (error) {
    console.error('💥 アシスタントエラー:', error.message);
  }
}

main();
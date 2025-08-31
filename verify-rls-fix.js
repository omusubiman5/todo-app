
const { createClient } = require('@supabase/supabase-js');

async function verifyRLSFix() {
  console.log('🔍 RLS修正後の検証テスト...');
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  const tables = ['tasks', 'profiles', 'notifications', 'teams', 'team_members'];
  let allSecure = true;
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      
      if (error && (error.code === 'PGRST301' || error.message.includes('JWT'))) {
        console.log(`✅ ${table}: RLS正常 - 未認証アクセス拒否`);
      } else if (error) {
        console.log(`⚠️ ${table}: その他エラー - ${error.message}`);
      } else {
        console.log(`🚨 ${table}: 未認証アクセス成功 - RLS設定要確認`);
        allSecure = false;
      }
    } catch (e) {
      console.log(`❌ ${table}: 接続エラー - ${e.message}`);
    }
  }
  
  console.log(`\n📊 RLS セキュリティ状態: ${allSecure ? '✅ 安全' : '🚨 要修正'}`);
  return allSecure;
}

verifyRLSFix().catch(console.error);

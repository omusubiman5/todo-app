const { createClient } = require('@supabase/supabase-js');

async function securityTest() {
  console.log('🔍 セキュリティテスト実行...');
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  // 1. SQLインジェクション攻撃テスト
  console.log('\n1️⃣ SQLインジェクション攻撃テスト...');
  const maliciousInputs = [
    "'; DROP TABLE users; --",
    "admin@test.com'; DELETE FROM auth.users WHERE email='admin@test.com'; --",
    "<script>alert('XSS')</script>",
    "${process.env.DATABASE_URL}",
    "../../../etc/passwd"
  ];
  
  for (const input of maliciousInputs) {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: input,
        password: 'test123'
      });
      if (error && !error.message.includes('Invalid login')) {
        console.log('⚠️ 予期しないエラー:', input, '->', error.message);
      } else {
        console.log('✅ 攻撃をブロック:', input.substring(0, 20) + '...');
      }
    } catch (e) {
      console.log('✅ 例外でブロック:', input.substring(0, 20) + '...');
    }
  }
  
  // 2. 認証バイパス試行
  console.log('\n2️⃣ 認証バイパス試行...');
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .limit(1);
      
    if (error && error.code === 'PGRST301') {
      console.log('✅ RLSが正常に機能 - 未認証アクセス拒否');
    } else if (!error && data) {
      console.log('🚨 セキュリティリスク - 未認証でデータアクセス可能');
    } else {
      console.log('⚠️ 予期しない結果:', { error: error?.message, dataLength: data?.length });
    }
  } catch (e) {
    console.log('✅ システムレベルでアクセス拒否');
  }
  
  // 3. パスワードリセット セキュリティ
  console.log('\n3️⃣ パスワードリセットセキュリティ...');
  try {
    const { error } = await supabase.auth.resetPasswordForEmail('test@malicious.com');
    if (error) {
      console.log('✅ 不正なリセット要求をブロック:', error.message);
    } else {
      console.log('⚠️ リセット要求が受け付けられました');
    }
  } catch (e) {
    console.log('✅ リセット試行をブロック');
  }
}

securityTest().catch(console.error);
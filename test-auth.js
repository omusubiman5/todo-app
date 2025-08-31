const { createClient } = require('@supabase/supabase-js');

async function diagnoseAuthSettings() {
  console.log('🔍 Supabase認証設定の診断開始...');
  const supabase = createClient(
    'https://zmxnsfjmusgmapxbcbpn.supabase.co/',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpteG5zZmptdXNnbWFweGJjYnBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MTA2MTEsImV4cCI6MjA2ODQ4NjYxMX0.PoDsoL4V0_fpVdyLfQvMTEPoQyn4Lv8ZVsXCW3UWJ2Q'
  );
  
  try {
    // 1. 基本接続テスト
    console.log('1️⃣ 基本接続テスト...');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError && sessionError.message !== 'Auth session missing!') {
      console.log('❌ 接続エラー:', sessionError.message);
      return;
    }
    console.log('✅ Supabase接続正常');
    
    // 2. 認証設定確認 - サインアップテスト
    console.log('\n2️⃣ 認証設定確認...');
    const testEmail = `auth-test-${Date.now()}@gmail.com`;
    const testPassword = 'TestPassword123!';
    
    const signupResult = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    });
    
    console.log('📊 サインアップテスト結果:');
    console.log('- エラー:', signupResult.error?.message || 'なし');
    console.log('- ユーザー作成:', signupResult.data?.user ? '成功' : '失敗');
    console.log('- セッション作成:', signupResult.data?.session ? '成功' : '失敗');
    console.log('- メール確認状態:', signupResult.data?.user?.email_confirmed_at ? '確認済み' : '未確認');
    
    if (signupResult.data?.user) {
      console.log('\n3️⃣ 作成したユーザーでログインテスト...');
      await supabase.auth.signOut(); // 既存セッションをクリア
      
      const loginResult = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });
      
      console.log('📊 ログインテスト結果:');
      console.log('- エラー:', loginResult.error?.message || 'なし');
      console.log('- ユーザー取得:', loginResult.data?.user ? '成功' : '失敗');
      console.log('- セッション取得:', loginResult.data?.session ? '成功' : '失敗');
      
      if (loginResult.error) {
        if (loginResult.error.message.includes('Email not confirmed')) {
          console.log('\n🔍 メール確認が必要です');
          console.log('💡 Supabase設定確認項目:');
          console.log('1. Authentication → Settings → Email confirmation: 無効化を検討');
          console.log('2. または Authentication → Users で手動確認');
        } else if (loginResult.error.message.includes('Invalid login credentials')) {
          console.log('\n❌ 認証情報が無効');
          console.log('💡 パスワードポリシーまたはユーザー状態を確認');
        } else {
          console.log('\n❓ その他の認証エラー:', loginResult.error.message);
        }
      } else if (loginResult.data?.session) {
        console.log('\n✅ ログイン成功！認証システムは正常動作');
        await supabase.auth.signOut();
      }
    }
    
    // 4. 認証プロバイダー設定確認
    console.log('\n4️⃣ 推奨Supabase設定確認項目:');
    console.log('🔧 Authentication → Settings で以下を確認:');
    console.log('- Site URL: http://localhost:3000');
    console.log('- Redirect URLs: http://localhost:3000/**');
    console.log('- Email confirmation: 開発環境では無効化推奨');
    console.log('- Auto confirm users: 開発環境では有効化推奨');
    
  } catch (error) {
    console.error('💥 診断エラー:', error.message);
  }
}

diagnoseAuthSettings();
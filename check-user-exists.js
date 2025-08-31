/**
 * ユーザーアカウントの存在確認
 */
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zmxnsfjmusgmapxbcbpn.supabase.co/';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpteG5zZmptdXNnbWFweGJjYnBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MTA2MTEsImV4cCI6MjA2ODQ4NjYxMX0.PoDsoL4V0_fpVdyLfQvMTEPoQyn4Lv8ZVsXCW3UWJ2Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
  console.log('🔍 ユーザーアカウント存在確認...\n');

  try {
    // 新規ユーザー作成テスト（一時的）
    const testEmail = 'test.' + Date.now() + '@gmail.com';
    const testPassword = 'TestPass123!';
    
    console.log('📧 テスト用アカウント作成:', testEmail);
    
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });
    
    if (signupError) {
      console.error('❌ テストアカウント作成エラー:', signupError.message);
    } else {
      console.log('✅ テストアカウント作成成功');
      console.log('  - ユーザーID:', signupData.user?.id);
      console.log('  - メール:', signupData.user?.email);
      
      // 作成直後にログインテスト
      console.log('\n🔐 作成直後のログインテスト...');
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });
      
      if (loginError) {
        console.error('❌ 新規アカウントでもログイン失敗:', loginError.message);
        console.log('  - これはSupabase設定に問題がある可能性を示します');
      } else {
        console.log('✅ 新規アカウントでログイン成功');
        console.log('  - 基本的なSupabase認証は動作しています');
        
        // クリーンアップ
        await supabase.auth.signOut();
      }
    }
    
    // パスワードリセット機能のテスト
    console.log('\n🔑 パスワードリセット機能テスト...');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      testEmail,
      { redirectTo: 'http://localhost:3000/login?message=password_reset' }
    );
    
    if (resetError) {
      console.error('❌ パスワードリセット機能エラー:', resetError.message);
    } else {
      console.log('✅ パスワードリセット機能は動作しています');
    }
    
  } catch (error) {
    console.error('💥 予期しないエラー:', error.message);
  }
  
  console.log('\n📊 診断結果:');
  console.log('1. 新規アカウント作成とログインの両方が失敗 → Supabase設定問題');
  console.log('2. 新規アカウントでログイン成功 → 既存アカウント(omusubi.o@gmail.com)に問題');
  console.log('3. パスワードリセット失敗 → メール/認証設定問題');
}

checkUser();
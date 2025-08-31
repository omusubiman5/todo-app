/**
 * Supabase設定確認スクリプト
 * 認証・メール設定の状況を詳しく調査
 */
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zmxnsfjmusgmapxbcbpn.supabase.co/';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpteG5zZmptdXNnbWFweGJjYnBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MTA2MTEsImV4cCI6MjA2ODQ4NjYxMX0.PoDsoL4V0_fpVdyLfQvMTEPoQyn4Lv8ZVsXCW3UWJ2Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSupabaseSettings() {
  console.log('🔍 Supabase設定診断開始...\n');
  console.log('🌐 Supabase URL:', supabaseUrl);
  console.log('🔑 Anon Key:', supabaseKey.slice(0, 20) + '...\n');

  // 1. 基本接続テスト
  console.log('1️⃣ 基本接続テスト:');
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.log('❌ 接続エラー:', error.message);
    } else {
      console.log('✅ Supabase接続成功');
      console.log('   現在のセッション:', data.session ? 'あり' : 'なし');
    }
  } catch (err) {
    console.log('❌ 接続失敗:', err.message);
  }

  // 2. 認証設定のテスト
  console.log('\n2️⃣ 認証設定テスト:');
  
  // テスト用アカウントでサインアップ
  const testEmail = 'settings-test-' + Date.now() + '@example.com';
  const testPassword = 'TestPass123!';
  
  console.log('📧 テストアカウント:', testEmail);
  
  try {
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    });
    
    if (signupError) {
      console.log('❌ サインアップエラー:', signupError.message);
      console.log('   考えられる原因:');
      console.log('   • メールドメイン制限');
      console.log('   • サインアップ無効化');
      console.log('   • レート制限');
    } else {
      console.log('✅ サインアップ成功');
      console.log('   ユーザーID:', signupData.user?.id);
      console.log('   メール確認状況:', signupData.user?.email_confirmed_at ? '確認済み' : '未確認');
      console.log('   セッション:', signupData.session ? 'あり' : 'なし');
      
      // 即座にログイン試行
      console.log('\n   📋 即座ログイン試行:');
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });
      
      if (loginError) {
        console.log('   ❌ ログイン失敗:', loginError.message);
        if (loginError.message.includes('Email not confirmed')) {
          console.log('   📧 メール確認が必須設定になっています');
        }
      } else {
        console.log('   ✅ ログイン成功 (メール確認不要)');
      }
    }
  } catch (err) {
    console.log('❌ 認証テストエラー:', err.message);
  }

  // 3. パスワードリセットテスト
  console.log('\n3️⃣ パスワードリセット機能テスト:');
  
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(testEmail, {
      redirectTo: 'http://localhost:3000/reset-password'
    });
    
    if (error) {
      console.log('❌ パスワードリセットエラー:', error.message);
    } else {
      console.log('✅ パスワードリセット機能は動作中');
      console.log('   リダイレクト先: http://localhost:3000/reset-password');
    }
  } catch (err) {
    console.log('❌ パスワードリセットテストエラー:', err.message);
  }

  // 4. 設定推奨事項
  console.log('\n4️⃣ 推奨される設定確認項目:');
  console.log('');
  console.log('🔧 Supabaseダッシュボード確認項目:');
  console.log('   URL: https://supabase.com/dashboard/project/zmxnsfjmusgmapxbcbpn');
  console.log('');
  console.log('📧 Authentication > Settings:');
  console.log('   • Confirm email: 有効/無効 の設定確認');
  console.log('   • Enable sign ups: 有効になっているか確認');
  console.log('   • Site URL: http://localhost:3000 が設定されているか');
  console.log('   • Redirect URLs: http://localhost:3000/** が許可されているか');
  console.log('');
  console.log('📮 Authentication > Email Templates:');
  console.log('   • Confirm signup template の確認');
  console.log('   • Reset password template の確認');
  console.log('   • リダイレクトURL: {{ .SiteURL }}/reset-password');
  console.log('');
  console.log('🔒 Authentication > URL Configuration:');
  console.log('   • Site URL: http://localhost:3000');
  console.log('   • Redirect URLs: http://localhost:3000/**, http://localhost:3000/reset-password');
  
  // 5. 既存ユーザーの状況確認
  console.log('\n5️⃣ 既存ユーザー(omusubi.o@gmail.com)の状況:');
  console.log('   Supabaseダッシュボード > Authentication > Users');
  console.log('   • ユーザーの存在確認');
  console.log('   • Email Confirmed のチェック状況');
  console.log('   • Last Sign In の日時');
  console.log('   • 必要に応じて "Send confirmation email" ボタンクリック');

  console.log('\n🔍 Supabase設定診断完了');
  console.log('\n💡 次のステップ:');
  console.log('1. 上記の推奨項目をSupabaseダッシュボードで確認');
  console.log('2. 設定変更後、新しいパスワードリセットメールを送信');
  console.log('3. 修正されたリンクでパスワード変更をテスト');
}

checkSupabaseSettings();
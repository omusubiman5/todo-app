/**
 * 確認済みアカウントの作成と検証
 */
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zmxnsfjmusgmapxbcbpn.supabase.co/';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpteG5zZmptdXNnbWFweGJjYnBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MTA2MTEsImV4cCI6MjA2ODQ4NjYxMX0.PoDsoL4V0_fpVdyLfQvMTEPoQyn4Lv8ZVsXCW3UWJ2Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createVerifiedAccount() {
  console.log('🆕 確認済みアカウント作成プロセス開始...\n');

  const testEmail = process.argv[2] || ('testuser.' + Date.now() + '@gmail.com');
  const testPassword = process.argv[3] || 'SecurePass123!';
  
  console.log('📧 作成対象アカウント:', testEmail);
  console.log('🔐 パスワード:', testPassword);
  console.log('');

  try {
    // 1. アカウント作成
    console.log('1️⃣ アカウント作成中...');
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        emailRedirectTo: 'http://localhost:3000/',
        data: {
          display_name: testEmail.split('@')[0]
        }
      }
    });
    
    if (signupError) {
      console.error('❌ アカウント作成エラー:', signupError.message);
      return;
    }
    
    console.log('✅ アカウント作成成功');
    console.log('  - ユーザーID:', signupData.user?.id);
    console.log('  - メール確認状況:', signupData.user?.email_confirmed_at ? '確認済み' : '未確認');
    console.log('  - セッション状況:', signupData.session ? 'セッションあり' : 'セッションなし');
    
    // 2. メール確認無しでのログイン試行
    console.log('\n2️⃣ 確認前ログイン試行...');
    const { data: loginData1, error: loginError1 } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (loginError1) {
      console.log('❌ 予想通り - メール未確認でログイン失敗:', loginError1.message);
    } else {
      console.log('✅ 意外 - メール未確認でもログイン成功');
    }
    
    // 3. Supabase設定確認の提案
    console.log('\n3️⃣ 解決方法の提案:');
    console.log('');
    console.log('💡 解決策1: Supabaseダッシュボードで設定変更');
    console.log('   → Authentication > Settings');
    console.log('   → "Confirm email" を無効化');
    console.log('');
    console.log('💡 解決策2: 新しいテストアカウントで進行');
    console.log('   → 新しいGmailアカウント作成');
    console.log('   → メール確認を完了');
    console.log('');
    console.log('💡 解決策3: 既存アカウントの確認メール再送');
    console.log('   → パスワードリセットメールから確認');
    
    // 4. 管理者権限でのユーザー状況確認（Service Role Keyが必要）
    console.log('\n4️⃣ 既存アカウント確認の推奨:');
    console.log('📧 対象:', 'omusubi.o@gmail.com');
    console.log('🔍 Supabaseダッシュボード > Authentication > Users');
    console.log('   → omusubi.o@gmail.com の状況確認');
    console.log('   → Email Confirmed の状況確認');
    console.log('   → 必要に応じて手動確認');
    
  } catch (error) {
    console.error('💥 予期しないエラー:', error.message);
  }
}

createVerifiedAccount();
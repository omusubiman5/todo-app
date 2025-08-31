// 実際のメール送信テスト用スクリプト
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zmxnsfjmusgmapxbcbpn.supabase.co/'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpteG5zZmptdXNnbWFweGJjYnBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MTA2MTEsImV4cCI6MjA2ODQ4NjYxMX0.PoDsoL4V0_fpVdyLfQvMTEPoQyn4Lv8ZVsXCW3UWJ2Q'

async function testRealEmailReset() {
  console.log('🔧 実際のメール送信テスト\n');
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // 実際のメールアドレスに変更してください
  const yourEmail = 'your-actual-email@gmail.com'; // ここを変更
  
  if (yourEmail === 'your-actual-email@gmail.com') {
    console.log('❌ まず実際のメールアドレスを設定してください');
    console.log('📝 このファイルの7行目を編集: const yourEmail = "あなたのメール@gmail.com";');
    return;
  }
  
  console.log('📧 使用するメール:', yourEmail);
  console.log('⚠️  このメールアドレスで事前にアカウント作成が必要です\n');
  
  try {
    console.log('1️⃣ アカウント作成を試行...');
    
    // まずアカウント作成
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: yourEmail,
      password: 'tempPassword123',
      options: {
        emailRedirectTo: 'http://localhost:3001/'
      }
    });
    
    if (signupError) {
      if (signupError.message.includes('already registered')) {
        console.log('✅ アカウント既存 - パスワードリセットをテスト可能');
      } else {
        console.log('❌ アカウント作成エラー:', signupError.message);
        console.log('💡 ブラウザでhCAPTCHA付きでアカウント作成してください');
        console.log('   http://localhost:3001/login → 新規登録');
        return;
      }
    } else {
      console.log('✅ アカウント作成成功 - 確認メールをチェックしてください');
      console.log('📬 メールボックスの確認メールで認証後、パスワードリセットをテストできます');
      return;
    }
    
    console.log('\n2️⃣ パスワードリセットメール送信...');
    
    // NODE_ENVを本番に設定して実際の送信をテスト
    process.env.NODE_ENV = 'production';
    
    const { data, error } = await supabase.auth.resetPasswordForEmail(yourEmail, {
      redirectTo: 'http://localhost:3001/login?message=password_reset'
    });
    
    if (error) {
      console.log('❌ リセットエラー:', error.message);
      
      if (error.message.includes('captcha')) {
        console.log('💡 解決方法: ブラウザでhCAPTCHAを完了してください');
        console.log('   http://localhost:3001/login → パスワードを忘れた方');
      }
    } else {
      console.log('✅ リセットメール送信成功!');
      console.log('📬 メールボックスをチェックしてください');
    }
    
  } catch (err) {
    console.error('💥 エラー:', err.message);
  }
}

console.log('📋 手順:');
console.log('1. 実際のメールアドレスをこのファイルに設定');
console.log('2. このスクリプトでアカウント作成');
console.log('3. 確認メールでアカウント認証');
console.log('4. パスワードリセットをテスト');
console.log('');

if (require.main === module) {
  testRealEmailReset();
}

module.exports = { testRealEmailReset };
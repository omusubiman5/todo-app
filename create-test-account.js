// テスト用アカウント作成スクリプト
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zmxnsfjmusgmapxbcbpn.supabase.co/'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpteG5zZmptdXNnbWFweGJjYnBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MTA2MTEsImV4cCI6MjA2ODQ4NjYxMX0.PoDsoL4V0_fpVdyLfQvMTEPoQyn4Lv8ZVsXCW3UWJ2Q'

async function createTestAccount() {
  console.log('👤 テスト用アカウント作成\n');
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // 実際のメールアドレスに変更してください
  const testEmail = 'your-real-email@gmail.com'; // ここを実際のメールに変更
  const testPassword = 'testpassword123';
  
  console.log('📧 使用するメールアドレス:', testEmail);
  console.log('⚠️  上記を実際に受信可能なメールアドレスに変更してください\n');
  
  try {
    console.log('🔄 アカウント作成中...');
    
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        emailRedirectTo: 'http://localhost:3001/',
        data: {
          display_name: testEmail.split('@')[0]
        }
      }
    });
    
    if (error) {
      console.error('❌ アカウント作成エラー:', error.message);
      
      if (error.message.includes('captcha')) {
        console.log('\n💡 解決方法:');
        console.log('   1. ブラウザで http://localhost:3001/login にアクセス');
        console.log('   2. "新規登録" をクリック');
        console.log('   3. hCAPTCHAを完了してアカウント作成');
      } else if (error.message.includes('already registered')) {
        console.log('\n✅ このメールアドレスは既に登録済みです！');
        console.log('   パスワードリセットテストを実行できます。');
      }
      return;
    }
    
    console.log('\n✅ アカウント作成成功!');
    console.log('📬 確認メールが送信されました');
    console.log('📋 次のステップ:');
    console.log('   1. メールボックスを確認');
    console.log('   2. 確認リンクをクリック');
    console.log('   3. アカウントを有効化');
    console.log('   4. パスワードリセットをテスト');
    
    if (data.user && !data.user.email_confirmed_at) {
      console.log('\n⏳ アカウント状態: メール確認待ち');
      console.log('   確認メールをチェックしてください');
    }
    
  } catch (err) {
    console.error('\n💥 予期しないエラー:', err);
  }
}

console.log('🚨 重要: testEmail変数を実際のメールアドレスに変更してから実行してください');
console.log('📝 ファイル: create-test-account.js の 9行目を編集');

// 実際のメールアドレスが設定されている場合のみ実行
if (require.main === module) {
  const testEmail = 'your-real-email@gmail.com';
  if (testEmail === 'your-real-email@gmail.com') {
    console.log('\n❌ 実際のメールアドレスを設定してください');
    console.log('📝 create-test-account.js の 9行目を編集してから再実行してください');
  } else {
    createTestAccount();
  }
}

module.exports = { createTestAccount };
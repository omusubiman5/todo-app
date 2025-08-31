// パスワードリセット機能のテストスクリプト
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zmxnsfjmusgmapxbcbpn.supabase.co/'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpteG5zZmptdXNnbWFweGJjYnBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MTA2MTEsImV4cCI6MjA2ODQ4NjYxMX0.PoDsoL4V0_fpVdyLfQvMTEPoQyn4Lv8ZVsXCW3UWJ2Q'

async function testPasswordReset() {
  console.log('🧪 パスワードリセット機能テスト開始\n');
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // テスト用のメールアドレス（実際に使用可能なものに変更してください）
  const testEmail = 'test@example.com'; // 実際のメールアドレスに変更
  
  try {
    console.log('📧 パスワードリセットメール送信テスト...');
    console.log('テストメール:', testEmail);
    
    const { data, error } = await supabase.auth.resetPasswordForEmail(testEmail, {
      redirectTo: 'http://localhost:3000/login?message=password_reset'
    });
    
    console.log('\n📊 結果:');
    console.log('- データ:', data);
    console.log('- エラー:', error);
    
    if (error) {
      console.log('\n❌ エラーの詳細:');
      console.log('- メッセージ:', error.message);
      console.log('- コード:', error.code);
      console.log('- ステータス:', error.status);
      
      // 一般的なエラーの説明
      if (error.message.includes('captcha verification')) {
        console.log('\n💡 hCaptchaエラーについて:');
        console.log('   ✅ hCaptchaが正常に有効化されています！');
        console.log('   🌐 ブラウザでテストしてください - hCaptchaウィジェットが表示されます');
        console.log('   📍 http://localhost:3000/login → パスワードをお忘れですか？');
      } else if (error.message.includes('For security purposes')) {
        console.log('\n💡 このエラーについて:');
        console.log('   Supabaseはセキュリティ上の理由により、存在しないメールアドレスに');
        console.log('   対してもエラーを表示しません。メールが送信されたように見えますが、');
        console.log('   実際には存在するアカウントにのみメールが送信されます。');
      } else if (error.message.includes('email not confirmed')) {
        console.log('\n💡 このエラーについて:');
        console.log('   メールアドレスが確認されていないアカウントです。');
        console.log('   まず新規登録時の確認メールからアカウントを有効化してください。');
      } else if (error.message.includes('SMTP')) {
        console.log('\n💡 このエラーについて:');
        console.log('   Supabaseのメール送信設定に問題があります。');
        console.log('   Supabaseダッシュボードでメール設定を確認してください。');
      }
    } else {
      console.log('\n✅ パスワードリセットメール送信成功!');
      console.log('   メールボックスを確認してください（迷惑メールフォルダも確認）');
    }
    
    // Supabaseプロジェクトの設定情報を確認
    console.log('\n🔧 Supabaseプロジェクト設定確認:');
    console.log('- プロジェクトURL:', supabaseUrl);
    console.log('- APIキー:', supabaseKey.substring(0, 20) + '...');
    
    // 認証設定の確認を試みる
    console.log('\n⚙️ 認証設定確認:');
    try {
      const { data: settings } = await supabase.auth.getSession();
      console.log('- セッション取得: ✅');
    } catch (err) {
      console.log('- セッション取得: ❌', err.message);
    }
    
  } catch (err) {
    console.error('\n💥 予期しないエラー:', err);
  }
}

async function checkSupabaseEmailSettings() {
  console.log('\n📋 Supabaseメール設定チェックリスト:');
  console.log('   以下をSupabaseダッシュボードで確認してください:');
  console.log('   1. Authentication → Settings → SMTP Settings');
  console.log('   2. Enable custom SMTP が設定されているか');
  console.log('   3. または、Supabaseの標準メール送信が有効か');
  console.log('   4. Email templates が設定されているか');
  console.log('   5. Rate limiting の設定');
  console.log('\n🌐 ダッシュボードURL:');
  console.log('   https://supabase.com/dashboard/project/zmxnsfjmusgmapxbcbpn/auth/users');
}

// テスト実行
if (require.main === module) {
  testPasswordReset()
    .then(() => checkSupabaseEmailSettings())
    .catch(console.error);
}

module.exports = { testPasswordReset };
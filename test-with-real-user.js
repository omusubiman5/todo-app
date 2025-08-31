// 実際のユーザーアカウントでのテストスクリプト
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zmxnsfjmusgmapxbcbpn.supabase.co/'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpteG5zZmptdXNnbWFweGJjYnBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MTA2MTEsImV4cCI6MjA2ODQ4NjYxMX0.PoDsoL4V0_fpVdyLfQvMTEPoQyn4Lv8ZVsXCW3UWJ2Q'

async function testWithRealUser() {
  console.log('👤 実際のユーザーアカウントでのテスト開始\n');
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // 1. 既存ユーザーの確認
    console.log('📊 登録済みユーザーの確認...');
    const { data: users, error: usersError } = await supabase
      .from('auth.users')
      .select('email, email_confirmed_at, created_at')
      .limit(5);
    
    if (usersError) {
      console.log('❌ ユーザーデータにアクセスできません（権限制限）');
      console.log('   これは正常です - セキュリティ上の理由によるものです');
    } else {
      console.log('✅ 登録済みユーザー一覧:');
      users?.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} - 確認済み: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
      });
    }
    
    // 2. パスワードリセットのテスト（登録済みアカウントが必要）
    console.log('\n🔑 パスワードリセットテスト...');
    console.log('⚠️  重要: パスワードリセットは登録済みアカウントにのみ送信されます');
    
    // テスト用の実際のメールアドレス
    const testEmails = [
      'test@example.com',  // 偽のアドレス（失敗するはず）
      // 実際のアドレスがあればここに追加
    ];
    
    for (const email of testEmails) {
      console.log(`\n📧 テスト対象: ${email}`);
      
      try {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: 'http://localhost:3001/login?message=password_reset'
        });
        
        if (error) {
          if (error.message.includes('captcha verification')) {
            console.log('   ❌ CAPTCHA検証失敗（ブラウザでのテストが必要）');
          } else if (error.message.includes('For security purposes')) {
            console.log('   ⚠️  存在しないアカウント（セキュリティ上正常な動作）');
          } else {
            console.log(`   ❌ エラー: ${error.message}`);
          }
        } else {
          console.log('   ✅ リセットメール送信成功!');
        }
      } catch (err) {
        console.log(`   💥 予期しないエラー: ${err.message}`);
      }
    }
    
    console.log('\n💡 メールが届かない理由:');
    console.log('   1. 未登録のメールアドレスを使用している');
    console.log('   2. 登録済みだが、メール未確認のアカウント');
    console.log('   3. Supabaseのメール送信設定が未完了');
    console.log('   4. CAPTCHA検証がコマンドラインでは不可能');
    
    console.log('\n🎯 解決方法:');
    console.log('   1. まず新規登録でアカウントを作成');
    console.log('   2. 確認メールでアカウントを有効化');
    console.log('   3. その後、パスワードリセットをテスト');
    console.log('   4. ブラウザでhCAPTCHAを完了してテスト');
    
  } catch (error) {
    console.error('\n❌ テストエラー:', error);
  }
}

// テスト実行
if (require.main === module) {
  testWithRealUser();
}

module.exports = { testWithRealUser };
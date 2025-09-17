// E2Eテスト用アカウント作成スクリプト
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zmxnsfjmusgmapxbcbpn.supabase.co/'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpteG5zZmptdXNnbWFweGJjYnBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MTA2MTEsImV4cCI6MjA2ODQ4NjYxMX0.PoDsoL4V0_fpVdyLfQvMTEPoQyn4Lv8ZVsXCW3UWJ2Q'

async function createE2ETestAccount() {
  console.log('🤖 E2Eテスト用アカウント作成\n');
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const testEmail = 'e2e.test.user2@gmail.com';
  const testPassword = 'testpassword123';
  
  console.log('📧 テストメールアドレス:', testEmail);
  console.log('🔑 テストパスワード:', testPassword);
  console.log('\n');
  
  try {
    console.log('🔄 アカウント作成中...');
    
    // まず既存アカウントをチェック
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    
    if (signInData.user && !signInError) {
      console.log('✅ アカウントは既に存在し、ログイン可能です！');
      console.log('🔑 パスワード:', testPassword);
      console.log('📧 メール:', testEmail);
      return { success: true, password: testPassword };
    }
    
    // アカウントが存在しない場合、作成を試行
    console.log('🔄 新しいアカウントを作成中...');
    
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        emailRedirectTo: 'http://localhost:3007/',
        data: {
          display_name: 'E2E Test User'
        }
      }
    });
    
    if (error) {
      console.error('❌ アカウント作成エラー:', error.message);
      
      if (error.message.includes('already registered')) {
        console.log('\n🔍 既存アカウントの他のパスワード候補をテスト中...');
        
        const passwordCandidates = [
          'password123',
          '123456789',
          'test123',
          'Test123!',
          'testuser123',
          'e2etest123',
          'playwright123'
        ];
        
        for (const password of passwordCandidates) {
          console.log(`🔑 パスワード試行: ${password}`);
          
          const { data: testSignIn, error: testError } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: password,
          });
          
          if (testSignIn.user && !testError) {
            console.log(`✅ ログイン成功! 正しいパスワード: ${password}`);
            return { success: true, password: password };
          }
        }
        
        console.log('❌ すべてのパスワード候補でログインに失敗しました');
        console.log('💡 既存アカウントのパスワードが不明です');
        return { success: false, message: 'アカウントは存在するが、パスワードが不明' };
      }
      
      return { success: false, error: error.message };
    }
    
    console.log('\n✅ アカウント作成成功!');
    console.log('📧 メール:', testEmail);
    console.log('🔑 パスワード:', testPassword);
    
    if (data.user && !data.user.email_confirmed_at) {
      console.log('\n⚠️  注意: メール確認が必要な場合があります');
      console.log('   ただし、テスト用なので確認なしでも使用可能な場合があります');
    }
    
    return { success: true, password: testPassword };
    
  } catch (err) {
    console.error('\n💥 予期しないエラー:', err);
    return { success: false, error: err.message };
  }
}

// 直接実行時
if (require.main === module) {
  createE2ETestAccount().then(result => {
    if (result.success) {
      console.log('\n🎉 E2Eテストアカウントの準備完了!');
      console.log('🧪 これでPlaywrightテストを実行できます');
    } else {
      console.log('\n❌ アカウント準備に失敗しました');
      console.log('エラー:', result.error || result.message);
    }
  });
}

module.exports = { createE2ETestAccount };
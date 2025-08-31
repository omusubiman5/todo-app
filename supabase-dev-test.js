// Supabase CAPTCHA設定テスト
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zmxnsfjmusgmapxbcbpn.supabase.co/'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpteG5zZmptdXNnbWFweGJjYnBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MTA2MTEsImV4cCI6MjA2ODQ4NjYxMX0.PoDsoL4V0_fpVdyLfQvMTEPoQyn4Lv8ZVsXCW3UWJ2Q'

async function testSupabaseCaptchaConfig() {
  console.log('🔍 Supabase CAPTCHA設定テスト');
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // テスト用メールアドレス
  const testEmail = 'omusubiman@gmail.com';
  
  console.log('📧 テスト対象:', testEmail);
  console.log('🌐 Supabase URL:', supabaseUrl);
  
  try {
    console.log('\n1️⃣ CAPTCHAトークンなしでテスト...');
    
    const { data, error } = await supabase.auth.resetPasswordForEmail(testEmail, {
      redirectTo: 'http://localhost:3001/login?message=password_reset'
      // captchaToken: 意図的に省略
    });
    
    if (error) {
      console.log('❌ エラー:', error.message);
      console.log('📊 エラーコード:', error.status);
      console.log('🔍 詳細:', JSON.stringify(error, null, 2));
      
      if (error.message.includes('captcha')) {
        console.log('\n✅ CAPTCHA保護が有効に設定されています');
        console.log('💡 これは正常な動作です');
        
        console.log('\n🔧 解決方法:');
        console.log('1. Supabaseダッシュボードでauth設定を確認');
        console.log('2. 開発環境でCAPTCHA要件を一時的に無効化');
        console.log('3. 有効なhCAPTCHAサイトキー/シークレットキーを設定');
        
        console.log('\n📋 推奨アクション:');
        console.log('- Authentication → Settings → CAPTCHA protection');
        console.log('- "Enable CAPTCHA verification for password reset" を一時的にOFF');
        console.log('- または、hCAPTCHA設定を正しく構成');
      }
    } else {
      console.log('✅ 成功（予期しない）:', data);
    }
    
  } catch (err) {
    console.error('💥 予期しないエラー:', err.message);
  }
  
  console.log('\n🎯 次のステップ:');
  console.log('1. Supabaseダッシュボードにアクセス');
  console.log('2. Project Settings → Authentication → CAPTCHA');
  console.log('3. 開発中は一時的にCAPTCHA保護を無効化');
  console.log('4. 本番リリース前に再有効化');
}

if (require.main === module) {
  testSupabaseCaptchaConfig();
}

module.exports = { testSupabaseCaptchaConfig };
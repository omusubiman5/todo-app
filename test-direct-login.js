/**
 * 直接的な認証テスト
 * ブラウザ環境を経由せずにSupabaseの認証APIを直接テスト
 */
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zmxnsfjmusgmapxbcbpn.supabase.co/';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpteG5zZmptdXNnbWFweGJjYnBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MTA2MTEsImV4cCI6MjA2ODQ4NjYxMX0.PoDsoL4V0_fpVdyLfQvMTEPoQyn4Lv8ZVsXCW3UWJ2Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDirectLogin() {
  console.log('🔧 直接認証テスト開始...\n');
  
  // テスト用の認証情報（実際の値に置き換えてください）
  const testEmail = process.argv[2];
  const testPassword = process.argv[3];
  
  if (!testEmail || !testPassword) {
    console.log('使用方法: node test-direct-login.js email@example.com password123');
    process.exit(1);
  }
  
  try {
    console.log('📧 テスト対象アカウント:', testEmail);
    console.log('🌐 Supabase URL:', supabaseUrl);
    console.log('⏰ テスト開始時刻:', new Date().toISOString());
    console.log('');
    
    console.log('🔐 認証試行中...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    console.log('📥 認証結果:');
    console.log('  - エラー有無:', !!error);
    console.log('  - データ有無:', !!data);
    
    if (error) {
      console.log('\n❌ エラー詳細:');
      console.log('  - メッセージ:', error.message);
      console.log('  - コード:', error.code);
      console.log('  - ステータス:', error.status);
      console.log('  - 詳細:', JSON.stringify(error, null, 2));
    }
    
    if (data) {
      console.log('\n✅ データ詳細:');
      console.log('  - ユーザー有無:', !!data.user);
      console.log('  - セッション有無:', !!data.session);
      
      if (data.user) {
        console.log('  - ユーザーID:', data.user.id);
        console.log('  - メール:', data.user.email);
        console.log('  - メール確認:', data.user.email_confirmed_at ? '確認済み' : '未確認');
        console.log('  - 最終ログイン:', data.user.last_sign_in_at);
      }
      
      if (data.session) {
        console.log('  - セッション有効期限:', new Date(data.session.expires_at * 1000).toLocaleString());
        console.log('  - アクセストークン(末尾10文字):', data.session.access_token.slice(-10));
      }
    }
    
    // 認証後のセッション確認
    console.log('\n🔍 セッション確認...');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('❌ セッション確認エラー:', sessionError.message);
    } else if (sessionData.session) {
      console.log('✅ セッション確認成功');
      console.log('  - セッションユーザーID:', sessionData.session.user.id);
      console.log('  - セッション有効期限:', new Date(sessionData.session.expires_at * 1000).toLocaleString());
    } else {
      console.log('❌ セッションが見つかりません');
    }
    
  } catch (err) {
    console.error('💥 予期しないエラー:', err);
    console.error('スタックトレース:', err.stack);
  }
  
  console.log('\n🔧 直接認証テスト完了');
}

testDirectLogin();
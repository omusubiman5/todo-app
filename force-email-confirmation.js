/**
 * 強制的な確認メール再送信
 * 既存アカウントの確認メールを再送信します
 */
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zmxnsfjmusgmapxbcbpn.supabase.co/';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpteG5zZmptdXNnbWFweGJjYnBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MTA2MTEsImV4cCI6MjA2ODQ4NjYxMX0.PoDsoL4V0_fpVdyLfQvMTEPoQyn4Lv8ZVsXCW3UWJ2Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function forceEmailConfirmation() {
  const email = 'omusubi.o@gmail.com';
  
  console.log('📧 確認メール再送信プロセス開始');
  console.log('対象アカウント:', email);
  console.log('');
  
  try {
    // 1. 確認メール再送信
    console.log('1️⃣ 確認メール再送信...');
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: 'http://localhost:3000/'
      }
    });
    
    if (error) {
      console.log('❌ 確認メール再送信エラー:', error.message);
      
      // 2. パスワードリセット経由でのアクセス試行
      console.log('\n2️⃣ パスワードリセット経由での解決試行...');
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'http://localhost:3000/reset-password',
        captchaToken: undefined
      });
      
      if (resetError) {
        console.log('❌ パスワードリセットも失敗:', resetError.message);
      } else {
        console.log('✅ パスワードリセットメールを送信しました');
        console.log('');
        console.log('📬 次の手順:');
        console.log('1. メールボックスを確認してください');
        console.log('2. パスワードリセットリンクをクリック');
        console.log('3. 新しいパスワードを設定');
        console.log('4. これによりアカウントが自動的に確認されます');
      }
    } else {
      console.log('✅ 確認メール再送信成功!');
      console.log('');
      console.log('📬 次の手順:');
      console.log('1. メールボックス（迷惑メールフォルダも含む）を確認');
      console.log('2. 確認リンクをクリック');
      console.log('3. アカウント確認完了後、ログインが可能になります');
    }
    
  } catch (error) {
    console.error('💥 予期しないエラー:', error.message);
  }
}

forceEmailConfirmation();
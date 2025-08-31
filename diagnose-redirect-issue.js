/**
 * リダイレクト問題の詳細診断
 * パスワードリセットメールのリダイレクト設定を詳しく調査
 */
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zmxnsfjmusgmapxbcbpn.supabase.co/';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpteG5zZmptdXNnbWFweGJjYnBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MTA2MTEsImV4cCI6MjA2ODQ4NjYxMX0.PoDsoL4V0_fpVdyLfQvMTEPoQyn4Lv8ZVsXCW3UWJ2Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseRedirectIssue() {
  console.log('🔍 リダイレクト問題の詳細診断...\n');
  
  const email = 'omusubi.o@gmail.com';
  
  // 異なるリダイレクト設定でテスト
  const testCases = [
    {
      name: '基本設定（現在）',
      options: {
        redirectTo: 'http://localhost:3000/reset-password'
      }
    },
    {
      name: '完全URL指定',
      options: {
        redirectTo: 'http://localhost:3000/reset-password?test=1'
      }
    },
    {
      name: 'ルートパスのみ',
      options: {
        redirectTo: 'http://localhost:3000/'
      }
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📧 テスト: ${testCase.name}`);
    console.log(`   リダイレクト先: ${testCase.options.redirectTo}`);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, testCase.options);
      
      if (error) {
        console.log(`   ❌ エラー: ${error.message}`);
      } else {
        console.log(`   ✅ 送信成功`);
        console.log(`   📬 メールを確認して実際のリンクをチェックしてください`);
      }
    } catch (err) {
      console.log(`   ❌ 例外: ${err.message}`);
    }
    
    // 短い間隔を空ける
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n🔧 Supabaseダッシュボード設定チェックポイント:');
  console.log('');
  console.log('1️⃣ URL Configuration:');
  console.log('   https://supabase.com/dashboard/project/zmxnsfjmusgmapxbcbpn/auth/url-configuration');
  console.log('   ✅ Site URL: http://localhost:3000');
  console.log('   ✅ Redirect URLs:');
  console.log('      • http://localhost:3000/**');
  console.log('      • http://localhost:3000/reset-password');
  console.log('');
  console.log('2️⃣ Email Templates:');
  console.log('   https://supabase.com/dashboard/project/zmxnsfjmusgmapxbcbpn/auth/templates');
  console.log('   ✅ Reset Password テンプレートを確認');
  console.log('   ✅ リンク先が {{ .ConfirmationURL }} になっているか');
  console.log('');
  console.log('3️⃣ 問題の可能性:');
  console.log('   • Supabaseのメールテンプレートがカスタマイズされていない');
  console.log('   • デフォルトテンプレートが SiteURL のみを使用している');
  console.log('   • redirectTo パラメータが無視されている');
  
  console.log('\n💡 解決策の提案:');
  console.log('A. Supabaseダッシュボードでメールテンプレート修正');
  console.log('B. フロントエンドでリダイレクト後の自動転送処理');
  console.log('C. カスタムドメインの使用');
}

diagnoseRedirectIssue();
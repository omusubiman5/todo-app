// 手動でタスクの読み込みと削除をテストするスクリプト

console.log('🔍 タスク削除問題の診断開始');

// 環境変数をチェック
const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zmxnsfjmusgmapxbcbpn.supabase.co/';
const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpteG5zZmptdXNnbWFweGJjYnBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MTA2MTEsImV4cCI6MjA2ODQ4NjYxMX0.PoDsoL4V0_fpVdyLfQvMTEPoQyn4Lv8ZVsXCW3UWJ2Q';

console.log('📊 環境設定確認:');
console.log('- Supabase URL:', NEXT_PUBLIC_SUPABASE_URL);
console.log('- Anon Key:', NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20) + '...');

// アプリの起動状況を確認
const http = require('http');

function checkAppStatus() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:3007', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('✅ アプリが正常に動作しています (http://localhost:3007)');
        console.log('📄 レスポンス長:', data.length, '文字');
        resolve(true);
      });
    });
    req.on('error', (err) => {
      console.log('❌ アプリが起動していません:', err.message);
      reject(err);
    });
  });
}

// 診断結果と推奨アクション
async function runDiagnostic() {
  try {
    console.log('\n🔍 アプリ接続テスト...');
    await checkAppStatus();
    
    console.log('\n📋 削除機能テスト手順:');
    console.log('1. ブラウザで http://localhost:3007 にアクセス');
    console.log('2. メールアドレス: omusubiman@gmail.com');  
    console.log('3. パスワード: Mm1696bz?');
    console.log('4. ログイン後、タスクが表示されるか確認');
    console.log('5. 削除ボタン（🗑️）をクリックして削除をテスト');
    
    console.log('\n🔧 問題が発生した場合のチェック項目:');
    console.log('- ブラウザの開発者ツール (F12) でエラーを確認');
    console.log('- Networkタブで削除APIリクエストが送信されているか');
    console.log('- Consoleタブでエラーメッセージを確認');
    console.log('- タスクにマウスホバーで削除ボタンが表示されるか');
    
  } catch (error) {
    console.log('\n❌ 診断中にエラーが発生しました:', error.message);
    console.log('👉 npm run dev でアプリを起動してから再実行してください');
  }
}

runDiagnostic();
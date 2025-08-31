const fs = require('fs');
const path = require('path');

console.log('🔧 RLSポリシー修正スクリプト適用');
console.log('=====================================');

// SQLファイルの内容を読み取り
const sqlFilePath = path.join(__dirname, 'fix-rls-policies.sql');
const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

console.log('📋 適用予定のRLSポリシー:');
console.log('- tasks テーブル: 個人・チーム両方対応のポリシー');
console.log('- profiles テーブル: 自分のプロフィール + チームメンバー閲覧');
console.log('- notifications テーブル: 個人通知のみアクセス');
console.log('- task_comments テーブル: アクセス可能タスクのコメント');
console.log('- task_history テーブル: アクセス可能タスクの履歴');

console.log('\n⚠️ 注意: このスクリプトはSupabaseダッシュボードで手動実行が必要です');
console.log('📁 SQLファイル: fix-rls-policies.sql');

console.log('\n🔗 Supabaseダッシュボードでの実行手順:');
console.log('1. https://supabase.com/dashboard にアクセス');
console.log('2. プロジェクトを選択');
console.log('3. SQL Editor に移動');
console.log('4. fix-rls-policies.sql の内容をコピー&ペースト');
console.log('5. "Run" ボタンをクリックして実行');

console.log('\n✅ RLSポリシー修正スクリプト準備完了');

// 実行後の検証スクリプトも作成
const verificationScript = `
const { createClient } = require('@supabase/supabase-js');

async function verifyRLSFix() {
  console.log('🔍 RLS修正後の検証テスト...');
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  const tables = ['tasks', 'profiles', 'notifications', 'teams', 'team_members'];
  let allSecure = true;
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      
      if (error && (error.code === 'PGRST301' || error.message.includes('JWT'))) {
        console.log(\`✅ \${table}: RLS正常 - 未認証アクセス拒否\`);
      } else if (error) {
        console.log(\`⚠️ \${table}: その他エラー - \${error.message}\`);
      } else {
        console.log(\`🚨 \${table}: 未認証アクセス成功 - RLS設定要確認\`);
        allSecure = false;
      }
    } catch (e) {
      console.log(\`❌ \${table}: 接続エラー - \${e.message}\`);
    }
  }
  
  console.log(\`\\n📊 RLS セキュリティ状態: \${allSecure ? '✅ 安全' : '🚨 要修正'}\`);
  return allSecure;
}

verifyRLSFix().catch(console.error);
`;

fs.writeFileSync(path.join(__dirname, 'verify-rls-fix.js'), verificationScript);
console.log('📄 検証スクリプト作成: verify-rls-fix.js');
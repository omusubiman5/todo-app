const https = require('https');
const fs = require('fs');

async function implementRLSViaWebAPI() {
  console.log('🌐 Web API経由でのRLS実装試行...');
  console.log('============================================================');

  const projectRef = 'zmxnsfjmusgmapxbcbpn';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!anonKey) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY が設定されていません');
    return;
  }

  // SQLファイル読み込み
  const sqlContent = fs.readFileSync('generated-rls.sql', 'utf8');
  
  console.log('📤 Supabase REST API経由でSQL実行を試行...');
  
  // PostgREST API経由での実行を試行
  const apiUrl = `https://${projectRef}.supabase.co/rest/v1/rpc`;
  
  try {
    // カスタムRPC関数の作成を試行
    console.log('🔧 カスタムRPC関数による実行を試行...');
    
    const rpcPayload = JSON.stringify({
      sql_query: sqlContent.substring(0, 1000) // 最初の1000文字のみテスト
    });

    const postData = JSON.stringify({});
    
    const options = {
      hostname: `${projectRef}.supabase.co`,
      port: 443,
      path: '/rest/v1/rpc/execute_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('📥 API応答:', res.statusCode);
        console.log('📄 応答内容:', data);
        
        if (res.statusCode === 200) {
          console.log('✅ API経由でのRLS設定成功の可能性');
        } else {
          console.log('⚠️ API経由では制限があります');
          showAlternativeMethod();
        }
      });
    });

    req.on('error', (e) => {
      console.log('❌ API接続エラー:', e.message);
      showAlternativeMethod();
    });

    req.write(postData);
    req.end();

  } catch (error) {
    console.log('💥 Web API実装エラー:', error.message);
    showAlternativeMethod();
  }
}

function showAlternativeMethod() {
  console.log('\n🎯 推奨実装方法:');
  console.log('============================================================');
  console.log('📋 Supabase Dashboardでの手動実行');
  console.log('');
  console.log('1. 🌐 https://supabase.com/dashboard を開く');
  console.log('2. 🏠 プロジェクト "zmxnsfjmusgmapxbcbpn" を選択');
  console.log('3. 📝 左メニューから "SQL Editor" をクリック');
  console.log('4. ➕ "New query" ボタンをクリック');
  console.log('5. 📄 以下のSQLをコピー&ペースト:');
  console.log('');
  
  // 重要な部分のSQLを表示
  const criticalSQL = `-- 最重要: 全テーブルでRLS有効化
ALTER TABLE IF EXISTS public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

-- tasksテーブル: 個人タスクのセキュリティ
CREATE POLICY "Users can view own tasks" ON public.tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tasks" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- profilesテーブル: プロフィールセキュリティ  
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- notificationsテーブル: 通知セキュリティ
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);`;
  
  console.log(criticalSQL);
  console.log('');
  console.log('6. ▶️ "Run" ボタンをクリックして実行');
  console.log('7. ✅ node verify-rls-fix.js で検証');
  console.log('============================================================');
  
  console.log('\n📱 モバイルからの実行手順:');
  console.log('1. supabase.com/dashboard をモバイルブラウザで開く');
  console.log('2. ログイン後、プロジェクトを選択');
  console.log('3. メニュー → SQL Editor');
  console.log('4. 上記SQLをコピー&ペースト');
  console.log('5. Run実行');
  
  console.log('\n⏰ 推定実行時間: 2-3分');
  console.log('🔒 実行後、全テーブルが認証必須になります');
  
  // 実行チェックリストを作成
  const checklist = `📋 RLS実装チェックリスト:

□ Supabaseダッシュボードにアクセス完了
□ プロジェクト選択完了  
□ SQL Editorを開く完了
□ SQLをコピー&ペースト完了
□ SQL実行完了
□ エラーがないことを確認
□ verify-rls-fix.js で検証実行
□ 全テーブルでRLS有効化確認
□ セキュリティテスト実行

実行日時: _______________
実行者: _______________`;

  fs.writeFileSync('rls-implementation-checklist.txt', checklist);
  console.log('\n📄 rls-implementation-checklist.txt を作成しました');
}

// 実行検証用の関数
async function quickVerification() {
  console.log('\n🔍 実行前検証...');
  
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
  try {
    const { data, error } = await supabase.from('tasks').select('*').limit(1);
    
    if (error && error.code === 'PGRST301') {
      console.log('✅ RLS既に有効 - 実装済みの可能性');
      return true;
    } else if (error) {
      console.log('⚠️ 接続エラー:', error.message);
      return false;
    } else {
      console.log('🚨 RLS未設定 - 実装が必要');
      return false;
    }
  } catch (e) {
    console.log('❌ 検証エラー:', e.message);
    return false;
  }
}

// メイン実行
async function main() {
  const isAlreadySecure = await quickVerification();
  
  if (isAlreadySecure) {
    console.log('🎉 RLS既に設定済み - 追加作業不要');
  } else {
    await implementRLSViaWebAPI();
  }
}

main().catch(console.error);
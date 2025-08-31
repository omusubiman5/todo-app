const { chromium } = require('playwright');
const fs = require('fs');

async function automateSupabaseRLS() {
  console.log('🚀 Playwright自動化開始: Supabase RLS設定');
  console.log('=' * 60);

  // ブラウザ起動（既存のEdgeセッションを使用）
  const browser = await chromium.launch({
    headless: false,  // UIを表示して進行を確認
    channel: 'msedge', // Microsoft Edgeを使用
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--disable-background-timer-throttling'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
  });

  const page = await context.newPage();

  try {
    console.log('📱 Step 1: Supabase Dashboardへアクセス');
    await page.goto('https://supabase.com/dashboard', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // ログイン状態確認
    console.log('🔍 Step 2: ログイン状態確認');
    await page.waitForTimeout(3000);
    
    // プロジェクト一覧が表示されているかチェック
    const isLoggedIn = await page.locator('[data-testid="project-card"], .project-card, [href*="project"]').count() > 0;
    
    if (!isLoggedIn) {
      console.log('❌ ログインが必要です。手動でログインしてから再実行してください');
      await page.pause(); // 手動ログインのため一時停止
    } else {
      console.log('✅ ログイン済み確認');
    }

    console.log('🏠 Step 3: プロジェクト選択');
    // プロジェクト "zmxnsfjmusgmapxbcbpn" を探す
    const projectSelector = `[href*="zmxnsfjmusgmapxbcbpn"], [data-project-ref="zmxnsfjmusgmapxbcbpn"]`;
    
    try {
      await page.waitForSelector(projectSelector, { timeout: 10000 });
      await page.click(projectSelector);
      console.log('✅ プロジェクト選択成功');
    } catch (error) {
      console.log('⚠️ プロジェクトを自動選択できません。手動で選択してください');
      console.log('   プロジェクト名: zmxnsfjmusgmapxbcbpn');
      await page.pause(); // 手動選択のため一時停止
    }

    console.log('📝 Step 4: SQL Editorへ移動');
    await page.waitForTimeout(3000);
    
    // SQL Editorのリンクを探す
    const sqlEditorSelectors = [
      'a[href*="sql"]',
      '[data-testid="sql-editor"]',
      'text=SQL Editor',
      'text=SQL',
      '[title*="SQL"]'
    ];

    let sqlEditorFound = false;
    for (const selector of sqlEditorSelectors) {
      try {
        if (await page.locator(selector).count() > 0) {
          await page.click(selector);
          sqlEditorFound = true;
          console.log('✅ SQL Editor選択成功');
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!sqlEditorFound) {
      console.log('⚠️ SQL Editorを自動選択できません');
      console.log('   手動で左メニューから "SQL Editor" をクリックしてください');
      await page.pause();
    }

    console.log('➕ Step 5: New Queryの作成');
    await page.waitForTimeout(3000);

    // New Query ボタンを探す
    const newQuerySelectors = [
      'text=New query',
      'text=New Query', 
      '[data-testid="new-query"]',
      'button:has-text("New")',
      '.btn:has-text("New")'
    ];

    let newQueryFound = false;
    for (const selector of newQuerySelectors) {
      try {
        if (await page.locator(selector).count() > 0) {
          await page.click(selector);
          newQueryFound = true;
          console.log('✅ New Query作成成功');
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!newQueryFound) {
      console.log('⚠️ New Queryボタンを自動選択できません');
      console.log('   手動で "New Query" ボタンをクリックしてください');
      await page.pause();
    }

    console.log('📄 Step 6: SQL入力とペースト');
    await page.waitForTimeout(2000);

    // SQL読み込み
    const sqlContent = `-- 🔒 RLS設定SQL - 自動実行
-- 生成日時: ${new Date().toISOString()}

-- Step 1: 全テーブルでRLS有効化
ALTER TABLE IF EXISTS public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;  
ALTER TABLE IF EXISTS public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

-- Step 2: tasksテーブルのポリシー設定
CREATE POLICY "Users can view own tasks" ON public.tasks
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can create own tasks" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update own tasks" ON public.tasks
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY "Users can delete own tasks" ON public.tasks
  FOR DELETE USING (auth.uid() = user_id);

-- Step 3: profilesテーブルのポリシー設定
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
  
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Step 4: notificationsテーブルのポリシー設定
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- 🎉 RLS設定完了`;

    // SQL Editorを探してテキストをペースト
    const editorSelectors = [
      '.monaco-editor textarea',
      '.ace_text-input',
      'textarea[data-testid="sql-editor"]',
      '.sql-editor textarea',
      'textarea',
      '.editor textarea'
    ];

    let editorFound = false;
    for (const selector of editorSelectors) {
      try {
        const editor = page.locator(selector).first();
        if (await editor.count() > 0) {
          await editor.click();
          await editor.fill(sqlContent);
          editorFound = true;
          console.log('✅ SQLペースト成功');
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!editorFound) {
      console.log('⚠️ SQLエディターを自動入力できません');
      console.log('   手動でSQLをコピー&ペーストしてください:');
      console.log(sqlContent);
      await page.pause();
    }

    console.log('▶️ Step 7: SQL実行');
    await page.waitForTimeout(2000);

    // Run ボタンを探す
    const runSelectors = [
      'text=Run',
      '[data-testid="run-button"]',
      'button:has-text("Run")',
      '.btn:has-text("Run")',
      'button[title*="Run"]'
    ];

    let runFound = false;
    for (const selector of runSelectors) {
      try {
        if (await page.locator(selector).count() > 0) {
          await page.click(selector);
          runFound = true;
          console.log('✅ SQL実行開始');
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!runFound) {
      console.log('⚠️ Runボタンを自動クリックできません');
      console.log('   手動で "Run" ボタンをクリックしてください');
      await page.pause();
    }

    console.log('⏳ Step 8: 実行完了待機');
    await page.waitForTimeout(5000);

    // 実行結果確認
    console.log('📊 Step 9: 実行結果確認');
    
    // エラーまたは成功メッセージを探す
    const resultSelectors = [
      '.error, .alert-error',
      '.success, .alert-success', 
      '.result, .query-result',
      '[data-testid="query-result"]'
    ];

    let hasErrors = false;
    for (const selector of resultSelectors) {
      try {
        const elements = await page.locator(selector).count();
        if (elements > 0) {
          const text = await page.locator(selector).first().textContent();
          if (text && text.toLowerCase().includes('error')) {
            console.log('❌ SQL実行エラー:', text);
            hasErrors = true;
          } else if (text && (text.toLowerCase().includes('success') || text.toLowerCase().includes('completed'))) {
            console.log('✅ SQL実行成功:', text);
          }
        }
      } catch (e) {
        continue;
      }
    }

    if (!hasErrors) {
      console.log('🎉 RLS設定が正常に完了した可能性があります');
    }

    console.log('📱 Step 10: 実行完了');
    console.log('🔍 次のステップ: node verify-rls-fix.js で検証を実行してください');

    // スクリーンショット撮影
    await page.screenshot({ path: 'supabase-rls-result.png', fullPage: true });
    console.log('📸 結果スクリーンショット: supabase-rls-result.png');

    // 5秒間結果を確認するために待機
    console.log('⏰ 5秒間結果確認のため待機...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('💥 自動化エラー:', error.message);
    console.log('📱 手動で続行してください');
    
    // エラー時もスクリーンショット撮影
    await page.screenshot({ path: 'supabase-error.png', fullPage: true });
  } finally {
    console.log('🏁 自動化完了');
    console.log('🌐 ブラウザは開いたままにします（手動確認用）');
    
    // ブラウザを閉じずに終了（手動確認のため）
    // await browser.close();
  }
}

// 実行
async function main() {
  try {
    await automateSupabaseRLS();
  } catch (error) {
    console.error('💥 メイン処理エラー:', error.message);
    console.log('🔧 トラブルシューティング:');
    console.log('1. Microsoft Edgeが最新版か確認');
    console.log('2. Supabaseにログインしているか確認');
    console.log('3. プロジェクトへのアクセス権限があるか確認');
  }
}

main();
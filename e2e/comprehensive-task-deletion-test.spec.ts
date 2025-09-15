import { test, expect } from '@playwright/test';

test.describe('包括的なタスク削除機能テスト - e2e.test.user2@gmail.com', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('認証付きタスク削除機能の完全テスト', async ({ page }) => {
    console.log('🚀 認証付きタスク削除機能テスト開始');
    
    const testEmail = 'e2e.test.user2@gmail.com';
    const passwordCandidates = [
      'testpassword123',
      'password123', 
      '123456789',
      'test123',
      'Test123!',
      'testuser123'
    ];
    
    let loginSuccessful = false;
    let usedPassword = '';

    // スクリーンショット: 初期状態
    await page.screenshot({ path: 'test-results/01-initial-state.png' });
    console.log('📸 初期状態のスクリーンショットを撮影');

    // ログインプロセス開始
    console.log('🔐 ログインプロセス開始');
    
    // ログインページに移動またはログインボタンをクリック
    const loginButton = page.locator('button:has-text("ログイン"), button:has-text("Login"), a[href*="login"]').first();
    if (await loginButton.isVisible()) {
      await loginButton.click();
      await page.waitForLoadState('networkidle');
      console.log('✅ ログインページに移動');
    }

    // スクリーンショット: ログインページ
    await page.screenshot({ path: 'test-results/02-login-page.png' });

    // メールアドレス入力
    const emailInput = page.locator('input[type="email"], input[name*="email"], input[placeholder*="email"], input[placeholder*="メール"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill(testEmail);
      console.log(`📧 メールアドレス入力: ${testEmail}`);
    } else {
      console.log('❌ メールアドレス入力フィールドが見つかりません');
      await page.screenshot({ path: 'test-results/error-no-email-field.png' });
      throw new Error('メールアドレス入力フィールドが見つかりません');
    }

    // パスワード候補を順番に試行
    for (const password of passwordCandidates) {
      console.log(`🔑 パスワード試行: ${password}`);
      
      const passwordInput = page.locator('input[type="password"], input[name*="password"], input[placeholder*="password"], input[placeholder*="パスワード"]').first();
      
      if (await passwordInput.isVisible()) {
        await passwordInput.fill(password);
        
        // ログインボタンをクリック
        const submitButton = page.locator('button[type="submit"], button:has-text("ログイン"), button:has-text("Login"), button:has-text("Sign in")').first();
        await submitButton.click();
        
        // ログイン結果を待機
        await page.waitForTimeout(3000);
        
        // ログイン成功の確認（エラーメッセージがないかチェック）
        const errorMessage = page.locator('text=Error, text=エラー, text=Invalid, text=incorrect, text=wrong').first();
        const isErrorVisible = await errorMessage.isVisible().catch(() => false);
        
        // ダッシュボードまたはタスクページへのリダイレクトをチェック
        const currentUrl = page.url();
        const isOnLoginPage = currentUrl.includes('login') || currentUrl.includes('auth');
        
        if (!isErrorVisible && !isOnLoginPage) {
          loginSuccessful = true;
          usedPassword = password;
          console.log(`✅ ログイン成功: ${password}`);
          break;
        } else {
          console.log(`❌ ログイン失敗: ${password}`);
          // パスワードフィールドをクリア
          if (await passwordInput.isVisible()) {
            await passwordInput.clear();
          }
        }
      }
    }

    if (!loginSuccessful) {
      await page.screenshot({ path: 'test-results/error-login-failed.png' });
      throw new Error('すべてのパスワード候補でログインに失敗しました');
    }

    // スクリーンショット: ログイン成功後
    await page.screenshot({ path: 'test-results/03-after-login.png' });
    console.log(`✅ ログイン成功 - 使用パスワード: ${usedPassword}`);

    // タスクリストページに移動（必要に応じて）
    await page.waitForLoadState('networkidle');
    
    // タスクページまたはダッシュボードに移動
    const taskLink = page.locator('a[href*="task"], a:has-text("タスク"), a:has-text("Tasks"), nav a').first();
    if (await taskLink.isVisible()) {
      await taskLink.click();
      await page.waitForLoadState('networkidle');
      console.log('📋 タスクページに移動');
    }

    // スクリーンショット: タスクページ
    await page.screenshot({ path: 'test-results/04-tasks-page.png' });

    // 既存のタスクを確認、なければテスト用タスクを作成
    let existingTasks = page.locator('[data-testid*="task"], .task-item, li:has(button:has-text("削除")), li:has(button[title*="削除"])');
    let taskCount = await existingTasks.count();
    
    console.log(`📊 既存タスク数: ${taskCount}`);

    if (taskCount === 0) {
      console.log('📝 テスト用タスクを作成');
      
      // タスク作成フィールドを探す
      const taskInput = page.locator('input[placeholder*="タスク"], input[placeholder*="task"], input[type="text"]').first();
      const addButton = page.locator('button:has-text("追加"), button:has-text("Add"), button[type="submit"]').first();
      
      if (await taskInput.isVisible()) {
        await taskInput.fill('削除テスト用タスク - 自動生成');
        
        if (await addButton.isVisible()) {
          await addButton.click();
        } else {
          await taskInput.press('Enter');
        }
        
        await page.waitForTimeout(2000);
        console.log('✅ テスト用タスクを作成');
        
        // 更新されたタスク数を確認
        taskCount = await existingTasks.count();
        console.log(`📊 更新後のタスク数: ${taskCount}`);
      }
    }

    // スクリーンショット: タスク作成後
    await page.screenshot({ path: 'test-results/05-tasks-with-data.png' });

    // タスク削除機能のテスト
    if (taskCount > 0) {
      console.log('🗑️ タスク削除機能のテスト開始');
      
      // 削除前のタスク数を記録
      const initialTaskCount = taskCount;
      console.log(`📊 削除前のタスク数: ${initialTaskCount}`);
      
      // 最初のタスクの削除ボタンを探す
      const deleteButton = page.locator('button:has-text("削除"), button[title*="削除"], button:has(svg):has-text("削除"), [data-testid*="delete"], button:has(.trash-icon), button:has([class*="trash"])').first();
      
      if (await deleteButton.isVisible()) {
        console.log('🎯 削除ボタンが見つかりました');
        
        // スクリーンショット: 削除前
        await page.screenshot({ path: 'test-results/06-before-deletion.png' });
        
        // 削除ボタンをクリック
        await deleteButton.click();
        console.log('🖱️ 削除ボタンをクリック');
        
        // 確認ダイアログがある場合の対応
        await page.waitForTimeout(1000);
        const confirmButton = page.locator('button:has-text("確認"), button:has-text("OK"), button:has-text("削除"), button:has-text("Delete"), button:has-text("Yes")');
        if (await confirmButton.first().isVisible()) {
          await confirmButton.first().click();
          console.log('✅ 削除確認ダイアログで確認');
        }
        
        // 削除処理の完了を待機
        await page.waitForTimeout(3000);
        await page.waitForLoadState('networkidle');
        
        // スクリーンショット: 削除後
        await page.screenshot({ path: 'test-results/07-after-deletion.png' });
        
        // 削除後のタスク数を確認
        const updatedTasks = page.locator('[data-testid*="task"], .task-item, li:has(button:has-text("削除")), li:has(button[title*="削除"])');
        const finalTaskCount = await updatedTasks.count();
        
        console.log(`📊 削除後のタスク数: ${finalTaskCount}`);
        
        // 削除が成功したかを検証
        if (finalTaskCount === initialTaskCount - 1) {
          console.log('✅ タスク削除成功！');
          
          // 成功のスクリーンショット
          await page.screenshot({ path: 'test-results/08-deletion-success.png' });
          
          // テスト結果の記録
          await page.evaluate((result) => {
            console.log('🎉 テスト結果:', result);
          }, {
            success: true,
            initialCount: initialTaskCount,
            finalCount: finalTaskCount,
            deletedCount: initialTaskCount - finalTaskCount,
            usedPassword: usedPassword,
            testEmail: testEmail
          });
          
        } else {
          console.log('❌ タスク削除失敗 - タスク数が変わりませんでした');
          await page.screenshot({ path: 'test-results/error-deletion-failed.png' });
          throw new Error(`タスク削除失敗: 期待値 ${initialTaskCount - 1}, 実際値 ${finalTaskCount}`);
        }
        
      } else {
        console.log('❌ 削除ボタンが見つかりません');
        await page.screenshot({ path: 'test-results/error-no-delete-button.png' });
        
        // より詳細な要素検索
        const allButtons = page.locator('button');
        const buttonCount = await allButtons.count();
        console.log(`🔍 ページ内のボタン総数: ${buttonCount}`);
        
        for (let i = 0; i < Math.min(buttonCount, 10); i++) {
          const buttonText = await allButtons.nth(i).textContent();
          console.log(`ボタン ${i}: "${buttonText}"`);
        }
        
        throw new Error('削除ボタンが見つかりません');
      }
      
    } else {
      console.log('❌ テスト可能なタスクがありません');
      await page.screenshot({ path: 'test-results/error-no-tasks.png' });
      throw new Error('テスト可能なタスクがありません');
    }

    // 最終スクリーンショット
    await page.screenshot({ path: 'test-results/09-final-state.png' });
    console.log('🏁 タスク削除機能テスト完了');
  });

  test('削除ボタンのUI要素確認', async ({ page }) => {
    console.log('🔍 削除ボタンのUI要素確認テスト');
    
    // 様々な削除ボタンのセレクターを試行
    const deleteSelectors = [
      'button:has-text("削除")',
      'button[title*="削除"]',
      'button:has(svg):has-text("削除")',
      '[data-testid*="delete"]',
      'button:has(.trash-icon)',
      'button:has([class*="trash"])',
      'button[aria-label*="削除"]',
      'button[aria-label*="delete"]',
      '.delete-button',
      '.btn-delete'
    ];

    for (const selector of deleteSelectors) {
      const elements = page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        console.log(`✅ セレクター "${selector}" で ${count} 個の要素が見つかりました`);
      } else {
        console.log(`❌ セレクター "${selector}" では要素が見つかりませんでした`);
      }
    }

    await page.screenshot({ path: 'test-results/ui-elements-check.png' });
  });
});
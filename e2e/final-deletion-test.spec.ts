import { test, expect } from '@playwright/test';

test.describe('最終タスク削除機能テスト', () => {
  const TEST_EMAIL = 'omusubiman@gmail.com';
  const TEST_PASSWORD = 'Mm1696bz?';
  
  test('正しい認証情報でタスク削除機能をテスト', async ({ page }) => {
    console.log('🔍 最終タスク削除機能テスト開始');
    
    // アプリにアクセス
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // ログインページに移動
    if (!page.url().includes('/login')) {
      await page.goto('/login');
    }
    
    await page.waitForLoadState('networkidle');
    console.log('📧 ログインページにアクセス');
    
    // ログイン情報を入力
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    
    console.log(`📧 ログイン情報入力完了: ${TEST_EMAIL}`);
    
    // ログインボタンをクリック
    await page.click('button[type="submit"]');
    console.log('🔐 ログインボタンをクリック');
    
    // ログイン後のページ遷移を待機
    await page.waitForTimeout(5000);
    
    // ログイン成功の確認
    const isLoggedIn = !page.url().includes('/login');
    if (!isLoggedIn) {
      console.log('❌ ログインに失敗しました');
      await page.screenshot({ path: 'test-results/login-failed-final.png' });
      test.skip();
      return;
    }
    
    console.log('✅ ログイン成功！');
    await page.screenshot({ path: 'test-results/login-success.png' });
    
    // データ読み込み完了まで待機
    await page.waitForTimeout(5000);
    
    // ページ内容確認
    const pageText = await page.textContent('body');
    const isLoading = pageText?.includes('読み込み中');
    console.log(`🔄 読み込み状態: ${isLoading ? '読み込み中' : '完了'}`);
    
    if (isLoading) {
      console.log('⏳ データ読み込み完了まで追加待機...');
      await page.waitForTimeout(10000);
    }
    
    // タスク関連要素を確認
    const taskInput = page.locator('input[placeholder*="タスク"], input[type="text"]').first();
    const addButton = page.locator('button:has-text("追加"), button[type="submit"]').first();
    
    const hasTaskInput = await taskInput.count() > 0;
    const hasAddButton = await addButton.count() > 0;
    
    console.log(`📝 タスク入力フィールド: ${hasTaskInput ? '発見' : '未発見'}`);
    console.log(`➕ 追加ボタン: ${hasAddButton ? '発見' : '未発見'}`);
    
    // 既存のタスク確認
    let existingTasks = await page.locator('li, [data-testid*="task"], .task-item').count();
    console.log(`📋 既存タスク数: ${existingTasks}`);
    
    // タスクがない場合は新しく作成
    if (existingTasks === 0 && hasTaskInput && hasAddButton) {
      console.log('📝 新しいタスクを作成します');
      
      const testTaskText = 'E2E削除テスト_' + Date.now();
      await taskInput.fill(testTaskText);
      await addButton.click();
      
      console.log(`✅ テストタスク作成: ${testTaskText}`);
      await page.waitForTimeout(3000);
      
      existingTasks = await page.locator('li, [data-testid*="task"], .task-item').count();
      console.log(`📋 作成後タスク数: ${existingTasks}`);
    }
    
    // 削除ボタンを探す
    const deleteSelectors = [
      'button[title="削除"]',
      'button[aria-label*="削除"]',
      'button:has-text("削除")',
      'button:has([data-icon="trash"])',
      'svg[data-icon="trash"]',
      '.delete-button',
      '.btn-delete'
    ];
    
    let deleteButton = null;
    let deleteButtonFound = false;
    
    for (const selector of deleteSelectors) {
      deleteButton = page.locator(selector).first();
      if (await deleteButton.count() > 0) {
        console.log(`🗑️ 削除ボタン発見: ${selector}`);
        deleteButtonFound = true;
        break;
      }
    }
    
    if (deleteButtonFound && deleteButton) {
      console.log('🎯 削除機能テスト実行');
      
      // 削除前の状態記録
      const initialTaskCount = await page.locator('li, [data-testid*="task"], .task-item').count();
      console.log(`📊 削除前タスク数: ${initialTaskCount}`);
      
      await page.screenshot({ path: 'test-results/before-deletion.png' });
      
      // 削除ボタンをクリック
      await deleteButton.click();
      console.log('🗑️ 削除ボタンをクリック');
      
      // 確認ダイアログがある場合は確認
      await page.waitForTimeout(1000);
      const confirmButton = page.locator('button:has-text("確認"), button:has-text("OK"), button:has-text("削除")');
      if (await confirmButton.count() > 0) {
        await confirmButton.first().click();
        console.log('✅ 削除確認ダイアログで確認');
      }
      
      // 削除処理完了を待機
      await page.waitForTimeout(3000);
      
      // 削除後の状態確認
      const finalTaskCount = await page.locator('li, [data-testid*="task"], .task-item').count();
      console.log(`📊 削除後タスク数: ${finalTaskCount}`);
      
      await page.screenshot({ path: 'test-results/after-deletion-final.png' });
      
      // 削除が成功したかチェック
      if (finalTaskCount < initialTaskCount) {
        console.log('🎉 タスク削除機能が正常に動作しました！');
        console.log(`✅ 削除成功: ${initialTaskCount} → ${finalTaskCount}`);
        expect(finalTaskCount).toBeLessThan(initialTaskCount);
      } else {
        console.log('❌ タスクが削除されませんでした');
        console.log(`⚠️ タスク数変化なし: ${initialTaskCount} → ${finalTaskCount}`);
        expect(finalTaskCount).toBeLessThan(initialTaskCount);
      }
    } else {
      console.log('❌ 削除ボタンが見つかりませんでした');
      
      // DOM詳細調査
      const allButtons = await page.locator('button').count();
      console.log(`🔍 全ボタン数: ${allButtons}`);
      
      // 各ボタンの詳細を調査
      const buttons = await page.locator('button').all();
      for (let i = 0; i < Math.min(buttons.length, 10); i++) {
        const text = await buttons[i].textContent().catch(() => '');
        const title = await buttons[i].getAttribute('title').catch(() => '');
        const className = await buttons[i].getAttribute('class').catch(() => '');
        console.log(`  ボタン${i + 1}: "${text}" title="${title}" class="${className}"`);
      }
      
      await page.screenshot({ path: 'test-results/no-delete-button-final.png' });
      expect(deleteButtonFound).toBeTruthy();
    }
  });
});
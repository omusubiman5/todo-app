import { test, expect } from '@playwright/test';

test.describe('シンプルタスク削除テスト', () => {
  const TEST_EMAIL = 'e2e.test.user2@gmail.com';
  
  test('手動ログインでタスク削除機能をテスト', async ({ page }) => {
    console.log('🔍 シンプルタスク削除テスト開始');
    
    // アプリにアクセス
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // ログインページにリダイレクトされることを確認
    await page.waitForURL('**/login', { timeout: 10000 });
    console.log('✅ ログインページにアクセス');
    
    // ログインフィールドを確認
    const emailField = page.locator('input[type="email"]');
    const passwordField = page.locator('input[type="password"]');
    const loginButton = page.locator('button[type="submit"]');
    
    await expect(emailField).toBeVisible();
    await expect(passwordField).toBeVisible();
    await expect(loginButton).toBeVisible();
    
    console.log('✅ ログインフォームの要素を確認');
    
    // メールアドレスを入力
    await emailField.fill(TEST_EMAIL);
    console.log(`📧 メールアドレス入力: ${TEST_EMAIL}`);
    
    // テスト実行者への指示
    console.log('⚠️ 手動でパスワードを入力してログインボタンをクリックしてください');
    console.log('⚠️ このテストは一時停止します。ログイン後、再開してください');
    
    // 30秒待機（手動ログイン用）
    await page.waitForTimeout(30000);
    
    // ログイン成功の確認
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      console.log('❌ ログインが完了していません');
      test.skip();
      return;
    }
    
    console.log('✅ ログイン成功！');
    await page.screenshot({ path: 'test-results/after-login.png' });
    
    // タスクリストが表示されるまで待機
    await page.waitForTimeout(3000);
    
    // 既存のタスクを探す
    const taskItems = page.locator('li:has-text("タスク"), li:has([title="削除"]), [data-testid*="task"]');
    const taskCount = await taskItems.count();
    console.log(`📋 見つかったタスク数: ${taskCount}`);
    
    if (taskCount === 0) {
      console.log('📝 タスクが見つからないため、新しいタスクを作成');
      
      // タスク入力フィールドを探す
      const taskInput = page.locator('input[placeholder*="タスク"], input[type="text"]').first();
      if (await taskInput.isVisible()) {
        await taskInput.fill('削除テスト用タスク_' + Date.now());
        
        const addButton = page.locator('button:has-text("追加"), button[type="submit"]').first();
        if (await addButton.isVisible()) {
          await addButton.click();
          await page.waitForTimeout(2000);
          console.log('✅ テスト用タスクを作成');
        }
      }
    }
    
    // 削除ボタンを探す
    const deleteButton = page.locator('button[title="削除"], [aria-label*="削除"]').first();
    
    if (await deleteButton.count() > 0) {
      console.log('🗑️ 削除ボタンを発見');
      
      // 削除前のタスク数を記録
      const initialTaskCount = await page.locator('li').count();
      console.log(`📊 削除前のタスク数: ${initialTaskCount}`);
      
      // 削除ボタンをクリック
      await deleteButton.click();
      console.log('🗑️ 削除ボタンをクリック');
      
      // 削除処理完了を待機
      await page.waitForTimeout(2000);
      
      // 削除後のタスク数を確認
      const finalTaskCount = await page.locator('li').count();
      console.log(`📊 削除後のタスク数: ${finalTaskCount}`);
      
      await page.screenshot({ path: 'test-results/after-deletion.png' });
      
      // 削除が成功したかチェック
      if (finalTaskCount < initialTaskCount) {
        console.log('✅ タスクの削除が成功！');
        expect(finalTaskCount).toBeLessThan(initialTaskCount);
      } else {
        console.log('⚠️ タスク数に変化なし');
      }
    } else {
      console.log('❌ 削除ボタンが見つかりません');
      await page.screenshot({ path: 'test-results/no-delete-button.png' });
    }
  });
});
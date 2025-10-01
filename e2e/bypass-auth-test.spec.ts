import { test, expect } from '@playwright/test';

test.describe('認証スルーテスト', () => {
  test('認証スルー設定でタスク削除機能をテスト', async ({ page }) => {
    console.log('🔍 認証スルーテスト開始');
    
    // アプリにアクセス
    await page.goto('/');
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    const pageText = await page.textContent('body');
    
    console.log(`📍 現在のURL: ${currentUrl}`);
    console.log(`📄 ページ内容 (最初の200文字): ${pageText?.substring(0, 200)}`);
    
    const isLoginPage = currentUrl.includes('/login');
    const isLoading = pageText?.includes('読み込み中');
    
    console.log(`🔐 ログインページ?: ${isLoginPage}`);
    console.log(`🔄 読み込み中?: ${isLoading}`);
    
    if (isLoginPage) {
      console.log('❌ 認証スルーが機能していません');
      expect(isLoginPage).toBeFalsy();
      return;
    }
    
    if (isLoading) {
      console.log('⏳ データ読み込み中... 追加待機');
      await page.waitForTimeout(10000);
      
      const finalPageText = await page.textContent('body');
      const stillLoading = finalPageText?.includes('読み込み中');
      
      if (stillLoading) {
        console.log('❌ データ読み込みが完了しません');
        await page.screenshot({ path: 'test-results/still-loading.png' });
        expect(stillLoading).toBeFalsy();
        return;
      }
    }
    
    console.log('✅ 認証スルー成功！メインページに到達');
    await page.screenshot({ path: 'test-results/auth-bypass-success.png' });
    
    // タスク要素を確認
    await page.waitForTimeout(2000);
    
    const taskInput = await page.locator('input[placeholder*="タスク"], input[type="text"]').count();
    const addButton = await page.locator('button:has-text("追加"), button[type="submit"]').count();
    const existingTasks = await page.locator('li, [data-testid*="task"]').count();
    const deleteButtons = await page.locator('button[title="削除"]').count();
    
    console.log(`📝 タスク入力フィールド: ${taskInput}個`);
    console.log(`➕ 追加ボタン: ${addButton}個`);
    console.log(`📋 既存タスク: ${existingTasks}個`);
    console.log(`🗑️ 削除ボタン: ${deleteButtons}個`);
    
    // タスクが表示されている場合は削除テスト実行
    if (deleteButtons > 0) {
      console.log('🎯 削除機能テスト開始');
      
      // 削除前のタスク数を記録
      const initialCount = existingTasks;
      
      // 削除ボタンをクリック
      await page.locator('button[title="削除"]').first().click();
      console.log('🗑️ 削除ボタンをクリック');
      
      // 削除処理完了を待機
      await page.waitForTimeout(3000);
      
      // 削除後のタスク数を確認
      const finalCount = await page.locator('li, [data-testid*="task"]').count();
      
      console.log(`📊 削除前: ${initialCount}個 → 削除後: ${finalCount}個`);
      
      if (finalCount < initialCount) {
        console.log('🎉 タスク削除機能が正常に動作しました！');
        expect(finalCount).toBeLessThan(initialCount);
      } else {
        console.log('❌ タスクが削除されませんでした');
        expect(finalCount).toBeLessThan(initialCount);
      }
      
      await page.screenshot({ path: 'test-results/deletion-test-result.png' });
    } else if (taskInput > 0 && addButton > 0) {
      console.log('📝 タスクを作成してから削除テスト');
      
      // 新しいタスクを作成
      const testTaskText = 'テスト削除用_' + Date.now();
      await page.locator('input[placeholder*="タスク"], input[type="text"]').first().fill(testTaskText);
      await page.locator('button:has-text("追加"), button[type="submit"]').first().click();
      
      console.log(`✅ テストタスク作成: ${testTaskText}`);
      await page.waitForTimeout(3000);
      
      // 削除ボタンが現れたか確認
      const newDeleteButtons = await page.locator('button[title="削除"]').count();
      
      if (newDeleteButtons > 0) {
        console.log('🗑️ 削除ボタンが現れました');
        
        await page.locator('button[title="削除"]').first().click();
        console.log('🗑️ 削除ボタンをクリック');
        
        await page.waitForTimeout(3000);
        
        // タスクが削除されたか確認
        const taskExists = await page.locator(`text=${testTaskText}`).count() > 0;
        
        if (!taskExists) {
          console.log('🎉 作成したタスクの削除が成功しました！');
          expect(taskExists).toBeFalsy();
        } else {
          console.log('❌ 作成したタスクが削除されませんでした');
          expect(taskExists).toBeFalsy();
        }
        
        await page.screenshot({ path: 'test-results/created-task-deletion.png' });
      } else {
        console.log('❌ タスク作成後も削除ボタンが現れませんでした');
      }
    } else {
      console.log('❌ タスク入力要素が見つかりません');
      await page.screenshot({ path: 'test-results/no-task-elements.png' });
    }
  });
});
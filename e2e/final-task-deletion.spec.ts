import { test, expect } from '@playwright/test';

test.describe('最終タスク削除機能テスト', () => {
  test('AccessibleTaskItemの削除ボタンをテスト', async ({ page }) => {
    console.log('🔍 AccessibleTaskItem削除機能テスト開始');
    
    // アプリにアクセス
    await page.goto('/');
    await page.waitForTimeout(5000);
    
    const currentUrl = page.url();
    const isLoginPage = currentUrl.includes('/login');
    
    if (isLoginPage) {
      console.log('❌ ログインページにリダイレクトされました');
      expect(isLoginPage).toBeFalsy();
      return;
    }
    
    console.log('✅ メインページにアクセス成功');
    
    // データ読み込み完了を待機
    await page.waitForTimeout(10000);
    
    const pageText = await page.textContent('body');
    if (pageText?.includes('読み込み中')) {
      console.log('❌ まだ読み込み中です');
      expect(pageText.includes('読み込み中')).toBeFalsy();
      return;
    }
    
    console.log('✅ データ読み込み完了');
    await page.screenshot({ path: 'test-results/main-page-loaded.png' });
    
    // AccessibleTaskItemで使用される正確なセレクターを使用
    const taskItems = await page.locator('[role="listitem"]').count();
    console.log(`📋 タスクアイテム数: ${taskItems}`);
    
    if (taskItems === 0) {
      console.log('❌ タスクが見つかりません');
      expect(taskItems).toBeGreaterThan(0);
      return;
    }
    
    // 削除ボタンの正確なセレクター（AccessibleTaskItemのコードから）
    const deleteButtons = await page.locator('button[aria-label="タスクを削除"]').count();
    console.log(`🗑️ 削除ボタン数: ${deleteButtons}`);
    
    if (deleteButtons === 0) {
      console.log('❌ 削除ボタンが見つかりません');
      
      // デバッグ: 全てのボタンを調査
      const allButtons = await page.locator('button').count();
      console.log(`🔍 全ボタン数: ${allButtons}`);
      
      // 各ボタンのaria-labelを確認
      const buttons = await page.locator('button').all();
      for (let i = 0; i < Math.min(buttons.length, 10); i++) {
        const ariaLabel = await buttons[i].getAttribute('aria-label') || '';
        const textContent = await buttons[i].textContent() || '';
        console.log(`  ボタン${i + 1}: aria-label="${ariaLabel}" text="${textContent}"`);
      }
      
      // FaTrash アイコンを持つボタンを探す
      const trashButtons = await page.locator('button:has([data-icon="trash"])').count();
      console.log(`🗑️ Trashアイコン付きボタン: ${trashButtons}`);
      
      await page.screenshot({ path: 'test-results/no-delete-buttons-debug.png' });
      expect(deleteButtons).toBeGreaterThan(0);
      return;
    }
    
    console.log('🎯 削除ボタンが見つかりました！削除テスト実行');
    
    // 削除前の状態記録
    const initialTaskCount = taskItems;
    console.log(`📊 削除前タスク数: ${initialTaskCount}`);
    
    // 削除ボタンをクリック
    await page.locator('button[aria-label="タスクを削除"]').first().click();
    console.log('🗑️ 削除ボタンをクリックしました');
    
    // 削除処理完了を待機
    await page.waitForTimeout(3000);
    
    // 削除後の状態確認
    const finalTaskCount = await page.locator('[role="listitem"]').count();
    console.log(`📊 削除後タスク数: ${finalTaskCount}`);
    
    await page.screenshot({ path: 'test-results/deletion-completed.png' });
    
    // 削除が成功したかチェック
    if (finalTaskCount < initialTaskCount) {
      console.log('🎉 タスク削除機能が正常に動作しました！');
      console.log(`✅ 削除成功: ${initialTaskCount} → ${finalTaskCount}`);
      expect(finalTaskCount).toBeLessThan(initialTaskCount);
    } else {
      console.log('❌ タスクが削除されませんでした');
      console.log(`⚠️ タスク数に変化なし: ${initialTaskCount} → ${finalTaskCount}`);
      
      // 削除が失敗した場合の詳細デバッグ
      const pageContent = await page.textContent('body');
      if (pageContent?.includes('エラー') || pageContent?.includes('失敗')) {
        console.log('🚨 ページにエラーメッセージが表示されています');
      }
      
      expect(finalTaskCount).toBeLessThan(initialTaskCount);
    }
  });
  
  test('Deleteキーでのキーボード削除をテスト', async ({ page }) => {
    console.log('⌨️ キーボード削除テスト開始');
    
    await page.goto('/');
    await page.waitForTimeout(10000);
    
    const taskItems = await page.locator('[role="listitem"]').count();
    if (taskItems === 0) {
      console.log('❌ タスクが見つかりません');
      test.skip();
      return;
    }
    
    console.log(`📋 タスク数: ${taskItems}`);
    
    // 最初のタスクにフォーカスを当てる
    await page.locator('[role="listitem"]').first().focus();
    console.log('🎯 最初のタスクにフォーカス');
    
    // Deleteキーを押す（AccessibleTaskItemのキーボードショートカット）
    await page.keyboard.press('Delete');
    console.log('⌨️ Deleteキーを押しました');
    
    await page.waitForTimeout(3000);
    
    const finalTaskCount = await page.locator('[role="listitem"]').count();
    
    if (finalTaskCount < taskItems) {
      console.log('🎉 キーボード削除が成功しました！');
      expect(finalTaskCount).toBeLessThan(taskItems);
    } else {
      console.log('❌ キーボード削除が失敗しました');
      expect(finalTaskCount).toBeLessThan(taskItems);
    }
  });
});
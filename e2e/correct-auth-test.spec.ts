import { test, expect } from '@playwright/test';

test.describe('正しい認証情報でのテスト', () => {
  const TEST_EMAIL = 'omusubiman@gmail.com';
  const TEST_PASSWORD = 'Mm1696bz?'; // 正確なパスワード
  
  test('正しいパスワードでログインして削除機能をテスト', async ({ page }) => {
    console.log('🔍 正しい認証情報でのテスト開始');
    
    // アプリにアクセス
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // ログインページかどうか確認
    const currentUrl = page.url();
    console.log(`📍 現在のURL: ${currentUrl}`);
    
    if (!currentUrl.includes('/login')) {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
    }
    
    console.log('📧 ログインページにアクセス');
    
    // ログイン情報を慎重に入力
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    
    console.log(`📧 ログイン情報入力完了: ${TEST_EMAIL}`);
    console.log(`🔑 パスワード入力完了: ${TEST_PASSWORD}`);
    
    // スクリーンショット（ログイン前）
    await page.screenshot({ path: 'test-results/before-login.png' });
    
    // ログインボタンをクリック
    await page.click('button[type="submit"]');
    console.log('🔐 ログインボタンをクリック');
    
    // ログイン処理の完了を十分に待機
    await page.waitForTimeout(8000);
    
    // ログイン成功の確認
    const finalUrl = page.url();
    const isLoggedIn = !finalUrl.includes('/login');
    
    console.log(`📍 ログイン後URL: ${finalUrl}`);
    console.log(`✅ ログイン成功?: ${isLoggedIn}`);
    
    if (!isLoggedIn) {
      console.log('❌ ログインに失敗しました');
      
      // エラーメッセージを確認
      const pageText = await page.textContent('body');
      console.log(`📄 ページ内容: ${pageText?.substring(0, 500)}`);
      
      // スクリーンショット（ログイン失敗）
      await page.screenshot({ path: 'test-results/login-failed-detailed.png' });
      
      expect(isLoggedIn).toBeTruthy();
      return;
    }
    
    console.log('🎉 ログイン成功！');
    await page.screenshot({ path: 'test-results/login-success-detailed.png' });
    
    // データ読み込み完了を待機
    console.log('⏳ データ読み込み待機中...');
    await page.waitForTimeout(10000);
    
    // ページ内容を確認
    const pageContent = await page.textContent('body');
    const isLoading = pageContent?.includes('読み込み中');
    
    if (isLoading) {
      console.log('⏳ まだ読み込み中... 追加待機');
      await page.waitForTimeout(15000);
      
      const finalContent = await page.textContent('body');
      const stillLoading = finalContent?.includes('読み込み中');
      
      if (stillLoading) {
        console.log('❌ 読み込みが完了しませんでした');
        await page.screenshot({ path: 'test-results/loading-timeout.png' });
        expect(stillLoading).toBeFalsy();
        return;
      }
    }
    
    console.log('✅ データ読み込み完了');
    await page.screenshot({ path: 'test-results/data-loaded.png' });
    
    // タスク要素を確認
    const taskItems = await page.locator('[role="listitem"]').count();
    const deleteButtons = await page.locator('button[aria-label="タスクを削除"]').count();
    
    console.log(`📋 タスクアイテム: ${taskItems}個`);
    console.log(`🗑️ 削除ボタン: ${deleteButtons}個`);
    
    if (taskItems > 0 && deleteButtons > 0) {
      console.log('🎯 削除機能テスト実行！');
      
      // 削除前の状態記録
      const initialCount = taskItems;
      
      // 削除ボタンをクリック
      await page.locator('button[aria-label="タスクを削除"]').first().click();
      console.log('🗑️ 削除ボタンをクリック');
      
      // 削除処理完了を待機
      await page.waitForTimeout(5000);
      
      // 削除後の状態確認
      const finalCount = await page.locator('[role="listitem"]').count();
      
      console.log(`📊 削除前: ${initialCount}個 → 削除後: ${finalCount}個`);
      
      await page.screenshot({ path: 'test-results/after-deletion-final.png' });
      
      if (finalCount < initialCount) {
        console.log('🎉🎉 タスク削除機能が正常に動作しました！！');
        console.log('✅✅ E2Eテスト完全成功！');
        expect(finalCount).toBeLessThan(initialCount);
      } else {
        console.log('❌ タスクが削除されませんでした');
        expect(finalCount).toBeLessThan(initialCount);
      }
    } else {
      console.log('❌ タスクまたは削除ボタンが見つかりません');
      console.log('🔍 デバッグ情報を収集中...');
      
      // 詳細なデバッグ
      const allButtons = await page.locator('button').count();
      console.log(`🔍 全ボタン数: ${allButtons}`);
      
      const buttons = await page.locator('button').all();
      for (let i = 0; i < Math.min(buttons.length, 5); i++) {
        const ariaLabel = await buttons[i].getAttribute('aria-label') || '';
        const textContent = await buttons[i].textContent() || '';
        console.log(`  ボタン${i + 1}: "${ariaLabel}" / "${textContent}"`);
      }
      
      await page.screenshot({ path: 'test-results/debug-no-elements.png' });
    }
  });
});
import { test, expect } from '@playwright/test';

test.describe('認証状態確認', () => {
  test('現在の認証状態とページ内容を確認', async ({ page }) => {
    console.log('🔍 認証状態確認テスト開始');
    
    try {
      // アプリにアクセス
      await page.goto('/', { timeout: 15000 });
      console.log('✅ ページアクセス成功');
      
      // 3秒待機
      await page.waitForTimeout(3000);
      
      // 現在のURL確認
      const currentUrl = page.url();
      console.log(`📍 現在のURL: ${currentUrl}`);
      
      // ページタイトル確認
      const title = await page.title();
      console.log(`📄 ページタイトル: ${title}`);
      
      // ログインページかどうか確認
      const isLoginPage = currentUrl.includes('/login');
      console.log(`🔐 ログインページ?: ${isLoginPage}`);
      
      if (isLoginPage) {
        console.log('❌ まだ認証が必要です');
        
        // ログインフォームの確認
        const emailField = await page.locator('input[type="email"]').count();
        const passwordField = await page.locator('input[type="password"]').count();
        console.log(`📧 メールフィールド: ${emailField}個`);
        console.log(`🔑 パスワードフィールド: ${passwordField}個`);
      } else {
        console.log('✅ 認証スルー成功！メインページにアクセス');
        
        // タスク関連要素の確認
        const taskInput = await page.locator('input[placeholder*="タスク"]').count();
        const addButton = await page.locator('button:has-text("追加")').count();
        const taskItems = await page.locator('li').count();
        const deleteButtons = await page.locator('button[title="削除"]').count();
        
        console.log(`📝 タスク入力フィールド: ${taskInput}個`);
        console.log(`➕ 追加ボタン: ${addButton}個`);
        console.log(`📋 タスクアイテム: ${taskItems}個`);
        console.log(`🗑️ 削除ボタン: ${deleteButtons}個`);
        
        if (deleteButtons > 0) {
          console.log('✅ 削除ボタンが見つかりました！');
          
          // 削除ボタンをクリックしてテスト
          await page.locator('button[title="削除"]').first().click();
          console.log('🗑️ 削除ボタンをクリックしました');
          
          await page.waitForTimeout(2000);
          
          const newTaskCount = await page.locator('li').count();
          console.log(`📊 削除後のタスク数: ${newTaskCount}`);
          
          if (newTaskCount < taskItems) {
            console.log('✅ 削除機能が正常に動作しました！');
          } else {
            console.log('⚠️ 削除されませんでした');
          }
        } else {
          console.log('❌ 削除ボタンが見つかりません');
        }
      }
      
      // スクリーンショット保存
      await page.screenshot({ path: 'test-results/auth-check.png' });
      
    } catch (error) {
      console.log(`❌ エラー発生: ${error}`);
      await page.screenshot({ path: 'test-results/auth-check-error.png' });
    }
  });
});
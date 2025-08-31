const { test, expect } = require('@playwright/test');

/**
 * 認証プロセスのデバッグテスト
 */

test.describe('認証デバッグ', () => {
  const TEST_BASE_URL = 'http://localhost:3000';
  const TEST_EMAIL = 'omusubiman@gmail.com';
  const TEST_PASSWORD = 'Mm1696bz?';
  
  test('認証プロセスの詳細デバッグ', async ({ page }) => {
    console.log('🚀 認証デバッグテスト開始');
    
    // ページ移動
    await page.goto(TEST_BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // 現在のURLをログ
    console.log('📍 初期URL:', page.url());
    
    // ページタイトルをログ
    const title = await page.title();
    console.log('📋 ページタイトル:', title);
    
    // ログインボタンを探す
    const loginButton = page.locator('button:has-text("ログイン")');
    const isLoginVisible = await loginButton.isVisible();
    console.log('🔐 ログインボタンの表示状況:', isLoginVisible);
    
    if (isLoginVisible) {
      console.log('🔐 ログイン処理開始');
      
      // ログインボタンをクリック
      await loginButton.click();
      await page.waitForLoadState('networkidle');
      console.log('📍 ログインクリック後のURL:', page.url());
      
      // メールアドレス入力
      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toBeVisible();
      await emailInput.fill(TEST_EMAIL);
      console.log('📧 メールアドレス入力完了');
      
      // パスワード入力
      const passwordInput = page.locator('input[type="password"]');
      await expect(passwordInput).toBeVisible();
      await passwordInput.fill(TEST_PASSWORD);
      console.log('🔒 パスワード入力完了');
      
      // ログインボタン（フォーム内）をクリック
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeVisible();
      await submitButton.click();
      console.log('✅ ログインフォーム送信完了');
      
      // 認証処理を待機
      await page.waitForTimeout(3000);
      console.log('📍 認証後のURL:', page.url());
      
      // エラーメッセージの確認
      const errorMessage = page.locator('text=認証エラー');
      const hasError = await errorMessage.isVisible();
      console.log('❌ 認証エラーの有無:', hasError);
      
      if (hasError) {
        const errorText = await errorMessage.textContent();
        console.log('❌ エラーメッセージ:', errorText);
      }
      
      // 成功した場合の要素チェック
      const taskInputs = [
        'input[placeholder*="タスク"]',
        'input[placeholder*="内容"]',
        'input[type="text"]',
        'textarea[placeholder*="タスク"]'
      ];
      
      console.log('🔍 タスク入力フィールドの検索開始');
      for (const selector of taskInputs) {
        const element = page.locator(selector);
        const count = await element.count();
        const isVisible = count > 0 ? await element.first().isVisible() : false;
        console.log(`📝 ${selector}: ${count}個見つかり、表示=${isVisible}`);
      }
      
      // ワークスペーススイッチャーの確認
      const workspaceSwitchers = [
        '[class*="workspace"]',
        'button:has-text("個人")',
        'button:has-text("チーム")',
        '[data-testid*="workspace"]'
      ];
      
      console.log('🔍 ワークスペーススイッチャーの検索開始');
      for (const selector of workspaceSwitchers) {
        const element = page.locator(selector);
        const count = await element.count();
        const isVisible = count > 0 ? await element.first().isVisible() : false;
        console.log(`🔄 ${selector}: ${count}個見つかり、表示=${isVisible}`);
      }
      
      // ページの全体的な構造を確認
      console.log('📋 ページ内のすべてのボタンを検索');
      const allButtons = page.locator('button');
      const buttonCount = await allButtons.count();
      console.log(`🔘 合計ボタン数: ${buttonCount}`);
      
      for (let i = 0; i < Math.min(buttonCount, 10); i++) {
        const button = allButtons.nth(i);
        const text = await button.textContent();
        const isVisible = await button.isVisible();
        console.log(`🔘 ボタン${i + 1}: "${text}", 表示=${isVisible}`);
      }
      
      // 全input要素の確認
      console.log('📝 ページ内のすべてのinput要素を検索');
      const allInputs = page.locator('input');
      const inputCount = await allInputs.count();
      console.log(`📝 合計input数: ${inputCount}`);
      
      for (let i = 0; i < Math.min(inputCount, 5); i++) {
        const input = allInputs.nth(i);
        const type = await input.getAttribute('type');
        const placeholder = await input.getAttribute('placeholder');
        const isVisible = await input.isVisible();
        console.log(`📝 Input${i + 1}: type="${type}", placeholder="${placeholder}", 表示=${isVisible}`);
      }
      
    } else {
      console.log('ℹ️ 既にログイン済み、またはログインが不要な状態');
      
      // 直接タスク入力フィールドを探す
      const taskInput = page.locator('input[placeholder*="タスク"]');
      const isTaskInputVisible = await taskInput.isVisible();
      console.log('📝 タスク入力フィールドの表示状況:', isTaskInputVisible);
    }
    
    // 最終的なページ状態のスクリーンショット
    await page.screenshot({ 
      path: 'debug-final-state.png', 
      fullPage: true 
    });
    console.log('📸 最終状態のスクリーンショット保存完了');
    
    console.log('🎯 認証デバッグテスト完了');
  });
});
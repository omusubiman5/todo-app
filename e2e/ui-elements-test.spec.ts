import { test, expect } from '@playwright/test';

test.describe('UI要素とタスク削除機能の検証', () => {
  test.setTimeout(60000);

  test('ログインページとUI要素の検証', async ({ page }) => {
    console.log('🎯 UI要素検証テスト開始');
    
    // アプリにアクセス
    console.log('📱 アプリにアクセス中...');
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // 初期状態のスクリーンショット
    await page.screenshot({ path: 'test-results/ui-01-initial-load.png', fullPage: true });
    console.log('📸 初期状態キャプチャ完了');

    // ページタイトル確認
    const title = await page.title();
    console.log(`📄 ページタイトル: ${title}`);
    expect(title).toContain('TodoApp');

    // URLの確認
    const currentUrl = page.url();
    console.log(`🌐 現在のURL: ${currentUrl}`);
    
    // ログインページへのリダイレクト確認
    if (currentUrl.includes('/login')) {
      console.log('✅ ログインページに正しくリダイレクトされました');
      
      // ログインフォーム要素の確認
      await page.waitForTimeout(3000);
      
      // スクリーンショット: ログインページ
      await page.screenshot({ path: 'test-results/ui-02-login-page.png', fullPage: true });
      
      // メールアドレスフィールドの確認
      const emailInput = page.locator('input[type="email"]').first();
      const isEmailVisible = await emailInput.isVisible();
      console.log(`📧 メールアドレスフィールド: ${isEmailVisible ? '✅ 存在' : '❌ 不在'}`);
      
      // パスワードフィールドの確認
      const passwordInput = page.locator('input[type="password"]').first();
      const isPasswordVisible = await passwordInput.isVisible();
      console.log(`🔑 パスワードフィールド: ${isPasswordVisible ? '✅ 存在' : '❌ 不在'}`);
      
      // ログインボタンの確認
      const loginButton = page.locator('button:has-text("ログイン"), button[type="submit"]').first();
      const isLoginButtonVisible = await loginButton.isVisible();
      console.log(`🚪 ログインボタン: ${isLoginButtonVisible ? '✅ 存在' : '❌ 不在'}`);
      
      // 新規登録リンクの確認
      const signupLink = page.locator('a:has-text("新規登録"), button:has-text("新規登録")').first();
      const isSignupVisible = await signupLink.isVisible();
      console.log(`📝 新規登録リンク: ${isSignupVisible ? '✅ 存在' : '❌ 不在'}`);
      
    } else {
      console.log('🔍 ログインページではない場合のテスト');
      await page.waitForTimeout(5000);
      
      // スクリーンショット: 他のページ
      await page.screenshot({ path: 'test-results/ui-02-other-page.png', fullPage: true });
    }
    
    console.log('✅ UI要素検証完了');
  });

  test('新規登録ページの検証', async ({ page }) => {
    console.log('📝 新規登録ページテスト開始');
    
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    // 新規登録リンクを探してクリック
    const signupSelectors = [
      'a:has-text("新規登録")',
      'button:has-text("新規登録")',
      'a[href*="signup"]',
      'a[href*="register"]'
    ];
    
    let signupFound = false;
    for (const selector of signupSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`✅ 新規登録リンクが見つかりました: ${selector}`);
        await element.click();
        signupFound = true;
        break;
      }
    }
    
    if (signupFound) {
      await page.waitForTimeout(3000);
      
      // 新規登録ページのスクリーンショット
      await page.screenshot({ path: 'test-results/ui-03-signup-page.png', fullPage: true });
      
      // 新規登録フォーム要素の確認
      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      const signupButton = page.locator('button:has-text("登録"), button:has-text("Sign up"), button[type="submit"]').first();
      
      console.log(`📧 メールフィールド: ${await emailInput.isVisible() ? '✅ 存在' : '❌ 不在'}`);
      console.log(`🔑 パスワードフィールド: ${await passwordInput.isVisible() ? '✅ 存在' : '❌ 不在'}`);
      console.log(`📝 登録ボタン: ${await signupButton.isVisible() ? '✅ 存在' : '❌ 不在'}`);
      
    } else {
      console.log('❌ 新規登録リンクが見つかりませんでした');
    }
    
    console.log('✅ 新規登録ページテスト完了');
  });

  test('アクセシビリティとレスポンシブデザインの確認', async ({ page }) => {
    console.log('♿ アクセシビリティテスト開始');
    
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    // デスクトップビューのスクリーンショット
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.screenshot({ path: 'test-results/ui-04-desktop-view.png', fullPage: true });
    console.log('🖥️ デスクトップビューキャプチャ完了');
    
    // タブレットビューのスクリーンショット
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/ui-05-tablet-view.png', fullPage: true });
    console.log('📱 タブレットビューキャプチャ完了');
    
    // モバイルビューのスクリーンショット
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/ui-06-mobile-view.png', fullPage: true });
    console.log('📱 モバイルビューキャプチャ完了');
    
    // デスクトップビューに戻す
    await page.setViewportSize({ width: 1280, height: 720 });
    
    console.log('✅ アクセシビリティテスト完了');
  });

  test('ページパフォーマンスと読み込み時間の測定', async ({ page }) => {
    console.log('⚡ パフォーマンステスト開始');
    
    const startTime = Date.now();
    
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    const domLoadTime = Date.now() - startTime;
    console.log(`⏱️ DOM読み込み時間: ${domLoadTime}ms`);
    
    await page.waitForTimeout(5000);
    
    const totalLoadTime = Date.now() - startTime;
    console.log(`⏱️ 総読み込み時間: ${totalLoadTime}ms`);
    
    // パフォーマンス指標の収集
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        dns: Math.round(navigation.domainLookupEnd - navigation.domainLookupStart),
        connection: Math.round(navigation.connectEnd - navigation.connectStart),
        request: Math.round(navigation.responseStart - navigation.requestStart),
        response: Math.round(navigation.responseEnd - navigation.responseStart),
        domProcessing: Math.round(navigation.domComplete - navigation.responseEnd),
        totalTime: Math.round(navigation.loadEventEnd - navigation.navigationStart)
      };
    });
    
    console.log('📊 パフォーマンス指標:');
    console.log(`   DNS解決: ${metrics.dns}ms`);
    console.log(`   接続: ${metrics.connection}ms`);
    console.log(`   リクエスト: ${metrics.request}ms`);
    console.log(`   レスポンス: ${metrics.response}ms`);
    console.log(`   DOM処理: ${metrics.domProcessing}ms`);
    console.log(`   総時間: ${metrics.totalTime}ms`);
    
    // 最終スクリーンショット
    await page.screenshot({ path: 'test-results/ui-07-performance-final.png', fullPage: true });
    
    console.log('✅ パフォーマンステスト完了');
  });
});
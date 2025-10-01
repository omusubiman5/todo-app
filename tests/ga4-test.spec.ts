import { test, expect } from '@playwright/test';

test.describe('Google Analytics 4 Integration', () => {
  test.beforeEach(async ({ page }) => {
    // ローカル開発環境にアクセス
    await page.goto('http://localhost:3001');
  });

  test('Cookie同意バナーが表示され、同意後にGA4が初期化される', async ({ page }) => {
    console.log('📊 GA4テスト開始...');

    // 1. Cookie同意バナーの表示を確認
    const cookieBanner = page.locator('div:has-text("このサイトではユーザーエクスペリエンス向上のためにクッキーを使用しています")');
    await expect(cookieBanner).toBeVisible({ timeout: 10000 });
    console.log('✅ Cookie同意バナーが表示されました');

    // 2. バナー内のボタンを確認
    const acceptButton = page.locator('button:has-text("同意する")');
    const declineButton = page.locator('button:has-text("拒否")');
    await expect(acceptButton).toBeVisible();
    await expect(declineButton).toBeVisible();
    console.log('✅ 同意/拒否ボタンが表示されています');

    // 3. プライバシーポリシーリンクの確認
    const privacyLink = page.locator('a[href="/privacy"]');
    await expect(privacyLink).toBeVisible();
    console.log('✅ プライバシーポリシーリンクが存在');

    // 4. ネットワークリクエストを監視
    const googleAnalyticsRequests: string[] = [];
    page.on('request', request => {
      const url = request.url();
      if (url.includes('google-analytics.com') || url.includes('googletagmanager.com')) {
        googleAnalyticsRequests.push(url);
        console.log('🔍 GA4リクエスト検出:', url);
      }
    });

    // 5. コンソールメッセージを監視
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      if (text.includes('GA4')) {
        console.log('📝 Console:', text);
      }
    });

    // 6. 同意ボタンをクリック
    await acceptButton.click();
    console.log('🖱️ 同意ボタンをクリックしました');

    // 7. バナーが消えることを確認
    await expect(cookieBanner).toBeHidden({ timeout: 5000 });
    console.log('✅ Cookie同意バナーが非表示になりました');

    // 8. LocalStorageの確認
    const consentStatus = await page.evaluate(() => {
      return localStorage.getItem('cookie-consent');
    });
    expect(consentStatus).toBe('accepted');
    console.log('✅ LocalStorageに同意状態が保存されました');

    // 9. GA4スクリプトの読み込みを確認
    await page.waitForTimeout(2000); // スクリプト読み込みを待つ

    const hasGtagScript = await page.evaluate(() => {
      const scripts = Array.from(document.scripts);
      return scripts.some(script =>
        script.src.includes('googletagmanager.com/gtag/js')
      );
    });
    expect(hasGtagScript).toBe(true);
    console.log('✅ GA4スクリプトが読み込まれました');

    // 10. gtag関数の存在を確認
    const hasGtagFunction = await page.evaluate(() => {
      return typeof window.gtag === 'function';
    });
    expect(hasGtagFunction).toBe(true);
    console.log('✅ gtag関数が利用可能です');

    // 11. 測定IDの確認
    const measurementId = await page.evaluate(() => {
      // @ts-ignore
      return window.dataLayer?.find(item =>
        Array.isArray(item) && item[0] === 'config'
      )?.[1];
    });
    expect(measurementId).toBe('G-FB2LTRTM3K');
    console.log('✅ 測定IDが正しく設定されています:', measurementId);

    // 12. GA4リクエストの確認
    expect(googleAnalyticsRequests.length).toBeGreaterThan(0);
    console.log(`✅ ${googleAnalyticsRequests.length}個のGA4リクエストが送信されました`);

    // 結果サマリー
    console.log('\n=== GA4テスト完了 ===');
    console.log('✅ Cookie同意バナー: 正常動作');
    console.log('✅ GA4スクリプト: 読み込み成功');
    console.log('✅ 測定ID: G-FB2LTRTM3K');
    console.log(`✅ 送信リクエスト数: ${googleAnalyticsRequests.length}`);
  });

  test('Cookie同意を拒否した場合、GA4が初期化されない', async ({ page }) => {
    console.log('🚫 Cookie拒否テスト開始...');

    // Cookie同意バナーを待つ
    const cookieBanner = page.locator('div:has-text("このサイトではユーザーエクスペリエンス向上のためにクッキーを使用しています")');
    await expect(cookieBanner).toBeVisible();

    // ネットワークリクエストを監視
    const googleAnalyticsRequests: string[] = [];
    page.on('request', request => {
      const url = request.url();
      if (url.includes('google-analytics.com') || url.includes('googletagmanager.com')) {
        googleAnalyticsRequests.push(url);
      }
    });

    // 拒否ボタンをクリック
    const declineButton = page.locator('button:has-text("拒否")');
    await declineButton.click();
    console.log('🖱️ 拒否ボタンをクリックしました');

    // バナーが消えることを確認
    await expect(cookieBanner).toBeHidden();
    console.log('✅ Cookie同意バナーが非表示になりました');

    // LocalStorageの確認
    const consentStatus = await page.evaluate(() => {
      return localStorage.getItem('cookie-consent');
    });
    expect(consentStatus).toBe('declined');
    console.log('✅ 拒否状態が保存されました');

    // 少し待ってからリクエストを確認
    await page.waitForTimeout(2000);

    // GA4リクエストが送信されていないことを確認
    const analyticsRequestsAfterDecline = googleAnalyticsRequests.filter(url =>
      url.includes('collect') || url.includes('analytics')
    );
    expect(analyticsRequestsAfterDecline.length).toBe(0);
    console.log('✅ Cookie拒否後、GA4リクエストは送信されていません');
  });

  test('ページナビゲーション時のイベントトラッキング', async ({ page }) => {
    console.log('📍 ナビゲーショントラッキングテスト開始...');

    // まず同意を与える
    const cookieBanner = page.locator('div:has-text("このサイトではユーザーエクスペリエンス向上のためにクッキーを使用しています")');

    if (await cookieBanner.isVisible()) {
      const acceptButton = page.locator('button:has-text("同意する")');
      await acceptButton.click();
      await expect(cookieBanner).toBeHidden();
      console.log('✅ Cookie同意済み');
    }

    // ネットワークリクエストを監視
    const pageViewEvents: string[] = [];
    page.on('request', request => {
      const url = request.url();
      if (url.includes('collect') && url.includes('en=page_view')) {
        pageViewEvents.push(url);
        console.log('📄 ページビューイベント検出');
      }
    });

    // プライバシーページに移動
    await page.click('a[href="/privacy"]');
    await page.waitForURL('**/privacy');
    console.log('✅ プライバシーページに移動');

    // ページビューイベントが送信されたか確認
    await page.waitForTimeout(2000);
    expect(pageViewEvents.length).toBeGreaterThan(0);
    console.log(`✅ ${pageViewEvents.length}個のページビューイベントが送信されました`);
  });
});

// スクリーンショット付き視覚的確認テスト
test('GA4統合の視覚的確認', async ({ page }) => {
  console.log('📸 視覚的確認テスト開始...');

  await page.goto('http://localhost:3001');

  // Cookie同意バナーのスクリーンショット
  await page.screenshot({
    path: 'test-results/ga4-cookie-banner.png',
    fullPage: true
  });
  console.log('📸 Cookie同意バナーのスクリーンショットを保存');

  // 開発者ツールのネットワークタブを開く（仮想的に）
  const acceptButton = page.locator('button:has-text("同意する")');
  if (await acceptButton.isVisible()) {
    await acceptButton.click();
  }

  await page.waitForTimeout(3000);

  // 同意後のスクリーンショット
  await page.screenshot({
    path: 'test-results/ga4-after-consent.png',
    fullPage: true
  });
  console.log('📸 同意後のスクリーンショットを保存');

  console.log('\n✅ GA4統合テスト完了！');
  console.log('📁 スクリーンショットは test-results/ フォルダに保存されました');
});
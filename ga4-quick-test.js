const { chromium } = require('playwright');

async function testGA4Integration() {
  console.log('🚀 GA4統合テスト開始...\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // ネットワークリクエストを監視
    const requests = [];
    page.on('request', request => {
      const url = request.url();
      if (url.includes('google') || url.includes('analytics') || url.includes('gtag')) {
        requests.push({
          url,
          method: request.method(),
          timestamp: new Date().toISOString()
        });
        console.log(`📡 リクエスト検出: ${request.method()} ${url}`);
      }
    });

    // コンソールメッセージを監視
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('GA4') || text.includes('gtag') || text.includes('analytics')) {
        console.log(`📝 Console: ${text}`);
      }
    });

    console.log('1️⃣ ページにアクセス中...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });

    console.log('2️⃣ Cookie同意バナーを確認中...');

    // Cookie同意バナーの確認
    const cookieBanner = page.locator('div:has-text("このサイトではユーザーエクスペリエンス向上のためにクッキーを使用しています")');

    try {
      await cookieBanner.waitFor({ timeout: 10000 });
      console.log('✅ Cookie同意バナーが表示されました');

      // スクリーンショット撮影
      await page.screenshot({ path: 'ga4-cookie-banner.png', fullPage: true });
      console.log('📸 スクリーンショット保存: ga4-cookie-banner.png');

      // 同意ボタンをクリック
      const acceptButton = page.locator('button:has-text("同意する")');
      await acceptButton.click();
      console.log('✅ 同意ボタンをクリックしました');

      // バナーが消えることを確認
      await cookieBanner.waitFor({ state: 'hidden', timeout: 5000 });
      console.log('✅ Cookie同意バナーが非表示になりました');

    } catch (error) {
      console.log('❌ Cookie同意バナーが見つかりません:', error.message);
    }

    console.log('3️⃣ GA4スクリプトの読み込みを確認中...');

    // 少し待ってからスクリプトの存在を確認
    await page.waitForTimeout(3000);

    // GA4スクリプトの確認
    const hasGAScript = await page.evaluate(() => {
      const scripts = Array.from(document.scripts);
      return scripts.some(script =>
        script.src.includes('googletagmanager.com') ||
        script.src.includes('google-analytics.com')
      );
    });

    if (hasGAScript) {
      console.log('✅ GA4スクリプトが読み込まれています');
    } else {
      console.log('❌ GA4スクリプトが見つかりません');
    }

    // gtag関数の確認
    const hasGtag = await page.evaluate(() => {
      return typeof window.gtag === 'function';
    });

    if (hasGtag) {
      console.log('✅ gtag関数が利用可能です');
    } else {
      console.log('❌ gtag関数が見つかりません');
    }

    // LocalStorageの確認
    const consentStatus = await page.evaluate(() => {
      return localStorage.getItem('cookie-consent');
    });
    console.log(`📝 同意状態: ${consentStatus}`);

    // 測定IDの確認
    const measurementId = await page.evaluate(() => {
      return window.dataLayer?.find(item =>
        Array.isArray(item) && item[0] === 'config'
      )?.[1];
    });
    console.log(`📊 測定ID: ${measurementId}`);

    // 最終スクリーンショット
    await page.screenshot({ path: 'ga4-final-state.png', fullPage: true });
    console.log('📸 最終状態スクリーンショット保存: ga4-final-state.png');

    console.log('\n4️⃣ ネットワークリクエスト分析...');
    console.log(`📡 総リクエスト数: ${requests.length}`);

    const gaRequests = requests.filter(req =>
      req.url.includes('google-analytics.com') ||
      req.url.includes('googletagmanager.com')
    );

    console.log(`📊 GA関連リクエスト数: ${gaRequests.length}`);

    if (gaRequests.length > 0) {
      console.log('✅ GA4との通信が確認されました');
      gaRequests.forEach((req, index) => {
        console.log(`  ${index + 1}. ${req.method} ${req.url}`);
      });
    } else {
      console.log('❌ GA4との通信が検出されませんでした');
    }

    console.log('\n=== GA4統合テスト結果 ===');
    console.log(`Cookie同意バナー: ${cookieBanner ? '✅ 表示' : '❌ 未表示'}`);
    console.log(`GA4スクリプト: ${hasGAScript ? '✅ 読み込み済み' : '❌ 未読み込み'}`);
    console.log(`gtag関数: ${hasGtag ? '✅ 利用可能' : '❌ 未定義'}`);
    console.log(`同意状態: ${consentStatus || '未設定'}`);
    console.log(`測定ID: ${measurementId || '未設定'}`);
    console.log(`GA通信: ${gaRequests.length > 0 ? '✅ 正常' : '❌ 未確認'}`);

    // 5秒間ページを表示してから終了
    console.log('\n5️⃣ 5秒間表示してからブラウザを閉じます...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('❌ テスト中にエラーが発生:', error);
  } finally {
    await browser.close();
    console.log('✅ テスト完了');
  }
}

// テスト実行
testGA4Integration().catch(console.error);
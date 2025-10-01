const { chromium } = require('playwright');

async function simpleGA4Test() {
  console.log('🔍 GA4簡単テスト開始...\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // GA4リクエストを監視
    const gaRequests = [];
    page.on('request', request => {
      const url = request.url();
      if (url.includes('googletagmanager.com') || url.includes('google-analytics.com')) {
        gaRequests.push(url);
        console.log('📊 GA4リクエスト:', url);
      }
    });

    console.log('ページにアクセス中...');
    await page.goto('http://localhost:3001', { waitUntil: 'load', timeout: 10000 });

    // 2秒待機
    await page.waitForTimeout(2000);

    // ページのタイトルを確認
    const title = await page.title();
    console.log('📄 ページタイトル:', title);

    // Cookie同意バナーを確認
    const cookieExists = await page.locator('button:has-text("同意する")').isVisible();
    console.log('🍪 Cookie同意バナー:', cookieExists ? '表示' : '非表示');

    if (cookieExists) {
      // 同意ボタンをクリック
      await page.click('button:has-text("同意する")');
      console.log('✅ 同意ボタンをクリック');
      await page.waitForTimeout(2000);
    }

    // GA4の状態を確認
    const gaStatus = await page.evaluate(() => {
      return {
        hasGtag: typeof window.gtag === 'function',
        hasDataLayer: Array.isArray(window.dataLayer),
        dataLayerLength: window.dataLayer?.length || 0,
        measurementId: window.dataLayer?.find(item =>
          Array.isArray(item) && item[0] === 'config'
        )?.[1],
        consentStatus: localStorage.getItem('cookie-consent')
      };
    });

    console.log('\n📊 GA4状態:');
    console.log('  gtag関数:', gaStatus.hasGtag ? '✅ 利用可能' : '❌ 未定義');
    console.log('  dataLayer:', gaStatus.hasDataLayer ? '✅ 存在' : '❌ 未定義');
    console.log('  dataLayer要素数:', gaStatus.dataLayerLength);
    console.log('  測定ID:', gaStatus.measurementId || '未設定');
    console.log('  同意状態:', gaStatus.consentStatus || '未設定');

    console.log('\n📡 GA4リクエスト結果:');
    console.log('  総リクエスト数:', gaRequests.length);

    if (gaRequests.length > 0) {
      console.log('✅ GA4との通信が確認されました！');
      gaRequests.forEach((url, index) => {
        console.log(`  ${index + 1}. ${url}`);
      });
    } else {
      console.log('❌ GA4リクエストが検出されませんでした');
    }

    // スクリーンショット撮影
    await page.screenshot({ path: 'ga4-test-result.png', fullPage: true });
    console.log('\n📸 スクリーンショット保存: ga4-test-result.png');

    // 5秒間表示
    console.log('📱 5秒間ブラウザを表示します...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('❌ エラー:', error.message);
  } finally {
    await browser.close();
  }

  console.log('\n✅ テスト完了');
}

simpleGA4Test().catch(console.error);
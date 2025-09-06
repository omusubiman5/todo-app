// 📊 パフォーマンス数値測定テスト - 具体的な数値を取得

const { test, expect } = require('@playwright/test');

const TEST_USER = {
  email: 'e2e.test.user2@gmail.com',
  password: 'TestPassword123!'
};

test.describe('📊 パフォーマンス数値測定', () => {
  
  test('📈 現在のベースライン性能測定', async ({ page, context }) => {
    console.log('📈 ベースライン性能測定を開始...');
    
    // パフォーマンス測定開始
    const overallStartTime = performance.now();
    
    // 1️⃣ 初回ページロード時間
    console.log('🌐 初回ページロード時間を測定中...');
    const pageLoadStart = performance.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    const pageLoadEnd = performance.now();
    const pageLoadTime = pageLoadEnd - pageLoadStart;
    console.log(`📊 初回ページロード: ${pageLoadTime.toFixed(2)}ms`);
    
    // 2️⃣ ログイン処理時間
    console.log('🔐 ログイン処理時間を測定中...');
    const loginStart = performance.now();
    
    try {
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      await emailInput.waitFor({ timeout: 8000 });
      await emailInput.fill(TEST_USER.email);
      
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      await passwordInput.fill(TEST_USER.password);
      
      const loginButton = page.locator('button:has-text("ログイン"), button[type="submit"]').first();
      await loginButton.click();
      
      // ダッシュボードへの遷移を待機
      await page.waitForTimeout(3000);
      
      const loginEnd = performance.now();
      const loginTime = loginEnd - loginStart;
      console.log(`📊 ログイン処理: ${loginTime.toFixed(2)}ms`);
      
      // 3️⃣ タスク画面の表示時間
      console.log('📝 タスク画面表示時間を測定中...');
      const taskViewStart = performance.now();
      
      // タスク入力フィールドが表示されるまで待機
      await page.waitForSelector('input[placeholder*="やること"], input[placeholder*="タスク"]', { 
        timeout: 10000 
      });
      
      const taskViewEnd = performance.now();
      const taskViewTime = taskViewEnd - taskViewStart;
      console.log(`📊 タスク画面表示: ${taskViewTime.toFixed(2)}ms`);
      
      // 4️⃣ DOM要素数とメモリ使用量
      console.log('💾 リソース使用量を測定中...');
      
      const domElementCount = await page.evaluate(() => {
        return document.getElementsByTagName('*').length;
      });
      
      const memoryInfo = await page.evaluate(() => {
        if (performance.memory) {
          return {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
          };
        }
        return null;
      });
      
      console.log(`📊 DOM要素数: ${domElementCount}`);
      
      if (memoryInfo) {
        const usedMB = (memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(2);
        const totalMB = (memoryInfo.totalJSHeapSize / 1024 / 1024).toFixed(2);
        console.log(`📊 使用メモリ: ${usedMB}MB`);
        console.log(`📊 総メモリ: ${totalMB}MB`);
      }
      
      // 5️⃣ タスク操作のレスポンス時間
      console.log('⚡ タスク操作レスポンス時間を測定中...');
      
      const taskInput = page.locator('input[placeholder*="やること"], input[placeholder*="タスク"]').first();
      const addButton = page.locator('button:has-text("追加"), button[type="submit"]').first();
      
      // タスク追加のレスポンス時間測定
      const taskAddStart = performance.now();
      const testTaskText = `📊 ベンチマークタスク - ${Date.now()}`;
      
      await taskInput.fill(testTaskText);
      await addButton.click();
      
      // タスクがUIに表示されるまで待機
      try {
        await page.waitForSelector(`text*=ベンチマークタスク`, { timeout: 8000 });
        const taskAddEnd = performance.now();
        const taskAddTime = taskAddEnd - taskAddStart;
        console.log(`📊 タスク追加時間: ${taskAddTime.toFixed(2)}ms`);
        
        // 6️⃣ チェックボックス操作時間
        console.log('☑️ チェックボックス操作時間を測定中...');
        
        const checkboxes = page.locator('input[type="checkbox"]');
        const checkboxCount = await checkboxes.count();
        console.log(`📊 チェックボックス数: ${checkboxCount}`);
        
        if (checkboxCount > 0) {
          const checkbox = checkboxes.last();
          
          const checkboxStart = performance.now();
          await checkbox.click({ force: true });
          
          // 少し待機してUI更新を確認
          await page.waitForTimeout(1000);
          
          const checkboxEnd = performance.now();
          const checkboxTime = checkboxEnd - checkboxStart;
          console.log(`📊 チェックボックス操作: ${checkboxTime.toFixed(2)}ms`);
        }
        
      } catch (error) {
        console.log(`⚠️ タスク追加の確認に失敗: ${error.message}`);
      }
      
      // 7️⃣ 総合実行時間
      const overallEndTime = performance.now();
      const totalExecutionTime = overallEndTime - overallStartTime;
      console.log(`📊 総合実行時間: ${totalExecutionTime.toFixed(2)}ms`);
      
      // パフォーマンススコア計算
      const performanceScore = {
        pageLoadTime: pageLoadTime,
        loginTime: loginTime,
        taskViewTime: taskViewTime,
        domElementCount: domElementCount,
        memoryUsageMB: memoryInfo ? (memoryInfo.usedJSHeapSize / 1024 / 1024) : 0,
        taskAddTime: taskAddTime || 0,
        checkboxTime: checkboxTime || 0,
        totalTime: totalExecutionTime
      };
      
      console.log('\n🎯 パフォーマンススコア:');
      console.log(JSON.stringify(performanceScore, null, 2));
      
      // パフォーマンス基準の評価
      let rating = 'A';
      if (pageLoadTime > 3000 || (taskAddTime && taskAddTime > 1000)) rating = 'B';
      if (pageLoadTime > 5000 || (taskAddTime && taskAddTime > 2000)) rating = 'C';
      if (pageLoadTime > 8000 || (taskAddTime && taskAddTime > 3000)) rating = 'D';
      
      console.log(`📊 総合パフォーマンス評価: ${rating}級`);
      
      // アサーション（基本的な性能要件）
      expect(pageLoadTime).toBeLessThan(10000); // 10秒以下
      expect(domElementCount).toBeLessThan(2000); // DOM要素数制限
      if (memoryInfo) {
        expect(memoryInfo.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024); // 100MB以下
      }
      
      await page.screenshot({ 
        path: 'test-results/performance-benchmark.png',
        fullPage: true 
      });
      
    } catch (error) {
      console.error(`❌ テスト実行エラー: ${error.message}`);
      await page.screenshot({ 
        path: 'test-results/performance-benchmark-error.png',
        fullPage: true 
      });
      throw error;
    }
  });

  test('🔍 軽量パフォーマンスチェック', async ({ page }) => {
    console.log('🔍 軽量パフォーマンスチェックを実行中...');
    
    // 最小限のパフォーマンス測定
    const startTime = performance.now();
    
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    const loadTime = performance.now() - startTime;
    console.log(`⚡ DOMContentLoaded: ${loadTime.toFixed(2)}ms`);
    
    // ページの基本情報
    const title = await page.title();
    const url = page.url();
    
    console.log(`📄 ページタイトル: ${title}`);
    console.log(`🌐 URL: ${url}`);
    
    // 基本的なメトリクス
    const metrics = await page.evaluate(() => ({
      innerHeight: window.innerHeight,
      innerWidth: window.innerWidth,
      userAgent: navigator.userAgent.split(' ')[0]
    }));
    
    console.log(`📐 画面サイズ: ${metrics.innerWidth}x${metrics.innerHeight}`);
    console.log(`🌐 ブラウザ: ${metrics.userAgent}`);
    
    expect(loadTime).toBeLessThan(5000); // 5秒以下
  });

});

/*
📊 【パフォーマンス数値測定テスト】

✅ 測定項目:
1. 初回ページロード時間
2. ログイン処理時間
3. タスク画面表示時間
4. DOM要素数
5. メモリ使用量
6. タスク追加レスポンス時間
7. チェックボックス操作時間
8. 総合実行時間

🎯 パフォーマンス基準:
- A級: ページロード3秒以下、タスク追加1秒以下
- B級: ページロード5秒以下、タスク追加2秒以下  
- C級: ページロード8秒以下、タスク追加3秒以下
- D級: それ以上

📈 実行コマンド:
npx playwright test tests/performance-benchmark.spec.js --headed

📊 このテストにより、現在のアプリケーションの性能を定量的に測定します。
*/
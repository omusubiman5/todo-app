// 🚀 パフォーマンス改善テスト - 最適化効果を検証

const { test, expect } = require('@playwright/test');

const TEST_USER = {
  email: 'e2e.test.user2@gmail.com',
  password: 'TestPassword123!'
};

test.describe('🚀 パフォーマンス改善テスト', () => {
  
  test.beforeEach(async ({ page }) => {
    // ログイン処理
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill(TEST_USER.email);
    
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill(TEST_USER.password);
    
    const loginButton = page.locator('button:has-text("ログイン")').first();
    await loginButton.click();
    
    await page.waitForTimeout(3000);
    
    // メインページが表示されるまで待機
    await page.waitForSelector('input[placeholder*="やること"]', { timeout: 10000 });
  });

  test('⚡ タスク追加のレスポンス速度テスト', async ({ page }) => {
    console.log('⚡ タスク追加のレスポンス速度を測定中...');
    
    const taskInput = page.locator('input[placeholder*="やること"]').first();
    const addButton = page.locator('button:has-text("追加")').first();
    
    // 5個のタスクを連続で追加し、レスポンス時間を測定
    const responseTimes = [];
    
    for (let i = 1; i <= 5; i++) {
      const testTask = `⚡ パフォーマンステスト ${i} - ${Date.now()}`;
      
      // タスク追加の開始時間
      const startTime = performance.now();
      
      await taskInput.fill(testTask);
      await addButton.click();
      
      // タスクがUIに表示されるまでの時間を測定
      await page.waitForSelector(`text*=パフォーマンステスト ${i}`, { timeout: 5000 });
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      responseTimes.push(responseTime);
      
      console.log(`タスク${i}の追加時間: ${responseTime.toFixed(2)}ms`);
      
      // 次のタスクのために少し待機
      await page.waitForTimeout(500);
    }
    
    // 結果の分析
    const averageTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxTime = Math.max(...responseTimes);
    
    console.log(`平均レスポンス時間: ${averageTime.toFixed(2)}ms`);
    console.log(`最大レスポンス時間: ${maxTime.toFixed(2)}ms`);
    
    // パフォーマンス期待値
    expect(averageTime).toBeLessThan(1000); // 平均1秒以下
    expect(maxTime).toBeLessThan(2000);     // 最大2秒以下
    
    await page.screenshot({ 
      path: 'test-results/performance-task-addition.png',
      fullPage: true 
    });
  });

  test('🔄 チェックボックス操作のレスポンス速度テスト', async ({ page }) => {
    console.log('🔄 チェックボックス操作のレスポンス速度を測定中...');
    
    // まずテストタスクを追加
    const taskInput = page.locator('input[placeholder*="やること"]').first();
    const addButton = page.locator('button:has-text("追加")').first();
    
    const testTask = `🔄 チェックボックステスト - ${Date.now()}`;
    await taskInput.fill(testTask);
    await addButton.click();
    
    await page.waitForSelector(`text*=チェックボックステスト`, { timeout: 5000 });
    
    // チェックボックスを見つける
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    
    if (checkboxCount === 0) {
      throw new Error('チェックボックスが見つかりません');
    }
    
    const checkbox = checkboxes.last(); // 最新のタスクのチェックボックス
    
    // チェックボックス操作のレスポンス時間を測定
    const toggleTimes = [];
    
    for (let i = 0; i < 3; i++) {
      const startTime = performance.now();
      
      // 初期状態を確認
      const initialState = await checkbox.isChecked();
      
      // チェックボックスをクリック
      await checkbox.click({ force: true });
      
      // 状態変化を待機
      await page.waitForFunction(
        (selector, expectedState) => {
          const cb = document.querySelector(selector);
          return cb && cb.checked !== expectedState;
        },
        { timeout: 3000 },
        'input[type="checkbox"]:last-of-type',
        initialState
      );
      
      const endTime = performance.now();
      const toggleTime = endTime - startTime;
      toggleTimes.push(toggleTime);
      
      console.log(`チェックボックス切り替え${i + 1}: ${toggleTime.toFixed(2)}ms`);
      
      // 少し待機
      await page.waitForTimeout(500);
    }
    
    const averageToggleTime = toggleTimes.reduce((a, b) => a + b, 0) / toggleTimes.length;
    console.log(`平均切り替え時間: ${averageToggleTime.toFixed(2)}ms`);
    
    // パフォーマンス期待値
    expect(averageToggleTime).toBeLessThan(500); // 500ms以下
    
    await page.screenshot({ 
      path: 'test-results/performance-checkbox-toggle.png',
      fullPage: true 
    });
  });

  test('📊 大量データ表示のパフォーマンステスト', async ({ page }) => {
    console.log('📊 大量データ表示のパフォーマンステストを実行中...');
    
    const taskInput = page.locator('input[placeholder*="やること"]').first();
    const addButton = page.locator('button:has-text("追加")').first();
    
    // 10個のタスクを追加
    console.log('📝 10個のタスクを追加中...');
    for (let i = 1; i <= 10; i++) {
      await taskInput.fill(`📊 大量データテスト ${i.toString().padStart(2, '0')}`);
      await addButton.click();
      await page.waitForTimeout(200); // UI更新を待機
    }
    
    // 全タスクが表示されているか確認
    const allTasks = page.locator('[data-testid^="task-"]');
    const taskCount = await allTasks.count();
    
    console.log(`表示されているタスク数: ${taskCount}`);
    expect(taskCount).toBeGreaterThanOrEqual(10);
    
    // スクロール性能をテスト
    const startScrollTime = performance.now();
    
    // ページの下部までスクロール
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(100);
    
    // ページの上部に戻る
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(100);
    
    const endScrollTime = performance.now();
    const scrollTime = endScrollTime - startScrollTime;
    
    console.log(`スクロール操作時間: ${scrollTime.toFixed(2)}ms`);
    expect(scrollTime).toBeLessThan(1000); // 1秒以下
    
    await page.screenshot({ 
      path: 'test-results/performance-large-data.png',
      fullPage: true 
    });
  });

  test('🔍 フィルタリング性能テスト', async ({ page }) => {
    console.log('🔍 フィルタリング性能テストを実行中...');
    
    // 優先度でソートボタンがある場合
    const sortButton = page.locator('text=優先度でソート, button:has-text("優先度")');
    
    if (await sortButton.count() > 0) {
      const startTime = performance.now();
      await sortButton.first().click();
      await page.waitForTimeout(500);
      const endTime = performance.now();
      
      const sortTime = endTime - startTime;
      console.log(`ソート処理時間: ${sortTime.toFixed(2)}ms`);
      expect(sortTime).toBeLessThan(1000);
    }
    
    // 完了タスクを隠すボタンがある場合
    const hideCompletedButton = page.locator('text=完了タスクを隠す, button:has-text("完了")');
    
    if (await hideCompletedButton.count() > 0) {
      const startTime = performance.now();
      await hideCompletedButton.first().click();
      await page.waitForTimeout(500);
      const endTime = performance.now();
      
      const filterTime = endTime - startTime;
      console.log(`フィルタリング処理時間: ${filterTime.toFixed(2)}ms`);
      expect(filterTime).toBeLessThan(800);
    }
    
    await page.screenshot({ 
      path: 'test-results/performance-filtering.png',
      fullPage: true 
    });
  });

  test('💾 メモリ使用量の基本チェック', async ({ page, context }) => {
    console.log('💾 メモリ使用量の基本チェックを実行中...');
    
    // JavaScript heap size を取得
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
    
    if (memoryInfo) {
      const usedMB = (memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(2);
      const totalMB = (memoryInfo.totalJSHeapSize / 1024 / 1024).toFixed(2);
      
      console.log(`使用メモリ: ${usedMB}MB`);
      console.log(`総メモリ: ${totalMB}MB`);
      
      // メモリ使用量が妥当な範囲内であることを確認
      expect(memoryInfo.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024); // 100MB以下
    }
    
    // DOM要素数をチェック
    const domElementCount = await page.evaluate(() => {
      return document.getElementsByTagName('*').length;
    });
    
    console.log(`DOM要素数: ${domElementCount}`);
    expect(domElementCount).toBeLessThan(2000); // 過度に複雑ではないことを確認
  });

});

/*
🚀 【パフォーマンス改善テスト】

✅ テスト項目:
1. タスク追加のレスポンス速度 - 楽観的更新の効果測定
2. チェックボックス操作の速度 - UI反応性の改善確認
3. 大量データ表示性能 - 仮想化の効果測定
4. フィルタリング性能 - メモ化による改善確認
5. メモリ使用量チェック - リソース効率の確認

🎯 期待値:
- タスク追加: 平均1秒以下
- チェックボックス操作: 500ms以下
- スクロール操作: 1秒以下
- フィルタリング: 800ms以下
- メモリ使用量: 100MB以下

📊 実行コマンド:
npx playwright test tests/performance-improvement-test.spec.js --headed

📈 このテストにより、アーキテクチャ改善の効果を定量的に測定できます。
*/
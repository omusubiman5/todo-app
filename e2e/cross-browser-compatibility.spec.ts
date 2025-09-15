import { test, expect } from '@playwright/test';

test.describe('Cross-browser compatibility', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Todo App|タスク管理/);
  });

  test('基本機能の動作確認', async ({ page }) => {
    // タスク追加フォームの表示確認
    const taskInput = page.locator('input[placeholder*="タスク"]');
    await expect(taskInput).toBeVisible();
    
    // フォームの基本操作
    await taskInput.fill('クロスブラウザテストタスク');
    
    // 優先度選択（ドロップダウンが正常に動作するか）
    const prioritySelect = page.locator('select[aria-label*="優先度"]');
    if (await prioritySelect.isVisible()) {
      await prioritySelect.selectOption('高');
      await expect(prioritySelect).toHaveValue('高');
    }
    
    // フォーム送信
    await page.click('button[type="submit"]');
    
    // タスクが正常に表示されるか
    await expect(page.locator('text=クロスブラウザテストタスク')).toBeVisible();
    
    // チェックボックスの動作確認（ブラウザ間での違いが出やすい）
    const checkbox = page.locator('input[type="checkbox"]').first();
    await checkbox.check();
    await expect(checkbox).toBeChecked();
    
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
  });

  test('CSS レンダリングの一貫性', async ({ page }) => {
    // レイアウトの基本要素が正しく表示されるか
    const mainContainer = page.locator('[data-testid="main-container"], main, .container').first();
    await expect(mainContainer).toBeVisible();
    
    // フレックスボックスレイアウトの確認
    const taskList = page.locator('[data-testid="task-list"], .task-list').first();
    if (await taskList.isVisible()) {
      const boundingBox = await taskList.boundingBox();
      expect(boundingBox).not.toBeNull();
      expect(boundingBox!.width).toBeGreaterThan(0);
      expect(boundingBox!.height).toBeGreaterThan(0);
    }
    
    // ボタンのスタイリング確認
    const submitButton = page.locator('button[type="submit"]');
    const buttonStyles = await submitButton.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        display: computed.display,
        padding: computed.padding,
        border: computed.border,
        backgroundColor: computed.backgroundColor
      };
    });
    
    // 基本的なスタイルが適用されていることを確認
    expect(buttonStyles.display).not.toBe('none');
    expect(buttonStyles.padding).not.toBe('0px');
  });

  test('JavaScript 機能の互換性', async ({ page }) => {
    // イベントハンドラーの動作確認
    let eventsFired = 0;
    
    // コンソールイベントを監視
    page.on('console', msg => {
      if (msg.text().includes('task')) {
        eventsFired++;
      }
    });
    
    // DOM 操作のテスト
    await page.evaluate(() => {
      // 基本的なDOM操作がサポートされているか
      const testDiv = document.createElement('div');
      testDiv.id = 'browser-test';
      testDiv.textContent = 'Browser compatibility test';
      document.body.appendChild(testDiv);
    });
    
    // 作成した要素が存在することを確認
    await expect(page.locator('#browser-test')).toBeVisible();
    
    // ローカルストレージのテスト
    await page.evaluate(() => {
      try {
        localStorage.setItem('crossBrowserTest', 'success');
        return localStorage.getItem('crossBrowserTest');
      } catch (e) {
        console.error('LocalStorage not supported');
        return null;
      }
    });
    
    // ローカルストレージの値を確認
    const storageValue = await page.evaluate(() => 
      localStorage.getItem('crossBrowserTest')
    );
    expect(storageValue).toBe('success');
  });

  test('フォーム要素の互換性', async ({ page }) => {
    // 各種input要素のテスト
    const inputTypes = [
      { selector: 'input[type="text"], input[placeholder*="タスク"]', type: 'text' },
      { selector: 'input[type="checkbox"]', type: 'checkbox' },
      { selector: 'select', type: 'select' }
    ];
    
    for (const inputType of inputTypes) {
      const element = page.locator(inputType.selector).first();
      
      if (await element.isVisible()) {
        // フォーカス可能性の確認
        await element.focus();
        await expect(element).toBeFocused();
        
        // 適切なtype属性を持っているか
        if (inputType.type !== 'select') {
          const type = await element.getAttribute('type');
          expect(type).toBe(inputType.type);
        }
      }
    }
    
    // フォーム検証の動作確認
    const form = page.locator('form').first();
    if (await form.isVisible()) {
      // 必須フィールドの検証
      const requiredInput = page.locator('input[required]').first();
      if (await requiredInput.isVisible()) {
        await form.evaluate(f => f.reportValidity());
        
        // ブラウザ標準の検証メッセージが表示されるか
        const validationMessage = await requiredInput.evaluate(input => 
          input.validationMessage
        );
        expect(validationMessage).toBeTruthy();
      }
    }
  });

  test('レスポンシブデザインの確認', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 1024, height: 768, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500); // レンダリング完了を待つ
      
      // 基本要素が適切に表示されることを確認
      const taskInput = page.locator('input[placeholder*="タスク"]');
      await expect(taskInput).toBeVisible();
      
      // モバイル表示での特別な確認
      if (viewport.name === 'mobile') {
        // タッチフレンドリーなサイズかチェック
        const submitButton = page.locator('button[type="submit"]');
        const buttonBox = await submitButton.boundingBox();
        
        if (buttonBox) {
          // 最小タッチターゲットサイズ（44px）の確認
          expect(Math.min(buttonBox.width, buttonBox.height)).toBeGreaterThanOrEqual(44);
        }
      }
    }
  });

  test('パフォーマンスの基本チェック', async ({ page }) => {
    // ページ読み込み時間の測定
    const startTime = Date.now();
    await page.goto('/', { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;
    
    // 合理的な読み込み時間内であることを確認（5秒以内）
    expect(loadTime).toBeLessThan(5000);
    
    // 基本的なメトリクスの取得
    const metrics = await page.evaluate(() => ({
      domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
      loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart,
      firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0
    }));
    
    expect(metrics.domContentLoaded).toBeGreaterThan(0);
    expect(metrics.loadComplete).toBeGreaterThan(0);
    
    console.log('Performance metrics:', metrics);
  });

  test('アクセシビリティ機能の互換性', async ({ page }) => {
    // フォーカス管理の確認
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // ARIAラベルのサポート確認
    const ariaElements = page.locator('[aria-label]');
    const ariaCount = await ariaElements.count();
    
    if (ariaCount > 0) {
      // 最初のARIA要素のラベルが読み取れることを確認
      const firstAriaLabel = await ariaElements.first().getAttribute('aria-label');
      expect(firstAriaLabel).toBeTruthy();
    }
    
    // キーボードナビゲーションの確認
    const taskInput = page.locator('input[placeholder*="タスク"]');
    await taskInput.focus();
    await expect(taskInput).toBeFocused();
    
    // Tabキーでの移動
    await page.keyboard.press('Tab');
    const nextFocused = page.locator(':focus');
    await expect(nextFocused).toBeVisible();
    
    // フォーカス要素が変わったことを確認
    const nextFocusedElement = await nextFocused.evaluate(el => el.tagName);
    expect(nextFocusedElement).toBeTruthy();
  });
});

test.describe('Mobile compatibility', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // モバイルビューポートを設定
    await page.setViewportSize({ width: 375, height: 667 });
  });

  test('モバイル操作の確認', async ({ page }) => {
    // タッチ操作のテスト
    const taskInput = page.locator('input[placeholder*="タスク"]');
    await expect(taskInput).toBeVisible();
    
    // タッチでフォーカス
    await taskInput.tap();
    await expect(taskInput).toBeFocused();
    
    // 仮想キーボードでの入力
    await taskInput.fill('モバイルテストタスク');
    await expect(taskInput).toHaveValue('モバイルテストタスク');
    
    // タップでボタンを押下
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.tap();
    
    // タスクが追加されたことを確認
    await expect(page.locator('text=モバイルテストタスク')).toBeVisible();
  });

  test('モバイル表示の最適化', async ({ page }) => {
    // ビューポートメタタグの確認
    const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewportMeta).toContain('width=device-width');
    
    // メニューの適切な表示
    const mobileMenu = page.locator('[data-testid="mobile-menu"], .hamburger-menu');
    if (await mobileMenu.isVisible()) {
      await mobileMenu.tap();
      
      // メニューが展開されることを確認
      const menuItems = page.locator('[data-testid="mobile-menu-items"], .menu-items');
      await expect(menuItems).toBeVisible();
    }
    
    // フォントサイズの適切性
    const mainText = page.locator('body').first();
    const fontSize = await mainText.evaluate(el => {
      return window.getComputedStyle(el).fontSize;
    });
    
    // モバイルで適切なフォントサイズであることを確認
    const fontSizeValue = parseFloat(fontSize);
    expect(fontSizeValue).toBeGreaterThanOrEqual(14); // 14px以上
  });
});

// 特定ブラウザ固有の問題をテスト
test.describe('Browser-specific features', () => {
  
  test('Safari での日付入力対応', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'Safari specific test');
    
    await page.goto('/');
    
    // Safari での日付入力フィールドの動作確認
    const dateInput = page.locator('input[type="date"]');
    if (await dateInput.isVisible()) {
      await dateInput.click();
      
      // Safari固有の日付ピッカーが表示されることを確認
      // または、フォールバック動作が適切に機能することを確認
      const currentValue = await dateInput.inputValue();
      await dateInput.fill('2024-12-31');
      await expect(dateInput).toHaveValue('2024-12-31');
    }
  });

  test('Firefox での拡張機能との互換性', async ({ page, browserName }) => {
    test.skip(browserName !== 'firefox', 'Firefox specific test');
    
    await page.goto('/');
    
    // Firefox特有のCSS機能の動作確認
    const hasFirefoxCSS = await page.evaluate(() => {
      return CSS.supports('-moz-appearance', 'none');
    });
    
    expect(hasFirefoxCSS).toBeTruthy();
    
    // ユーザーエージェントスタイルシートとの競合確認
    const submitButton = page.locator('button[type="submit"]');
    const buttonStyle = await submitButton.evaluate(el => {
      return window.getComputedStyle(el).appearance;
    });
    
    // カスタムスタイルが適用されていることを確認
    expect(buttonStyle).toBeDefined();
  });

  test('Chrome での新機能サポート', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome specific test');
    
    await page.goto('/');
    
    // Chromium系ブラウザでの最新Web API対応確認
    const hasModernFeatures = await page.evaluate(() => {
      return {
        intersectionObserver: 'IntersectionObserver' in window,
        resizeObserver: 'ResizeObserver' in window,
        webComponents: 'customElements' in window
      };
    });
    
    expect(hasModernFeatures.intersectionObserver).toBeTruthy();
    expect(hasModernFeatures.resizeObserver).toBeTruthy();
    expect(hasModernFeatures.webComponents).toBeTruthy();
  });
});
import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('初期ページの外観', async ({ page }) => {
    // ページが完全に読み込まれるまで待機
    await page.waitForSelector('input[placeholder*="タスク"]');
    
    // 全体のスクリーンショット
    await expect(page).toHaveScreenshot('homepage-full.png', {
      fullPage: true,
      threshold: 0.2, // 20%までの差異は許容
      maxDiffPixels: 1000
    });
    
    // メインコンテンツエリアのスクリーンショット
    const mainContent = page.locator('[data-testid="main-container"], main').first();
    if (await mainContent.isVisible()) {
      await expect(mainContent).toHaveScreenshot('homepage-main-content.png');
    }
  });

  test('タスク追加フォームの外観', async ({ page }) => {
    // フォームエリアに焦点を当てたスクリーンショット
    const taskForm = page.locator('form, [data-testid="task-form"]').first();
    
    if (await taskForm.isVisible()) {
      await expect(taskForm).toHaveScreenshot('task-form-empty.png');
    } else {
      // フォーム要素が直接見つからない場合、入力エリア全体を撮影
      const inputArea = page.locator('input[placeholder*="タスク"]').locator('..');
      await expect(inputArea).toHaveScreenshot('task-input-area.png');
    }
    
    // フォームにフォーカスを当てた状態
    await page.focus('input[placeholder*="タスク"]');
    await expect(page.locator('input[placeholder*="タスク"]')).toHaveScreenshot('task-input-focused.png');
  });

  test('タスクリストの表示状態', async ({ page }) => {
    // テスト用のタスクを複数作成
    const testTasks = [
      { text: '高優先度タスク', priority: '高' },
      { text: '中優先度タスク', priority: '中' },
      { text: '低優先度タスク', priority: '低' }
    ];

    for (const task of testTasks) {
      await page.fill('input[placeholder*="タスク"]', task.text);
      
      const prioritySelect = page.locator('select[aria-label*="優先度"]');
      if (await prioritySelect.isVisible()) {
        await prioritySelect.selectOption(task.priority);
      }
      
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500); // アニメーション完了を待つ
    }

    // タスクリストのスクリーンショット
    const taskList = page.locator('[data-testid="task-list"], .task-list').first();
    if (await taskList.isVisible()) {
      await expect(taskList).toHaveScreenshot('task-list-multiple-items.png');
    } else {
      // タスクリストが見つからない場合は、タスクを含むエリア全体を撮影
      await expect(page).toHaveScreenshot('tasks-display-area.png', {
        clip: { x: 0, y: 200, width: 1200, height: 600 }
      });
    }
  });

  test('タスクの完了状態表示', async ({ page }) => {
    // タスクを作成
    await page.fill('input[placeholder*="タスク"]', 'スクリーンショットテストタスク');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);

    // 未完了状態のスクリーンショット
    const taskItem = page.locator('text=スクリーンショットテストタスク').locator('..').first();
    await expect(taskItem).toHaveScreenshot('task-item-incomplete.png');

    // 完了状態にマーク
    const checkbox = page.locator('input[type="checkbox"]').first();
    await checkbox.check();
    await page.waitForTimeout(500); // 状態変更アニメーション完了を待つ

    // 完了状態のスクリーンショット
    await expect(taskItem).toHaveScreenshot('task-item-completed.png');
  });

  test('レスポンシブデザインの外観', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop-large' },
      { width: 1280, height: 720, name: 'desktop-standard' },
      { width: 1024, height: 768, name: 'tablet-landscape' },
      { width: 768, height: 1024, name: 'tablet-portrait' },
      { width: 375, height: 667, name: 'mobile-standard' },
      { width: 320, height: 568, name: 'mobile-small' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(1000); // レイアウト調整完了を待つ

      // 各ビューポートでのスクリーンショット
      await expect(page).toHaveScreenshot(`responsive-${viewport.name}.png`, {
        fullPage: true,
        threshold: 0.3
      });
    }
  });

  test('エラー状態の表示', async ({ page }) => {
    // バリデーションエラーをトリガー
    await page.click('button[type="submit"]'); // 空のフォーム送信
    await page.waitForTimeout(500);

    // エラー状態のスクリーンショット
    const form = page.locator('form, [data-testid="task-form"]').first();
    if (await form.isVisible()) {
      await expect(form).toHaveScreenshot('form-validation-error.png');
    }

    // エラーメッセージが表示される場合
    const errorMessage = page.locator('[role="alert"], .error-message').first();
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toHaveScreenshot('error-message.png');
    }
  });

  test('ダークモード対応（実装されている場合）', async ({ page }) => {
    // ダークモード切り替えボタンがあるかチェック
    const darkModeToggle = page.locator('button[aria-label*="ダーク"], [data-testid="dark-mode-toggle"]');
    
    if (await darkModeToggle.isVisible()) {
      // ライトモード（デフォルト）のスクリーンショット
      await expect(page).toHaveScreenshot('light-mode-full.png', { fullPage: true });

      // ダークモードに切り替え
      await darkModeToggle.click();
      await page.waitForTimeout(1000); // テーマ変更アニメーション完了を待つ

      // ダークモードのスクリーンショット
      await expect(page).toHaveScreenshot('dark-mode-full.png', { fullPage: true });
    } else {
      // システム設定でダークモードを適用
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('system-dark-mode.png', { fullPage: true });
    }
  });

  test('インタラクション状態の外観', async ({ page }) => {
    // ホバー状態
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.hover();
    await expect(submitButton).toHaveScreenshot('button-hover-state.png');

    // フォーカス状態
    const taskInput = page.locator('input[placeholder*="タスク"]');
    await taskInput.focus();
    await expect(taskInput).toHaveScreenshot('input-focus-state.png');

    // アクティブ状態（クリック中）
    await submitButton.click({ delay: 100 });
    await expect(submitButton).toHaveScreenshot('button-active-state.png');
  });

  test('ローディング状態の外観（実装されている場合）', async ({ page }) => {
    // ローディング表示があるかチェック
    const loadingIndicator = page.locator('[data-testid="loading"], .loading, .spinner').first();
    
    if (await loadingIndicator.isVisible()) {
      await expect(loadingIndicator).toHaveScreenshot('loading-indicator.png');
    }

    // フォーム送信時のローディング状態をシミュレート
    // ネットワークを遅延させてローディング状態をキャプチャ
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 2000); // 2秒遅延
    });

    await page.fill('input[placeholder*="タスク"]', 'ローディングテストタスク');
    await page.click('button[type="submit"]');
    
    // ローディング中のスクリーンショット
    await page.waitForTimeout(500);
    if (await loadingIndicator.isVisible()) {
      await expect(loadingIndicator).toHaveScreenshot('form-loading-state.png');
    }
  });

  test('アクセシビリティ関連の視覚要素', async ({ page }) => {
    // ハイコントラストモードのシミュレート
    await page.emulateMedia({ forcedColors: 'active' });
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('high-contrast-mode.png', { 
      fullPage: true,
      threshold: 0.4 // ハイコントラストモードでは大きな変化が予想される
    });

    // フォーカスインジケーターの確認
    await page.emulateMedia({ forcedColors: 'none' });
    await page.focus('input[placeholder*="タスク"]');
    
    const focusedInput = page.locator('input[placeholder*="タスク"]:focus');
    await expect(focusedInput).toHaveScreenshot('focus-indicator.png');
  });

  test('アニメーション状態のキャプチャ', async ({ page }) => {
    // CSSアニメーションを無効化してから有効化
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-delay: -0.01ms !important;
          animation-iteration-count: 1 !important;
          background-attachment: initial !important;
          scroll-behavior: auto !important;
        }
      `
    });

    // タスク追加アニメーション
    await page.fill('input[placeholder*="タスク"]', 'アニメーションテストタスク');
    await page.click('button[type="submit"]');
    
    // アニメーション直後の状態をキャプチャ
    await page.waitForTimeout(100);
    const newTask = page.locator('text=アニメーションテストタスク').locator('..').first();
    if (await newTask.isVisible()) {
      await expect(newTask).toHaveScreenshot('task-added-animation.png');
    }
  });

  test('多言語対応の外観（実装されている場合）', async ({ page }) => {
    // 言語切り替えボタンがあるかチェック
    const languageToggle = page.locator('button[aria-label*="言語"], [data-testid="language-toggle"]');
    
    if (await languageToggle.isVisible()) {
      // 日本語表示のスクリーンショット
      await expect(page).toHaveScreenshot('japanese-interface.png', { fullPage: true });

      // 英語に切り替え
      await languageToggle.click();
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('english-interface.png', { fullPage: true });
    }
  });

  test('印刷レイアウトの確認', async ({ page }) => {
    // 印刷メディアクエリを適用
    await page.emulateMedia({ media: 'print' });
    await page.waitForTimeout(500);

    // テスト用のタスクを追加
    await page.emulateMedia({ media: 'screen' });
    await page.fill('input[placeholder*="タスク"]', '印刷テストタスク');
    await page.click('button[type="submit"]');
    
    // 印刷レイアウトに戻す
    await page.emulateMedia({ media: 'print' });
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('print-layout.png', { 
      fullPage: true,
      threshold: 0.3
    });
  });

  test('コンポーネント個別の外観確認', async ({ page }) => {
    // 個別のUI コンポーネントのスクリーンショット

    // ナビゲーション領域
    const navigation = page.locator('nav, [role="navigation"]').first();
    if (await navigation.isVisible()) {
      await expect(navigation).toHaveScreenshot('navigation-component.png');
    }

    // フッター領域
    const footer = page.locator('footer, [role="contentinfo"]').first();
    if (await footer.isVisible()) {
      await expect(footer).toHaveScreenshot('footer-component.png');
    }

    // サイドバー（あれば）
    const sidebar = page.locator('aside, [data-testid="sidebar"]').first();
    if (await sidebar.isVisible()) {
      await expect(sidebar).toHaveScreenshot('sidebar-component.png');
    }
  });
});
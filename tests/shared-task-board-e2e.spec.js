// 🎭 【E2Eテスト】SharedTaskBoard 統合テスト
// Playwright を使用した実際のブラウザでのテスト

const { test, expect } = require('@playwright/test');

test.describe('SharedTaskBoard E2E Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // 開発サーバーにアクセス（認証が必要な場合は適切に設定）
    await page.goto('/');
    
    // 認証状態をモックまたはバイパス（必要に応じて）
    // 実際のアプリでは適切な認証フローを実装
  });

  test('📺 基本的なUIコンポーネントが表示される', async ({ page }) => {
    // タスク入力フィールドの確認
    const taskInput = page.locator('input[placeholder*="やることを入力"]');
    await expect(taskInput).toBeVisible();
    
    // 追加ボタンの確認
    const addButton = page.locator('button:has-text("追加")');
    await expect(addButton).toBeVisible();
    
    // 優先度セレクトボックスの確認
    const prioritySelect = page.locator('select');
    await expect(prioritySelect).toBeVisible();
    
    // ソートボタンの確認
    const sortButton = page.locator('button:has-text("優先度でソート")');
    await expect(sortButton).toBeVisible();
    
    // フィルターボタンの確認
    const filterButton = page.locator('button:has-text("完了タスクを隠す")');
    await expect(filterButton).toBeVisible();
  });

  test('➕ タスク作成機能のフル操作テスト', async ({ page }) => {
    const taskInput = page.locator('input[placeholder*="やることを入力"]');
    const addButton = page.locator('button:has-text("追加")');
    
    // 新しいタスクを入力
    await taskInput.fill('E2Eテストで作成したタスク');
    
    // 追加ボタンをクリック
    await addButton.click();
    
    // タスクが追加されたことを確認（タスクリストに表示される）
    // 注意: 実際のアプリではSupabaseとの通信があるため、適切な待機が必要
    await expect(page.locator('text=E2Eテストで作成したタスク')).toBeVisible({ timeout: 10000 });
    
    // 入力フィールドがクリアされることを確認
    await expect(taskInput).toHaveValue('');
  });

  test('🔄 ソート機能のテスト', async ({ page }) => {
    const sortButton = page.locator('button:has-text("優先度でソート")');
    
    // ソートボタンをクリック
    await sortButton.click();
    
    // ボタンテキストが変更されることを確認
    await expect(page.locator('button:has-text("優先度で元に戻す")')).toBeVisible();
    
    // 再度クリックして元に戻す
    await page.locator('button:has-text("優先度で元に戻す")').click();
    await expect(sortButton).toBeVisible();
  });

  test('👁️ フィルター機能のテスト', async ({ page }) => {
    const filterButton = page.locator('button:has-text("完了タスクを隠す")');
    
    // フィルターボタンをクリック
    await filterButton.click();
    
    // ボタンテキストが変更されることを確認
    await expect(page.locator('button:has-text("完了タスクを表示")')).toBeVisible();
    
    // 再度クリックして元に戻す
    await page.locator('button:has-text("完了タスクを表示")').click();
    await expect(filterButton).toBeVisible();
  });

  test('🎨 ダークモード切り替えのテスト（存在する場合）', async ({ page }) => {
    // ダークモードトグルが存在する場合のテスト
    const darkModeToggle = page.locator('[data-testid="dark-mode-toggle"]');
    
    if (await darkModeToggle.isVisible()) {
      await darkModeToggle.click();
      
      // ダークモードのスタイルが適用されることを確認
      const taskInput = page.locator('input[placeholder*="やることを入力"]');
      await expect(taskInput).toHaveClass(/bg-gray-700/);
    }
  });

  test('⌨️ キーボードナビゲーションのテスト', async ({ page }) => {
    const taskInput = page.locator('input[placeholder*="やることを入力"]');
    
    // タスク入力フィールドにフォーカス
    await taskInput.focus();
    
    // Enterキーでタスク追加（空の場合は追加されない）
    await taskInput.press('Enter');
    
    // 実際のテキストを入力してEnterキー
    await taskInput.fill('キーボードで追加したタスク');
    await taskInput.press('Enter');
    
    // タスクが追加されることを確認
    await expect(page.locator('text=キーボードで追加したタスク')).toBeVisible({ timeout: 10000 });
  });

  test('📱 レスポンシブデザインのテスト', async ({ page }) => {
    // モバイルビューポートに変更
    await page.setViewportSize({ width: 375, height: 667 });
    
    // UI要素が適切に表示されることを確認
    const taskInput = page.locator('input[placeholder*="やることを入力"]');
    await expect(taskInput).toBeVisible();
    
    const addButton = page.locator('button:has-text("追加")');
    await expect(addButton).toBeVisible();
    
    // タブレットビューポートに変更
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // 要素が引き続き表示されることを確認
    await expect(taskInput).toBeVisible();
    await expect(addButton).toBeVisible();
    
    // デスクトップビューポートに戻す
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test('🔄 リアルタイム更新のシミュレーション', async ({ page }) => {
    // 複数のタスクを作成して状態変化を確認
    const taskInput = page.locator('input[placeholder*="やることを入力"]');
    const addButton = page.locator('button:has-text("追加")');
    
    // 複数のタスクを追加
    for (let i = 1; i <= 3; i++) {
      await taskInput.fill(`リアルタイムテストタスク ${i}`);
      await addButton.click();
      
      // 各タスクの追加を確認
      await expect(page.locator(`text=リアルタイムテストタスク ${i}`)).toBeVisible({ timeout: 10000 });
      
      // 少し待機（UXの確認とサーバー負荷軽減）
      await page.waitForTimeout(500);
    }
  });

  test('🚨 エラーハンドリングのテスト', async ({ page }) => {
    // ネットワークエラーの場合の動作をテスト
    await page.route('**/*', route => {
      if (route.request().url().includes('supabase')) {
        route.abort();
      } else {
        route.continue();
      }
    });
    
    const taskInput = page.locator('input[placeholder*="やることを入力"]');
    const addButton = page.locator('button:has-text("追加")');
    
    await taskInput.fill('エラーテスト用タスク');
    await addButton.click();
    
    // エラー状態でも画面が壊れないことを確認
    await expect(taskInput).toBeVisible();
    await expect(addButton).toBeVisible();
  });

  test('📊 パフォーマンステスト', async ({ page }) => {
    // ページロード時間の測定
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;
    
    // ロード時間が5秒以内であることを確認
    expect(loadTime).toBeLessThan(5000);
    
    // 主要なUI要素が適切な時間内に表示されることを確認
    await expect(page.locator('input[placeholder*="やることを入力"]')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('button:has-text("追加")')).toBeVisible({ timeout: 3000 });
  });
});

/*
🎯 【E2Eテストの特徴】

✅ 実際のブラウザでのテスト:
- Chrome, Firefox, Safari での動作確認
- 実際のユーザーインタラクションをシミュレート
- レスポンシブデザインの確認

✅ 統合テスト:
- コンポーネント間の連携確認
- 実際のネットワーク通信（モック可能）
- エラーハンドリングの確認

✅ ユーザビリティテスト:
- キーボードナビゲーション
- アクセシビリティの基本確認
- パフォーマンスの基本測定

🔄 実行方法:
npm run test:e2e または npx playwright test
*/
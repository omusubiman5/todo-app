import { test, expect } from '@playwright/test';

test.describe('タスク管理機能', () => {
  // 各テスト前にログイン状態をセットアップ
  test.beforeEach(async ({ page }) => {
    // 注意: 実際のテストでは認証をモックするか、テスト用アカウントを使用
    await page.goto('/');
    // ここで認証状態をモック、またはテストユーザーでログイン
    await page.evaluate(() => {
      // LocalStorageに認証トークンを設定（実際の実装に合わせて調整）
      localStorage.setItem('supabase.auth.token', 'mock-token');
    });
  });

  test('タスク一覧ページが正しく表示される', async ({ page }) => {
    await page.goto('/dashboard');
    
    // タスクボードの要素が表示されることを確認
    await expect(page.locator('h1')).toContainText('タスク管理');
    
    // タスクの状態列が表示されることを確認
    await expect(page.locator('text=未着手')).toBeVisible();
    await expect(page.locator('text=進行中')).toBeVisible();
    await expect(page.locator('text=完了')).toBeVisible();
  });

  test('新しいタスクを作成できる', async ({ page }) => {
    await page.goto('/dashboard');
    
    // タスク追加ボタンをクリック
    await page.click('button:has-text("新しいタスク")');
    
    // タスク作成フォームが表示されることを確認
    await expect(page.locator('input[placeholder*="タスク"]')).toBeVisible();
    
    // タスクの詳細を入力
    await page.fill('input[placeholder*="タスク"]', 'テストタスク');
    await page.fill('textarea[placeholder*="説明"]', 'これはテスト用のタスクです');
    
    // 優先度を選択
    await page.selectOption('select', '中');
    
    // タスクを保存
    await page.click('button:has-text("保存")');
    
    // 新しいタスクが表示されることを確認
    await expect(page.locator('text=テストタスク')).toBeVisible();
  });

  test('タスクをドラッグ&ドロップで移動できる', async ({ page }) => {
    await page.goto('/dashboard');
    
    // 最初にテスト用のタスクを作成
    await page.click('button:has-text("新しいタスク")');
    await page.fill('input[placeholder*="タスク"]', 'ドラッグテストタスク');
    await page.click('button:has-text("保存")');
    
    // 作成されたタスクを取得
    const task = page.locator('text=ドラッグテストタスク').first();
    const progressColumn = page.locator('[data-column="progress"]');
    
    // ドラッグ&ドロップでタスクを移動
    await task.dragTo(progressColumn);
    
    // タスクが進行中列に移動したことを確認
    await expect(progressColumn.locator('text=ドラッグテストタスク')).toBeVisible();
  });

  test('タスクを削除できる', async ({ page }) => {
    await page.goto('/dashboard');
    
    // テスト用タスクを作成
    await page.click('button:has-text("新しいタスク")');
    await page.fill('input[placeholder*="タスク"]', '削除テストタスク');
    await page.click('button:has-text("保存")');
    
    // 作成されたタスクのメニューを開く
    await page.hover('text=削除テストタスク');
    await page.click('[aria-label="タスクメニュー"]');
    
    // 削除を選択
    await page.click('text=削除');
    
    // 確認ダイアログで削除を確定
    await page.click('button:has-text("削除する")');
    
    // タスクが削除されたことを確認
    await expect(page.locator('text=削除テストタスク')).not.toBeVisible();
  });
});
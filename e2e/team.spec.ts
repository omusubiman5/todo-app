import { test, expect } from '@playwright/test';

test.describe('チーム機能', () => {
  test.beforeEach(async ({ page }) => {
    // 認証状態をセットアップ（実際のテストでは適切な認証処理）
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('supabase.auth.token', 'mock-token');
    });
  });

  test('チーム作成機能が動作する', async ({ page }) => {
    await page.goto('/dashboard');
    
    // チーム作成ボタンをクリック
    await page.click('button:has-text("チーム作成")');
    
    // チーム作成フォームが表示されることを確認
    await expect(page.locator('input[placeholder*="チーム名"]')).toBeVisible();
    
    // チーム情報を入力
    await page.fill('input[placeholder*="チーム名"]', 'テストチーム');
    await page.fill('textarea[placeholder*="説明"]', 'これはテスト用のチームです');
    
    // チームを作成
    await page.click('button:has-text("作成")');
    
    // 作成されたチームが表示されることを確認
    await expect(page.locator('text=テストチーム')).toBeVisible();
  });

  test('チームメンバー招待機能が動作する', async ({ page }) => {
    await page.goto('/dashboard');
    
    // 既存のチームを選択（事前にチームが作成されている前提）
    await page.click('text=テストチーム');
    
    // メンバー招待ボタンをクリック
    await page.click('button:has-text("メンバー招待")');
    
    // 招待フォームが表示されることを確認
    await expect(page.locator('input[type="email"]')).toBeVisible();
    
    // メンバーのメールアドレスを入力
    await page.fill('input[type="email"]', 'newmember@example.com');
    
    // 役割を選択
    await page.selectOption('select', 'member');
    
    // 招待を送信
    await page.click('button:has-text("招待送信")');
    
    // 成功メッセージが表示されることを確認
    await expect(page.locator('text=招待を送信しました')).toBeVisible();
  });

  test('個人タスクとチームタスクの切り替えが動作する', async ({ page }) => {
    await page.goto('/dashboard');
    
    // 初期状態では個人タスクが表示されている
    await expect(page.locator('text=個人タスク')).toBeVisible();
    
    // チームタスクに切り替え
    await page.click('button:has-text("チーム")');
    
    // チームタスクビューが表示されることを確認
    await expect(page.locator('text=チームタスク')).toBeVisible();
    
    // 個人タスクに戻る
    await page.click('button:has-text("個人")');
    
    // 個人タスクビューが表示されることを確認
    await expect(page.locator('text=個人タスク')).toBeVisible();
  });

  test('チームタスクの割り当て機能が動作する', async ({ page }) => {
    await page.goto('/dashboard');
    
    // チームモードに切り替え
    await page.click('button:has-text("チーム")');
    
    // 新しいチームタスクを作成
    await page.click('button:has-text("新しいタスク")');
    await page.fill('input[placeholder*="タスク"]', 'チーム割り当てテストタスク');
    
    // メンバーに割り当て
    await page.selectOption('select[aria-label="担当者"]', 'user@example.com');
    
    // タスクを保存
    await page.click('button:has-text("保存")');
    
    // 割り当てられたタスクが表示されることを確認
    await expect(page.locator('text=チーム割り当てテストタスク')).toBeVisible();
    await expect(page.locator('text=user@example.com')).toBeVisible();
  });
});
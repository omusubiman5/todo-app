import { test, expect } from '@playwright/test';

test.describe('認証機能', () => {
  test('ログインページが正しく表示される', async ({ page }) => {
    await page.goto('/');
    
    // ログインページにリダイレクトされることを確認
    await expect(page).toHaveURL(/.*login/);
    
    // ログインフォームの要素が存在することを確認
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('無効なログイン情報でエラーが表示される', async ({ page }) => {
    await page.goto('/login');
    
    // 無効な認証情報を入力
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // エラーメッセージが表示されることを確認
    await expect(page.locator('text=認証に失敗しました')).toBeVisible();
  });

  // 注意: 実際のテスト用ユーザーアカウントが必要です
  test.skip('有効なログイン情報でダッシュボードにリダイレクト', async ({ page }) => {
    await page.goto('/login');
    
    // 有効な認証情報を入力（テスト用アカウントが必要）
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword');
    await page.click('button[type="submit"]');
    
    // ダッシュボードにリダイレクトされることを確認
    await expect(page).toHaveURL('/dashboard');
  });
});
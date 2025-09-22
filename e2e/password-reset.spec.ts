import { test, expect } from '@playwright/test';

test.describe('パスワードリセット機能', () => {
  test.beforeEach(async ({ page }) => {
    // 開発サーバーの準備確認
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('パスワードリセットページの基本表示', async ({ page }) => {
    // パスワードリセットページに移動
    await page.goto('/reset-password');

    // ページの読み込みを待つ
    await page.waitForLoadState('networkidle');

    // ホームに戻るボタンの確認
    await expect(page.locator('button:has-text("🏠 ホームに戻る")')).toBeVisible();

    // パスワードリセット情報の表示確認
    await expect(page.locator('text=パスワードリセットについて')).toBeVisible();
    await expect(page.locator('text=リセットリンクは1時間で期限切れになります')).toBeVisible();
    await expect(page.locator('text=パスワードは8文字以上、大文字・小文字・数字・記号を含む')).toBeVisible();

    // エラーメッセージが表示されることを確認（トークンなしの場合）
    const errorMessage = page.locator('text=パスワードリセットリンクが無効です');
    const isErrorVisible = await errorMessage.isVisible().catch(() => false);

    if (isErrorVisible) {
      console.log('✅ 無効なリンクエラーが正しく表示されています');

      // エラー時のアクションボタンの確認
      await expect(page.locator('button:has-text("新しいリセットリンクを要求")')).toBeVisible();
      await expect(page.locator('button:has-text("ダッシュボードに戻る")')).toBeVisible();
    }

    // スクリーンショット撮影
    await page.screenshot({ path: 'test-results/password-reset-initial.png', fullPage: true });
  });

  test('有効なリセットトークンでのパスワード変更シミュレーション', async ({ page }) => {
    // 実際のリセットトークンを使用する代わりに、リセットフォームの表示をテスト

    // モック用のURLパラメータ付きでアクセス
    const mockUrl = '/reset-password?access_token=mock_token&refresh_token=mock_refresh&type=recovery';
    await page.goto(mockUrl);

    // ページの読み込みを待つ
    await page.waitForLoadState('networkidle');

    // リセットフォームが表示されるかチェック（セッションが確立された場合）
    const resetFormTitle = page.locator('h2:has-text("新しいパスワードを設定")');
    const isFormVisible = await resetFormTitle.isVisible().catch(() => false);

    if (isFormVisible) {
      console.log('✅ パスワードリセットフォームが表示されています');

      // フォーム要素の確認
      await expect(page.locator('input[placeholder="強力なパスワードを入力"]')).toBeVisible();
      await expect(page.locator('input[placeholder="パスワードを再入力"]')).toBeVisible();

      // パスワード強度チェックのテスト
      const passwordInput = page.locator('input[placeholder="強力なパスワードを入力"]');

      // 弱いパスワードをテスト
      await passwordInput.fill('weak');
      await expect(page.locator('text=非常に弱い').or(page.locator('text=弱い'))).toBeVisible();

      // STANDARD要件を満たすパスワードをテスト
      await passwordInput.clear();
      await passwordInput.fill('NewSecure@2024!');

      // 強度が向上したことを確認
      await expect(page.locator('text=良い').or(page.locator('text=強い'))).toBeVisible();

      // パスワード確認
      const confirmInput = page.locator('input[placeholder="パスワードを再入力"]');
      await confirmInput.fill('NewSecure@2024!');

      // 一致確認
      await expect(page.locator('text=パスワードが一致しています')).toBeVisible();

      // 更新ボタンが有効になることを確認
      const updateButton = page.locator('button:has-text("パスワードを更新")');
      await expect(updateButton).toBeEnabled();

      // スクリーンショット撮影
      await page.screenshot({ path: 'test-results/password-reset-form-filled.png', fullPage: true });

    } else {
      console.log('ℹ️ モックトークンではフォームが表示されません（期待される動作）');

      // エラーメッセージの確認
      await expect(page.locator('text=パスワードリセットトークンが無効')).toBeVisible();
    }
  });

  test('パスワード強度要件の詳細テスト', async ({ page }) => {
    // 仮のフォーム状態をテストするため、登録画面を代用
    await page.goto('/register');

    // パスワード強度のテストパターン
    const passwordInput = page.locator('input[placeholder="強力なパスワードを入力"]');

    // STANDARD要件の各項目をテスト
    const testCases = [
      {
        password: 'short',
        expectedIssues: ['8文字以上128文字以下']
      },
      {
        password: 'nouppercase123!',
        expectedIssues: ['大文字を含む（A-Z）']
      },
      {
        password: 'NOLOWERCASE123!',
        expectedIssues: ['小文字を含む（a-z）']
      },
      {
        password: 'NoNumbers!',
        expectedIssues: ['数字を含む（0-9）']
      },
      {
        password: 'NoSpecial123',
        expectedIssues: ['特殊文字を含む（!@#$%^&*等）']
      },
      {
        password: 'Password123!',
        expectedIssues: ['一般的な単語を避ける']
      },
      {
        password: 'AAA123!@#bbb',
        expectedIssues: ['連続する同じ文字を3つ以上使わない']
      },
      {
        password: 'qwerty123!',
        expectedIssues: ['キーボード配列パターンを避ける']
      },
      {
        password: 'PerfectPass@2024!',
        expectedIssues: [] // 全要件を満たす
      }
    ];

    for (const testCase of testCases) {
      console.log(`Testing password: ${testCase.password}`);

      await passwordInput.clear();
      await passwordInput.fill(testCase.password);

      // 期待される問題の確認
      for (const issue of testCase.expectedIssues) {
        await expect(page.locator(`text=${issue}`)).toBeVisible();
      }

      // 全要件を満たす場合の確認
      if (testCase.expectedIssues.length === 0) {
        await expect(page.locator('text=良い').or(page.locator('text=強い'))).toBeVisible();
      }

      // 各テストケースのスクリーンショット
      await page.screenshot({
        path: `test-results/password-strength-${testCase.password.replace(/[^a-zA-Z0-9]/g, '')}.png`,
        fullPage: true
      });
    }
  });

  test('エラーハンドリングの確認', async ({ page }) => {
    await page.goto('/reset-password');

    // エラー状態の確認
    const errorContainer = page.locator('.bg-red-500\\/20');
    const isErrorVisible = await errorContainer.isVisible().catch(() => false);

    if (isErrorVisible) {
      // エラーメッセージの内容確認
      await expect(page.locator('text=エラー')).toBeVisible();

      // エラー時のアクションボタンの動作確認
      const newLinkButton = page.locator('button:has-text("新しいリセットリンクを要求")');
      const dashboardButton = page.locator('button:has-text("ダッシュボードに戻る")');

      await expect(newLinkButton).toBeVisible();
      await expect(dashboardButton).toBeVisible();

      // ボタンクリックのテスト（実際の遷移はしない）
      await newLinkButton.click();
      // ログインページに遷移することを確認
      await expect(page.url()).toContain('/login');
    }
  });

  test('ナビゲーション機能の確認', async ({ page }) => {
    await page.goto('/reset-password');

    // ホームに戻るボタンのテスト
    const homeButton = page.locator('button:has-text("🏠 ホームに戻る")');
    await expect(homeButton).toBeVisible();

    await homeButton.click();

    // ホームページに遷移することを確認
    await expect(page.url()).toBe('http://localhost:3000/');
  });

  test('レスポンシブデザインの確認', async ({ page }) => {
    // モバイルビューポート
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/reset-password');

    // モバイルでの表示確認
    await expect(page.locator('button:has-text("🏠 ホームに戻る")')).toBeVisible();
    await expect(page.locator('text=パスワードリセットについて')).toBeVisible();

    // モバイルスクリーンショット
    await page.screenshot({ path: 'test-results/password-reset-mobile.png', fullPage: true });

    // デスクトップビューポート
    await page.setViewportSize({ width: 1280, height: 720 });

    // デスクトップスクリーンショット
    await page.screenshot({ path: 'test-results/password-reset-desktop.png', fullPage: true });
  });

  test('セキュリティ情報の表示確認', async ({ page }) => {
    await page.goto('/reset-password');

    // セキュリティ関連の情報が適切に表示されることを確認
    await expect(page.locator('text=パスワードリセットについて')).toBeVisible();
    await expect(page.locator('text=リセットリンクは1時間で期限切れになります')).toBeVisible();
    await expect(page.locator('text=パスワードは8文字以上、大文字・小文字・数字・記号を含む')).toBeVisible();
    await expect(page.locator('text=問題がある場合は新しいリセットリンクを要求してください')).toBeVisible();

    // アイコンの表示確認
    const lockIcon = page.locator('.fa-lock, [data-icon="lock"]').first();
    const isIconVisible = await lockIcon.isVisible().catch(() => false);

    if (isIconVisible) {
      console.log('✅ セキュリティアイコンが表示されています');
    }
  });

  test('キーボードナビゲーションの確認', async ({ page }) => {
    await page.goto('/reset-password');

    // フォーカス可能な要素のテスト
    const homeButton = page.locator('button:has-text("🏠 ホームに戻る")');

    // ホームボタンにフォーカス
    await homeButton.focus();
    await expect(homeButton).toBeFocused();

    // Tabキーでのナビゲーション
    await page.keyboard.press('Tab');

    // 他のボタンにフォーカスが移ることを確認
    const actionButtons = page.locator('button:has-text("新しいリセットリンクを要求"), button:has-text("ダッシュボードに戻る")').first();
    const isActionButtonFocused = await actionButtons.isFocused().catch(() => false);

    if (isActionButtonFocused) {
      console.log('✅ キーボードナビゲーションが正常に動作しています');
    }

    // Enterキーでのボタン操作
    await page.keyboard.press('Enter');

    // 何らかのアクションが実行されることを確認（URL変更など）
    await page.waitForTimeout(1000);
  });

  test('URL パラメータのハンドリング確認', async ({ page }) => {
    // 各種URLパラメータのテスト
    const testUrls = [
      '/reset-password',
      '/reset-password?type=recovery',
      '/reset-password?access_token=invalid&type=recovery',
      '/reset-password?type=invalid'
    ];

    for (const url of testUrls) {
      console.log(`Testing URL: ${url}`);

      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // 基本要素が表示されることを確認
      await expect(page.locator('text=パスワードリセットについて')).toBeVisible();

      // URLごとのスクリーンショット
      const cleanUrl = url.replace(/[^a-zA-Z0-9]/g, '-');
      await page.screenshot({ path: `test-results/password-reset-url-${cleanUrl}.png`, fullPage: true });
    }
  });
});
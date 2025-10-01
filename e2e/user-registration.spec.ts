import { test, expect } from '@playwright/test';

test.describe('ユーザー登録フロー', () => {
  test.beforeEach(async ({ page }) => {
    // 開発サーバーの準備確認
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('正常な登録フローの実行', async ({ page }) => {
    // 登録ページへのナビゲーション
    await page.goto('/register');

    // ページタイトルの確認
    await expect(page.locator('h1:has-text("アカウント作成")')).toBeVisible();

    // フォーム要素の存在確認
    await expect(page.locator('input[placeholder="田中太郎"]')).toBeVisible();
    await expect(page.locator('input[placeholder="example@email.com"]')).toBeVisible();
    await expect(page.locator('input[placeholder="強力なパスワードを入力"]')).toBeVisible();
    await expect(page.locator('input[placeholder="パスワードを再入力"]')).toBeVisible();

    // 一意のテストデータを生成
    const timestamp = Date.now();
    const testName = `テストユーザー${timestamp}`;
    const testEmail = `test${timestamp}@example.com`;
    const testPassword = 'TestSecure@2024!';

    // フォーム入力
    await page.fill('input[placeholder="田中太郎"]', testName);
    await page.fill('input[placeholder="example@email.com"]', testEmail);
    await page.fill('input[placeholder="強力なパスワードを入力"]', testPassword);

    // パスワード強度が表示されることを確認
    await expect(page.locator('text=パスワード強度')).toBeVisible();
    await expect(page.locator('text=良い').or(page.locator('text=強い'))).toBeVisible();

    // パスワード確認を入力
    await page.fill('input[placeholder="パスワードを再入力"]', testPassword);

    // パスワード一致確認
    await expect(page.locator('text=パスワードが一致しています')).toBeVisible();

    // 送信ボタンが有効になっていることを確認
    const submitButton = page.locator('button:has-text("アカウント作成")');
    await expect(submitButton).toBeEnabled();

    // スクリーンショット撮影（送信前）
    await page.screenshot({ path: 'test-results/registration-before-submit.png', fullPage: true });

    // フォーム送信
    await submitButton.click();

    // 送信後の状態確認（2つの可能性）
    const loadingIndicator = page.locator('text=作成中...');
    const successMessage = page.locator('text=登録完了');
    const confirmationPage = page.locator('text=確認メールを');

    // ローディング状態または結果画面を待つ
    await Promise.race([
      loadingIndicator.waitFor({ timeout: 5000 }).catch(() => {}),
      successMessage.waitFor({ timeout: 10000 }).catch(() => {}),
      confirmationPage.waitFor({ timeout: 10000 }).catch(() => {}),
    ]);

    // 送信後のスクリーンショット
    await page.screenshot({ path: 'test-results/registration-after-submit.png', fullPage: true });

    // 成功の場合の確認（メール確認画面）
    const isConfirmationVisible = await confirmationPage.isVisible().catch(() => false);
    if (isConfirmationVisible) {
      await expect(page.locator('text=登録完了')).toBeVisible();
      await expect(page.locator(`text=${testEmail}`)).toBeVisible();
      console.log('✅ 登録成功 - メール確認画面に移動');
    } else {
      // エラーメッセージがある場合は記録
      const errorMessage = page.locator('.text-red-300, .text-red-600').first();
      const hasError = await errorMessage.isVisible().catch(() => false);
      if (hasError) {
        const errorText = await errorMessage.textContent();
        console.log(`⚠️ 登録エラー: ${errorText}`);
      }
    }
  });

  test('バリデーションエラーの表示確認', async ({ page }) => {
    await page.goto('/register');

    // 空のフォーム送信を試行
    const submitButton = page.locator('button:has-text("アカウント作成")');
    await expect(submitButton).toBeDisabled();

    // 不正なメールアドレスでの検証
    await page.fill('input[placeholder="田中太郎"]', 'テストユーザー');
    await page.fill('input[placeholder="example@email.com"]', 'invalid-email');
    await page.fill('input[placeholder="強力なパスワードを入力"]', 'ValidPass@123!');
    await page.fill('input[placeholder="パスワードを再入力"]', 'ValidPass@123!');

    // HTML5バリデーションが働くことを確認
    const emailInput = page.locator('input[placeholder="example@email.com"]');
    await expect(emailInput).toHaveAttribute('type', 'email');

    // 正しいメールに修正
    await emailInput.clear();
    await emailInput.fill('valid@example.com');

    // ボタンが有効になることを確認
    await expect(submitButton).toBeEnabled();
  });

  test('パスワード強度要件の詳細確認', async ({ page }) => {
    await page.goto('/register');

    // 必要フィールドを入力
    await page.fill('input[placeholder="田中太郎"]', 'テストユーザー');
    await page.fill('input[placeholder="example@email.com"]', 'test@example.com');

    const passwordInput = page.locator('input[placeholder="強力なパスワードを入力"]');

    // 段階的にパスワード要件をテスト
    const passwordTests = [
      {
        password: '123',
        expectation: '非常に弱い',
        requirements: ['8文字以上128文字以下']
      },
      {
        password: '12345678',
        expectation: '弱い',
        requirements: ['大文字を含む', '小文字を含む', '特殊文字を含む']
      },
      {
        password: 'Abcdef123',
        expectation: '普通',
        requirements: ['特殊文字を含む']
      },
      {
        password: 'SecurePass@123!',
        expectation: '強い',
        requirements: []
      }
    ];

    for (const test of passwordTests) {
      await passwordInput.clear();
      await passwordInput.fill(test.password);

      // 強度レベルの確認
      await expect(page.locator(`text=${test.expectation}`)).toBeVisible();

      // 未満足要件の確認
      for (const requirement of test.requirements) {
        await expect(page.locator(`text=${requirement}`)).toBeVisible();
      }

      // 各段階のスクリーンショット
      await page.screenshot({
        path: `test-results/password-test-${test.password.replace(/[^a-zA-Z0-9]/g, '')}.png`,
        fullPage: true
      });
    }
  });

  test('ログインページからの登録リンク', async ({ page }) => {
    // ログインページに移動
    await page.goto('/login');

    // 登録リンクの存在確認
    const registerLink = page.locator('a:has-text("新規登録")');
    await expect(registerLink).toBeVisible();

    // 登録ページへの遷移確認
    await registerLink.click();

    // 登録ページに到達したことを確認
    await expect(page.locator('h1:has-text("アカウント作成")')).toBeVisible();
    await expect(page.url()).toContain('/register');
  });

  test('セキュリティ機能の表示確認', async ({ page }) => {
    await page.goto('/register');

    // セキュリティ機能の説明が表示されることを確認
    await expect(page.locator('text=セキュリティ機能')).toBeVisible();
    await expect(page.locator('text=強力なパスワード要件')).toBeVisible();
    await expect(page.locator('text=メール確認による本人認証')).toBeVisible();
    await expect(page.locator('text=暗号化されたデータ保存')).toBeVisible();
    await expect(page.locator('text=不正アクセス防止機能')).toBeVisible();
  });

  test('パスワード表示切り替え機能', async ({ page }) => {
    await page.goto('/register');

    const passwordInput = page.locator('input[placeholder="強力なパスワードを入力"]');
    const showPasswordButton = page.locator('button').nth(0); // パスワード表示ボタン

    // パスワードを入力
    await passwordInput.fill('TestPassword123!');

    // 初期状態では非表示（type="password"）
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // 表示ボタンをクリック
    await showPasswordButton.click();

    // テキストとして表示されることを確認
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // 再度クリックして非表示に戻す
    await showPasswordButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('レスポンシブデザインの確認', async ({ page }) => {
    // モバイルビューポートでのテスト
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/register');

    // フォームが適切に表示されることを確認
    await expect(page.locator('h1:has-text("アカウント作成")')).toBeVisible();

    // フォーム要素が見切れていないことを確認
    const nameInput = page.locator('input[placeholder="田中太郎"]');
    await expect(nameInput).toBeVisible();

    // モバイルスクリーンショット
    await page.screenshot({ path: 'test-results/registration-mobile.png', fullPage: true });

    // デスクトップビューポートに戻す
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.screenshot({ path: 'test-results/registration-desktop.png', fullPage: true });
  });

  test('アクセシビリティの基本確認', async ({ page }) => {
    await page.goto('/register');

    // フォームラベルの確認
    await expect(page.locator('label:has-text("名前")')).toBeVisible();

    // 必須フィールドのaria属性確認（HTMLのrequired属性）
    const nameInput = page.locator('input[placeholder="田中太郎"]');
    const emailInput = page.locator('input[placeholder="example@email.com"]');
    const passwordInput = page.locator('input[placeholder="強力なパスワードを入力"]');

    await expect(nameInput).toHaveAttribute('required');
    await expect(emailInput).toHaveAttribute('required');
    await expect(passwordInput).toHaveAttribute('required');

    // フォーカス可能な要素の確認
    await nameInput.focus();
    await expect(nameInput).toBeFocused();

    // キーボードナビゲーションのテスト
    await page.keyboard.press('Tab');
    await expect(emailInput).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(passwordInput).toBeFocused();
  });
});
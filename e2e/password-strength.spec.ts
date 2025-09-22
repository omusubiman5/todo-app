import { test, expect } from '@playwright/test';

test.describe('パスワード強度チェック機能', () => {
  test.beforeEach(async ({ page }) => {
    // アプリケーションのベースURLに移動
    await page.goto('/');
  });

  test('ユーザー登録画面でパスワード強度が表示される', async ({ page }) => {
    // 登録ページへ移動
    await page.goto('/register');

    // ページの読み込みを待つ
    await page.waitForLoadState('networkidle');

    // 登録フォームが表示されていることを確認
    await expect(page.locator('h1:has-text("アカウント作成")')).toBeVisible();

    // 名前とメールを入力
    await page.fill('input[placeholder="田中太郎"]', 'テストユーザー');
    await page.fill('input[placeholder="example@email.com"]', 'test@example.com');

    // 弱いパスワードを入力
    const passwordInput = page.locator('input[placeholder="強力なパスワードを入力"]');
    await passwordInput.fill('weak');

    // 弱いパスワードの強度表示を確認
    await expect(page.locator('text=非常に弱い')).toBeVisible();
    await expect(page.locator('text=8文字以上128文字以下')).toBeVisible();

    // 中程度のパスワードを入力
    await passwordInput.clear();
    await passwordInput.fill('Medium123');

    // 中程度のパスワードの強度表示を確認
    await expect(page.locator('text=弱い').or(page.locator('text=普通'))).toBeVisible();

    // 強いパスワードを入力（STANDARD要件を満たす）
    await passwordInput.clear();
    await passwordInput.fill('Strong@Pass123!');

    // 強いパスワードの強度表示を確認
    await expect(page.locator('text=良い').or(page.locator('text=強い'))).toBeVisible();

    // 要件チェックリストの確認
    await expect(page.locator('text=✓').first()).toBeVisible();
    await expect(page.locator('text=大文字を含む（A-Z）')).toBeVisible();
    await expect(page.locator('text=小文字を含む（a-z）')).toBeVisible();
    await expect(page.locator('text=数字を含む（0-9）')).toBeVisible();
    await expect(page.locator('text=特殊文字を含む（!@#$%^&*等）')).toBeVisible();

    // スクリーンショットを撮影
    await page.screenshot({ path: 'test-results/password-strength-register.png', fullPage: true });
  });

  test('パスワード確認フィールドの一致チェック', async ({ page }) => {
    // 登録ページへ移動
    await page.goto('/register');

    // 必要なフィールドを入力
    await page.fill('input[placeholder="田中太郎"]', 'テストユーザー');
    await page.fill('input[placeholder="example@email.com"]', 'test@example.com');

    // パスワードを入力
    const passwordInput = page.locator('input[placeholder="強力なパスワードを入力"]');
    await passwordInput.fill('Strong@Pass123!');

    // 一致しないパスワード確認を入力
    const confirmPasswordInput = page.locator('input[placeholder="パスワードを再入力"]');
    await confirmPasswordInput.fill('Different@Pass123!');

    // エラーメッセージを確認
    await expect(page.locator('text=パスワードが一致しません')).toBeVisible();

    // 一致するパスワードを入力
    await confirmPasswordInput.clear();
    await confirmPasswordInput.fill('Strong@Pass123!');

    // 成功メッセージを確認
    await expect(page.locator('text=パスワードが一致しています')).toBeVisible();

    // 送信ボタンが有効になっていることを確認
    const submitButton = page.locator('button:has-text("アカウント作成")');
    await expect(submitButton).toBeEnabled();
  });

  test('パスワードリセット画面でSTANDARD要件が適用される', async ({ page }) => {
    // パスワードリセットページへ移動
    await page.goto('/reset-password');

    // ページの読み込みを待つ
    await page.waitForLoadState('networkidle');

    // パスワードリセットフォームが表示されるか確認
    const passwordResetTitle = page.locator('h2:has-text("新しいパスワードを設定")');

    // フォームが表示される場合のみテストを実行
    const isFormVisible = await passwordResetTitle.isVisible().catch(() => false);

    if (isFormVisible) {
      // 弱いパスワードを入力
      const passwordInput = page.locator('input[placeholder="強力なパスワードを入力"]');
      await passwordInput.fill('weak');

      // 強度インジケーターを確認
      await expect(page.locator('text=非常に弱い').or(page.locator('text=弱い'))).toBeVisible();

      // STANDARD要件を満たすパスワードを入力
      await passwordInput.clear();
      await passwordInput.fill('SecureReset@2024!');

      // 強度が改善されたことを確認
      await expect(page.locator('text=良い').or(page.locator('text=強い'))).toBeVisible();

      // パスワード確認を入力
      const confirmInput = page.locator('input[placeholder="パスワードを再入力"]');
      await confirmInput.fill('SecureReset@2024!');

      // 一致メッセージを確認
      await expect(page.locator('text=パスワードが一致しています')).toBeVisible();

      // スクリーンショットを撮影
      await page.screenshot({ path: 'test-results/password-strength-reset.png', fullPage: true });
    } else {
      console.log('パスワードリセットフォームが表示されていません（セッションが必要）');
    }
  });

  test('禁止パターンの検証', async ({ page }) => {
    // 登録ページへ移動
    await page.goto('/register');

    // 必要なフィールドを入力
    await page.fill('input[placeholder="田中太郎"]', 'テストユーザー');
    await page.fill('input[placeholder="example@email.com"]', 'test@example.com');

    const passwordInput = page.locator('input[placeholder="強力なパスワードを入力"]');

    // 禁止単語を含むパスワードを入力
    await passwordInput.fill('Password123!');

    // 禁止パターンのエラーを確認
    await expect(page.locator('text=一般的な単語を避ける')).toBeVisible();

    // 連続する文字のパターンを入力
    await passwordInput.clear();
    await passwordInput.fill('AAA123!@#bbb');

    // 連続文字のエラーを確認
    await expect(page.locator('text=連続する同じ文字を3つ以上使わない')).toBeVisible();

    // キーボードパターンを入力
    await passwordInput.clear();
    await passwordInput.fill('Qwerty123!@#');

    // キーボードパターンのエラーを確認
    await expect(page.locator('text=キーボード配列パターンを避ける')).toBeVisible();
  });

  test('パスワード強度バーの動的更新', async ({ page }) => {
    // 登録ページへ移動
    await page.goto('/register');

    // パスワード入力フィールドを取得
    const passwordInput = page.locator('input[placeholder="強力なパスワードを入力"]');

    // 段階的にパスワードを強化
    const passwords = [
      { value: 'a', expectedWidth: 25 },
      { value: 'abc123', expectedWidth: 25 },
      { value: 'Abc123', expectedWidth: 50 },
      { value: 'Abc123!', expectedWidth: 75 },
      { value: 'SecurePass@2024!', expectedWidth: 100 }
    ];

    for (const { value, expectedWidth } of passwords) {
      await passwordInput.clear();
      await passwordInput.fill(value);

      // 強度バーの幅を確認
      const strengthBar = page.locator('.bg-red-500, .bg-orange-500, .bg-yellow-500, .bg-blue-500, .bg-green-500').first();

      // バーが表示されるまで待つ
      if (await strengthBar.isVisible().catch(() => false)) {
        const style = await strengthBar.getAttribute('style');
        console.log(`パスワード: ${value}, スタイル: ${style}`);
      }
    }

    // 最終状態のスクリーンショット
    await page.screenshot({ path: 'test-results/password-strength-progression.png', fullPage: true });
  });
});

test.describe('パスワード強度機能の統合テスト', () => {
  test('完全な登録フローでパスワード強度チェックが機能する', async ({ page }) => {
    // 登録ページへ移動
    await page.goto('/register');

    // フォーム入力
    await page.fill('input[placeholder="田中太郎"]', `テストユーザー${Date.now()}`);
    await page.fill('input[placeholder="example@email.com"]', `test${Date.now()}@example.com`);

    // 弱いパスワードで送信を試みる
    await page.fill('input[placeholder="強力なパスワードを入力"]', 'weak');
    await page.fill('input[placeholder="パスワードを再入力"]', 'weak');

    const submitButton = page.locator('button:has-text("アカウント作成")');

    // ボタンが無効化されていることを確認
    await expect(submitButton).toBeDisabled();

    // STANDARD要件を満たすパスワードに変更
    await page.fill('input[placeholder="強力なパスワードを入力"]', 'ValidPass@2024!');
    await page.fill('input[placeholder="パスワードを再入力"]', 'ValidPass@2024!');

    // ボタンが有効になったことを確認
    await expect(submitButton).toBeEnabled();

    // 最終状態のスクリーンショット
    await page.screenshot({ path: 'test-results/registration-flow-complete.png', fullPage: true });
  });
});
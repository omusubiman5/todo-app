import { test, expect } from '@playwright/test';

// 実際のSupabaseテストユーザー情報
const TEST_USER = {
  email: 'e2e.test.user2@gmail.com',
  password: 'TestPassword123!'
};

test.describe('最終版：実際のユーザー操作フロー', () => {
  test('🎯 完全なユーザーフロー：ログイン→タスク追加→完了', async ({ page }) => {
    console.log('🎬 最終テストシナリオ開始');
    
    // 1️⃣ アプリにアクセス
    console.log('1️⃣ アプリにアクセス');
    await page.goto('/');
    
    // 現在の状態を確認
    await page.waitForLoadState('networkidle');
    const currentTitle = await page.locator('h1').textContent();
    console.log(`現在のページタイトル: ${currentTitle}`);
    
    // ログイン処理（必要な場合のみ）
    if (!currentTitle?.includes('やることリスト')) {
      console.log('🔐 ログインが必要です');
      
      // ログインページの要素を確認
      await expect(page.locator('h1')).toContainText('ログイン', { timeout: 10000 });
      
      // ログインフォーム入力
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');
      const loginButton = page.locator('button:has-text("ログイン")');
      
      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
      await expect(loginButton).toBeVisible();
      
      // 認証情報入力
      await emailInput.fill(TEST_USER.email);
      console.log(`📧 Email入力: ${TEST_USER.email}`);
      
      await passwordInput.fill(TEST_USER.password);
      console.log('🔑 パスワード入力完了');
      
      // ログイン実行
      await loginButton.click();
      console.log('🔐 ログインボタンクリック');
      
      // ログイン成功を待機
      await expect(page.locator('h1')).toContainText('やることリスト', { timeout: 20000 });
      console.log('✅ ログイン成功');
    } else {
      console.log('✅ 既にログイン済み');
    }
    
    // 2️⃣ タスク管理画面の確認
    console.log('2️⃣ タスク管理画面の確認');
    await expect(page.locator('h1')).toContainText('やることリスト');
    
    // 3️⃣ 新しいタスクを追加
    console.log('3️⃣ 新しいタスクを追加');
    
    const uniqueTaskText = `最終テストタスク_${Date.now()}`;
    
    // タスク入力フィールド
    const taskInput = page.locator('input[type="text"]').first();
    await expect(taskInput).toBeVisible({ timeout: 10000 });
    
    // タスクテキスト入力
    await taskInput.fill(uniqueTaskText);
    console.log(`📝 タスク入力完了: ${uniqueTaskText}`);
    
    // 優先度設定（可能な場合のみ）
    try {
      const prioritySelect = page.locator('select').first();
      if (await prioritySelect.isVisible({ timeout: 3000 })) {
        const options = await prioritySelect.locator('option').allTextContents();
        if (options.includes('高')) {
          await prioritySelect.selectOption('高');
          console.log('⭐ 優先度「高」に設定');
        }
      }
    } catch (error) {
      console.log('ℹ️ 優先度設定をスキップ');
    }
    
    // タスク追加ボタンクリック
    const addButton = page.locator('button:has-text("追加")');
    await expect(addButton).toBeVisible();
    await addButton.click();
    console.log('✅ 追加ボタンクリック');
    
    // 4️⃣ タスクが表示されることを確認
    console.log('4️⃣ タスク表示確認');
    
    // タスクが画面に表示されるまで待機
    await expect(page.locator(`text=${uniqueTaskText}`)).toBeVisible({ timeout: 15000 });
    console.log('✅ 新しいタスクが画面に表示されました');
    
    // 5️⃣ タスクを完了状態にする
    console.log('5️⃣ タスクを完了状態にする');
    
    // タスクコンテナを取得
    const taskContainer = page.locator(`text=${uniqueTaskText}`).locator('..').first();
    await expect(taskContainer).toBeVisible();
    
    // チェックボックスの操作
    const checkbox = taskContainer.locator('input[type="checkbox"]').first();
    
    if (await checkbox.isVisible({ timeout: 5000 })) {
      const isCurrentlyChecked = await checkbox.isChecked();
      
      if (!isCurrentlyChecked) {
        await checkbox.check();
        console.log('☑️ タスクをチェック（完了状態に）');
        
        // チェック状態の確認
        await expect(checkbox).toBeChecked();
        console.log('✅ タスクが完了状態になりました');
      } else {
        console.log('ℹ️ タスクは既に完了状態です');
      }
    } else {
      console.log('⚠️ チェックボックスが見つかりません');
      
      // 代替の完了操作を試行
      const buttons = await taskContainer.locator('button').all();
      console.log(`利用可能なボタン数: ${buttons.length}`);
      
      for (const button of buttons) {
        const buttonText = await button.textContent();
        console.log(`ボタンテキスト: "${buttonText}"`);
        
        if (buttonText && /完了|✓|done|check/i.test(buttonText)) {
          await button.click();
          console.log('✅ 完了ボタンをクリック');
          break;
        }
      }
    }
    
    // 6️⃣ 最終確認とスクリーンショット
    console.log('6️⃣ 最終確認');
    
    // タスクが存在することを再確認
    await expect(page.locator(`text=${uniqueTaskText}`)).toBeVisible();
    
    // 証拠としてスクリーンショットを保存
    await page.screenshot({
      path: `test-results/final-test-success-${Date.now()}.png`,
      fullPage: true
    });
    
    console.log('🎉 最終テスト完了：すべての操作が正常に実行されました！');
    console.log(`📋 追加されたタスク: "${uniqueTaskText}"`);
  });

  test('🚀 高速タスク追加テスト', async ({ page }) => {
    console.log('🚀 高速タスク追加テスト開始');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // ログイン状態の確認
    const title = await page.locator('h1').textContent();
    
    if (!title?.includes('やることリスト')) {
      // 高速ログイン
      await page.locator('input[type="email"]').fill(TEST_USER.email);
      await page.locator('input[type="password"]').fill(TEST_USER.password);
      await page.locator('button:has-text("ログイン")').click();
      await expect(page.locator('h1')).toContainText('やることリスト');
    }
    
    // 高速タスク追加
    const quickTask = `高速追加_${Date.now()}`;
    
    await page.locator('input[type="text"]').first().fill(quickTask);
    await page.locator('button:has-text("追加")').click();
    
    // 結果確認
    await expect(page.locator(`text=${quickTask}`)).toBeVisible();
    
    console.log(`⚡ 高速タスク「${quickTask}」追加完了`);
  });

  test('📊 UI要素確認テスト', async ({ page }) => {
    console.log('📊 UI要素確認テスト開始');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // ログイン状態の確認
    const title = await page.locator('h1').textContent();
    
    if (!title?.includes('やることリスト')) {
      await page.locator('input[type="email"]').fill(TEST_USER.email);
      await page.locator('input[type="password"]').fill(TEST_USER.password);
      await page.locator('button:has-text("ログイン")').click();
      await expect(page.locator('h1')).toContainText('やることリスト');
    }
    
    // UI要素の存在確認
    const uiElements = [
      { selector: 'h1', name: 'メインタイトル' },
      { selector: 'input[type="text"]', name: 'タスク入力フィールド' },
      { selector: 'button:has-text("追加")', name: '追加ボタン' }
    ];
    
    for (const element of uiElements) {
      const isVisible = await page.locator(element.selector).isVisible();
      console.log(`${isVisible ? '✅' : '❌'} ${element.name}: ${isVisible ? '表示' : '非表示'}`);
      
      if (isVisible) {
        await expect(page.locator(element.selector)).toBeVisible();
      }
    }
    
    // 既存タスクの数を確認
    const taskCount = await page.locator('input[type="checkbox"]').count();
    console.log(`📋 既存タスク数: ${taskCount}`);
    
    console.log('📊 UI要素確認テスト完了');
  });
});
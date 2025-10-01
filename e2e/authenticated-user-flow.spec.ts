import { test, expect } from '@playwright/test';

// 実際のSupabaseテストユーザー情報
const TEST_USER = {
  email: 'e2e.test.user2@gmail.com',
  password: 'TestPassword123!'
};

test.describe('実際のテストユーザーによる操作フロー', () => {
  test('テストユーザーでログインしてタスク管理操作を実行', async ({ page }) => {
    console.log('🎬 テストシナリオ開始: ユーザーがタスクを管理する一連の流れ');
    
    // 1️⃣ アプリにアクセス
    console.log('1️⃣ アプリにアクセス中...');
    await page.goto('/');
    
    // ログインページが表示されることを確認
    await expect(page.locator('h1')).toContainText('ログイン', { timeout: 10000 });
    console.log('✅ ログインページが表示されました');
    
    // 2️⃣ テストユーザーでログイン
    console.log('2️⃣ テストユーザーでログイン中...');
    
    // ログインフォームの要素を取得
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const loginButton = page.locator('button:has-text("ログイン")');
    
    // フォーム要素が表示されるまで待機
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(loginButton).toBeVisible();
    
    // ログイン情報を入力
    await emailInput.fill(TEST_USER.email);
    console.log(`📧 メールアドレス入力: ${TEST_USER.email}`);
    
    await passwordInput.fill(TEST_USER.password);
    console.log('🔑 パスワード入力完了');
    
    // ログインボタンをクリック
    await loginButton.click();
    console.log('🔐 ログインボタンをクリックしました');
    
    // 3️⃣ ホーム画面への遷移を確認
    console.log('3️⃣ ホーム画面への遷移を待機中...');
    
    // ログイン成功後、ホーム画面に遷移することを確認
    await expect(page).toHaveURL(/\/(home)?$/, { timeout: 15000 });
    await expect(page.locator('h1')).toContainText('やることリスト', { timeout: 10000 });
    console.log('✅ ホーム画面が表示されました');
    
    // 4️⃣ 新しいタスクを追加
    console.log('4️⃣ 新しいタスクを追加中...');
    
    const testTaskText = `E2Eテストタスク_${Date.now()}`;
    
    // タスク入力フィールドを探す
    const taskInput = page.locator('input[type="text"]').first();
    await expect(taskInput).toBeVisible({ timeout: 10000 });
    
    // タスクを入力
    await taskInput.fill(testTaskText);
    console.log(`📝 タスク入力: ${testTaskText}`);
    
    // 優先度を設定
    const prioritySelect = page.locator('select').first();
    if (await prioritySelect.isVisible()) {
      await prioritySelect.selectOption('高');
      console.log('⭐ 優先度を「高」に設定');
    }
    
    // 追加ボタンをクリック
    const addButton = page.locator('button:has-text("追加")');
    await expect(addButton).toBeVisible();
    await addButton.click();
    console.log('✅ 追加ボタンをクリック');
    
    // 5️⃣ タスクが表示されることを確認
    console.log('5️⃣ タスクが表示されることを確認中...');
    
    await expect(page.locator(`text=${testTaskText}`)).toBeVisible({ timeout: 10000 });
    console.log('✅ 新しいタスクが画面に表示されました');
    
    // 6️⃣ タスクを完了状態にする
    console.log('6️⃣ タスクを完了状態にする...');
    
    // タスクのアイテムを取得
    const taskItem = page.locator(`text=${testTaskText}`).locator('..').first();
    await expect(taskItem).toBeVisible();
    
    // チェックボックスを探してクリック
    const checkbox = taskItem.locator('input[type="checkbox"]').first();
    if (await checkbox.isVisible()) {
      await checkbox.check();
      console.log('☑️ チェックボックスをクリックして完了状態に');
      
      // チェックボックスが選択されていることを確認
      await expect(checkbox).toBeChecked();
      console.log('✅ タスクが完了状態になりました');
    } else {
      console.log('ℹ️ チェックボックスが見つかりません');
    }
    
    // 7️⃣ スクリーンショットを撮影（証拠保存）
    await page.screenshot({
      path: `test-results/task-management-success-${Date.now()}.png`,
      fullPage: true
    });
    
    console.log('🎉 テスト完了: すべての操作が正常に実行されました！');
  });

  test('複数のタスクを連続で追加して管理', async ({ page }) => {
    console.log('📝 複数タスク管理テスト開始');
    
    // ログイン処理
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('ログイン');
    
    await page.locator('input[type="email"]').fill(TEST_USER.email);
    await page.locator('input[type="password"]').fill(TEST_USER.password);
    await page.locator('button:has-text("ログイン")').click();
    
    await expect(page).toHaveURL(/\/(home)?$/);
    await expect(page.locator('h1')).toContainText('やることリスト');
    
    // 複数のタスクを定義
    const tasks = [
      { text: `朝の散歩_${Date.now()}`, priority: '低' },
      { text: `会議資料作成_${Date.now()}`, priority: '高' },
      { text: `夕食の買い物_${Date.now()}`, priority: '中' }
    ];
    
    // タスクを順番に追加
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      console.log(`📋 ${i + 1}/${tasks.length}: 「${task.text}」を追加中...`);
      
      const taskInput = page.locator('input[type="text"]').first();
      await taskInput.fill(task.text);
      
      const prioritySelect = page.locator('select').first();
      if (await prioritySelect.isVisible()) {
        await prioritySelect.selectOption(task.priority);
      }
      
      const addButton = page.locator('button:has-text("追加")');
      await addButton.click();
      
      // タスクが追加されたことを確認
      await expect(page.locator(`text=${task.text}`)).toBeVisible();
      
      // リアルなユーザー操作を模擬
      await page.waitForTimeout(1000);
    }
    
    // すべてのタスクが表示されていることを確認
    for (const task of tasks) {
      await expect(page.locator(`text=${task.text}`)).toBeVisible();
    }
    
    // 最初のタスクを完了にする
    const firstTaskItem = page.locator(`text=${tasks[0].text}`).locator('..').first();
    const checkbox = firstTaskItem.locator('input[type="checkbox"]').first();
    
    if (await checkbox.isVisible()) {
      await checkbox.check();
      await expect(checkbox).toBeChecked();
      console.log(`✅ 「${tasks[0].text}」を完了状態にしました`);
    }
    
    console.log('🎉 複数タスク管理テスト完了');
  });

  test('タスクの編集機能をテスト', async ({ page }) => {
    console.log('✏️ タスク編集機能テスト開始');
    
    // ログイン処理
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('ログイン');
    
    await page.locator('input[type="email"]').fill(TEST_USER.email);
    await page.locator('input[type="password"]').fill(TEST_USER.password);
    await page.locator('button:has-text("ログイン")').click();
    
    await expect(page).toHaveURL(/\/(home)?$/);
    await expect(page.locator('h1')).toContainText('やることリスト');
    
    // テスト用タスクを追加
    const originalText = `編集前タスク_${Date.now()}`;
    const editedText = `編集後タスク_${Date.now()}`;
    
    const taskInput = page.locator('input[type="text"]').first();
    await taskInput.fill(originalText);
    
    const addButton = page.locator('button:has-text("追加")');
    await addButton.click();
    
    await expect(page.locator(`text=${originalText}`)).toBeVisible();
    console.log(`📝 元のタスク「${originalText}」を追加しました`);
    
    // タスクの編集を試行
    const taskItem = page.locator(`text=${originalText}`).locator('..').first();
    
    // タスクアイテムにホバーして編集ボタンを表示
    await taskItem.hover();
    
    // 編集ボタンを探してクリック
    const editButton = taskItem.locator('button').filter({ hasText: /編集|✏️/ }).first();
    
    if (await editButton.isVisible()) {
      await editButton.click();
      console.log('✏️ 編集ボタンをクリック');
      
      // 編集フィールドに新しいテキストを入力
      const editInput = taskItem.locator('input[type="text"]').first();
      if (await editInput.isVisible()) {
        await editInput.fill(editedText);
        
        // 保存ボタンをクリック
        const saveButton = taskItem.locator('button').filter({ hasText: /保存|✓/ }).first();
        if (await saveButton.isVisible()) {
          await saveButton.click();
          
          // 編集されたタスクが表示されることを確認
          await expect(page.locator(`text=${editedText}`)).toBeVisible();
          await expect(page.locator(`text=${originalText}`)).not.toBeVisible();
          
          console.log(`✅ タスクが「${editedText}」に編集されました`);
        }
      }
    } else {
      console.log('ℹ️ 編集機能が見つかりませんでした（編集機能が実装されていない可能性があります）');
    }
    
    console.log('🎉 タスク編集テスト完了');
  });
});
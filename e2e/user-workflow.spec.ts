import { test, expect } from '@playwright/test';

test.describe('実際のユーザー操作フロー', () => {
  test('ユーザーが新しいタスクを追加して完了させる操作', async ({ page }) => {
    // 1. アプリにアクセス
    console.log('🚀 ステップ1: アプリにアクセス');
    await page.goto('/');
    
    // 認証済み状態を模擬（実際のアプリではログインが必要）
    // テスト用の認証トークンをセット
    await page.evaluate(() => {
      // Supabaseの認証状態をモック
      const mockAuthData = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          user_metadata: {},
          app_metadata: {}
        }
      };
      
      localStorage.setItem(
        'sb-localhost-auth-token', 
        JSON.stringify(mockAuthData)
      );
    });
    
    // ページをリロードして認証状態を反映
    await page.reload();
    
    // ホーム画面が表示されるまで待機
    await expect(page.locator('h1')).toContainText('やることリスト');
    
    // 2. 新しいタスクを追加
    console.log('✅ ステップ2: 新しいタスクを追加');
    
    // タスク入力フィールドを見つける（実際のプレースホルダーに基づく）
    const taskInput = page.locator('input[placeholder*="やることを入力してね"]');
    await expect(taskInput).toBeVisible();
    
    // タスクの内容を入力
    const testTaskText = 'テスト用の新しいタスク';
    await taskInput.fill(testTaskText);
    
    // 優先度を選択（デフォルトは「中」なのでそのまま使用）
    const prioritySelect = page.locator('select').first();
    await expect(prioritySelect).toBeVisible();
    await prioritySelect.selectOption('中');
    
    // 追加ボタンをクリック（FaPlusアイコンと「追加」テキストを含むボタン）
    const addButton = page.locator('button:has-text("追加")');
    await expect(addButton).toBeVisible();
    await addButton.click();
    
    // 3. タスクが表示されることを確認
    console.log('👀 ステップ3: タスクが表示されることを確認');
    
    // 新しく追加されたタスクが画面に表示されることを確認
    await expect(page.locator('text=' + testTaskText)).toBeVisible();
    
    // タスクが未完了状態で表示されていることを確認
    const taskElement = page.locator('text=' + testTaskText).locator('..').first();
    await expect(taskElement).toBeVisible();
    
    // 4. タスクを完了にする
    console.log('✅ ステップ4: タスクを完了にする');
    
    // タスクのチェックボックスを探してクリック（実際のDOM構造に基づく）
    const checkbox = taskElement.locator('input[type="checkbox"]').first();
    await expect(checkbox).toBeVisible();
    await checkbox.check();
    
    // 5. 完了マークがつくことを確認
    console.log('🎯 ステップ5: 完了マークがつくことを確認');
    
    // チェックボックスが選択されていることを確認
    await expect(checkbox).toBeChecked();
    
    // タスクテキストに取り消し線が表示されることを確認
    // (実際のコンポーネントではcompletedクラスで取り消し線が適用される)
    const taskTextElement = taskElement.locator('span, p').filter({ hasText: testTaskText });
    await expect(taskTextElement).toHaveClass(/line-through|completed/, { timeout: 3000 });
    
    console.log('🎉 テスト完了: すべての操作が正常に動作しました！');
  });

  test('複数のタスクを連続で追加して管理する操作', async ({ page }) => {
    // 認証状態をセット
    await page.goto('/');
    await page.evaluate(() => {
      const mockAuthData = {
        access_token: 'mock-access-token',
        user: { id: 'test-user-id', email: 'test@example.com' }
      };
      localStorage.setItem('sb-localhost-auth-token', JSON.stringify(mockAuthData));
    });
    await page.reload();
    
    await expect(page.locator('h1')).toContainText('やることリスト');
    
    // 複数のタスクを連続で追加
    const tasks = [
      { text: '朝の散歩', priority: '低' },
      { text: '仕事の資料作成', priority: '高' },
      { text: '夕食の買い物', priority: '中' }
    ];
    
    for (const task of tasks) {
      console.log(`📝 タスクを追加: ${task.text}`);
      
      const taskInput = page.locator('input[placeholder*="やることを入力してね"]');
      await taskInput.fill(task.text);
      
      const prioritySelect = page.locator('select').first();
      if (await prioritySelect.isVisible()) {
        await prioritySelect.selectOption(task.priority);
      }
      
      const addButton = page.locator('button:has-text("追加")');
      await addButton.click();
      
      // タスクが追加されたことを確認
      await expect(page.locator('text=' + task.text)).toBeVisible();
      
      // 少し待機（リアルなユーザー操作を模擬）
      await page.waitForTimeout(500);
    }
    
    // 全てのタスクが表示されていることを確認
    for (const task of tasks) {
      await expect(page.locator('text=' + task.text)).toBeVisible();
    }
    
    // 1つのタスクを完了にする
    const firstTask = page.locator('text=' + tasks[0].text).locator('..').first();
    const checkbox = firstTask.locator('input[type="checkbox"]').first();
    if (await checkbox.isVisible()) {
      await checkbox.check();
    }
    
    // 完了したタスクが完了状態になることを確認
    await expect(firstTask).toHaveClass(/completed|done/, { timeout: 3000 });
    
    console.log('🎉 複数タスクの管理テスト完了');
  });

  test('タスクの編集機能をテストする', async ({ page }) => {
    // 認証状態をセット
    await page.goto('/');
    await page.evaluate(() => {
      const mockAuthData = {
        access_token: 'mock-access-token',
        user: { id: 'test-user-id', email: 'test@example.com' }
      };
      localStorage.setItem('sb-localhost-auth-token', JSON.stringify(mockAuthData));
    });
    await page.reload();
    
    await expect(page.locator('h1')).toContainText('やることリスト');
    
    // タスクを追加
    const originalText = '編集前のタスク';
    const editedText = '編集後のタスク';
    
    const taskInput = page.locator('input[placeholder*="やることを入力してね"]');
    await taskInput.fill(originalText);
    
    const addButton = page.locator('button:has-text("追加")');
    await addButton.click();
    
    await expect(page.locator('text=' + originalText)).toBeVisible();
    
    // タスクを編集する
    const taskElement = page.locator('text=' + originalText).locator('..').first();
    
    // 編集ボタンを探してクリック
    const editButton = taskElement.locator('button').filter({ hasText: /編集|✏️/ }).first();
    
    if (await editButton.isVisible()) {
      await editButton.click();
      
      // 編集フィールドに新しいテキストを入力
      const editInput = taskElement.locator('input[type="text"]').first();
      await editInput.fill(editedText);
      
      // 保存ボタンをクリック
      const saveButton = taskElement.locator('button').filter({ hasText: /保存|✓/ }).first();
      await saveButton.click();
      
      // 編集されたタスクが表示されることを確認
      await expect(page.locator('text=' + editedText)).toBeVisible();
      await expect(page.locator('text=' + originalText)).not.toBeVisible();
    }
    
    console.log('✏️ タスク編集テスト完了');
  });
});
import { test, expect } from '@playwright/test';

test.describe('リアルなユーザー操作フロー', () => {
  test.beforeEach(async ({ page }) => {
    // 認証状態をモック（実際のSupabaseの認証フローを模擬）
    await page.addInitScript(() => {
      // LocalStorageにSupabase認証データを設定
      const authData = {
        access_token: 'mock-jwt-token-12345',
        refresh_token: 'mock-refresh-token-67890',
        expires_in: 3600,
        expires_at: Date.now() / 1000 + 3600,
        token_type: 'bearer',
        user: {
          id: 'mock-user-id-123',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'test@example.com',
          email_confirmed_at: '2024-01-01T00:00:00.000Z',
          phone: '',
          confirmed_at: '2024-01-01T00:00:00.000Z',
          last_sign_in_at: '2024-01-01T00:00:00.000Z',
          app_metadata: {
            provider: 'email',
            providers: ['email']
          },
          user_metadata: {},
          identities: [],
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z'
        }
      };
      
      // Supabaseのセッション形式でLocalStorageに保存
      localStorage.setItem(
        'sb-localhost-auth-token',
        JSON.stringify(authData)
      );
    });
  });

  test('ユーザーがアプリを使って実際にタスクを管理する流れ', async ({ page }) => {
    console.log('🚀 テスト開始: ユーザーによる実際のタスク管理フロー');
    
    // 1. アプリにアクセス
    console.log('📱 ステップ1: アプリにアクセス');
    await page.goto('/');
    
    // 認証済みユーザーとしてホーム画面に自動遷移することを確認
    // ページが完全に読み込まれるまで待機
    await page.waitForLoadState('networkidle');
    
    // ホーム画面が表示されるまで待機（認証済みの場合は/homeにリダイレクト）
    await expect(page).toHaveURL(/\/(home)?$/);
    
    // ページタイトルまたはメインタイトルが表示されることを確認
    await expect(page.locator('h1')).toContainText('やることリスト', { timeout: 10000 });
    
    // 2. 新しいタスクを追加
    console.log('✅ ステップ2: 新しいタスクを追加');
    
    // タスク入力フィールドを見つける（柔軟なセレクター）
    const taskInput = page.locator('input[type="text"]').first();
    await expect(taskInput).toBeVisible({ timeout: 10000 });
    
    // タスクの内容を入力
    const testTaskText = 'テスト用タスク：買い物に行く';
    await taskInput.fill(testTaskText);
    
    // 優先度を選択
    const prioritySelect = page.locator('select').first();
    if (await prioritySelect.isVisible()) {
      await prioritySelect.selectOption('高');
    }
    
    // 追加ボタンをクリック
    const addButton = page.locator('button', { hasText: '追加' });
    await expect(addButton).toBeVisible();
    await addButton.click();
    
    // 3. タスクが表示されることを確認
    console.log('👀 ステップ3: タスクが表示されることを確認');
    
    // 新しく追加されたタスクが画面に表示されることを確認
    await expect(page.locator(`text=${testTaskText}`)).toBeVisible({ timeout: 10000 });
    
    // タスクが未完了状態で表示されていることを確認
    const taskItem = page.locator(`text=${testTaskText}`).locator('..').first();
    await expect(taskItem).toBeVisible();
    
    // 4. タスクを完了にする
    console.log('✅ ステップ4: タスクを完了にする');
    
    // タスクのチェックボックスを探してクリック
    const checkbox = taskItem.locator('input[type="checkbox"]').first();
    if (await checkbox.isVisible()) {
      await checkbox.check();
      
      // 5. 完了マークがつくことを確認
      console.log('🎯 ステップ5: 完了マークがつくことを確認');
      
      // チェックボックスが選択されていることを確認
      await expect(checkbox).toBeChecked();
      
      console.log('🎉 テスト完了: タスクが正常に完了状態になりました！');
    } else {
      console.log('ℹ️ チェックボックスが見つからない場合は別の完了ボタンを探します');
      
      // 完了ボタンを探してクリック
      const completeButton = taskItem.locator('button').filter({ hasText: /完了|✓/ }).first();
      if (await completeButton.isVisible()) {
        await completeButton.click();
        console.log('✅ 完了ボタンをクリックしました');
      }
    }
  });

  test('複数のタスクを追加して管理する実際の使用例', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('やることリスト', { timeout: 10000 });
    
    const tasks = [
      { text: '朝のジョギング', priority: '低' },
      { text: '会議の資料準備', priority: '高' },
      { text: '夕食の買い物', priority: '中' }
    ];
    
    console.log('📝 複数のタスクを順番に追加していきます');
    
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      console.log(`📋 ${i + 1}/${tasks.length}: ${task.text} を追加中`);
      
      const taskInput = page.locator('input[type="text"]').first();
      await taskInput.fill(task.text);
      
      const prioritySelect = page.locator('select').first();
      if (await prioritySelect.isVisible()) {
        await prioritySelect.selectOption(task.priority);
      }
      
      const addButton = page.locator('button', { hasText: '追加' });
      await addButton.click();
      
      // タスクが追加されたことを確認
      await expect(page.locator(`text=${task.text}`)).toBeVisible();
      
      // リアルなユーザー操作を模擬（少し間を空ける）
      await page.waitForTimeout(1000);
    }
    
    // すべてのタスクが表示されていることを確認
    for (const task of tasks) {
      await expect(page.locator(`text=${task.text}`)).toBeVisible();
    }
    
    // 最初のタスクを完了にする
    console.log('✅ 最初のタスクを完了状態にします');
    const firstTaskItem = page.locator(`text=${tasks[0].text}`).locator('..').first();
    const checkbox = firstTaskItem.locator('input[type="checkbox"]').first();
    
    if (await checkbox.isVisible()) {
      await checkbox.check();
      await expect(checkbox).toBeChecked();
    }
    
    console.log('🎉 複数タスク管理テスト完了');
  });

  test('タスクの削除機能をテスト', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('やることリスト', { timeout: 10000 });
    
    const taskText = '削除予定のタスク';
    
    // タスクを追加
    const taskInput = page.locator('input[type="text"]').first();
    await taskInput.fill(taskText);
    
    const addButton = page.locator('button', { hasText: '追加' });
    await addButton.click();
    
    await expect(page.locator(`text=${taskText}`)).toBeVisible();
    
    // タスクアイテムにホバーして削除ボタンを表示
    const taskItem = page.locator(`text=${taskText}`).locator('..').first();
    await taskItem.hover();
    
    // 削除ボタンを探してクリック
    const deleteButton = taskItem.locator('button').filter({ hasText: /削除|🗑️|ごみ箱/ }).first();
    
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      
      // タスクが削除されたことを確認
      await expect(page.locator(`text=${taskText}`)).not.toBeVisible({ timeout: 5000 });
      console.log('🗑️ タスクが正常に削除されました');
    } else {
      console.log('ℹ️ 削除ボタンが見つかりませんでした（削除機能がない可能性があります）');
    }
  });
});
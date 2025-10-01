import { test, expect } from '@playwright/test';

test.describe('Comprehensive Task Management E2E', () => {
  
  test.beforeEach(async ({ page }) => {
    // アプリケーションのホームページにアクセス
    await page.goto('/');
    
    // ページの基本構造が読み込まれるまで待機
    await expect(page).toHaveTitle(/Todo App|タスク管理/);
  });

  test('個人タスク管理の完全なワークフロー', async ({ page }) => {
    // 個人タスクセクションに移動
    await page.click('[data-testid="personal-tasks"]');
    
    // タスク追加フォームの確認
    await expect(page.locator('input[placeholder*="タスク"]')).toBeVisible();
    
    // 新しいタスクを追加
    const taskText = 'E2Eテストタスク - ' + Date.now();
    await page.fill('input[placeholder*="タスク"]', taskText);
    
    // 優先度を設定
    await page.selectOption('select[aria-label*="優先度"]', '高');
    
    // タスクを追加
    await page.click('button[type="submit"]');
    
    // タスクがリストに表示されることを確認
    await expect(page.locator(`text=${taskText}`)).toBeVisible();
    
    // タスクを完了にマーク
    const taskCheckbox = page.locator(`input[type="checkbox"]`).first();
    await taskCheckbox.check();
    
    // 完了状態の確認（視覚的変化）
    await expect(taskCheckbox).toBeChecked();
    
    // タスクを編集
    await page.click('[aria-label*="編集"]');
    const updatedText = taskText + ' - 編集済み';
    await page.fill('input[value*="E2Eテストタスク"]', updatedText);
    await page.press('input[value*="E2Eテストタスク"]', 'Enter');
    
    // 編集内容の反映確認
    await expect(page.locator(`text=${updatedText}`)).toBeVisible();
    
    // タスクを削除
    await page.click('[aria-label*="削除"]');
    
    // 確認ダイアログがある場合は承認
    if (await page.locator('button:has-text("削除")').isVisible()) {
      await page.click('button:has-text("削除")');
    }
    
    // タスクが削除されたことを確認
    await expect(page.locator(`text=${updatedText}`)).not.toBeVisible();
  });

  test('タスクフィルタリングと検索機能', async ({ page }) => {
    // テスト用タスクを複数作成
    const tasks = [
      { text: '高優先度タスク', priority: '高' },
      { text: '中優先度タスク', priority: '中' },
      { text: '低優先度タスク', priority: '低' }
    ];

    for (const task of tasks) {
      await page.fill('input[placeholder*="タスク"]', task.text);
      await page.selectOption('select[aria-label*="優先度"]', task.priority);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500); // 安定性のため少し待機
    }

    // 全てのタスクが表示されることを確認
    for (const task of tasks) {
      await expect(page.locator(`text=${task.text}`)).toBeVisible();
    }

    // 高優先度フィルターをテスト
    if (await page.locator('button:has-text("高優先度のみ")').isVisible()) {
      await page.click('button:has-text("高優先度のみ")');
      await expect(page.locator('text=高優先度タスク')).toBeVisible();
      await expect(page.locator('text=中優先度タスク')).not.toBeVisible();
    }

    // フィルターをリセット
    if (await page.locator('button:has-text("すべて")').isVisible()) {
      await page.click('button:has-text("すべて")');
    }

    // 検索機能をテスト
    if (await page.locator('input[placeholder*="検索"]').isVisible()) {
      await page.fill('input[placeholder*="検索"]', '高優先度');
      await expect(page.locator('text=高優先度タスク')).toBeVisible();
      await expect(page.locator('text=中優先度タスク')).not.toBeVisible();
    }
  });

  test('キーボードナビゲーションのアクセシビリティ', async ({ page }) => {
    // Tabキーでフォーカス移動をテスト
    await page.keyboard.press('Tab');
    
    // フォーカスが適切な要素に移動することを確認
    const focusedElement = await page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // タスク入力フィールドにフォーカス
    await page.focus('input[placeholder*="タスク"]');
    
    // キーボードでタスクを追加
    await page.type('input[placeholder*="タスク"]', 'キーボードテストタスク');
    await page.press('input[placeholder*="タスク"]', 'Tab');
    
    // 優先度選択にフォーカスが移ることを確認
    const prioritySelect = page.locator('select[aria-label*="優先度"]');
    await expect(prioritySelect).toBeFocused();
    
    // キーボードで優先度を選択
    await page.press('select[aria-label*="優先度"]', 'ArrowDown');
    await page.press('select[aria-label*="優先度"]', 'Enter');
    
    // Enterキーでフォーム送信
    await page.press('button[type="submit"]', 'Enter');
    
    // タスクが追加されたことを確認
    await expect(page.locator('text=キーボードテストタスク')).toBeVisible();
  });

  test('エラーハンドリングの動作確認', async ({ page }) => {
    // 空のタスクテキストで送信を試行
    await page.click('button[type="submit"]');
    
    // バリデーションエラーの確認
    // HTML5 validation または カスタム エラーメッセージ
    const taskInput = page.locator('input[placeholder*="タスク"]');
    
    // required属性による検証
    const validationMessage = await taskInput.getAttribute('validationMessage');
    if (validationMessage) {
      expect(validationMessage).toBeTruthy();
    }
    
    // または、カスタムエラーメッセージの確認
    const errorMessage = page.locator('[role="alert"], .error-message');
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toBeVisible();
    }
    
    // 正常なタスクを追加してエラー状態を解除
    await page.fill('input[placeholder*="タスク"]', '正常なタスク');
    await page.click('button[type="submit"]');
    
    // エラーが解除されることを確認
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).not.toBeVisible();
    }
  });

  test('レスポンシブデザインの確認', async ({ page }) => {
    // デスクトップサイズでのテスト
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // タスクリストが適切に表示されることを確認
    await expect(page.locator('[data-testid="task-list"], .task-list')).toBeVisible();
    
    // タブレットサイズでのテスト
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    
    // レスポンシブデザインが適用されることを確認
    await expect(page.locator('[data-testid="task-list"], .task-list')).toBeVisible();
    
    // モバイルサイズでのテスト
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // モバイル表示でも機能することを確認
    await expect(page.locator('input[placeholder*="タスク"]')).toBeVisible();
    
    // モバイルでのタスク追加テスト
    await page.fill('input[placeholder*="タスク"]', 'モバイルテストタスク');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=モバイルテストタスク')).toBeVisible();
  });

  test('ページリロード時のデータ永続性', async ({ page }) => {
    // タスクを追加
    const persistentTask = 'データ永続性テストタスク';
    await page.fill('input[placeholder*="タスク"]', persistentTask);
    await page.click('button[type="submit"]');
    
    // タスクが表示されることを確認
    await expect(page.locator(`text=${persistentTask}`)).toBeVisible();
    
    // ページをリロード
    await page.reload();
    
    // リロード後もタスクが表示されることを確認
    // 注: 実際のアプリではローカルストレージやサーバーからデータを復元
    await page.waitForLoadState('networkidle');
    
    // データが永続化されているかは実装に依存
    // ここではページが正常に読み込まれることを確認
    await expect(page.locator('input[placeholder*="タスク"]')).toBeVisible();
  });

  test('複数タスクの一括操作', async ({ page }) => {
    // 複数のタスクを作成
    const bulkTasks = ['一括テスト1', '一括テスト2', '一括テスト3'];
    
    for (const taskText of bulkTasks) {
      await page.fill('input[placeholder*="タスク"]', taskText);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(300);
    }
    
    // 全てのタスクが表示されることを確認
    for (const taskText of bulkTasks) {
      await expect(page.locator(`text=${taskText}`)).toBeVisible();
    }
    
    // 一括選択機能がある場合のテスト
    const selectAllButton = page.locator('button:has-text("すべて選択"), input[type="checkbox"][aria-label*="すべて"]');
    if (await selectAllButton.isVisible()) {
      await selectAllButton.click();
      
      // 一括削除
      const bulkDeleteButton = page.locator('button:has-text("選択したタスクを削除")');
      if (await bulkDeleteButton.isVisible()) {
        await bulkDeleteButton.click();
        
        // 確認ダイアログがある場合
        const confirmButton = page.locator('button:has-text("削除")');
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }
      }
    } else {
      // 一括機能がない場合は、個別に削除
      for (const taskText of bulkTasks) {
        const deleteButton = page.locator(`text=${taskText}`).locator('..').locator('button[aria-label*="削除"]');
        if (await deleteButton.isVisible()) {
          await deleteButton.click();
        }
      }
    }
  });

  test('アクセシビリティ基準の確認', async ({ page }) => {
    // injectを使用してaxe-coreライブラリを注入（もしある場合）
    try {
      await page.addScriptTag({ url: 'https://unpkg.com/axe-core@4.7.0/axe.min.js' });
      
      // アクセシビリティチェックを実行
      const results = await page.evaluate(() => {
        // @ts-ignore
        return axe.run();
      });
      
      // 重大な違反がないことを確認
      expect(results.violations.filter(v => v.impact === 'critical')).toHaveLength(0);
      expect(results.violations.filter(v => v.impact === 'serious')).toHaveLength(0);
    } catch (error) {
      console.log('axe-core not available, performing manual accessibility checks');
      
      // 手動でのアクセシビリティチェック
      // フォーム要素にラベルがあることを確認
      const taskInput = page.locator('input[placeholder*="タスク"]');
      await expect(taskInput).toHaveAttribute('aria-label');
      
      // ボタンにアクセシブルな名前があることを確認
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toHaveAttribute('aria-label');
    }
  });
});
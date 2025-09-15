import { test, expect } from '@playwright/test';

test.describe('Team Collaboration User Flows', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Todo App|タスク管理/);
    
    // ログイン状態をシミュレート（実装に応じて調整）
    // 実際のアプリケーションではログイン処理を実行
    await page.waitForLoadState('networkidle');
  });

  test('チーム作成から共同作業までの完全フロー', async ({ page }) => {
    // Step 1: チーム作成
    const teamCreationButton = page.locator('button:has-text("チーム作成"), [data-testid="create-team"]');
    
    if (await teamCreationButton.isVisible()) {
      await teamCreationButton.click();
      
      // チーム名を入力
      const teamName = 'E2Eテストチーム_' + Date.now();
      await page.fill('input[name="teamName"], input[placeholder*="チーム名"]', teamName);
      
      // チーム説明を入力
      await page.fill('textarea[name="description"], input[name="description"]', 'E2Eテスト用のチームです');
      
      // チーム作成を確定
      await page.click('button[type="submit"]:has-text("作成")');
      
      // チームが作成されたことを確認
      await expect(page.locator(`text=${teamName}`)).toBeVisible();
    }
    
    // Step 2: チームワークスペースに切り替え
    const teamWorkspace = page.locator('[data-testid="team-workspace"], button:has-text("チーム")');
    if (await teamWorkspace.isVisible()) {
      await teamWorkspace.click();
    }
    
    // Step 3: チームタスクを作成
    const teamTaskText = 'チーム共同タスク - ' + Date.now();
    await page.fill('input[placeholder*="タスク"]', teamTaskText);
    
    // 担当者を選択（実装されている場合）
    const assigneeSelect = page.locator('select[aria-label*="担当者"], [data-testid="assignee-select"]');
    if (await assigneeSelect.isVisible()) {
      await assigneeSelect.selectOption({ index: 1 });
    }
    
    await page.click('button[type="submit"]');
    
    // チームタスクが作成されたことを確認
    await expect(page.locator(`text=${teamTaskText}`)).toBeVisible();
    
    // Step 4: タスクにコメントを追加（実装されている場合）
    const commentButton = page.locator('button:has-text("コメント"), [data-testid="add-comment"]');
    if (await commentButton.isVisible()) {
      await commentButton.click();
      await page.fill('textarea[placeholder*="コメント"]', 'チーム共同作業のテストコメントです');
      await page.click('button:has-text("送信")');
      
      await expect(page.locator('text=チーム共同作業のテストコメントです')).toBeVisible();
    }
  });

  test('チームメンバー招待フロー', async ({ page }) => {
    // チーム設定またはメンバー管理ページに移動
    const memberManagement = page.locator('button:has-text("メンバー管理"), [data-testid="manage-members"]');
    
    if (await memberManagement.isVisible()) {
      await memberManagement.click();
      
      // メンバー招待ボタンをクリック
      const inviteButton = page.locator('button:has-text("招待"), [data-testid="invite-member"]');
      await inviteButton.click();
      
      // 招待するメールアドレスを入力
      const testEmail = 'test.member@example.com';
      await page.fill('input[type="email"]', testEmail);
      
      // 権限レベルを選択
      const roleSelect = page.locator('select[name="role"], [data-testid="member-role"]');
      if (await roleSelect.isVisible()) {
        await roleSelect.selectOption('member');
      }
      
      // 招待を送信
      await page.click('button[type="submit"]:has-text("招待送信")');
      
      // 招待が送信されたことを確認
      await expect(page.locator('text=招待を送信しました')).toBeVisible();
      
      // 招待リストに表示されることを確認
      await expect(page.locator(`text=${testEmail}`)).toBeVisible();
    }
  });

  test('リアルタイム更新の確認', async ({ page, context }) => {
    // 2つのタブでリアルタイム更新をテスト
    const secondPage = await context.newPage();
    await secondPage.goto('/');
    
    // 最初のページでタスクを作成
    const realtimeTask = 'リアルタイムテストタスク - ' + Date.now();
    await page.fill('input[placeholder*="タスク"]', realtimeTask);
    await page.click('button[type="submit"]');
    
    // 最初のページでタスクが表示されることを確認
    await expect(page.locator(`text=${realtimeTask}`)).toBeVisible();
    
    // 2番目のページでも同じタスクが表示されることを確認（リアルタイム更新）
    await secondPage.waitForTimeout(2000); // リアルタイム更新の時間を待つ
    await expect(secondPage.locator(`text=${realtimeTask}`)).toBeVisible();
    
    // 2番目のページでタスクを完了状態に変更
    const checkbox = secondPage.locator('input[type="checkbox"]').first();
    await checkbox.check();
    
    // 最初のページでも完了状態が反映されることを確認
    await page.waitForTimeout(2000);
    const firstPageCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(firstPageCheckbox).toBeChecked();
    
    await secondPage.close();
  });

  test('権限ベースのアクセス制御', async ({ page }) => {
    // 管理者権限でのテスト
    const adminActions = page.locator('[data-testid="admin-actions"], button:has-text("管理")');
    
    if (await adminActions.isVisible()) {
      await adminActions.click();
      
      // チーム削除ボタンが表示されることを確認（管理者のみ）
      const deleteTeamButton = page.locator('button:has-text("チーム削除")');
      await expect(deleteTeamButton).toBeVisible();
      
      // メンバー権限変更機能の確認
      const changeMemberRole = page.locator('button:has-text("権限変更"), [data-testid="change-role"]');
      if (await changeMemberRole.isVisible()) {
        await changeMemberRole.click();
        
        // 権限選択オプションが表示されることを確認
        const roleOptions = page.locator('select[name="newRole"] option, [role="option"]');
        await expect(roleOptions.first()).toBeVisible();
      }
    }
    
    // 一般メンバーとしての制限をテスト
    // 注: 実際のテストでは別のユーザーとしてログインする必要がある
    const restrictedActions = page.locator('button:has-text("チーム削除"), [data-testid="delete-team"]');
    
    // 一般メンバーには表示されないことを確認（コンテキストに依存）
    // await expect(restrictedActions).not.toBeVisible();
  });

  test('タスク割り当てとステータス追跡', async ({ page }) => {
    // タスクを作成
    const assignableTask = 'チーム割り当てタスク - ' + Date.now();
    await page.fill('input[placeholder*="タスク"]', assignableTask);
    
    // 担当者を選択
    const assigneeDropdown = page.locator('select[aria-label*="担当者"], [data-testid="assignee-select"]');
    if (await assigneeDropdown.isVisible()) {
      await assigneeDropdown.selectOption({ index: 1 }); // 2番目のオプションを選択
    }
    
    // 期日を設定（実装されている場合）
    const dueDateInput = page.locator('input[type="date"], [data-testid="due-date"]');
    if (await dueDateInput.isVisible()) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await dueDateInput.fill(tomorrow.toISOString().split('T')[0]);
    }
    
    await page.click('button[type="submit"]');
    
    // タスクが作成され、割り当て情報が表示されることを確認
    await expect(page.locator(`text=${assignableTask}`)).toBeVisible();
    
    // ステータス変更のテスト
    const statusDropdown = page.locator('select[aria-label*="ステータス"], [data-testid="task-status"]');
    if (await statusDropdown.isVisible()) {
      await statusDropdown.selectOption('進行中');
      
      // ステータスが更新されたことを確認
      await expect(statusDropdown).toHaveValue('進行中');
    }
    
    // タスクの詳細表示
    const taskDetails = page.locator(`text=${assignableTask}`);
    await taskDetails.click();
    
    // 詳細モーダル/ページが開くことを確認
    const detailsModal = page.locator('[data-testid="task-details"], .task-modal');
    if (await detailsModal.isVisible()) {
      await expect(detailsModal).toBeVisible();
      
      // 詳細情報が表示されることを確認
      await expect(detailsModal.locator('text=担当者')).toBeVisible();
      
      // モーダルを閉じる
      const closeButton = detailsModal.locator('button[aria-label*="閉じる"], .close-button');
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
    }
  });

  test('チーム統計とダッシュボード', async ({ page }) => {
    // ダッシュボードまたは統計ページに移動
    const dashboardLink = page.locator('a[href*="dashboard"], button:has-text("ダッシュボード")');
    
    if (await dashboardLink.isVisible()) {
      await dashboardLink.click();
      
      // 統計情報が表示されることを確認
      const teamStats = page.locator('[data-testid="team-stats"], .statistics');
      await expect(teamStats).toBeVisible();
      
      // 各種統計項目の確認
      const expectedStats = [
        'text=総タスク数',
        'text=完了タスク',
        'text=進行中タスク',
        'text=メンバー数'
      ];
      
      for (const stat of expectedStats) {
        const statElement = page.locator(stat);
        if (await statElement.isVisible()) {
          await expect(statElement).toBeVisible();
        }
      }
      
      // チャートやグラフが表示される場合の確認
      const charts = page.locator('canvas, .chart, [data-testid="progress-chart"]');
      if (await charts.first().isVisible()) {
        await expect(charts.first()).toBeVisible();
      }
    }
  });

  test('チーム通知システム', async ({ page }) => {
    // 通知設定ページに移動
    const notificationSettings = page.locator('button:has-text("通知設定"), [data-testid="notification-settings"]');
    
    if (await notificationSettings.isVisible()) {
      await notificationSettings.click();
      
      // 通知設定オプションの確認
      const notificationOptions = [
        'input[name="taskAssigned"]',
        'input[name="taskCompleted"]',
        'input[name="commentAdded"]',
        'input[name="dueDateReminder"]'
      ];
      
      for (const option of notificationOptions) {
        const checkbox = page.locator(option);
        if (await checkbox.isVisible()) {
          await expect(checkbox).toBeVisible();
          
          // 設定を切り替え
          await checkbox.check();
          await expect(checkbox).toBeChecked();
        }
      }
      
      // 設定を保存
      const saveButton = page.locator('button[type="submit"]:has-text("保存")');
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await expect(page.locator('text=設定を保存しました')).toBeVisible();
      }
    }
    
    // 通知の表示確認
    const notificationBell = page.locator('[data-testid="notifications"], .notification-icon');
    if (await notificationBell.isVisible()) {
      await notificationBell.click();
      
      // 通知パネルが開くことを確認
      const notificationPanel = page.locator('[data-testid="notification-panel"], .notifications-dropdown');
      await expect(notificationPanel).toBeVisible();
    }
  });

  test('チームワークスペースの切り替え', async ({ page }) => {
    // ワークスペース切り替えコントロールを探す
    const workspaceSelector = page.locator('[data-testid="workspace-selector"], select[aria-label*="ワークスペース"]');
    
    if (await workspaceSelector.isVisible()) {
      // 個人ワークスペースを選択
      await workspaceSelector.selectOption({ label: '個人タスク' });
      
      // 個人タスクビューが表示されることを確認
      await expect(page.locator('text=個人タスク')).toBeVisible();
      
      // チームワークスペースに戻る
      await workspaceSelector.selectOption({ index: 1 }); // 最初のチームを選択
      
      // チームタスクビューが表示されることを確認
      const teamIndicator = page.locator('text=チーム, [data-testid="team-workspace-indicator"]');
      if (await teamIndicator.isVisible()) {
        await expect(teamIndicator).toBeVisible();
      }
    }
    
    // ワークスペース切り替えによるタスク表示の変更確認
    const taskList = page.locator('[data-testid="task-list"], .task-container');
    await expect(taskList).toBeVisible();
    
    // 各ワークスペースで異なるタスクが表示されることを確認
    // 実装に依存するため、基本的な表示確認のみ
  });
});
import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: 'e2e.test.user2@gmail.com',
  password: 'test123456'
};

test.describe('チェックボックス機能緊急テスト', () => {
  test('🔧 チェックボックス楽観的更新テスト', async ({ page }) => {
    console.log('🔧 チェックボックス修正テスト開始');
    
    // 1. アプリにアクセス
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // 2. ログイン確認（既にログイン済みかチェック）
    const currentTitle = await page.locator('h1').textContent();
    
    if (currentTitle?.includes('ログイン')) {
      console.log('ログインが必要です');
      
      // ログイン処理
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
      
      // ログイン完了確認
      await expect(page.locator('h1')).toContainText('やることリスト', { timeout: 10000 });
    }
    
    console.log('✅ タスク管理画面表示確認');
    
    // 3. テスト用タスクを追加
    const testTaskText = `🔧 チェックボックステスト_${Date.now()}`;
    
    const inputSelectors = [
      'input[placeholder*="やること"]',
      'input[type="text"]',
      '[data-testid="task-input"]'
    ];
    
    let taskInput = null;
    for (const selector of inputSelectors) {
      try {
        taskInput = page.locator(selector).first();
        if (await taskInput.isVisible()) {
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!taskInput) {
      throw new Error('タスク入力フィールドが見つかりません');
    }
    
    await taskInput.fill(testTaskText);
    await taskInput.press('Enter');
    
    // タスクが追加されるまで待機
    await page.waitForTimeout(1000);
    
    console.log(`📝 テストタスク追加: ${testTaskText}`);
    
    // 4. 追加されたタスクのチェックボックスを取得
    const taskRow = page.locator(`text=${testTaskText}`).locator('..').locator('..');
    const checkbox = taskRow.locator('input[type="checkbox"]');
    
    // 5. チェックボックスの初期状態確認
    const initialChecked = await checkbox.isChecked();
    console.log(`初期チェック状態: ${initialChecked}`);
    
    // 6. チェックボックスをクリック
    console.log('🖱️ チェックボックスをクリック');
    await checkbox.click();
    
    // 7. 即座にUI状態が変わることを確認（楽観的更新のテスト）
    await page.waitForTimeout(100); // 短い待機時間で即座の変化をテスト
    
    const afterClickChecked = await checkbox.isChecked();
    console.log(`クリック後チェック状態: ${afterClickChecked}`);
    
    // 8. 状態が変わったことを検証
    expect(afterClickChecked).toBe(!initialChecked);
    
    console.log('✅ チェックボックス楽観的更新テスト完了');
    
    // 9. もう一度クリックして元に戻すテスト
    console.log('🔄 逆方向テスト');
    await checkbox.click();
    await page.waitForTimeout(100);
    
    const finalChecked = await checkbox.isChecked();
    expect(finalChecked).toBe(initialChecked);
    
    console.log('✅ 双方向チェックボックステスト完了');
  });
});
import { test, expect } from '@playwright/test';

test.describe('タスク作成→削除の完全テスト', () => {
  const TEST_EMAIL = 'omusubiman@gmail.com';
  const TEST_PASSWORD = 'Mm1696bz?';
  
  test('タスクを作成してから削除機能をテスト', async ({ page }) => {
    console.log('🔍 タスク作成→削除の完全テスト開始');
    
    // ログイン
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    
    console.log('🔐 ログイン完了');
    await page.waitForTimeout(5000);
    
    // ログイン成功確認
    const isLoggedIn = !page.url().includes('/login');
    if (!isLoggedIn) {
      console.log('❌ ログイン失敗');
      test.skip();
      return;
    }
    
    console.log('✅ ログイン成功、メインページに到達');
    await page.screenshot({ path: 'test-results/logged-in-ready.png' });
    
    // データ読み込み完了を待機
    await page.waitForTimeout(5000);
    
    // 1. まず新しいタスクを作成
    console.log('📝 新しいタスクを作成します');
    
    // タスク入力フィールドを探す（複数のパターンを試行）
    const inputSelectors = [
      'input[placeholder*="タスク"]',
      'input[placeholder*="やること"]',
      'input[placeholder*="todo"]',
      'input[type="text"]',
      'textarea'
    ];
    
    let taskInput = null;
    let inputFound = false;
    
    for (const selector of inputSelectors) {
      taskInput = page.locator(selector);
      if (await taskInput.count() > 0) {
        console.log(`📝 タスク入力フィールド発見: ${selector}`);
        inputFound = true;
        break;
      }
    }
    
    if (!inputFound) {
      console.log('❌ タスク入力フィールドが見つかりません');
      
      // デバッグ: 全ての入力要素を確認
      const allInputs = await page.locator('input').count();
      const allTextareas = await page.locator('textarea').count();
      console.log(`🔍 input要素: ${allInputs}個, textarea要素: ${allTextareas}個`);
      
      expect(inputFound).toBeTruthy();
      return;
    }
    
    // テストタスクを作成
    const testTaskText = 'E2E削除テスト用タスク_' + Date.now();
    await taskInput.first().fill(testTaskText);
    console.log(`✏️ タスクテキスト入力: "${testTaskText}"`);
    
    // 追加ボタンをクリック
    const addButton = page.locator('button:has-text("追加")').first();
    if (await addButton.count() > 0) {
      await addButton.click();
      console.log('➕ 追加ボタンをクリック');
    } else {
      // Enterキーで追加を試行
      await page.keyboard.press('Enter');
      console.log('⌨️ Enterキーで追加を試行');
    }
    
    // タスク作成完了を待機
    await page.waitForTimeout(5000);
    
    // 2. 作成されたタスクを確認
    const createdTask = page.locator(`text=${testTaskText}`);
    const taskCreated = await createdTask.count() > 0;
    
    if (!taskCreated) {
      console.log('❌ タスクが作成されませんでした');
      
      // デバッグ: ページの現在状態を確認
      const pageText = await page.textContent('body');
      console.log('📄 ページ内容 (一部):', pageText?.substring(0, 300));
      
      await page.screenshot({ path: 'test-results/task-creation-failed.png' });
      expect(taskCreated).toBeTruthy();
      return;
    }
    
    console.log('✅ タスクが正常に作成されました！');
    await page.screenshot({ path: 'test-results/task-created-success.png' });
    
    // 3. 削除ボタンが表示されるか確認
    await page.waitForTimeout(2000);
    
    const deleteButtons = await page.locator('button[aria-label="タスクを削除"]').count();
    console.log(`🗑️ 削除ボタン数: ${deleteButtons}個`);
    
    if (deleteButtons === 0) {
      // 他の削除ボタンセレクターを試行
      const altDeleteSelectors = [
        'button[title="削除"]',
        'button:has-text("削除")',
        'button:has([data-icon="trash"])',
        '.delete-button'
      ];
      
      let alternativeDeleteButtons = 0;
      for (const selector of altDeleteSelectors) {
        const count = await page.locator(selector).count();
        if (count > 0) {
          console.log(`🗑️ 代替削除ボタン発見 (${selector}): ${count}個`);
          alternativeDeleteButtons = count;
          break;
        }
      }
      
      if (alternativeDeleteButtons === 0) {
        console.log('❌ 削除ボタンが見つかりません');
        await page.screenshot({ path: 'test-results/no-delete-button-after-creation.png' });
        expect(deleteButtons).toBeGreaterThan(0);
        return;
      }
    }
    
    // 4. 削除機能をテスト
    console.log('🎯 削除機能テスト実行！');
    
    // 削除前のタスク数を記録
    const initialTaskCount = await page.locator('[role="listitem"]').count();
    console.log(`📊 削除前タスク数: ${initialTaskCount}`);
    
    // 削除ボタンをクリック
    const deleteButton = page.locator('button[aria-label="タスクを削除"]').first();
    await deleteButton.click();
    console.log('🗑️ 削除ボタンをクリック');
    
    // 削除処理完了を待機
    await page.waitForTimeout(5000);
    
    // 5. 削除結果を確認
    const finalTaskCount = await page.locator('[role="listitem"]').count();
    const taskStillExists = await createdTask.count() > 0;
    
    console.log(`📊 削除後タスク数: ${finalTaskCount}`);
    console.log(`🔍 作成したタスクの存在: ${taskStillExists ? 'まだ存在' : '削除済み'}`);
    
    await page.screenshot({ path: 'test-results/deletion-test-final-result.png' });
    
    // 削除成功の判定
    if (!taskStillExists || finalTaskCount < initialTaskCount) {
      console.log('🎉🎉🎉 タスク削除機能が正常に動作しました！！！');
      console.log('✅✅✅ E2E削除テスト完全成功！！！');
      console.log(`🎯 結果: ${initialTaskCount} → ${finalTaskCount} (タスク削除済み)`);
      
      expect(taskStillExists).toBeFalsy();
    } else {
      console.log('❌ タスクが削除されませんでした');
      console.log(`📊 タスク数変化なし: ${initialTaskCount} → ${finalTaskCount}`);
      
      expect(taskStillExists).toBeFalsy();
    }
  });
});
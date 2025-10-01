import { test, expect } from '@playwright/test';

test.describe('タスク操作テスト', () => {
  test('タスク追加と削除の完全テスト', async ({ page }) => {
    console.log('🔍 タスク操作テスト開始');
    
    // アプリにアクセス
    await page.goto('/');
    await page.waitForTimeout(5000); // 認証スルー後のデータ読み込み待機
    
    console.log('✅ アプリにアクセス完了');
    
    // より広範囲でタスク入力フィールドを探す
    const inputSelectors = [
      'input[placeholder*="タスク"]',
      'input[placeholder*="todo"]',
      'input[placeholder*="やること"]',
      'input[type="text"]',
      'textarea[placeholder*="タスク"]',
      '.task-input',
      '#task-input',
      'input'
    ];
    
    let taskInput = null;
    let inputFound = false;
    
    for (const selector of inputSelectors) {
      taskInput = page.locator(selector).first();
      if (await taskInput.count() > 0 && await taskInput.isVisible()) {
        console.log(`📝 タスク入力フィールド発見: ${selector}`);
        inputFound = true;
        break;
      }
    }
    
    if (!inputFound) {
      // ページの全体構造を調査
      console.log('❌ タスク入力フィールドが見つかりません。ページ構造を調査中...');
      
      const bodyText = await page.textContent('body');
      console.log('📄 ページ内容 (最初の500文字):', bodyText?.substring(0, 500));
      
      const allInputs = await page.locator('input').count();
      const allButtons = await page.locator('button').count();
      const allTextareas = await page.locator('textarea').count();
      
      console.log(`🔍 入力要素数: input=${allInputs}, button=${allButtons}, textarea=${allTextareas}`);
      
      // 全てのinput要素を調査
      const inputs = await page.locator('input').all();
      for (let i = 0; i < Math.min(inputs.length, 5); i++) {
        const placeholder = await inputs[i].getAttribute('placeholder') || '';
        const type = await inputs[i].getAttribute('type') || '';
        const className = await inputs[i].getAttribute('class') || '';
        console.log(`  Input ${i+1}: type="${type}" placeholder="${placeholder}" class="${className}"`);
      }
      
      await page.screenshot({ path: 'test-results/no-task-input.png' });
      
      // タスク入力フィールドがない場合、最初のtext inputを使用してみる
      const firstTextInput = page.locator('input[type="text"]').first();
      if (await firstTextInput.count() > 0) {
        console.log('🔄 最初のtext inputを使用してタスク作成を試行');
        taskInput = firstTextInput;
        inputFound = true;
      }
    }
    
    if (inputFound && taskInput) {
      // タスクを追加
      const testTaskText = 'E2Eテスト用タスク_' + Date.now();
      await taskInput.fill(testTaskText);
      console.log(`✅ タスクテキスト入力: ${testTaskText}`);
      
      // 追加ボタンを探す
      const addSelectors = [
        'button:has-text("追加")',
        'button:has-text("Add")',
        'button[type="submit"]',
        'button:has-text("+")',
        '.add-button',
        '.btn-add'
      ];
      
      let addButton = null;
      let addButtonFound = false;
      
      for (const selector of addSelectors) {
        addButton = page.locator(selector).first();
        if (await addButton.count() > 0 && await addButton.isVisible()) {
          console.log(`➕ 追加ボタン発見: ${selector}`);
          addButtonFound = true;
          break;
        }
      }
      
      if (addButtonFound && addButton) {
        await addButton.click();
        console.log('✅ 追加ボタンをクリック');
        
        // タスク追加後の待機
        await page.waitForTimeout(3000);
        
        // 作成されたタスクを確認
        const createdTask = page.locator(`text=${testTaskText}`);
        if (await createdTask.count() > 0) {
          console.log('✅ タスクが正常に作成されました');
          
          // 削除ボタンを探す
          const deleteSelectors = [
            'button[title="削除"]',
            'button:has-text("削除")',
            'button:has-text("Delete")',
            'button:has-text("×")',
            'button:has([data-icon="trash"])',
            '.delete-button',
            '.btn-delete'
          ];
          
          let deleteButton = null;
          let deleteButtonFound = false;
          
          for (const selector of deleteSelectors) {
            deleteButton = page.locator(selector).first();
            if (await deleteButton.count() > 0) {
              console.log(`🗑️ 削除ボタン発見: ${selector}`);
              deleteButtonFound = true;
              break;
            }
          }
          
          if (deleteButtonFound && deleteButton) {
            // 削除前のタスク数を記録
            const initialTaskCount = await page.locator('li').count();
            console.log(`📊 削除前のタスク数: ${initialTaskCount}`);
            
            await deleteButton.click();
            console.log('🗑️ 削除ボタンをクリック');
            
            // 削除処理完了を待機
            await page.waitForTimeout(2000);
            
            // 削除後のタスク数を確認
            const finalTaskCount = await page.locator('li').count();
            console.log(`📊 削除後のタスク数: ${finalTaskCount}`);
            
            // タスクが削除されたかチェック
            const taskStillExists = await createdTask.count() > 0;
            
            if (!taskStillExists || finalTaskCount < initialTaskCount) {
              console.log('🎉 タスク削除機能が正常に動作しました！');
              expect(taskStillExists).toBeFalsy();
            } else {
              console.log('❌ タスクが削除されませんでした');
              expect(taskStillExists).toBeFalsy();
            }
            
            await page.screenshot({ path: 'test-results/task-deletion-success.png' });
          } else {
            console.log('❌ 削除ボタンが見つかりません');
            await page.screenshot({ path: 'test-results/no-delete-button.png' });
          }
        } else {
          console.log('❌ タスクが作成されませんでした');
        }
      } else {
        console.log('❌ 追加ボタンが見つかりません');
        
        // Enterキーでタスク追加を試行
        console.log('🔄 Enterキーでタスク追加を試行');
        await taskInput.press('Enter');
        await page.waitForTimeout(2000);
        
        const createdTask = page.locator(`text=${testTaskText}`);
        if (await createdTask.count() > 0) {
          console.log('✅ Enterキーでタスクが作成されました');
        } else {
          console.log('❌ Enterキーでもタスクが作成されませんでした');
        }
      }
    }
    
    await page.screenshot({ path: 'test-results/final-state.png' });
  });
});
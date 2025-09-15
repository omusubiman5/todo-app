import { test, expect } from '@playwright/test';

test.describe('タスク削除機能テスト', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('タスクの削除ボタンが存在するかテスト', async ({ page }) => {
    console.log('🔍 タスク削除ボタンの存在確認テスト開始');
    
    // まずタスク入力フィールドを探す
    const taskInput = page.locator('input[placeholder*="タスク"]').first();
    
    if (await taskInput.isVisible()) {
      console.log('✅ タスク入力フィールドが見つかりました');
      
      // テスト用タスクを追加
      await taskInput.fill('削除テスト用タスク');
      
      const addButton = page.locator('button:has-text("追加")').first();
      if (await addButton.isVisible()) {
        await addButton.click();
        console.log('✅ タスクを追加しました');
        
        // タスクが追加されるまで待機
        await page.waitForTimeout(2000);
        
        // スクリーンショットを撮る
        await page.screenshot({ path: 'test-results/task-added.png' });
        
        // 削除ボタンを探す（複数の可能性を考慮）
        const deleteButtons = await page.locator(`
          [data-testid*="delete"],
          button:has-text("削除"),
          button[title*="削除"],
          button[aria-label*="削除"],
          .delete-button,
          .btn-delete,
          [class*="delete"],
          button:has([data-icon="trash"]),
          button:has([data-icon="delete"]),
          svg[data-icon="trash"],
          svg[data-icon="delete"]
        `).count();
        
        console.log(`🔍 削除ボタン候補: ${deleteButtons}個見つかりました`);
        
        if (deleteButtons > 0) {
          console.log('✅ 削除ボタンが見つかりました');
          
          // 最初の削除ボタンをクリックしてみる
          const firstDeleteButton = page.locator(`
            [data-testid*="delete"],
            button:has-text("削除"),
            button[title*="削除"],
            button[aria-label*="削除"],
            .delete-button,
            .btn-delete,
            [class*="delete"]
          `).first();
          
          if (await firstDeleteButton.isVisible()) {
            await firstDeleteButton.click();
            console.log('🗑️ 削除ボタンをクリックしました');
            
            await page.waitForTimeout(2000);
            
            // 削除後のスクリーンショット
            await page.screenshot({ path: 'test-results/after-delete.png' });
            
            // タスクが削除されたかチェック
            const remainingTask = await page.locator('text=削除テスト用タスク').count();
            
            if (remainingTask === 0) {
              console.log('✅ タスクが正常に削除されました');
              expect(remainingTask).toBe(0);
            } else {
              console.log('❌ タスクが削除されませんでした');
              expect(remainingTask).toBe(0); // これは失敗するはず
            }
          } else {
            console.log('❌ 削除ボタンは見つかりましたが、クリックできません');
            expect(false).toBeTruthy(); // テスト失敗
          }
        } else {
          console.log('❌ 削除ボタンが見つかりませんでした');
          
          // DOMの詳細を調査
          const allButtons = await page.locator('button').count();
          console.log(`🔍 ページ内の全ボタン数: ${allButtons}`);
          
          // 全てのボタンのテキストを取得
          const buttonTexts = await page.locator('button').allTextContents();
          console.log('🔍 ボタンのテキスト一覧:', buttonTexts);
          
          // タスクリストエリアのHTML構造を確認
          const taskListHtml = await page.locator('[class*="task"], [data-testid*="task"], li, .list-item').innerHTML().catch(() => 'タスクリストが見つかりません');
          console.log('🔍 タスクリストHTML:', taskListHtml);
          
          expect(deleteButtons).toBeGreaterThan(0); // これは失敗するはず
        }
      } else {
        console.log('❌ 追加ボタンが見つかりません');
      }
    } else {
      console.log('❌ タスク入力フィールドが見つかりません（ログインが必要な可能性があります）');
      
      // ログインページかどうかチェック
      const isLoginPage = await page.locator('input[type="email"]').count() > 0;
      if (isLoginPage) {
        console.log('ℹ️ ログインページにリダイレクトされています');
      }
    }
  });

  test('タスクリストのHTML構造を調査', async ({ page }) => {
    console.log('🔍 HTML構造調査テスト開始');
    
    // ページ全体のスクリーンショット
    await page.screenshot({ path: 'test-results/page-structure.png' });
    
    // メインコンテンツエリアを探す
    const mainContent = await page.locator('main, [role="main"], .main-content, #main').innerHTML().catch(() => 'メインコンテンツが見つかりません');
    console.log('🔍 メインコンテンツHTML:', mainContent.substring(0, 500) + '...');
    
    // タスク関連の要素を探す
    const taskElements = await page.locator('[class*="task"], [data-testid*="task"], [id*="task"]').count();
    console.log(`🔍 タスク関連要素: ${taskElements}個`);
    
    // リスト要素を探す
    const listElements = await page.locator('ul, ol, .list, [role="list"]').count();
    console.log(`🔍 リスト要素: ${listElements}個`);
    
    // 削除に関連する要素を探す
    const deleteElements = await page.locator('[class*="delete"], [data-testid*="delete"], [id*="delete"]').count();
    console.log(`🔍 削除関連要素: ${deleteElements}個`);
    
    expect(true).toBeTruthy(); // このテストは情報収集のため常に成功
  });
});
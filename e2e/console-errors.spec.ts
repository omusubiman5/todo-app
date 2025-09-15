import { test, expect } from '@playwright/test';

test.describe('コンソールエラー確認', () => {
  test('ページ読み込み時のエラーを確認', async ({ page }) => {
    const consoleMessages: string[] = [];
    const networkErrors: string[] = [];
    
    // コンソールメッセージをキャプチャ
    page.on('console', (msg) => {
      const text = `[${msg.type()}] ${msg.text()}`;
      consoleMessages.push(text);
      console.log(`🔍 Console: ${text}`);
    });
    
    // ネットワークエラーをキャプチャ
    page.on('response', (response) => {
      if (!response.ok()) {
        const error = `${response.status()} ${response.url()}`;
        networkErrors.push(error);
        console.log(`🌐 Network Error: ${error}`);
      }
    });
    
    // ページアクセス
    console.log('🔍 ページアクセス開始');
    await page.goto('/');
    
    // 10秒待機してデータ読み込みを待つ
    console.log('⏳ データ読み込み待機中（10秒）...');
    await page.waitForTimeout(10000);
    
    // ページ内容を確認
    const pageText = await page.textContent('body');
    console.log('📄 ページ内容:', pageText?.substring(0, 200));
    
    // 読み込み中状態かチェック
    const isLoading = pageText?.includes('読み込み中');
    console.log(`🔄 読み込み中状態: ${isLoading}`);
    
    // エラー状況を出力
    console.log(`\n📊 エラーサマリー:`);
    console.log(`- コンソールメッセージ: ${consoleMessages.length}個`);
    console.log(`- ネットワークエラー: ${networkErrors.length}個`);
    
    if (consoleMessages.length > 0) {
      console.log('\n📝 コンソールメッセージ詳細:');
      consoleMessages.forEach((msg, index) => {
        console.log(`  ${index + 1}. ${msg}`);
      });
    }
    
    if (networkErrors.length > 0) {
      console.log('\n🌐 ネットワークエラー詳細:');
      networkErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    // スクリーンショット
    await page.screenshot({ path: 'test-results/console-errors-check.png' });
    
    // 読み込み完了まで追加で待機
    if (isLoading) {
      console.log('🔄 読み込み完了まで追加待機（15秒）...');
      await page.waitForTimeout(15000);
      
      const finalPageText = await page.textContent('body');
      const stillLoading = finalPageText?.includes('読み込み中');
      console.log(`🔄 最終的な読み込み状態: ${stillLoading ? '未完了' : '完了'}`);
      
      if (!stillLoading) {
        console.log('✅ 読み込み完了！タスク要素を再確認');
        const taskInputs = await page.locator('input').count();
        const addButtons = await page.locator('button:has-text("追加")').count();
        const deleteButtons = await page.locator('button[title="削除"]').count();
        
        console.log(`📝 タスク入力: ${taskInputs}個`);
        console.log(`➕ 追加ボタン: ${addButtons}個`);
        console.log(`🗑️ 削除ボタン: ${deleteButtons}個`);
      }
    }
  });
});
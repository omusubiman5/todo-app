const { test, expect } = require('@playwright/test');

test('タスクボックスの透明度とチェックボックス状態の一致を確認', async ({ page }) => {
  console.log('🚀 テスト開始: タスクボックス透明度の確認');
  
  // ログインページに移動
  await page.goto('http://localhost:3000/login');
  
  console.log('🔐 ログイン処理開始');
  // メールとパスワードを入力してログイン
  await page.fill('input[type="email"]', 'omusubiman@gmail.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  // ホームページに移動するまで待機
  await page.waitForURL('**/home', { timeout: 10000 });
  console.log('✅ ログイン完了');
  
  // タスク一覧の読み込み完了を待機
  await page.waitForTimeout(2000);
  
  // 既存のタスクを確認
  const taskCards = page.locator('.group.rounded-2xl');
  const taskCount = await taskCards.count();
  console.log(`🔍 既存タスク数: ${taskCount}`);
  
  if (taskCount > 0) {
    // 各タスクについて透明度とチェックボックス状態を確認
    for (let i = 0; i < Math.min(5, taskCount); i++) {
      const taskCard = taskCards.nth(i);
      const checkbox = taskCard.locator('input[type="checkbox"]');
      
      // チェックボックスの状態を取得
      const isChecked = await checkbox.isChecked();
      
      // タスクカードのclass属性を取得
      const cardClasses = await taskCard.getAttribute('class');
      
      // opacity-60が含まれているかチェック
      const hasOpacity60 = cardClasses.includes('opacity-60');
      
      console.log(`📋 タスク ${i + 1}:`);
      console.log(`  - チェックボックス: ${isChecked ? 'チェック済み' : '未チェック'}`);
      console.log(`  - opacity-60: ${hasOpacity60 ? 'あり' : 'なし'}`);
      console.log(`  - クラス: ${cardClasses}`);
      
      // 期待値と実際の値が一致するかテスト
      if (isChecked && !hasOpacity60) {
        console.error(`❌ バグ発見: チェック済みなのにopacity-60がない`);
      } else if (!isChecked && hasOpacity60) {
        console.error(`❌ バグ発見: 未チェックなのにopacity-60がある`);
      } else {
        console.log(`✅ 正常: チェック状態と透明度が一致`);
      }
    }
    
    // 最初のタスクでチェック状態を切り替えてテスト
    if (taskCount > 0) {
      console.log('🔄 チェック状態切り替えテスト');
      const firstTask = taskCards.nth(0);
      const firstCheckbox = firstTask.locator('input[type="checkbox"]');
      
      // 初期状態を記録
      const initialChecked = await firstCheckbox.isChecked();
      console.log(`初期状態: ${initialChecked ? 'チェック済み' : '未チェック'}`);
      
      // チェック状態を切り替え
      await firstCheckbox.click();
      await page.waitForTimeout(1000);
      
      // 切り替え後の状態を確認
      const afterChecked = await firstCheckbox.isChecked();
      const afterClasses = await firstTask.getAttribute('class');
      const afterHasOpacity = afterClasses.includes('opacity-60');
      
      console.log(`切り替え後: ${afterChecked ? 'チェック済み' : '未チェック'}`);
      console.log(`切り替え後のopacity-60: ${afterHasOpacity ? 'あり' : 'なし'}`);
      
      // 状態の一致をテスト
      expect(afterChecked).toBe(afterHasOpacity);
      
      if (afterChecked === afterHasOpacity) {
        console.log('✅ チェック切り替え後も状態が一致している');
      } else {
        console.error('❌ チェック切り替え後に状態が不一致');
      }
    }
  } else {
    console.log('⚠️ テスト用のタスクがありません');
  }
});
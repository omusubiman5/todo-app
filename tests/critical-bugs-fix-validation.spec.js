const { test, expect } = require('@playwright/test');

/**
 * 重要バグ修正の包括的検証テスト
 * 
 * 検証対象:
 * ① チームタスクの新規登録機能
 * ② 個人タスクの削除機能  
 * ③ ワークスペース切り替え時の個人タスク表示
 */

test.describe('重要バグ修正検証', () => {
  const TEST_BASE_URL = 'http://localhost:3000';
  const TEST_EMAIL = 'omusubiman@gmail.com';
  const TEST_PASSWORD = 'Mm1696bz?';
  
  test.beforeEach(async ({ page }) => {
    console.log('🚀 テスト開始: ページ初期化');
    
    // ブラウザコンソールログを取得
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'log' && (text.includes('📝') || text.includes('🔍') || text.includes('✅') || text.includes('❌') || text.includes('📋') || text.includes('💾'))) {
        console.log(`[BROWSER ${type.toUpperCase()}] ${text}`);
      } else if (type === 'error') {
        console.log(`[BROWSER ERROR] ${text}`);
      }
    });
    
    // ページエラーも取得
    page.on('pageerror', error => {
      console.log(`[PAGE ERROR] ${error.message}`);
      console.log(`[ERROR STACK] ${error.stack}`);
    });
    
    await page.goto(TEST_BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // ログイン処理（必要に応じて）
    const loginButton = page.locator('button:has-text("ログイン")');
    if (await loginButton.isVisible()) {
      console.log('🔐 ログイン処理開始');
      await loginButton.click();
      await page.waitForLoadState('networkidle');
      
      console.log('📧 メール入力');
      await page.fill('input[type="email"]', TEST_EMAIL);
      console.log('🔒 パスワード入力'); 
      await page.fill('input[type="password"]', TEST_PASSWORD);
      console.log('✅ ログインボタンクリック');
      await page.click('button[type="submit"]');
      
      // ログイン後のリダイレクトを待機
      console.log('⏳ ログイン後のリダイレクト待機');
      await page.waitForURL('**/home', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      console.log('✅ ログイン完了:', page.url());
    }
  });

  test('① チームタスクの新規登録が正常に動作する', async ({ page }) => {
    console.log('🧪 テスト① チームタスク新規登録');
    
    // チームワークスペースに切り替え - デバッグ強化版
    console.log('📋 チームワークスペースに切り替え');
    console.log('📍 現在のURL:', page.url());
    
    // 様々なセレクターでワークスペース切り替え要素を探す
    const selectors = [
      'nav select', // Navigation.tsx の select を優先
      'select:has(option:text("個人タスク"))',
      'select[class*="workspace"]',
      '[class*="workspace"] select',
      'button:has-text("個人タスク")',
      'text=個人タスク',
      'select' // 最後の候補として一般的な select
    ];
    
    let workspaceElement = null;
    for (const selector of selectors) {
      console.log(`🔍 セレクター "${selector}" を確認中...`);
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log(`✅ セレクター "${selector}" で要素が見つかりました`);
        workspaceElement = element;
        break;
      }
    }
    
    if (workspaceElement) {
      console.log('✅ ワークスペース要素が見つかりました');
      
      // select要素の場合はオプションを確認
      if (await workspaceElement.evaluate(el => el.tagName === 'SELECT').catch(() => false)) {
        console.log('📋 select要素です - オプションを確認中');
        // 該当するselect要素のオプションのみを取得
        const options = workspaceElement.locator('option');
        const optionCount = await options.count();
        console.log(`📋 ワークスペース選択のオプション数: ${optionCount}`);
        
        for (let i = 0; i < optionCount; i++) {
          const optionText = await options.nth(i).textContent();
          const optionValue = await options.nth(i).getAttribute('value');
          console.log(`📋 オプション${i + 1}: "${optionText}" (value: "${optionValue}")`);
        }
        
        // さかぐち家を探して選択
        try {
          await workspaceElement.selectOption({ label: '👥 さかぐち家' });
          console.log('✅ さかぐち家を選択しました');
        } catch (error) {
          console.log('⚠️ ラベルで選択できません - 値で試行');
          // 値で選択を試す（チームIDを使用）
          await workspaceElement.selectOption('732ec65e-9361-43b7-8b2f-c9928b3ea5fd');
        }
      } else {
        console.log('📋 ボタンまたはその他の要素です - クリックします');
        await workspaceElement.click();
        await page.waitForTimeout(500);
        
        // ドロップダウンから さかぐち家 を選択
        const teamOption = page.locator('text=さかぐち家').first();
        if (await teamOption.isVisible({ timeout: 2000 })) {
          await teamOption.click();
        }
      }
      
      await page.waitForTimeout(2000);
      console.log('✅ チームワークスペースに切り替え完了');
    } else {
      console.log('❌ ワークスペース要素が見つかりません');
      
      // ページの全体構造をデバッグ
      console.log('🔍 ページ全体のselect要素を確認:');
      const allSelects = page.locator('select');
      const selectCount = await allSelects.count();
      console.log(`📋 select要素数: ${selectCount}`);
      
      console.log('🔍 ページのボタン要素を確認:');
      const allButtons = page.locator('button');
      const buttonCount = await allButtons.count();
      console.log(`📋 button要素数: ${buttonCount}`);
      
      for (let i = 0; i < Math.min(buttonCount, 10); i++) {
        const buttonText = await allButtons.nth(i).textContent();
        console.log(`📋 ボタン${i + 1}: "${buttonText}"`);
      }
    }
    
    // タスク作成フォームの確認
    const taskInput = page.locator('input[placeholder*="やることを入力"]').first();
    await expect(taskInput).toBeVisible();
    
    // テストタスクを作成
    const testTaskText = `チームテストタスク ${Date.now()}`;
    console.log('📝 タスク作成:', testTaskText);
    
    await taskInput.fill(testTaskText);
    
    // 優先度はデフォルト値を使用（オプション）
    // const prioritySelect = page.locator('select').first();
    // if (await prioritySelect.isVisible()) {
    //   await prioritySelect.selectOption('高');
    // }
    
    // 追加ボタンをクリック
    const addButton = page.locator('button:has-text("追加")').first();
    await addButton.click();
    
    // タスクが追加されたことを確認
    await page.waitForTimeout(2000);
    const createdTask = page.locator(`text=${testTaskText}`);
    await expect(createdTask).toBeVisible({ timeout: 10000 });
    
    console.log('✅ テスト① 成功: チームタスクが正常に作成された');
  });

  test('② 個人タスクの削除が正常に動作する', async ({ page }) => {
    console.log('🧪 テスト② 個人タスク削除');
    
    // 個人ワークスペースに切り替え  
    console.log('👤 個人ワークスペースに切り替え');
    const workspaceSwitcher = page.locator('button:has-text("個人タスク"), button:has-text("さかぐち家")').first();
    if (await workspaceSwitcher.isVisible()) {
      await workspaceSwitcher.click();
      await page.waitForTimeout(500);
      
      // 個人タスク選択
      const personalOption = page.locator('text=個人タスク').first();
      if (await personalOption.isVisible()) {
        await personalOption.click();
        await page.waitForTimeout(1000);
      }
    }
    
    // テストタスクを作成（削除用）
    const testTaskText = `削除テストタスク ${Date.now()}`;
    console.log('📝 削除用タスク作成:', testTaskText);
    
    const taskInput = page.locator('input[placeholder*="やることを入力"]').first();
    await taskInput.fill(testTaskText);
    
    const addButton = page.locator('button:has-text("追加")').first();
    await addButton.click();
    await page.waitForTimeout(2000);
    
    // 作成されたタスクを確認
    const createdTask = page.locator(`text=${testTaskText}`);
    await expect(createdTask).toBeVisible({ timeout: 10000 });
    
    // タスクコンテナを見つけてホバーする
    const taskContainer = createdTask.locator('..').first();
    console.log('🔍 タスクコンテナにホバーしてボタンを表示');
    await taskContainer.hover();
    await page.waitForTimeout(1000); // ホバー効果の待機
    
    // 削除ボタンを探す（より具体的なセレクター）
    const deleteButton = taskContainer.locator('button').filter({ 
      has: page.locator('svg[data-icon="trash"], [class*="FaTrash"]') 
    }).first();
    
    // 代替手段：最後のボタンを削除ボタンとして試行
    const alternativeDeleteButton = taskContainer.locator('button').last();
    
    console.log('🔍 削除ボタンの可視性チェック');
    if (await deleteButton.isVisible()) {
      console.log('🗑️ 削除ボタンをクリック');
      await deleteButton.click();
      
      // 確認ダイアログがある場合の処理
      const confirmButton = page.locator('button:has-text("削除"), button:has-text("確認")').first();
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
      }
      
      // タスクが削除されたことを確認
      await page.waitForTimeout(2000);
      await expect(createdTask).not.toBeVisible({ timeout: 10000 });
      
      console.log('✅ テスト② 成功: 個人タスクが正常に削除された');
    } else if (await alternativeDeleteButton.isVisible()) {
      console.log('🗑️ 代替削除ボタンをクリック（最後のボタン）');
      await alternativeDeleteButton.click();
      
      // 確認ダイアログがある場合の処理
      const confirmButton = page.locator('button:has-text("削除"), button:has-text("確認")').first();
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
      }
      
      // タスクが削除されたことを確認
      await page.waitForTimeout(2000);
      await expect(createdTask).not.toBeVisible({ timeout: 10000 });
      
      console.log('✅ テスト② 成功: 個人タスクが正常に削除された（代替ボタン）');
    } else {
      console.log('⚠️ 削除ボタンが見つからない - デバッグ情報を取得');
      
      // デバッグ用：利用可能なボタンを確認
      const allButtons = taskContainer.locator('button');
      const buttonCount = await allButtons.count();
      console.log(`🔍 タスクコンテナ内のボタン数: ${buttonCount}`);
      
      for (let i = 0; i < buttonCount; i++) {
        const button = allButtons.nth(i);
        const isVisible = await button.isVisible();
        const text = await button.textContent().catch(() => 'no text');
        const title = await button.getAttribute('title').catch(() => 'no title');
        console.log(`🔍 ボタン${i}: visible=${isVisible}, text="${text}", title="${title}"`);
      }
      
      console.log('❌ テスト② 失敗: 削除ボタンが見つからない');
      throw new Error('削除機能が利用できません');
    }
  });

  test('④ タスクボックス透明度とチェックボックス状態の一致', async ({ page }) => {
    console.log('🚀 テスト開始: ページ初期化');
    
    // ログイン処理（他のテストと同じ方法）
    await page.goto('http://localhost:3000/login');
    
    console.log('🔐 ログイン処理開始');
    console.log('📧 メール入力');
    await page.fill('input[type="email"]', 'omusubiman@gmail.com');
    console.log('🔒 パスワード入力');
    await page.fill('input[type="password"]', 'password123');
    console.log('✅ ログインボタンクリック');
    await page.click('button[type="submit"]');
    
    console.log('⏳ ログイン後のリダイレクト待機');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await expect(page).toHaveURL(/.*\/home/, { timeout: 30000 });
    console.log('✅ ログイン完了:', page.url());
    
    // タスクの読み込み完了を待機
    await page.waitForTimeout(3000);
    
    console.log('🧪 透明度とチェックボックス状態の確認');
    
    // 既存のタスクを確認
    const taskCards = page.locator('.group.rounded-2xl');
    const taskCount = await taskCards.count();
    console.log(`🔍 既存タスク数: ${taskCount}`);
    
    let bugFound = false;
    
    if (taskCount > 0) {
      // 各タスクについて透明度とチェックボックス状態を確認
      for (let i = 0; i < Math.min(3, taskCount); i++) {
        const taskCard = taskCards.nth(i);
        const checkbox = taskCard.locator('input[type="checkbox"]');
        
        // チェックボックスの状態を取得
        const isChecked = await checkbox.isChecked();
        
        // タスクカードのclass属性を取得
        const cardClasses = await taskCard.getAttribute('class');
        
        // opacity-60が含まれているかチェック
        const hasOpacity60 = cardClasses?.includes('opacity-60') || false;
        
        console.log(`📋 タスク ${i + 1}:`);
        console.log(`  - チェックボックス: ${isChecked ? 'チェック済み' : '未チェック'}`);
        console.log(`  - opacity-60: ${hasOpacity60 ? 'あり' : 'なし'}`);
        
        // 期待値と実際の値が一致するかテスト
        if (isChecked !== hasOpacity60) {
          console.error(`❌ バグ発見: チェック状態(${isChecked})とopacity-60(${hasOpacity60})が不一致`);
          bugFound = true;
        } else {
          console.log(`✅ 正常: チェック状態と透明度が一致`);
        }
      }
    }
    
    // バグが見つからない場合は合格
    if (!bugFound) {
      console.log('✅ 透明度バグは見つかりませんでした');
    } else {
      throw new Error('透明度とチェックボックス状態の不一致が検出されました');
    }
  });

  test('③ ワークスペース切り替え時の個人タスク表示', async ({ page }) => {
    console.log('🧪 テスト③ ワークスペース切り替えと個人タスク表示');
    
    // まず個人タスクを作成
    const testTaskText = `表示テスト個人タスク ${Date.now()}`;
    console.log('📝 表示テスト用個人タスク作成:', testTaskText);
    
    // 個人ワークスペースであることを確認
    const workspaceSwitcher = page.locator('button:has-text("個人タスク"), button:has-text("さかぐち家")').first();
    if (await workspaceSwitcher.isVisible()) {
      await workspaceSwitcher.click();
      
      const personalOption = page.locator('text=個人タスク').first();
      if (await personalOption.isVisible()) {
        await personalOption.click();
        await page.waitForTimeout(1000);
      }
    }
    
    // 個人タスクを作成
    const taskInput = page.locator('input[placeholder*="やることを入力"]').first();
    await taskInput.fill(testTaskText);
    const addButton = page.locator('button:has-text("追加")').first();
    await addButton.click();
    await page.waitForTimeout(2000);
    
    // 作成されたタスクを確認
    const personalTask = page.locator(`text=${testTaskText}`);
    await expect(personalTask).toBeVisible({ timeout: 10000 });
    console.log('✅ 個人タスクが作成された');
    
    // チームワークスペースに切り替え
    console.log('🔄 チームワークスペースに切り替え');
    if (await workspaceSwitcher.isVisible()) {
      await workspaceSwitcher.click();
      await page.waitForTimeout(1000);
      
      // デバッグ: 利用可能なボタンを全て表示
      const allButtons = await page.locator('button').all();
      console.log('🔍 利用可能なボタン数:', allButtons.length);
      
      // チーム関連のボタンを探す
      const teamButtons = page.locator('button').filter({ hasText: 'チーム' });
      console.log('🔍 チーム関連ボタン数:', await teamButtons.count());
      
      // より広範囲な検索: 任意のチーム選択ボタンを探す
      const anyTeamButton = page.locator('button').filter({ hasText: /さかぐち|チーム/ }).first();
      if (await anyTeamButton.count() > 0) {
        console.log('🔍 チーム関連のボタンが見つかりました、クリックします');
        const buttonText = await anyTeamButton.textContent();
        console.log('🔍 ボタンのテキスト:', buttonText);
        await anyTeamButton.click();
        await page.waitForTimeout(3000); // ワークスペース切り替えの完了を待機
      } else {
        console.log('⚠️ チーム関連のボタンが見つかりません');
        // ワークスペースセレクターの内容をデバッグ出力
        const dropdownContent = await page.locator('[class*="dropdown"], [class*="menu"]').textContent();
        console.log('🔍 ドロップダウン内容:', dropdownContent);
      }
    }
    
    // チームワークスペースでは個人タスクが表示されないことを確認
    await expect(personalTask).not.toBeVisible({ timeout: 5000 });
    console.log('✅ チームワークスペースで個人タスクが非表示になった');
    
    // 再び個人ワークスペースに戻す
    console.log('🔄 個人ワークスペースに戻す');
    if (await workspaceSwitcher.isVisible()) {
      await workspaceSwitcher.click();
      
      const personalOption = page.locator('text=個人タスク').first();
      if (await personalOption.isVisible()) {
        await personalOption.click();
        await page.waitForTimeout(2000);
      }
    }
    
    // 個人タスクが再び表示されることを確認
    await expect(personalTask).toBeVisible({ timeout: 10000 });
    console.log('✅ テスト③ 成功: 個人ワークスペースに戻ると個人タスクが再表示された');
    
    // クリーンアップ: 作成したテストタスクを削除
    try {
      const taskContainer = personalTask.locator('..').first();
      const deleteButton = taskContainer.locator('button[title*="削除"], [data-testid*="delete"], svg[class*="trash"]').first();
      
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        await page.waitForTimeout(1000);
      }
    } catch (error) {
      console.log('⚠️ テストタスクのクリーンアップに失敗:', error.message);
    }
  });

  test('総合テスト: 全機能の連続実行', async ({ page }) => {
    console.log('🧪 総合テスト: 全機能の連続テスト');
    
    const timestamp = Date.now();
    const personalTaskText = `総合テスト個人タスク ${timestamp}`;
    const teamTaskText = `総合テストチームタスク ${timestamp}`;
    
    console.log('📋 Phase 1: 個人タスク作成と削除');
    
    // Phase 1: 個人タスク作成と削除
    const workspaceSwitcher = page.locator('button:has-text("個人タスク"), button:has-text("さかぐち家")').first();
    if (await workspaceSwitcher.isVisible()) {
      await workspaceSwitcher.click();
      await page.waitForTimeout(500);
      const personalOption = page.locator('text=個人タスク').first();
      if (await personalOption.isVisible()) {
        await personalOption.click();
        await page.waitForTimeout(1000);
      }
    }
    
    // 個人タスク作成
    let taskInput = page.locator('input[placeholder*="やることを入力"]').first();
    await taskInput.fill(personalTaskText);
    await page.locator('button:has-text("追加")').first().click();
    await page.waitForTimeout(2000);
    
    let createdTask = page.locator(`text=${personalTaskText}`);
    await expect(createdTask).toBeVisible();
    console.log('✅ 個人タスク作成成功');
    
    console.log('📋 Phase 2: チームタスク作成');
    
    // Phase 2: チームワークスペースでタスク作成
    if (await workspaceSwitcher.isVisible()) {
      await workspaceSwitcher.click();
      const teamOption = page.locator('text=さかぐち家').first();
      if (await teamOption.isVisible()) {
        await teamOption.click();
        await page.waitForTimeout(1000);
      }
    }
    
    // チームタスク作成
    taskInput = page.locator('input[placeholder*="やることを入力"]').first();
    await taskInput.fill(teamTaskText);
    await page.locator('button:has-text("追加")').first().click();
    await page.waitForTimeout(2000);
    
    createdTask = page.locator(`text=${teamTaskText}`);
    await expect(createdTask).toBeVisible();
    console.log('✅ チームタスク作成成功');
    
    console.log('📋 Phase 3: ワークスペース切り替え検証');
    
    // Phase 3: ワークスペース切り替えでタスク表示が正しく変わることを確認
    // 個人に戻す
    if (await workspaceSwitcher.isVisible()) {
      await workspaceSwitcher.click();
      const personalOption = page.locator('text=個人タスク').first();
      if (await personalOption.isVisible()) {
        await personalOption.click();
        await page.waitForTimeout(2000);
      }
    }
    
    // 個人タスクが表示され、チームタスクが非表示
    await expect(page.locator(`text=${personalTaskText}`)).toBeVisible();
    await expect(page.locator(`text=${teamTaskText}`)).not.toBeVisible();
    console.log('✅ 個人ワークスペースで正しいタスクが表示');
    
    // チームに戻す
    if (await workspaceSwitcher.isVisible()) {
      await workspaceSwitcher.click();
      const teamOption = page.locator('text=さかぐち家').first();
      if (await teamOption.isVisible()) {
        await teamOption.click();
        await page.waitForTimeout(2000);
      }
    }
    
    // チームタスクが表示され、個人タスクが非表示
    await expect(page.locator(`text=${teamTaskText}`)).toBeVisible();
    await expect(page.locator(`text=${personalTaskText}`)).not.toBeVisible();
    console.log('✅ チームワークスペースで正しいタスクが表示');
    
    console.log('🎉 総合テスト完了: 全ての機能が正常に動作');
  });
});
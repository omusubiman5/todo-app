const { chromium } = require('playwright');

async function testTodoApp() {
  console.log('🚀 Starting todo app test...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to the home page
    console.log('📍 Navigating to http://localhost:3007/home');
    await page.goto('http://localhost:3007/home', { waitUntil: 'networkidle' });
    
    // Wait a bit for React to initialize
    await page.waitForTimeout(2000);
    
    // Take initial screenshot
    await page.screenshot({ path: 'initial-load.png', fullPage: true });
    console.log('📸 Initial screenshot taken');
    
    // Check if loading spinner is present
    const loadingSpinner = await page.locator('text=読み込み中').count();
    console.log(`🔄 Loading spinner count: ${loadingSpinner}`);
    
    // Check if tasks are visible
    const taskElements = await page.locator('[data-testid*="task"], .task-item, .todo-item').count();
    console.log(`📋 Task elements found: ${taskElements}`);
    
    // Look for any task-related content
    const taskContent = await page.textContent('body');
    const hasTaskContent = taskContent.includes('task') || taskContent.includes('todo') || taskContent.includes('タスク');
    console.log(`📝 Has task content: ${hasTaskContent}`);
    
    // Check for error messages
    const errorMessages = await page.locator('text=/error|エラー|failed|失敗/i').count();
    console.log(`❌ Error messages: ${errorMessages}`);
    
    // Try to find add task button or input
    const addTaskButton = await page.locator('button:has-text("追加"), button:has-text("Add"), [data-testid*="add"]').count();
    console.log(`➕ Add task buttons: ${addTaskButton}`);
    
    // Check for any form inputs
    const inputs = await page.locator('input[type="text"], textarea').count();
    console.log(`📝 Input fields: ${inputs}`);
    
    // Wait for potential async loading
    console.log('⏳ Waiting for potential async operations...');
    await page.waitForTimeout(3000);
    
    // Take final screenshot
    await page.screenshot({ path: 'final-state.png', fullPage: true });
    console.log('📸 Final screenshot taken');
    
    // Check final state
    const finalLoadingSpinner = await page.locator('text=読み込み中').count();
    const finalTaskElements = await page.locator('[data-testid*="task"], .task-item, .todo-item').count();
    
    console.log('\n=== FINAL RESULTS ===');
    console.log(`🔄 Loading spinners remaining: ${finalLoadingSpinner}`);
    console.log(`📋 Task elements visible: ${finalTaskElements}`);
    console.log(`❌ Error messages: ${errorMessages}`);
    
    if (finalLoadingSpinner === 0 && finalTaskElements > 0) {
      console.log('✅ SUCCESS: Loading resolved and tasks are visible!');
    } else if (finalLoadingSpinner > 0) {
      console.log('❌ ISSUE: Loading spinner still present');
    } else if (finalTaskElements === 0) {
      console.log('❌ ISSUE: No tasks visible');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'error-state.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testTodoApp().catch(console.error);
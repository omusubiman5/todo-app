const { chromium } = require('playwright');

async function detailedTest() {
  console.log('🚀 Starting detailed todo app test...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen for console messages
  page.on('console', msg => {
    console.log(`🖥️  BROWSER: ${msg.type()}: ${msg.text()}`);
  });

  // Listen for network requests
  page.on('response', response => {
    if (!response.url().includes('chunk') && !response.url().includes('static')) {
      console.log(`🌐 NETWORK: ${response.status()} ${response.url()}`);
    }
  });

  try {
    // Navigate to the home page
    console.log('📍 Navigating to http://localhost:3007/home');
    await page.goto('http://localhost:3007/home', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait for React to initialize
    await page.waitForTimeout(2000);
    
    // Get page title
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);
    
    // Get current URL
    const url = page.url();
    console.log(`🔗 Current URL: ${url}`);
    
    // Check for loading indicators
    const loadingElements = await page.locator('text=読み込み中, text=Loading, [data-testid*="loading"]').count();
    console.log(`🔄 Loading indicators: ${loadingElements}`);
    
    // Get all text content to understand what's displayed
    const bodyText = await page.textContent('body');
    console.log('📝 Page content (first 500 chars):');
    console.log(bodyText.substring(0, 500));
    
    // Look for specific error messages
    const errorSelectors = [
      'text=Error',
      'text=エラー', 
      'text=Failed',
      'text=失敗',
      '[role="alert"]',
      '.error',
      '.alert-error'
    ];
    
    for (const selector of errorSelectors) {
      const errorCount = await page.locator(selector).count();
      if (errorCount > 0) {
        const errorText = await page.locator(selector).first().textContent();
        console.log(`❌ Error found (${selector}): ${errorText}`);
      }
    }
    
    // Look for any button or interactive elements
    const buttons = await page.locator('button').count();
    console.log(`🔘 Buttons found: ${buttons}`);
    
    if (buttons > 0) {
      const buttonTexts = await page.locator('button').allTextContents();
      console.log(`🔘 Button texts: ${buttonTexts.join(', ')}`);
    }
    
    // Look for form inputs
    const inputs = await page.locator('input').count();
    console.log(`📝 Inputs found: ${inputs}`);
    
    // Look for any lists or task containers
    const taskSelectors = [
      '[data-testid*="task"]',
      '[data-testid*="todo"]',
      '.task',
      '.todo',
      'ul li',
      '[role="list"]',
      '[role="listitem"]'
    ];
    
    for (const selector of taskSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`📋 Found ${count} elements matching: ${selector}`);
      }
    }
    
    // Take a screenshot
    const screenshotPath = `/c/Users/omusu/todo-app/detailed-test-screenshot.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot saved: ${screenshotPath}`);
    
    // Wait for any async operations
    console.log('⏳ Waiting 5 seconds for async operations...');
    await page.waitForTimeout(5000);
    
    // Check again after waiting
    const finalLoadingElements = await page.locator('text=読み込み中, text=Loading').count();
    const finalTaskElements = await page.locator('[data-testid*="task"], .task-item, .todo-item').count();
    
    console.log('\n=== FINAL STATE ===');
    console.log(`🔄 Loading elements: ${finalLoadingElements}`);
    console.log(`📋 Task elements: ${finalTaskElements}`);
    
    // Try to interact if possible
    const addButton = await page.locator('button:has-text("追加"), button:has-text("Add")').first();
    if (await addButton.count() > 0) {
      console.log('🔘 Attempting to click add button...');
      await addButton.click();
      await page.waitForTimeout(1000);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: '/c/Users/omusu/todo-app/error-screenshot.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

detailedTest().catch(console.error);
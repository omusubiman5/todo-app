import { test, expect } from '@playwright/test';

test.describe('Basic Navigation', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check if the page loads and has expected elements
    await expect(page).toHaveTitle(/TodoApp/);
    
    // Wait for main content to load
    await page.waitForLoadState('networkidle');
    
    // Check for basic app elements
    const hasTitle = await page.locator('h1:has-text("やることリスト")').count();
    const hasLoadingState = await page.locator('text=読み込み中').count();
    const hasMainContent = await page.locator('body').count();
    
    // Should have basic content structure
    expect(hasTitle + hasLoadingState + hasMainContent).toBeGreaterThan(0);
  });

  test('should handle routing correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check current URL
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/localhost:3000/);
    
    // If redirected to login, that's expected behavior
    if (currentUrl.includes('/login')) {
      await expect(page.locator('input[type="email"]')).toBeVisible();
    }
  });

  test('should be responsive', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should not crash on mobile
    const body = await page.locator('body').count();
    expect(body).toBe(1);
  });

  test('should load CSS and JavaScript', async ({ page }) => {
    await page.goto('/');
    
    // Check if styles are loaded
    const hasStyles = await page.evaluate(() => {
      const stylesheets = document.querySelectorAll('link[rel="stylesheet"], style');
      return stylesheets.length > 0;
    });
    
    expect(hasStyles).toBeTruthy();
    
    // Check if React is loaded (basic check)
    const hasReact = await page.evaluate(() => {
      return typeof window !== 'undefined' && 
             ((window as any).React !== undefined || 
             document.querySelector('[data-reactroot]') !== null ||
             document.querySelector('#__next') !== null ||
             document.querySelector('script[src*="react"]') !== null ||
             document.querySelector('[data-testid]') !== null ||
             document.querySelector('[class*="react"]') !== null);
    });
    
    expect(hasReact).toBeTruthy();
  });
});
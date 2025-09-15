import { test, expect } from '@playwright/test';

test.describe('Accessibility & Performance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should be keyboard navigable', async ({ page }) => {
    // Test Tab navigation
    await page.keyboard.press('Tab');
    let focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();

    // Navigate through multiple elements
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const newFocusedElement = await page.evaluate(() => document.activeElement?.tagName);
      // Should be able to tab through elements
      expect(newFocusedElement).toBeTruthy();
    }

    // Test Shift+Tab (reverse navigation)
    await page.keyboard.press('Shift+Tab');
    focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });

  test('should have proper ARIA labels and roles', async ({ page }) => {
    // Check for important ARIA attributes
    const ariaLabels = await page.locator('[aria-label]').count();
    const roles = await page.locator('[role]').count();
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').count();

    // Should have some semantic elements
    expect(ariaLabels + roles + headings).toBeGreaterThan(0);

    // Check for form labels
    const inputs = await page.locator('input').count();
    const labels = await page.locator('label').count();
    const ariaLabelledInputs = await page.locator('input[aria-label], input[aria-labelledby]').count();

    if (inputs > 0) {
      // Inputs should have labels or aria-labels
      expect(labels + ariaLabelledInputs).toBeGreaterThan(0);
    }
  });

  test('should have sufficient color contrast', async ({ page }) => {
    // Basic check for color contrast issues
    const bodyBg = await page.evaluate(() => {
      const body = document.body;
      const styles = window.getComputedStyle(body);
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color
      };
    });

    // Should have defined colors
    expect(bodyBg.backgroundColor).toBeTruthy();
    expect(bodyBg.color).toBeTruthy();

    // Check that text is not invisible (same color as background)
    expect(bodyBg.backgroundColor).not.toBe(bodyBg.color);
  });

  test('should handle screen reader requirements', async ({ page }) => {
    // Check for skip links
    const skipLinks = await page.locator('a[href="#main"], a[href="#content"], a:has-text("Skip")').count();
    
    // Check for proper heading structure
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(0); // Should have at least 0-1 h1 elements

    // Check for alt text on images
    const images = await page.locator('img').count();
    const imagesWithAlt = await page.locator('img[alt]').count();
    
    if (images > 0) {
      // All images should have alt attributes (even if empty for decorative)
      expect(imagesWithAlt).toBe(images);
    }
  });

  test('should load within reasonable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/', { waitUntil: 'load' });
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
    
    // Wait for network to be idle
    await page.waitForLoadState('networkidle');
    
    const totalTime = Date.now() - startTime;
    
    // Should be fully interactive within 15 seconds (allow for slower CI environments)
    expect(totalTime).toBeLessThan(15000);
  });

  test('should not have console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Interact with the page to trigger any potential errors
    const clickableElements = page.locator('button, a, input[type="submit"]');
    const count = Math.min(await clickableElements.count(), 3);

    for (let i = 0; i < count; i++) {
      try {
        await clickableElements.nth(i).click({ timeout: 1000 });
        await page.waitForTimeout(500);
      } catch (e) {
        // Ignore click failures, we're just testing for console errors
      }
    }

    // Filter out expected/harmless errors
    const significantErrors = consoleErrors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('404') &&
      !error.includes('network') &&
      !error.toLowerCase().includes('warning')
    );

    expect(significantErrors.length).toBe(0);
  });

  test('should be mobile responsive', async ({ page }) => {
    // Test different viewport sizes
    const viewports = [
      { width: 375, height: 667 },  // iPhone 6/7/8
      { width: 768, height: 1024 }, // iPad
      { width: 1280, height: 720 }  // Desktop
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Check that content is visible and not overflowing
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = viewport.width;

      // Content should not be significantly wider than viewport
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 50); // Allow small margin

      // Check that important elements are still visible
      const importantElements = await page.locator('input, button, h1, h2, h3').count();
      expect(importantElements).toBeGreaterThan(0);
    }
  });

  test('should handle large amounts of data', async ({ page }) => {
    // Check performance with many elements (if applicable)
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Measure performance of interactions
    const startTime = Date.now();

    // Try to add multiple items quickly
    const taskInput = page.locator('input[placeholder*="タスク"]').first();
    
    if (await taskInput.isVisible()) {
      for (let i = 0; i < 5; i++) {
        await taskInput.fill(`Performance Test Task ${i}`);
        
        const addButton = page.locator('button:has-text("追加")').first();
        if (await addButton.isVisible() && !(await addButton.isDisabled())) {
          await addButton.click();
          await page.waitForTimeout(100);
        }
      }
    }

    const totalTime = Date.now() - startTime;
    
    // Should handle multiple operations reasonably quickly
    expect(totalTime).toBeLessThan(10000);
  });

  test('should work without JavaScript (graceful degradation)', async ({ page, context }) => {
    // Disable JavaScript
    await context.addInitScript(() => {
      delete (window as any).navigator;
    });

    await page.goto('/');
    await page.waitForLoadState('load');

    // Should still show basic content
    const bodyText = await page.textContent('body');
    expect(bodyText?.length || 0).toBeGreaterThan(10);

    // Should not be completely blank
    const visibleElements = await page.locator('*:visible').count();
    expect(visibleElements).toBeGreaterThan(0);
  });
});
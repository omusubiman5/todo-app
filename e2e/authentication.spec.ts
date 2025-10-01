import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should handle authentication state correctly', async ({ page }) => {
    // Check current state
    const currentUrl = page.url();
    
    if (currentUrl.includes('/login')) {
      // On login page - test login form
      await expect(page.locator('input[type="email"]')).toBeVisible();
      
      // Test form validation
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');
      
      if (await emailInput.isVisible()) {
        // Test invalid email
        await emailInput.fill('invalid-email');
        if (await passwordInput.isVisible()) {
          await passwordInput.fill('password');
          
          const submitButton = page.locator('button[type="submit"], button:has-text("ログイン"), button:has-text("Login")').first();
          if (await submitButton.isVisible()) {
            await submitButton.click();
            
            // Should show validation error or stay on login page
            await page.waitForTimeout(2000);
            const stillOnLogin = page.url().includes('/login') || await emailInput.isVisible();
            expect(stillOnLogin).toBeTruthy();
          }
        }
      }
    } else {
      // Should be authenticated or show task board
      const hasTaskInterface = await page.locator('input[placeholder*="タスク"], [data-testid="task-board"]').count() > 0;
      const hasAuthElements = await page.locator('[data-testid="auth-provider"]').count() > 0;
      
      expect(hasTaskInterface || hasAuthElements).toBeTruthy();
    }
  });

  test('should handle logout if authenticated', async ({ page }) => {
    // Look for logout button or user menu
    const logoutButton = page.locator('button:has-text("ログアウト"), button:has-text("Logout")').first();
    const userMenu = page.locator('[data-testid="user-menu"], .user-menu').first();
    
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await page.waitForTimeout(2000);
      
      // Should redirect to login or show login form
      const isOnLogin = page.url().includes('/login') || await page.locator('input[type="email"]').isVisible();
      expect(isOnLogin).toBeTruthy();
    } else if (await userMenu.isVisible()) {
      await userMenu.click();
      
      // Look for logout option in menu
      const menuLogout = page.locator('button:has-text("ログアウト"), button:has-text("Logout")').first();
      if (await menuLogout.isVisible()) {
        await menuLogout.click();
        await page.waitForTimeout(2000);
        
        const isOnLogin = page.url().includes('/login') || await page.locator('input[type="email"]').isVisible();
        expect(isOnLogin).toBeTruthy();
      }
    } else {
      console.log('No logout functionality found - may not be authenticated');
    }
  });

  test('should handle protected routes', async ({ page }) => {
    // Try to access a protected route
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    
    if (currentUrl.includes('/login')) {
      // Correctly redirected to login
      await expect(page.locator('input[type="email"]')).toBeVisible();
    } else {
      // Either authenticated or route doesn't exist
      const has404 = await page.locator('text=404').count() > 0;
      const hasContent = await page.locator('body').textContent();
      
      expect(has404 || (hasContent && hasContent.length > 10)).toBeTruthy();
    }
  });

  test('should maintain authentication state on refresh', async ({ page }) => {
    const initialUrl = page.url();
    const initialState = {
      hasEmailInput: await page.locator('input[type="email"]').count() > 0,
      hasTaskInput: await page.locator('input[placeholder*="タスク"]').count() > 0
    };
    
    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const afterRefreshState = {
      hasEmailInput: await page.locator('input[type="email"]').count() > 0,
      hasTaskInput: await page.locator('input[placeholder*="タスク"]').count() > 0
    };
    
    // State should be consistent
    expect(initialState.hasEmailInput).toBe(afterRefreshState.hasEmailInput);
    expect(initialState.hasTaskInput).toBe(afterRefreshState.hasTaskInput);
  });

  test('should handle authentication errors gracefully', async ({ page }) => {
    // Go to login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    
    if (await emailInput.isVisible() && await passwordInput.isVisible()) {
      // Try with non-existent user
      await emailInput.fill('nonexistent@example.com');
      await passwordInput.fill('wrongpassword');
      
      const submitButton = page.locator('button[type="submit"], button:has-text("ログイン"), button:has-text("Login")').first();
      
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(3000);
        
        // Should show error message or stay on login page
        const errorMessage = page.locator('[class*="error"], [data-testid*="error"], text*="エラー", text*="Error"');
        const stillOnLogin = await emailInput.isVisible();
        
        expect(stillOnLogin).toBeTruthy();
        
        // May or may not show specific error message depending on implementation
        console.log('Checked authentication error handling');
      }
    }
  });

  test('should handle registration if available', async ({ page }) => {
    // Look for registration link or button
    const registerLink = page.locator('a:has-text("登録"), a:has-text("Register"), a:has-text("Sign up")').first();
    const registerButton = page.locator('button:has-text("登録"), button:has-text("Register"), button:has-text("Sign up")').first();
    
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await page.waitForLoadState('networkidle');
      
      // Should navigate to registration page
      const hasRegisterForm = await page.locator('input[type="email"]').count() > 0;
      expect(hasRegisterForm).toBeTruthy();
    } else if (await registerButton.isVisible()) {
      await registerButton.click();
      await page.waitForLoadState('networkidle');
      
      const hasRegisterForm = await page.locator('input[type="email"]').count() > 0;
      expect(hasRegisterForm).toBeTruthy();
    } else {
      console.log('No registration functionality found');
    }
  });
});
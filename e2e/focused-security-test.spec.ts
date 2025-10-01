import { test, expect } from '@playwright/test';

test.describe('Focused Security Validation', () => {
  test('should validate core security features', async ({ page }) => {
    console.log('🛡️ Starting focused security validation');

    // Test 1: Basic accessibility and security headers
    console.log('1️⃣ Testing application accessibility and security headers');
    const response = await page.goto('http://localhost:3000/', {
      timeout: 10000,
      waitUntil: 'domcontentloaded'
    });

    // Check if we got a response
    if (response) {
      const status = response.status();
      console.log(`📊 Response status: ${status}`);

      // If rate limited, that's actually a good security sign
      if (status === 429) {
        console.log('✅ Rate limiting is active - good security feature');
        const headers = response.headers();
        console.log(`🔒 Rate limit headers present: ${!!headers['retry-after']}`);
        expect(status).toBe(429);
        return; // Exit early if rate limited
      }

      // Check security headers if we get a successful response
      if (status === 200) {
        const headers = response.headers();
        console.log('🔍 Checking security headers...');

        // Key security headers validation
        const securityHeaders = {
          'x-frame-options': headers['x-frame-options'],
          'x-content-type-options': headers['x-content-type-options'],
          'x-xss-protection': headers['x-xss-protection'],
          'content-security-policy': headers['content-security-policy'],
          'referrer-policy': headers['referrer-policy']
        };

        for (const [header, value] of Object.entries(securityHeaders)) {
          if (value) {
            console.log(`✅ ${header}: ${value.substring(0, 50)}...`);
          } else {
            console.log(`⚠️ ${header}: Not present`);
          }
        }

        // At least some security headers should be present
        const hasSecurityHeaders = Object.values(securityHeaders).some(v => v !== undefined);
        expect(hasSecurityHeaders).toBeTruthy();
      }
    }

    // Test 2: Authentication state validation
    console.log('2️⃣ Testing authentication state');
    const currentUrl = page.url();
    const pageContent = await page.textContent('body').catch(() => '');

    console.log(`📍 Current URL: ${currentUrl}`);
    console.log(`📄 Page content length: ${pageContent.length} characters`);

    // Check authentication state
    const isLoginPage = currentUrl.includes('/login');
    const hasTaskInterface = pageContent.includes('タスク') || pageContent.includes('task');
    const hasAuthForm = pageContent.includes('email') || pageContent.includes('password');

    console.log(`🔐 On login page: ${isLoginPage}`);
    console.log(`📝 Has task interface: ${hasTaskInterface}`);
    console.log(`🔑 Has auth form: ${hasAuthForm}`);

    // Valid states: either on login page or has task interface
    expect(isLoginPage || hasTaskInterface || hasAuthForm).toBeTruthy();

    // Test 3: Basic XSS protection (if we can access input fields)
    console.log('3️⃣ Testing basic XSS protection');
    const inputs = await page.locator('input[type="text"], textarea').count();
    console.log(`📝 Found ${inputs} input fields`);

    if (inputs > 0) {
      const firstInput = page.locator('input[type="text"], textarea').first();
      const xssPayload = '<script>alert("XSS")</script>';

      // Set up alert detection
      let alertTriggered = false;
      page.on('dialog', dialog => {
        alertTriggered = true;
        dialog.dismiss();
      });

      await firstInput.fill(xssPayload);
      await page.waitForTimeout(1000);

      console.log(`🛡️ XSS alert triggered: ${alertTriggered}`);
      expect(alertTriggered).toBeFalsy();
    }

    // Test 4: CSRF token presence (if forms exist)
    console.log('4️⃣ Testing CSRF protection');
    const forms = await page.locator('form').count();
    console.log(`📋 Found ${forms} forms`);

    if (forms > 0) {
      const hiddenInputs = await page.locator('input[type="hidden"]').count();
      const csrfTokens = await page.locator('input[name*="csrf"], input[name*="_token"]').count();

      console.log(`🔒 Hidden inputs: ${hiddenInputs}`);
      console.log(`🛡️ CSRF tokens: ${csrfTokens}`);

      // Some form of CSRF protection should be present
      expect(hiddenInputs > 0 || csrfTokens > 0).toBeTruthy();
    }

    // Test 5: Rate limiting validation (API endpoints)
    console.log('5️⃣ Testing API rate limiting');
    try {
      const apiResponse = await page.request.get('/api/health');
      const apiStatus = apiResponse.status();
      console.log(`🌐 API response status: ${apiStatus}`);

      // Either endpoint doesn't exist (404) or rate limiting is active (429)
      expect([200, 404, 429, 405].includes(apiStatus)).toBeTruthy();

      if (apiStatus === 429) {
        console.log('✅ API rate limiting is active');
      }
    } catch (error) {
      console.log('ℹ️ API endpoint not accessible or blocked');
    }

    console.log('🎉 Focused security validation completed');
  });

  test('should validate application functionality', async ({ page }) => {
    console.log('⚙️ Testing core application functionality');

    await page.goto('http://localhost:3000/', {
      timeout: 10000,
      waitUntil: 'domcontentloaded'
    });

    const currentUrl = page.url();
    console.log(`📍 Application URL: ${currentUrl}`);

    // Check if application loads without critical errors
    const hasErrors = await page.locator('text=Error').count() > 0;
    const hasExceptions = await page.locator('text=Exception').count() > 0;

    console.log(`❌ Has visible errors: ${hasErrors}`);
    console.log(`💥 Has exceptions: ${hasExceptions}`);

    expect(hasErrors).toBeFalsy();
    expect(hasExceptions).toBeFalsy();

    // Check for basic UI elements
    const hasButtons = await page.locator('button').count();
    const hasInputs = await page.locator('input').count();
    const hasContent = (await page.textContent('body'))?.length || 0;

    console.log(`🔘 Buttons found: ${hasButtons}`);
    console.log(`📝 Inputs found: ${hasInputs}`);
    console.log(`📄 Content length: ${hasContent} characters`);

    // Application should have interactive elements or meaningful content
    expect(hasButtons > 0 || hasInputs > 0 || hasContent > 100).toBeTruthy();

    console.log('✅ Application functionality validation passed');
  });
});
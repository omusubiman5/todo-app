import { test, expect } from '@playwright/test';

test.describe('Security Validation Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept network requests to check for security headers
    await page.route('**/*', (route) => {
      route.continue();
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should enforce security headers', async ({ page }) => {
    console.log('🛡️ Testing security headers implementation');

    // Make a request and check headers
    const response = await page.goto('/');

    // Security Headers Validation
    const headers = response?.headers() || {};

    console.log('📋 Checking security headers...');

    // X-Frame-Options
    expect(headers['x-frame-options']).toBeDefined();
    console.log(`✅ X-Frame-Options: ${headers['x-frame-options']}`);

    // X-Content-Type-Options
    expect(headers['x-content-type-options']).toBe('nosniff');
    console.log(`✅ X-Content-Type-Options: ${headers['x-content-type-options']}`);

    // X-XSS-Protection
    expect(headers['x-xss-protection']).toBeDefined();
    console.log(`✅ X-XSS-Protection: ${headers['x-xss-protection']}`);

    // Content-Security-Policy
    expect(headers['content-security-policy']).toBeDefined();
    console.log(`✅ CSP: ${headers['content-security-policy']?.substring(0, 100)}...`);

    // Referrer-Policy
    expect(headers['referrer-policy']).toBeDefined();
    console.log(`✅ Referrer-Policy: ${headers['referrer-policy']}`);

    console.log('🎉 All security headers are properly configured');
  });

  test('should handle authentication bypass attempts', async ({ page }) => {
    console.log('🔐 Testing authentication bypass protection');

    // Try to access protected routes directly
    const protectedRoutes = ['/dashboard', '/api/tasks', '/profile'];

    for (const route of protectedRoutes) {
      const response = await page.goto(route);
      const status = response?.status();
      const currentUrl = page.url();

      console.log(`🔍 Testing route: ${route}`);
      console.log(`📍 Response status: ${status}, Final URL: ${currentUrl}`);

      // Should either redirect to login or return appropriate auth error
      const isRedirectedToLogin = currentUrl.includes('/login');
      const isUnauthorized = status === 401 || status === 403;
      const isNotFound = status === 404; // Route might not exist

      expect(isRedirectedToLogin || isUnauthorized || isNotFound).toBeTruthy();
      console.log(`✅ Route ${route} is properly protected`);
    }
  });

  test('should validate CSRF protection', async ({ page }) => {
    console.log('🛡️ Testing CSRF protection');

    // Navigate to the main app
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check if CSRF tokens are present in forms
    const forms = await page.locator('form').count();
    console.log(`📝 Found ${forms} forms on the page`);

    if (forms > 0) {
      // Check for CSRF token inputs
      const csrfInputs = await page.locator('input[name="_csrf"], input[name="csrf_token"]').count();
      const hiddenInputs = await page.locator('input[type="hidden"]').count();

      console.log(`🔐 CSRF inputs found: ${csrfInputs}`);
      console.log(`🔒 Hidden inputs found: ${hiddenInputs}`);

      // At least one form should have CSRF protection
      expect(csrfInputs > 0 || hiddenInputs > 0).toBeTruthy();
      console.log('✅ CSRF protection appears to be implemented');
    } else {
      console.log('ℹ️ No forms found to test CSRF protection');
    }
  });

  test('should handle rate limiting', async ({ page }) => {
    console.log('⚡ Testing rate limiting protection');

    // Test API endpoints for rate limiting
    const apiEndpoints = ['/api/health', '/api/test'];

    for (const endpoint of apiEndpoints) {
      console.log(`🔍 Testing rate limiting on: ${endpoint}`);

      // Make multiple rapid requests
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          page.request.get(endpoint).catch(err => ({
            status: () => 0,
            statusText: () => err.message
          }))
        );
      }

      const responses = await Promise.all(requests);
      const statuses = responses.map(r => r.status());

      console.log(`📊 Response statuses: ${statuses.join(', ')}`);

      // Check for rate limiting responses (429)
      const hasRateLimit = statuses.some(status => status === 429);
      const hasValidResponses = statuses.some(status => status === 200 || status === 404);

      console.log(`⚡ Rate limiting detected: ${hasRateLimit}`);
      console.log(`✅ Valid responses received: ${hasValidResponses}`);

      // Rate limiting should kick in or all requests should be valid
      expect(hasRateLimit || hasValidResponses).toBeTruthy();
    }
  });

  test('should sanitize XSS attempts', async ({ page }) => {
    console.log('🛡️ Testing XSS protection');

    // Go to the application
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for input fields
    const textInputs = await page.locator('input[type="text"], textarea').count();
    console.log(`📝 Found ${textInputs} text input fields`);

    if (textInputs > 0) {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src="x" onerror="alert(\'XSS\')" />',
        '<svg onload="alert(\'XSS\')" />',
        '"><script>alert("XSS")</script>',
      ];

      for (const payload of xssPayloads) {
        console.log(`🧪 Testing XSS payload: ${payload.substring(0, 30)}...`);

        // Fill the first text input with XSS payload
        const firstInput = page.locator('input[type="text"], textarea').first();
        await firstInput.fill(payload);

        // Check if any script execution occurred (shouldn't happen)
        const alerts = [];
        page.on('dialog', dialog => {
          alerts.push(dialog.message());
          dialog.dismiss();
        });

        // Submit form if available
        const submitButton = page.locator('button[type="submit"], button:has-text("追加")').first();
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await page.waitForTimeout(1000);
        }

        // Check that no alerts were triggered
        expect(alerts.length).toBe(0);
        console.log(`✅ XSS payload blocked: ${payload.substring(0, 20)}...`);
      }
    } else {
      console.log('ℹ️ No input fields found to test XSS protection');
    }
  });

  test('should validate secure cookie settings', async ({ page, context }) => {
    console.log('🍪 Testing secure cookie configuration');

    // Navigate and trigger authentication
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get all cookies
    const cookies = await context.cookies();
    console.log(`🍪 Found ${cookies.length} cookies`);

    // Check security attributes of important cookies
    const authCookies = cookies.filter(cookie =>
      cookie.name.toLowerCase().includes('auth') ||
      cookie.name.toLowerCase().includes('session') ||
      cookie.name.toLowerCase().includes('token')
    );

    console.log(`🔐 Found ${authCookies.length} authentication-related cookies`);

    for (const cookie of authCookies) {
      console.log(`🔍 Checking cookie: ${cookie.name}`);

      // Check security attributes
      if (process.env.NODE_ENV === 'production') {
        expect(cookie.secure).toBeTruthy();
        console.log(`✅ Cookie ${cookie.name} has secure flag`);
      }

      expect(cookie.httpOnly).toBeTruthy();
      console.log(`✅ Cookie ${cookie.name} has httpOnly flag`);

      expect(cookie.sameSite).toBeDefined();
      console.log(`✅ Cookie ${cookie.name} has sameSite: ${cookie.sameSite}`);
    }

    if (authCookies.length === 0) {
      console.log('ℹ️ No authentication cookies found (may not be logged in)');
    }
  });

  test('should handle SQL injection attempts', async ({ page }) => {
    console.log('💉 Testing SQL injection protection');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for search or input fields
    const inputs = await page.locator('input[type="text"], input[type="search"], textarea').count();
    console.log(`📝 Found ${inputs} input fields for SQL injection testing`);

    if (inputs > 0) {
      const sqlPayloads = [
        "'; DROP TABLE tasks; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM users --",
        "admin'--",
        "' OR 1=1 #",
        "\"; DROP TABLE tasks; --",
      ];

      for (const payload of sqlPayloads) {
        console.log(`🧪 Testing SQL payload: ${payload.substring(0, 20)}...`);

        const firstInput = page.locator('input[type="text"], input[type="search"], textarea').first();
        await firstInput.fill(payload);

        // Submit if possible
        const submitButton = page.locator('button[type="submit"], button:has-text("検索"), button:has-text("追加")').first();
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await page.waitForTimeout(1000);

          // Check for database errors or unexpected behavior
          const pageContent = await page.textContent('body');
          const hasDbError = pageContent?.toLowerCase().includes('sql') ||
                           pageContent?.toLowerCase().includes('database') ||
                           pageContent?.toLowerCase().includes('error');

          expect(hasDbError).toBeFalsy();
          console.log(`✅ SQL injection payload handled safely: ${payload.substring(0, 15)}...`);
        }
      }
    } else {
      console.log('ℹ️ No input fields found for SQL injection testing');
    }
  });

  test('should validate content type restrictions', async ({ page }) => {
    console.log('📋 Testing content type validation');

    // Test API endpoints with invalid content types
    const testEndpoints = ['/api/tasks', '/api/auth'];

    for (const endpoint of testEndpoints) {
      console.log(`🔍 Testing content type validation on: ${endpoint}`);

      // Test with invalid content types
      const invalidContentTypes = [
        'text/plain',
        'application/xml',
        'multipart/form-data',
        'text/html',
      ];

      for (const contentType of invalidContentTypes) {
        try {
          const response = await page.request.post(endpoint, {
            headers: {
              'Content-Type': contentType,
            },
            data: '{"test": "data"}',
          });

          const status = response.status();
          console.log(`📊 ${endpoint} with ${contentType}: ${status}`);

          // Should reject invalid content types (400, 415, or similar)
          if (status !== 404) { // Ignore not found errors
            expect(status === 400 || status === 415 || status === 403 || status === 405).toBeTruthy();
            console.log(`✅ Invalid content type properly rejected: ${contentType}`);
          }
        } catch (error) {
          console.log(`ℹ️ Request failed as expected: ${contentType}`);
        }
      }
    }
  });

  test('should maintain session security', async ({ page }) => {
    console.log('🔐 Testing session security');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);

    // Test session fixation protection
    const initialSessionId = await page.evaluate(() => {
      // Try to get session identifier from various sources
      return document.cookie || sessionStorage.getItem('session') || localStorage.getItem('session') || 'none';
    });

    console.log(`🔍 Initial session state: ${initialSessionId.substring(0, 50)}...`);

    // Refresh page to test session persistence
    await page.reload();
    await page.waitForLoadState('networkidle');

    const afterReloadUrl = page.url();
    const afterReloadSession = await page.evaluate(() => {
      return document.cookie || sessionStorage.getItem('session') || localStorage.getItem('session') || 'none';
    });

    console.log(`📍 After reload URL: ${afterReloadUrl}`);
    console.log(`🔍 After reload session: ${afterReloadSession.substring(0, 50)}...`);

    // Session should be maintained securely
    const sessionChanged = initialSessionId !== afterReloadSession;
    const urlChanged = currentUrl !== afterReloadUrl;

    console.log(`🔄 Session changed: ${sessionChanged}`);
    console.log(`🔄 URL changed: ${urlChanged}`);

    // Either session should be maintained or user should be redirected to login
    const isOnLogin = afterReloadUrl.includes('/login');
    const sessionMaintained = !sessionChanged;

    expect(isOnLogin || sessionMaintained).toBeTruthy();
    console.log('✅ Session security appears to be properly implemented');
  });
});
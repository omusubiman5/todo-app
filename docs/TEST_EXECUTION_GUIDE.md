# Test Execution Guide

## Quick Start

### Prerequisites
```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Basic Test Commands
```bash
# Run all unit tests
npm test

# Run unit tests with coverage
npm run test:coverage

# Run E2E tests
npm run e2e

# Run E2E tests with UI
npm run e2e:ui
```

## Test Categories

### 1. Unit & Integration Tests (Jest)

#### Core Commands
```bash
# Run all Jest tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage report
npm run test:coverage

# Run tests for CI (no watch, with coverage)
npm run test:ci

# Run specific test file
npm test -- TaskItem.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="認証"
```

#### Test Files Overview
```
__tests__/
├── components/              # Component tests
│   ├── TaskItem.test.tsx                    # Core TaskItem functionality
│   ├── TaskItem.accessibility.test.tsx     # TaskItem accessibility
│   ├── SharedTaskBoard.simple.test.tsx     # Basic SharedTaskBoard rendering
│   └── SharedTaskBoard.interaction.test.tsx # User interaction tests
├── hooks/                   # Custom hook tests
│   ├── useFilteredTasks.test.ts            # Task filtering logic
│   └── useAuth.accessibility.test.ts       # Auth accessibility features
├── lib/                     # Business logic tests
│   ├── authErrors.test.ts                  # Authentication error handling
│   ├── logger.test.ts                      # Logging utility
│   ├── teamService.test.ts                 # Team management
│   ├── types.test.ts                       # TypeScript type validation
│   └── errorHandling.test.ts               # Error handling patterns
└── utils/
    └── test-utils.tsx                      # Test utilities and mocks
```

#### Coverage Targets
- **Statements**: >80%
- **Branches**: >75%
- **Functions**: >80%
- **Lines**: >80%

### 2. End-to-End Tests (Playwright)

#### Core Commands
```bash
# Run all E2E tests
npm run e2e

# Run with UI mode (recommended for development)
npm run e2e:ui

# Run in headed mode (see browser)
npm run e2e:headed

# Run with debug mode
npm run e2e:debug

# Show test report
npm run e2e:report

# Run specific test file
npm run e2e -- comprehensive-task-management

# Run tests for specific browser
npm run e2e -- --project=chromium
npm run e2e -- --project=firefox  
npm run e2e -- --project=webkit
```

#### E2E Test Suites

##### 1. Comprehensive Task Management
**File**: `comprehensive-task-management.spec.ts`
```bash
npm run e2e -- comprehensive-task-management
```
- ✅ Personal task management workflow
- ✅ Task filtering and search functionality
- ✅ Keyboard navigation accessibility
- ✅ Error handling behavior
- ✅ Responsive design verification
- ✅ Data persistence on page reload
- ✅ Bulk operations
- ✅ Accessibility standards compliance

##### 2. Team Collaboration Flow
**File**: `team-collaboration-flow.spec.ts`
```bash
npm run e2e -- team-collaboration-flow
```
- ✅ Team creation to collaboration workflow
- ✅ Member invitation system
- ✅ Real-time updates
- ✅ Role-based access control
- ✅ Task assignment and status tracking
- ✅ Team statistics and dashboard
- ✅ Notification system
- ✅ Workspace switching

##### 3. Cross-Browser Compatibility
**File**: `cross-browser-compatibility.spec.ts`
```bash
npm run e2e -- cross-browser-compatibility
```
- ✅ Basic functionality across browsers
- ✅ CSS rendering consistency
- ✅ JavaScript feature compatibility
- ✅ Form element compatibility
- ✅ Responsive design verification
- ✅ Performance basic checks
- ✅ Accessibility features
- ✅ Mobile compatibility
- ✅ Browser-specific features

##### 4. Performance Tests
**File**: `performance-tests.spec.ts`
```bash
npm run e2e -- performance-tests
```
- ✅ Page load performance measurement
- ✅ Scroll performance with large datasets
- ✅ Memory usage monitoring
- ✅ Rendering performance
- ✅ Network request performance
- ✅ JavaScript execution performance
- ✅ Animation performance
- ✅ Form input performance
- ✅ Bundle size and resource usage

##### 5. Visual Regression Tests
**File**: `visual-regression-tests.spec.ts`
```bash
npm run e2e -- visual-regression-tests
```
- ✅ Initial page appearance
- ✅ Task form appearance
- ✅ Task list display states
- ✅ Completion state display
- ✅ Responsive design appearance
- ✅ Error state display
- ✅ Dark mode support
- ✅ Interaction states
- ✅ Loading states
- ✅ Accessibility visual elements
- ✅ Animation states
- ✅ Multi-language support
- ✅ Print layout
- ✅ Individual component appearance

## Test Configuration

### Jest Configuration
**File**: `jest.config.js`
```javascript
{
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  collectCoverageFrom: [
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,ts}',
    'hooks/**/*.{js,ts}'
  ]
}
```

### Playwright Configuration
**File**: `playwright.config.ts`
```typescript
{
  testDir: './e2e',
  timeout: 30 * 1000,
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    { name: 'firefox', use: devices['Desktop Firefox'] },
    { name: 'webkit', use: devices['Desktop Safari'] }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000'
  }
}
```

## Development Workflow

### Before Making Changes
1. **Run existing tests** to ensure current functionality
   ```bash
   npm test
   npm run e2e -- --project=chromium
   ```

2. **Check test coverage** to identify areas needing tests
   ```bash
   npm run test:coverage
   ```

### When Adding Features
1. **Write unit tests first** (TDD approach)
   ```bash
   # Create test file in appropriate __tests__ directory
   # Run specific test during development
   npm test -- --testNamePattern="your-new-feature"
   ```

2. **Add integration tests** for complex flows
   ```bash
   # Add to existing integration test files
   # Or create new integration test
   ```

3. **Update E2E tests** for user-facing changes
   ```bash
   # Run E2E tests to ensure no regression
   npm run e2e:ui  # Use UI mode for easier debugging
   ```

### Before Committing
1. **Run full test suite**
   ```bash
   npm run test:ci
   npm run e2e
   ```

2. **Check coverage reports**
   - Ensure new code has adequate test coverage
   - Review coverage report in `coverage/lcov-report/index.html`

3. **Validate visual changes**
   ```bash
   npm run e2e -- visual-regression-tests
   ```

## Debugging Tests

### Jest Test Debugging
```bash
# Run with verbose output
npm test -- --verbose

# Clear cache if tests behave unexpectedly
npm test -- --clearCache

# Debug specific test with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand TaskItem.test.tsx
```

### Playwright Test Debugging
```bash
# Debug mode - opens browser and pauses at failures
npm run e2e:debug

# UI mode - interactive test runner
npm run e2e:ui

# Run specific test with trace
npm run e2e -- --trace on comprehensive-task-management

# Generate and view trace
npm run e2e:report
```

### Common Issues and Solutions

#### Mock Issues
- **Problem**: `useAuth must be used within an AuthProvider`
- **Solution**: Check `test-utils.tsx` mock configuration
- **Debug**: Ensure mocks are properly imported in test files

#### Async Test Issues
- **Problem**: Tests timeout or fail intermittently
- **Solution**: Use `waitFor` and proper async/await patterns
- **Debug**: Add `await` to async operations and increase timeout

#### E2E Test Issues
- **Problem**: Element not found or tests flaky
- **Solution**: Use more reliable selectors and proper waiting
- **Debug**: Run with `--headed` mode to see browser actions

## Performance Benchmarks

### Unit Tests
- **Target Runtime**: <30 seconds for full suite
- **Individual Test**: <5 seconds maximum
- **Coverage Collection**: <60 seconds with coverage

### E2E Tests
- **Per Test**: <30 seconds average
- **Full Suite**: <15 minutes (parallel execution)
- **Browser Startup**: <10 seconds per browser

### Performance Test Thresholds
```typescript
// Page Load Performance
expect(loadTime).toBeLessThan(3000);        // 3 seconds
expect(firstContentfulPaint).toBeLessThan(1500); // 1.5 seconds

// Memory Usage
expect(memoryUsage).toBeLessThan(100 * 1024 * 1024); // 100MB

// Network Performance
expect(apiResponseTime).toBeLessThan(1000);   // 1 second
```

## Continuous Integration

### GitHub Actions Integration
```yaml
# .github/workflows/test.yml
- name: Run Unit Tests
  run: npm run test:ci

- name: Run E2E Tests
  run: npm run e2e

- name: Upload Test Results
  uses: actions/upload-artifact@v3
  with:
    name: test-results
    path: test-results/
```

### Quality Gates
- **Unit Test Coverage**: >80%
- **E2E Test Success**: 100%
- **Performance Regression**: <10% degradation
- **No Critical Accessibility Issues**

## Troubleshooting Guide

### Environment Setup Issues
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Reinstall Playwright browsers
npx playwright install --force
```

### Test Database Issues
```bash
# Reset test database (if applicable)
npm run db:reset:test

# Clear test data
npm run test:cleanup
```

### Memory Issues
```bash
# Increase Node.js memory for large test suites
NODE_OPTIONS="--max-old-space-size=4096" npm test
NODE_OPTIONS="--max-old-space-size=4096" npm run e2e
```

### Port Conflicts
```bash
# Check for processes using port 3000
lsof -ti:3000

# Kill process if needed
kill -9 $(lsof -ti:3000)

# Or use different port
PORT=3001 npm run dev
```

## Best Practices Summary

### Unit Testing
1. **Test behavior, not implementation**
2. **Use descriptive test names**
3. **Follow AAA pattern** (Arrange, Act, Assert)
4. **Mock external dependencies**
5. **Test error scenarios**

### E2E Testing
1. **Focus on critical user journeys**
2. **Use stable selectors**
3. **Wait for elements properly**
4. **Test across multiple browsers**
5. **Keep tests independent**

### Maintenance
1. **Review and update tests regularly**
2. **Monitor test execution time**
3. **Fix flaky tests immediately**
4. **Keep test documentation current**
5. **Analyze coverage reports**

---

This guide provides comprehensive instructions for running and maintaining the test infrastructure. Follow these practices to ensure high code quality and reliable test execution.
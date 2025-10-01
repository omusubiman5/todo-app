# Testing Architecture Documentation

## Architecture Overview

本プロジェクトのテストアーキテクチャは、品質保証の多層防御戦略を採用しており、各レイヤーが異なる種類の問題を検出・防止するよう設計されています。

```
┌─────────────────────────────────────────────────┐
│                E2E Tests                        │
│  ┌─────────────────────────────────────────┐   │
│  │          Integration Tests              │   │
│  │  ┌─────────────────────────────────┐   │   │
│  │  │        Unit Tests               │   │   │
│  │  │  ┌─────────────────────────┐   │   │   │
│  │  │  │   Static Analysis       │   │   │   │
│  │  │  └─────────────────────────┘   │   │   │
│  │  └─────────────────────────────────┘   │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## Testing Pyramid Implementation

### Level 1: Static Analysis & Type Checking
**Purpose**: Compile-time error detection and code quality enforcement

#### Tools
- **TypeScript**: 型安全性の保証
- **ESLint**: コード品質とスタイル規則の強制
- **Prettier**: コード整形の統一

#### Configuration
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### Level 2: Unit Tests (70% of test suite)
**Purpose**: Individual component and function behavior verification

#### Architecture Principles
```typescript
// test-utils.tsx - Centralized Mock System
export const createMockSupabaseClient = () => ({
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis()
  }))
});

export const createMockUser = (overrides = {}) => ({
  id: 'mock-user-id',
  email: 'test@example.com',
  user_metadata: { full_name: 'Test User' },
  ...overrides
});
```

#### Test Categories
1. **Component Tests**
   - Props validation
   - Event handling
   - Conditional rendering
   - State management

2. **Hook Tests**
   - Custom logic validation
   - Side effect management
   - Dependency tracking

3. **Service Tests**
   - Business logic validation
   - Error handling
   - Data transformation

#### Mock Strategy
```typescript
// Hierarchical Mock System
├── Global Mocks (jest.setup.js)
│   ├── Next.js Router
│   ├── Environment Variables
│   └── Browser APIs
├── Provider Mocks (test-utils.tsx)
│   ├── AuthProvider
│   ├── WorkspaceProvider
│   └── QueryClient
└── Service Mocks (per test file)
    ├── Supabase Client
    ├── API Endpoints
    └── External Services
```

### Level 3: Integration Tests (20% of test suite)
**Purpose**: Component interaction and data flow verification

#### Test Patterns
```typescript
// Feature Integration Test Example
describe('Task Management Integration', () => {
  it('should handle complete task lifecycle', async () => {
    // Arrange: Set up integrated environment
    const { render } = setupIntegratedTest();
    
    // Act: Perform user workflow
    await userCreatesTask('Integration Test Task');
    await userMarksTaskComplete();
    
    // Assert: Verify end-to-end behavior
    expect(taskIsMarkedComplete()).toBe(true);
    expect(statisticsAreUpdated()).toBe(true);
  });
});
```

#### Integration Boundaries
- **Component → Service**: UI component calling business logic
- **Service → API**: Business logic calling external APIs
- **Context → Components**: State management integration
- **Hook → Service**: Custom hooks with business logic

### Level 4: End-to-End Tests (10% of test suite)
**Purpose**: Complete user journey validation in real browser environment

#### E2E Architecture
```typescript
// Multi-Browser Test Matrix
const browsers = ['chromium', 'firefox', 'webkit'];
const devices = ['desktop', 'tablet', 'mobile'];
const scenarios = ['happy-path', 'error-cases', 'edge-cases'];

// Total Test Combinations: 3 × 3 × 3 = 27 base scenarios
// Actual Implementation: 234 tests across all combinations
```

## Test Infrastructure Components

### Mock System Architecture

#### 1. Context Provider Mocking
```typescript
// Centralized provider mocking
jest.mock('@/components/AuthProvider', () => ({
  useAuth: jest.fn(),
  AuthProvider: ({ children }) => children
}));

jest.mock('@/components/WorkspaceProvider', () => ({
  useWorkspace: jest.fn(),
  WorkspaceProvider: ({ children }) => children
}));
```

#### 2. Supabase Client Mocking
```typescript
// Method chaining support
export const createMockSupabaseClient = () => {
  const mockQuery = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    // ... supports complete query chain
  };

  return {
    from: jest.fn(() => mockQuery),
    auth: { user: jest.fn() },
    rpc: jest.fn()
  };
};
```

#### 3. Data Generation System
```typescript
// Consistent test data generation
export const createMockTask = (overrides = {}) => ({
  id: `task-${Math.random().toString(36).substr(2, 9)}`,
  text: 'Default test task',
  completed: false,
  priority: '中' as const,
  user_id: 'test-user-id',
  created_at: new Date().toISOString(),
  ...overrides
});

export const createMockWorkspace = (overrides = {}) => ({
  type: 'personal' as const,
  team_id: null,
  team_name: '個人タスク',
  ...overrides
});
```

### Test Execution Architecture

#### Parallel Execution Strategy
```typescript
// Jest Configuration
{
  maxWorkers: "50%",           // CPU-based parallelization
  testTimeout: 10000,          // 10 second timeout
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js'
  ]
}

// Playwright Configuration  
{
  fullyParallel: true,         // Maximum parallelization
  workers: process.env.CI ? 1 : undefined,
  retries: process.env.CI ? 2 : 0
}
```

#### Test Environment Isolation
```typescript
// Per-test isolation
beforeEach(() => {
  jest.clearAllMocks();        // Clear mock call history
  cleanup();                   // React Testing Library cleanup
  // Reset global state
});

afterEach(() => {
  jest.restoreAllMocks();      // Restore original implementations
});
```

## Quality Assurance Layers

### 1. Functional Testing
- **Unit Tests**: Individual component behavior
- **Integration Tests**: Component interaction
- **E2E Tests**: Complete user workflows

### 2. Non-Functional Testing

#### Performance Testing
```typescript
// Performance benchmark example
test('Page load performance', async ({ page }) => {
  const startTime = Date.now();
  await page.goto('/');
  const loadTime = Date.now() - startTime;
  
  expect(loadTime).toBeLessThan(3000);     // 3 second SLA
});

// Memory usage monitoring
test('Memory usage within limits', async ({ page }) => {
  const metrics = await page.evaluate(() => performance.memory);
  expect(metrics.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024); // 100MB
});
```

#### Accessibility Testing
```typescript
// Automated accessibility validation
test('WCAG 2.1 AA compliance', async ({ page }) => {
  await page.addScriptTag({ url: 'https://unpkg.com/axe-core' });
  
  const results = await page.evaluate(() => axe.run());
  
  // No critical or serious accessibility violations
  expect(results.violations.filter(v => 
    v.impact === 'critical' || v.impact === 'serious'
  )).toHaveLength(0);
});

// Manual accessibility testing
test('Keyboard navigation', async ({ page }) => {
  await page.keyboard.press('Tab');
  const focusedElement = page.locator(':focus');
  await expect(focusedElement).toBeVisible();
});
```

#### Visual Regression Testing
```typescript
// Screenshot comparison
test('Visual consistency', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('homepage.png', {
    threshold: 0.2,              // 20% difference tolerance
    maxDiffPixels: 1000         // Maximum pixel difference
  });
});

// Responsive design validation
const viewports = [
  { width: 1920, height: 1080 }, // Desktop
  { width: 768, height: 1024 },  // Tablet  
  { width: 375, height: 667 }    // Mobile
];

for (const viewport of viewports) {
  test(`Responsive at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await expect(page).toHaveScreenshot(`responsive-${viewport.width}.png`);
  });
}
```

### 3. Cross-Browser Testing
```typescript
// Browser compatibility matrix
const browserFeatureTests = {
  chromium: {
    webComponents: true,
    intersectionObserver: true,
    resizeObserver: true
  },
  firefox: {
    mozAppearance: true,
    firefoxSpecificAPIs: true
  },
  webkit: {
    safariDatePicker: true,
    webkitSpecificFeatures: true
  }
};

// Feature detection and compatibility testing
for (const [browser, features] of Object.entries(browserFeatureTests)) {
  test.describe(`${browser} specific features`, () => {
    // Browser-specific feature validation
  });
}
```

## Error Detection Strategy

### 1. Compile-Time Detection
- **TypeScript**: Type mismatches, undefined variables
- **ESLint**: Code quality issues, potential bugs
- **Build Process**: Import/export errors, asset issues

### 2. Test-Time Detection
- **Unit Tests**: Logic errors, edge cases
- **Integration Tests**: Component interaction issues
- **E2E Tests**: User workflow problems

### 3. Runtime Detection
- **Error Boundaries**: React component errors
- **Global Error Handlers**: Unhandled exceptions
- **Performance Monitoring**: Resource usage issues

## Test Data Management

### Data Generation Strategy
```typescript
// Hierarchical data generation
export const TestDataFactory = {
  // Base entities
  user: (overrides = {}) => createMockUser(overrides),
  task: (overrides = {}) => createMockTask(overrides),
  team: (overrides = {}) => createMockTeam(overrides),
  
  // Complex scenarios
  userWithTasks: (taskCount = 3) => ({
    user: TestDataFactory.user(),
    tasks: Array.from({ length: taskCount }, (_, i) => 
      TestDataFactory.task({ text: `Task ${i + 1}` })
    )
  }),
  
  teamWithMembers: (memberCount = 5) => ({
    team: TestDataFactory.team(),
    members: Array.from({ length: memberCount }, (_, i) =>
      TestDataFactory.user({ email: `member${i + 1}@example.com` })
    )
  })
};
```

### State Management Testing
```typescript
// Context state testing
const renderWithProviders = (component, initialState = {}) => {
  const AllProviders = ({ children }) => (
    <QueryClient>
      <AuthProvider initialUser={initialState.user}>
        <WorkspaceProvider initialWorkspace={initialState.workspace}>
          {children}
        </WorkspaceProvider>
      </AuthProvider>
    </QueryClient>
  );

  return render(component, { wrapper: AllProviders });
};
```

## Maintenance and Evolution

### Test Maintenance Strategies

#### 1. Automated Test Health Monitoring
```typescript
// Test execution time tracking
const testExecutionTimes = {
  unit: { target: 30, warning: 45, critical: 60 },      // seconds
  integration: { target: 120, warning: 180, critical: 300 },
  e2e: { target: 900, warning: 1200, critical: 1800 }   // 15-30 minutes
};

// Flaky test detection
const flakyTestDetection = {
  successRate: 0.95,           // 95% success rate minimum
  consecutiveFailures: 3,      // Alert after 3 consecutive failures
  intermittentFailures: 5      // Alert after 5 intermittent failures
};
```

#### 2. Coverage Analysis and Improvement
```typescript
// Coverage targets by component type
const coverageTargets = {
  components: { statements: 85, branches: 80, functions: 90 },
  hooks: { statements: 90, branches: 85, functions: 95 },
  services: { statements: 95, branches: 90, functions: 100 },
  utils: { statements: 100, branches: 95, functions: 100 }
};
```

#### 3. Performance Regression Prevention
```typescript
// Performance benchmark tracking
const performanceBenchmarks = {
  pageLoad: { baseline: 2000, threshold: 2500 },        // ms
  taskCreation: { baseline: 100, threshold: 150 },      // ms
  memoryUsage: { baseline: 50, threshold: 100 },        // MB
  bundleSize: { baseline: 500, threshold: 750 }         // KB
};
```

### Continuous Improvement Process

#### 1. Regular Review Cycles
- **Weekly**: Flaky test analysis and fixes
- **Monthly**: Coverage analysis and gap identification
- **Quarterly**: Performance benchmark review and adjustment

#### 2. Feedback Integration
- **Developer Feedback**: Test usability and maintenance burden
- **CI/CD Metrics**: Build time and failure rate analysis
- **Production Monitoring**: Real-world error correlation with test gaps

#### 3. Technology Evolution
- **Framework Updates**: Jest, Playwright, React Testing Library
- **New Testing Techniques**: Mutation testing, contract testing
- **Platform Evolution**: Browser updates, device support

## Conclusion

This testing architecture provides comprehensive quality assurance through:

1. **Multi-layered Defense**: Each layer catches different types of issues
2. **Scalable Infrastructure**: Supports team growth and feature expansion
3. **Maintainable Codebase**: Clear patterns and consistent approaches
4. **Continuous Quality**: Automated detection and prevention of regressions

The architecture balances thorough coverage with execution efficiency, ensuring both development velocity and product quality.
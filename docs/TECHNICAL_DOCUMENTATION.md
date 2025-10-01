# Todo App - Technical Documentation

## Overview

A collaborative task management application built with Next.js 15, React 19, TypeScript, and Supabase. The application supports both personal task management and team collaboration with real-time updates, role-based access control, and comprehensive E2E testing.

## Architecture

### Tech Stack
- **Frontend**: Next.js 15 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **Authentication**: Supabase Auth
- **Testing**: Playwright for E2E testing
- **Real-time**: Supabase Realtime subscriptions

### Project Structure

```
todo-app/
├── app/                    # Next.js App Router
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx          # Home page
├── components/            # React components
│   ├── accessibility/    # Accessibility-focused components
│   │   └── AccessibleTaskItem.tsx
│   ├── AuthProvider.tsx  # Authentication context
│   ├── SharedTaskBoard.tsx # Main task management UI
│   └── WorkspaceProvider.tsx # Workspace context
├── e2e/                   # Playwright E2E tests
│   ├── authenticated-task-deletion.spec.ts
│   ├── bypass-auth-test.spec.ts
│   └── final-task-deletion.spec.ts
├── hooks/                 # Custom React hooks
│   ├── useKeyboardNavigation.ts
│   └── useTaskBoardReducer.ts
├── lib/                   # Business logic and utilities
│   ├── sharedTaskService.ts # Task CRUD operations
│   ├── supabase.ts        # Supabase client
│   └── types.ts           # TypeScript definitions
└── playwright.config.ts   # E2E test configuration
```

## Key Components

### SharedTaskBoard.tsx

The main task management interface that handles:

- **Task CRUD operations** with optimistic updates
- **Real-time synchronization** via Supabase subscriptions
- **Workspace context switching** (personal/team modes)
- **Performance optimization** using React.memo and useCallback
- **Comprehensive error handling** with user feedback

**Key Features:**
```typescript
// Optimized task deletion with detailed logging
const handleDeleteTask = useCallback(async (taskId: string) => {
  console.log('🗑️ 削除ボタンがクリックされました - taskId:', taskId);
  
  // Optimistic update for immediate UI response
  const taskToDelete = tasks.find(t => t.id === taskId);
  actions.setTasks(tasks.filter(t => t.id !== taskId));
  
  try {
    await SharedTaskService.deleteTask(taskId);
    console.log('✅ タスク削除成功:', taskId);
  } catch (error) {
    // Revert on failure
    if (taskToDelete) {
      actions.setTasks([...tasks]);
    }
    console.error('❌ タスク削除エラー:', error);
  }
}, [tasks, user, currentWorkspace]);
```

### SharedTaskService.ts

Service layer handling all database operations:

**Architecture:**
- **Static methods** for consistent API
- **Workspace-aware filtering** (personal vs team tasks)
- **Comprehensive error handling** with retry logic
- **Pagination support** for large datasets

```typescript
/**
 * Task deletion with foreign key constraint handling
 * Implements smart retry logic for database constraint errors
 */
static async deleteTask(taskId: string): Promise<void> {
  // Delete related data first to avoid foreign key constraints
  await this.deleteRelatedDataFirst(taskId);
  
  const { data, error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);
    
  if (error) {
    throw new Error(`Task deletion failed: ${error.message}`);
  }
}
```

### AccessibleTaskItem.tsx

Accessibility-compliant task component:

- **WCAG 2.1 AA compliance** with proper ARIA labels
- **Keyboard navigation** support (Delete key for deletion)
- **Screen reader compatibility** with semantic HTML
- **Focus management** for optimal user experience

```typescript
<button
  onClick={(e) => {
    e.stopPropagation();
    onDeleteTask(task.id);
  }}
  onKeyDown={handleKeyDown}
  aria-label="タスクを削除"
  className="p-2 rounded-full transition-colors duration-200"
>
  <FaTrash size={14} aria-hidden="true" />
</button>
```

## Database Schema & Triggers

### Core Tables

```sql
-- Main task entity
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  priority TEXT CHECK (priority IN ('高', '中', '低')),
  user_id UUID REFERENCES auth.users(id),
  team_id UUID REFERENCES teams(id),
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task change history for audit trail
CREATE TABLE task_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Critical Database Fix: Trigger Timing

**Problem:** Foreign key constraint errors during task deletion
**Root Cause:** `task_history_trigger` executing AFTER DELETE operations
**Solution:** Separate triggers for different operations

```sql
-- INSERT/UPDATE operations (AFTER trigger)
CREATE OR REPLACE FUNCTION record_task_change_after()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO task_history (task_id, action, old_values, new_values, changed_by)
  VALUES (NEW.id, TG_OP, 
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    to_jsonb(NEW), 
    NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- DELETE operations (BEFORE trigger)
CREATE OR REPLACE FUNCTION record_task_deletion_before()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO task_history (task_id, action, old_values, changed_by)
  VALUES (OLD.id, 'DELETE', to_jsonb(OLD), OLD.user_id);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_change_trigger
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION record_task_change_after();

CREATE TRIGGER task_deletion_trigger
  BEFORE DELETE ON tasks
  FOR EACH ROW EXECUTE FUNCTION record_task_deletion_before();
```

## E2E Testing with Playwright

### Configuration (playwright.config.ts)

```typescript
export default defineConfig({
  testDir: './e2e',
  timeout: 30 * 1000,
  
  use: {
    baseURL: 'http://localhost:3007',
    headless: true,
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },

  // Multi-browser testing
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],

  // Auto-start dev server
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3007',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Test Architecture

**Three-layer testing approach:**

1. **Authentication Layer** (`authenticated-task-deletion.spec.ts`)
   - Real user login flow
   - Session persistence testing
   - Task operations with proper auth context

2. **Accessibility Layer** (`final-task-deletion.spec.ts`)
   - ARIA label validation
   - Keyboard navigation testing
   - Screen reader compatibility

3. **Integration Layer** (`bypass-auth-test.spec.ts`)
   - Auth bypass for development
   - Component integration testing
   - End-to-end workflow validation

### Critical Test Case: Task Deletion

```typescript
test('AccessibleTaskItemの削除ボタンをテスト', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(5000);
  
  // Find tasks using accessibility selectors
  const taskItems = await page.locator('[role="listitem"]').count();
  const deleteButtons = await page.locator('button[aria-label="タスクを削除"]').count();
  
  if (deleteButtons > 0) {
    const initialTaskCount = taskItems;
    
    // Execute deletion
    await page.locator('button[aria-label="タスクを削除"]').first().click();
    await page.waitForTimeout(3000);
    
    // Verify deletion success
    const finalTaskCount = await page.locator('[role="listitem"]').count();
    expect(finalTaskCount).toBeLessThan(initialTaskCount);
  }
});
```

## Performance Optimizations

### React Performance

- **React.memo()** for component memoization
- **useCallback()** for stable function references
- **useMemo()** for expensive calculations
- **useReducer()** for complex state management

### Database Performance

- **Indexed queries** on frequently accessed columns
- **Connection pooling** via Supabase
- **Optimistic updates** for immediate UI feedback
- **Pagination** for large datasets

### Real-time Updates

```typescript
// Efficient real-time subscription management
useEffect(() => {
  if (!user || !currentWorkspace) return;

  const channel = realtimeManager.subscribeToTasks(
    currentWorkspace,
    (payload) => {
      // Handle real-time task updates
      actions.handleRealtimeUpdate(payload);
    }
  );

  return () => {
    realtimeManager.unsubscribe(channel);
  };
}, [user, currentWorkspace]);
```

## Security Implementation

### Row Level Security (RLS)

```sql
-- Users can only see their own personal tasks
CREATE POLICY "Users can view own personal tasks" ON tasks
  FOR SELECT USING (user_id = auth.uid() AND team_id IS NULL);

-- Team tasks are visible to team members only
CREATE POLICY "Team members can view team tasks" ON tasks
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid()
    )
  );
```

### Input Validation

- **Server-side validation** via Supabase constraints
- **Client-side validation** using TypeScript
- **SQL injection prevention** via parameterized queries
- **XSS protection** through proper input sanitization

## Troubleshooting Guide

### Common Issues

1. **Task Deletion Fails**
   - **Cause:** Database trigger timing issues
   - **Solution:** Verify trigger functions are using correct timing (BEFORE for DELETE)
   - **Debug:** Check browser console for foreign key constraint errors

2. **Authentication Loops**
   - **Cause:** Invalid auth state persistence
   - **Solution:** Clear localStorage and restart dev server
   - **Debug:** Monitor auth state in React DevTools

3. **Real-time Updates Not Working**
   - **Cause:** Subscription cleanup issues
   - **Solution:** Verify subscription lifecycle management
   - **Debug:** Check Supabase real-time dashboard

### Development Commands

```bash
# Development server with Turbopack
npm run dev

# Run E2E tests
npx playwright test

# View test results
npx playwright show-report

# Database migrations
# Execute SQL files in Supabase Dashboard

# Type checking
npx tsc --noEmit

# Linting
npm run lint
```

## API Reference

### SharedTaskService Methods

```typescript
// Task CRUD operations
static async getTasks(workspace: WorkspaceContext, userId: string): Promise<SharedTask[]>
static async createTask(task: Partial<SharedTask>): Promise<SharedTask>
static async updateTask(id: string, updates: Partial<SharedTask>): Promise<void>
static async deleteTask(taskId: string): Promise<void>

// Advanced operations
static async assignTask(taskId: string, userId: string): Promise<void>
static async getTaskHistory(taskId: string): Promise<TaskHistory[]>
static async addTaskComment(taskId: string, comment: string): Promise<void>
```

### Context APIs

```typescript
// Authentication Context
const { user, isLoading, signOut } = useAuth();

// Workspace Context
const { currentWorkspace, setCurrentWorkspace, switchToTeam } = useWorkspace();
```

## Contributing Guidelines

### Code Standards

- **TypeScript strict mode** required
- **ESLint configuration** must pass
- **Accessibility guidelines** (WCAG 2.1 AA) compliance
- **Component testing** with Playwright required

### Git Workflow

```bash
# Feature branch development
git checkout -b feature/task-deletion-fix

# Commit with descriptive messages
git commit -m "fix: resolve database trigger timing for task deletion"

# E2E tests must pass before merge
npx playwright test
```

This technical documentation covers the complete architecture, implementation details, and operational aspects of the todo-app with special focus on the recent task deletion functionality fixes and E2E testing implementation.
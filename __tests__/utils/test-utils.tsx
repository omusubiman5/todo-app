import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { User, Session } from '@supabase/supabase-js';

// Test wrapper component that provides mocked contexts
const TestProviders = ({ children }: { children: React.ReactNode }) => {
  const { AuthProvider } = require('@/components/AuthProvider');
  const { WorkspaceProvider } = require('@/components/WorkspaceProvider');
  
  return (
    <div data-testid="test-providers">
      <AuthProvider>
        <WorkspaceProvider>
          {children}
        </WorkspaceProvider>
      </AuthProvider>
    </div>
  );
};

// AuthProvider と WorkspaceProvider をモック
jest.mock('@/components/AuthProvider', () => ({
  useAuth: jest.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children
}));

jest.mock('@/components/WorkspaceProvider', () => ({
  useWorkspace: jest.fn(),
  WorkspaceProvider: ({ children }: { children: React.ReactNode }) => children
}));

// Mock data generators
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User',
    avatar_url: null,
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides
});

export const createMockTask = (overrides = {}) => ({
  id: 'test-task-id',
  text: 'Test Task',
  completed: false,
  priority: '中' as const,
  user_id: 'test-user-id',
  team_id: null,
  assigned_to: null,
  created_by: 'test-user-id',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides
});

export const createMockTeam = (overrides = {}) => ({
  id: 'test-team-id',
  name: 'Test Team',
  description: 'Test team description',
  avatar_url: null,
  created_by: 'test-user-id',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides
});

export const createMockWorkspace = (overrides = {}) => ({
  type: 'personal' as const,
  team_id: null,
  team_name: '個人タスク',
  ...overrides
});

// Custom render function with default mock setup
interface MockUser {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

interface MockWorkspace {
  type: 'personal' | 'team';
  team_id: string | null;
  team_name?: string;
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  mockUser?: MockUser | null;
  mockWorkspace?: MockWorkspace | null;
}

const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { 
    mockUser = createMockUser(), 
    mockWorkspace = createMockWorkspace(), 
    ...renderOptions 
  } = options;

  // Get the mocked hooks and set up return values
  const { useAuth } = require('@/components/AuthProvider');
  const { useWorkspace } = require('@/components/WorkspaceProvider');

  // Setup mocks before rendering
  useAuth.mockReturnValue({
    user: mockUser,
    session: mockUser ? { user: mockUser } as Session : null,
    loading: false,
    sessionExpiry: null,
    isSessionValid: !!mockUser,
    login: jest.fn(),
    logout: jest.fn().mockResolvedValue(undefined),
    refreshSession: jest.fn().mockResolvedValue(true),
    checkSessionHealth: jest.fn().mockReturnValue(!!mockUser)
  });

  useWorkspace.mockReturnValue({
    currentWorkspace: mockWorkspace,
    availableWorkspaces: {
      personal: { type: 'personal', team_id: null, team_name: '個人タスク' },
      teams: []
    },
    switchWorkspace: jest.fn(),
    refreshWorkspaces: jest.fn().mockResolvedValue(undefined),
    isLoading: false
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestProviders>{children}</TestProviders>
  );

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...renderOptions })
  };
};

// Export userEvent for tests
export { userEvent };

// Async utilities
export const waitForLoadingToFinish = () =>
  new Promise(resolve => setTimeout(resolve, 0));

export const waitForNextTick = () =>
  new Promise(resolve => process.nextTick(resolve));

// Mock API responses
export const mockSuccessResponse = <T,>(data: T) =>
  Promise.resolve({ data, error: null });

export const mockErrorResponse = (error: { message: string; code?: string }) =>
  Promise.resolve({ data: null, error });

// Test IDs constants
export const TEST_IDS = {
  TASK_ITEM: 'task-item',
  TASK_LIST: 'task-list',
  TASK_FORM: 'task-form',
  TASK_FILTERS: 'task-filters',
  TASK_STATS: 'task-stats',
  LOGIN_FORM: 'login-form',
  AUTH_PROVIDER: 'auth-provider',
  WORKSPACE_PROVIDER: 'workspace-provider',
  LOADING_SPINNER: 'loading-spinner',
  ERROR_MESSAGE: 'error-message'
} as const;

// API mocks
export const createMockSupabaseClient = () => ({
  auth: {
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } }
    })),
    refreshSession: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    getUser: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis()
  })),
  channel: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn()
  }))
});

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };
export { customRender };

// Jest requires at least one test
describe('Test Utils', () => {
  it('モックデータジェネレーターが動作する', () => {
    const mockUser = createMockUser();
    const mockTask = createMockTask();
    const mockTeam = createMockTeam();
    const mockWorkspace = createMockWorkspace();

    expect(mockUser).toHaveProperty('id');
    expect(mockUser).toHaveProperty('email');
    expect(mockTask).toHaveProperty('text');
    expect(mockTask).toHaveProperty('priority');
    expect(mockTeam).toHaveProperty('name');
    expect(mockWorkspace).toHaveProperty('type');
  });

  it('テストユーティリティが定義されている', () => {
    expect(TEST_IDS).toBeDefined();
    expect(mockSuccessResponse).toBeDefined();
    expect(mockErrorResponse).toBeDefined();
    expect(waitForLoadingToFinish).toBeDefined();
  });

  it('Supabaseクライアントモックが動作する', () => {
    const mockClient = createMockSupabaseClient();
    expect(mockClient.auth).toBeDefined();
    expect(mockClient.from).toBeDefined();
    expect(mockClient.channel).toBeDefined();
  });
});
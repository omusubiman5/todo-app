import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '@/components/AuthProvider';
import { WorkspaceProvider } from '@/components/WorkspaceProvider';

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
  team_name: null,
  ...overrides
});

// Context providers wrapper
interface AllTheProvidersProps {
  children: React.ReactNode;
  mockUser?: any;
  mockWorkspace?: any;
  requireAuth?: boolean;
}

const AllTheProviders = ({ 
  children, 
  mockUser = null, 
  mockWorkspace = null,
  requireAuth = false 
}: AllTheProvidersProps) => {
  // Mock AuthProvider
  const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
    const mockAuthValue = {
      user: mockUser,
      session: mockUser ? { user: mockUser } : null,
      loading: false,
      sessionExpiry: null,
      isSessionValid: !!mockUser,
      login: jest.fn(),
      logout: jest.fn(),
      refreshSession: jest.fn(() => Promise.resolve(true)),
      checkSessionHealth: jest.fn(() => !!mockUser)
    };

    return React.createElement(
      'div',
      { 'data-testid': 'auth-provider' },
      children
    );
  };

  // Mock WorkspaceProvider
  const MockWorkspaceProvider = ({ children }: { children: React.ReactNode }) => {
    const mockWorkspaceValue = {
      workspace: mockWorkspace || createMockWorkspace(),
      currentWorkspace: mockWorkspace || createMockWorkspace(),
      userTeams: [],
      loading: false,
      switchWorkspace: jest.fn(),
      refreshTeams: jest.fn()
    };

    return React.createElement(
      'div',
      { 'data-testid': 'workspace-provider' },
      children
    );
  };

  return (
    <MockAuthProvider>
      <MockWorkspaceProvider>
        {children}
      </MockWorkspaceProvider>
    </MockAuthProvider>
  );
};

// Custom render function
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  mockUser?: any;
  mockWorkspace?: any;
  requireAuth?: boolean;
}

const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { mockUser, mockWorkspace, requireAuth, ...renderOptions } = options;

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AllTheProviders
      mockUser={mockUser}
      mockWorkspace={mockWorkspace}
      requireAuth={requireAuth}
    >
      {children}
    </AllTheProviders>
  );

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...renderOptions })
  };
};

// Async utilities
export const waitForLoadingToFinish = () =>
  new Promise(resolve => setTimeout(resolve, 0));

export const waitForNextTick = () =>
  new Promise(resolve => process.nextTick(resolve));

// Mock API responses
export const mockSuccessResponse = (data: any) => 
  Promise.resolve({ data, error: null });

export const mockErrorResponse = (error: any) =>
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

// Custom matchers
export const customMatchers = {
  toBeInTheDocument: (received: any) => {
    const pass = received && document.body.contains(received);
    return {
      message: () =>
        pass
          ? `Expected element not to be in the document`
          : `Expected element to be in the document`,
      pass
    };
  }
};

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
    resetPasswordForEmail: jest.fn()
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
    containedBy: jest.fn().mockReturnThis(),
    rangeGt: jest.fn().mockReturnThis(),
    rangeGte: jest.fn().mockReturnThis(),
    rangeLt: jest.fn().mockReturnThis(),
    rangeLte: jest.fn().mockReturnThis(),
    rangeAdjacent: jest.fn().mockReturnThis(),
    overlaps: jest.fn().mockReturnThis(),
    textSearch: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    abortSignal: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockReturnThis(),
    csv: jest.fn().mockReturnThis(),
    geojson: jest.fn().mockReturnThis(),
    explain: jest.fn().mockReturnThis(),
    rollback: jest.fn().mockReturnThis(),
    returns: jest.fn().mockReturnThis()
  })),
  channel: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn()
  }))
});

// Re-export everything
export * from '@testing-library/react';
// userEvent is included in @testing-library/react
export const userEvent = {
  setup: () => ({
    click: jest.fn(),
    type: jest.fn(),
    clear: jest.fn(),
    selectOptions: jest.fn(),
    tab: jest.fn(),
    keyboard: jest.fn()
  })
};
export { customRender as render };
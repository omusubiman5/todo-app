/**
 * AuthProvider ユニットテスト
 * 無限リダイレクトループの問題を特定するためのテスト
 */

// Next.jsナビゲーションをモック
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      })),
      signOut: jest.fn(),
      refreshSession: jest.fn()
    }
  }
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace
  }),
  usePathname: () => '/login'
}));

jest.mock('@/lib/authErrors', () => ({
  logAuthEvent: jest.fn()
}));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';

// テスト用コンポーネント
const TestComponent = () => {
  const { user, loading } = useAuth();
  return React.createElement('div', {},
    React.createElement('div', { 'data-testid': 'loading' }, loading ? 'loading' : 'not-loading'),
    React.createElement('div', { 'data-testid': 'user' }, user ? 'logged-in' : 'not-logged-in')
  );
};

describe('AuthProvider リダイレクトループテスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null
    });
  });

  test('requireAuth=false の場合、リダイレクトが発生しないこと', async () => {
    render(
      React.createElement(AuthProvider, { requireAuth: false },
        React.createElement(TestComponent)
      )
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    // リダイレクトが呼ばれていないことを確認
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('requireAuth=true の場合、ログインしていない時のリダイレクト', async () => {
    render(
      React.createElement(AuthProvider, { requireAuth: true },
        React.createElement(TestComponent)
      )
    );

    // リダイレクトが発生することを確認（テストコンポーネントはレンダリングされない）
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  test('ログイン状態の場合、コンテンツが表示されること', async () => {
    const mockUser = { id: 'test-user', email: 'test@example.com' };
    const mockSession = { user: mockUser, expires_at: Date.now() + 3600000 };

    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
      error: null
    });

    render(
      React.createElement(AuthProvider, { requireAuth: true },
        React.createElement(TestComponent)
      )
    );

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('logged-in');
    });

    // リダイレクトが呼ばれていないことを確認
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('認証状態変更リスナーが正しく設定されること', () => {
    render(
      React.createElement(AuthProvider, { requireAuth: false },
        React.createElement(TestComponent)
      )
    );

    expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
  });
});
/**
 * 管理者API統合テストスイート
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// テスト用のモック
const mockSupabaseAdmin = {
  from: jest.fn(),
  auth: {
    getUser: jest.fn(),
    admin: {
      generateLink: jest.fn()
    }
  }
};

const mockSupabase = {
  auth: {
    getUser: jest.fn()
  }
};

// Supabaseクライアントのモック
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn((url, key) => {
    if (key === process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return mockSupabaseAdmin;
    }
    return mockSupabase;
  })
}));

// 管理者認証のモック
jest.mock('@/lib/adminAuth', () => ({
  adminAuthMiddleware: jest.fn(),
  recordAdminAuditLog: jest.fn()
}));

import { adminAuthMiddleware, recordAdminAuditLog } from '@/lib/adminAuth';

describe('Admin API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // 環境変数のモック
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.NEXT_PUBLIC_APP_URL = 'https://test-app.com';
  });

  describe('Users List API - GET /api/admin/users/list', () => {
    const mockAdmin = {
      id: 'admin-123',
      user_id: 'user-123',
      role: 'user_admin',
      permissions: {}
    };

    const mockClientInfo = {
      ip: '192.168.1.1',
      userAgent: 'Test Browser',
      sessionId: 'session-123'
    };

    beforeEach(() => {
      (adminAuthMiddleware as jest.Mock).mockResolvedValue({
        admin: mockAdmin,
        clientInfo: mockClientInfo
      });

      (recordAdminAuditLog as jest.Mock).mockResolvedValue('audit-log-123');
    });

    it('should return users list with proper authentication', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@test.com',
          created_at: '2024-01-01T00:00:00Z',
          account_status: 'active',
          task_count: 5,
          team_count: 2,
          is_ip_blocked: false
        },
        {
          id: 'user-2',
          email: 'user2@test.com',
          created_at: '2024-01-02T00:00:00Z',
          account_status: 'suspended',
          task_count: 0,
          team_count: 1,
          is_ip_blocked: true
        }
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockUsers,
          error: null,
          count: 2
        })
      };

      mockSupabaseAdmin.from.mockReturnValue(mockQuery);

      const request = new NextRequest('https://test.com/api/admin/users/list?page=1&limit=50', {
        method: 'GET'
      });

      const response = await getUsersList(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.users).toHaveLength(2);
      expect(responseData.pagination.total).toBe(2);
      expect(responseData.pagination.page).toBe(1);

      // 認証ミドルウェアが正しく呼ばれたことを確認
      expect(adminAuthMiddleware).toHaveBeenCalledWith(request, 'users.view');

      // 監査ログが記録されたことを確認
      expect(recordAdminAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          admin_id: mockAdmin.id,
          target_type: 'system',
          success: true
        })
      );
    });

    it('should handle search queries correctly', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0
        })
      };

      mockSupabaseAdmin.from.mockReturnValue(mockQuery);

      const request = new NextRequest('https://test.com/api/admin/users/list?search=john@example.com', {
        method: 'GET'
      });

      await getUsersList(request);

      expect(mockQuery.ilike).toHaveBeenCalledWith('email', '%john@example.com%');
    });

    it('should handle filters correctly', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0
        })
      };

      mockSupabaseAdmin.from.mockReturnValue(mockQuery);

      const request = new NextRequest('https://test.com/api/admin/users/list?filter.status=active&filter.role=admin', {
        method: 'GET'
      });

      await getUsersList(request);

      expect(mockQuery.eq).toHaveBeenCalledWith('account_status', 'active');
      expect(mockQuery.not).toHaveBeenCalledWith('admin_role', 'is', null);
    });

    it('should return error when authentication fails', async () => {
      (adminAuthMiddleware as jest.Mock).mockResolvedValue(
        new Response('Unauthorized', { status: 401 })
      );

      const request = new NextRequest('https://test.com/api/admin/users/list', {
        method: 'GET'
      });

      const response = await getUsersList(request);

      expect(response.status).toBe(401);
    });

    it('should handle database errors gracefully', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' },
          count: null
        })
      };

      mockSupabaseAdmin.from.mockReturnValue(mockQuery);

      const request = new NextRequest('https://test.com/api/admin/users/list', {
        method: 'GET'
      });

      const response = await getUsersList(request);

      expect(response.status).toBe(500);

      // エラーが監査ログに記録されることを確認
      expect(recordAdminAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error_code: 'DATABASE_QUERY_FAILED'
        })
      );
    });
  });

  describe('Password Reset API - POST /api/admin/users/[id]/reset-password', () => {
    const mockAdmin = {
      id: 'admin-123',
      user_id: 'admin-user-123',
      role: 'user_admin',
      permissions: {}
    };

    const mockClientInfo = {
      ip: '192.168.1.1',
      userAgent: 'Test Browser',
      sessionId: 'session-123'
    };

    beforeEach(() => {
      (adminAuthMiddleware as jest.Mock).mockResolvedValue({
        admin: mockAdmin,
        clientInfo: mockClientInfo
      });

      (recordAdminAuditLog as jest.Mock).mockResolvedValue('audit-log-123');
    });

    it('should successfully reset user password with email notification', async () => {
      const targetUserId = 'target-user-123';
      const mockTargetUser = {
        id: targetUserId,
        email: 'target@test.com',
        account_status: 'active',
        admin_role: null
      };

      // ユーザー詳細取得のモック
      const mockUserQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockTargetUser,
          error: null
        })
      };

      // パスワード履歴挿入のモック
      const mockHistoryQuery = {
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      };

      mockSupabaseAdmin.from
        .mockReturnValueOnce(mockUserQuery) // 1回目: ユーザー詳細取得
        .mockReturnValueOnce(mockHistoryQuery); // 2回目: パスワード履歴

      // パスワードリセットリンク生成のモック
      mockSupabaseAdmin.auth.admin.generateLink.mockResolvedValue({
        data: {
          properties: {
            action_link: 'https://test.supabase.co/auth/v1/verify?token=test-token&type=recovery'
          }
        },
        error: null
      });

      const requestBody = {
        user_id: targetUserId,
        force_change: true,
        notify_user: true,
        reason: 'User forgot password'
      };

      const request = new NextRequest(`https://test.com/api/admin/users/${targetUserId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await resetPassword(request, { params: { id: targetUserId } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.email_sent).toBe(true);
      expect(responseData.audit_log_id).toBe('audit-log-123');

      // 認証が確認されたことを確認
      expect(adminAuthMiddleware).toHaveBeenCalledWith(request, 'users.password_reset');

      // 監査ログが記録されたことを確認
      expect(recordAdminAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          admin_id: mockAdmin.id,
          action: 'user_password_reset',
          target_type: 'user',
          target_id: targetUserId,
          target_email: mockTargetUser.email,
          success: true
        })
      );
    });

    it('should return error when target user not found', async () => {
      const targetUserId = 'nonexistent-user';

      const mockUserQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'User not found' }
        })
      };

      mockSupabaseAdmin.from.mockReturnValue(mockUserQuery);

      const requestBody = {
        user_id: targetUserId,
        reason: 'Test reset'
      };

      const request = new NextRequest(`https://test.com/api/admin/users/${targetUserId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await resetPassword(request, { params: { id: targetUserId } });

      expect(response.status).toBe(404);

      // エラーが監査ログに記録されることを確認
      expect(recordAdminAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error_code: 'USER_NOT_FOUND'
        })
      );
    });

    it('should prevent self password reset', async () => {
      const targetUserId = mockAdmin.user_id; // 自分自身

      const requestBody = {
        user_id: targetUserId,
        reason: 'Self reset attempt'
      };

      const request = new NextRequest(`https://test.com/api/admin/users/${targetUserId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await resetPassword(request, { params: { id: targetUserId } });

      expect(response.status).toBe(400);

      const responseData = await response.json();
      expect(responseData.code).toBe('SELF_OPERATION_NOT_ALLOWED');
    });

    it('should prevent non-super-admin from resetting super-admin password', async () => {
      const targetUserId = 'super-admin-user';
      const mockSuperAdmin = {
        id: targetUserId,
        email: 'superadmin@test.com',
        account_status: 'active',
        admin_role: 'super_admin'
      };

      const mockUserQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockSuperAdmin,
          error: null
        })
      };

      mockSupabaseAdmin.from.mockReturnValue(mockUserQuery);

      const requestBody = {
        user_id: targetUserId,
        reason: 'Unauthorized attempt'
      };

      const request = new NextRequest(`https://test.com/api/admin/users/${targetUserId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await resetPassword(request, { params: { id: targetUserId } });

      expect(response.status).toBe(403);

      // 権限不足が監査ログに記録されることを確認
      expect(recordAdminAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error_code: 'INSUFFICIENT_PRIVILEGES'
        })
      );
    });

    it('should handle emergency reset without email notification', async () => {
      const targetUserId = 'target-user-123';
      const mockTargetUser = {
        id: targetUserId,
        email: 'target@test.com',
        account_status: 'active',
        admin_role: null
      };

      const mockUserQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockTargetUser,
          error: null
        })
      };

      const mockHistoryQuery = {
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      };

      mockSupabaseAdmin.from
        .mockReturnValueOnce(mockUserQuery)
        .mockReturnValueOnce(mockHistoryQuery);

      // 緊急時用リセットトークン生成
      mockSupabaseAdmin.auth.admin.generateLink.mockResolvedValue({
        data: {
          properties: {
            action_link: 'https://test.supabase.co/auth/v1/verify?token=emergency-token&type=recovery'
          }
        },
        error: null
      });

      const requestBody = {
        user_id: targetUserId,
        notify_user: false, // メール通知なし
        reason: 'Emergency reset'
      };

      const request = new NextRequest(`https://test.com/api/admin/users/${targetUserId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await resetPassword(request, { params: { id: targetUserId } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.email_sent).toBe(false);
      expect(responseData.reset_token).toBe('emergency-token');
    });

    it('should validate request body format', async () => {
      const targetUserId = 'target-user-123';

      // 無効なJSON
      const request = new NextRequest(`https://test.com/api/admin/users/${targetUserId}/reset-password`, {
        method: 'POST',
        body: 'invalid json'
      });

      const response = await resetPassword(request, { params: { id: targetUserId } });

      expect(response.status).toBe(500); // JSON parse error
    });

    it('should validate user_id consistency', async () => {
      const targetUserId = 'target-user-123';

      const requestBody = {
        user_id: 'different-user-456', // パスと異なるユーザーID
        reason: 'Inconsistent request'
      };

      const request = new NextRequest(`https://test.com/api/admin/users/${targetUserId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await resetPassword(request, { params: { id: targetUserId } });

      expect(response.status).toBe(400);

      const responseData = await response.json();
      expect(responseData.code).toBe('USER_ID_MISMATCH');
    });
  });
});
/**
 * 管理者によるパスワードリセット API
 * POST /api/admin/users/[id]/reset-password
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { adminAuthMiddleware, recordAdminAuditLog } from '@/lib/adminAuth';
import {
  AdminPasswordResetRequest,
  AdminPasswordResetResponse,
  AdminAPIError
} from '@/lib/types';

// Supabase 管理者クライアント
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // 管理者認証
  const authResult = await adminAuthMiddleware(req, 'users.password_reset');
  if ('status' in authResult) {
    return authResult; // エラーレスポンス
  }

  const { admin, clientInfo } = authResult;
  const targetUserId = params.id;

  try {
    // リクエストボディ解析
    const body: AdminPasswordResetRequest = await req.json();

    // バリデーション
    if (!targetUserId || targetUserId.trim() === '') {
      return Response.json({
        code: 'INVALID_USER_ID',
        message: 'Valid user ID is required',
        timestamp: new Date().toISOString(),
        request_id: `req_${Date.now()}`
      } as AdminAPIError, { status: 400 });
    }

    if (body.user_id && body.user_id !== targetUserId) {
      return Response.json({
        code: 'USER_ID_MISMATCH',
        message: 'User ID in path and body must match',
        timestamp: new Date().toISOString(),
        request_id: `req_${Date.now()}`
      } as AdminAPIError, { status: 400 });
    }

    // 対象ユーザーの存在確認
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('admin_user_details')
      .select('id, email, account_status, admin_role')
      .eq('id', targetUserId)
      .single();

    if (userError || !targetUser) {
      // ユーザーが見つからない場合の監査ログ
      await recordAdminAuditLog({
        admin_id: admin.id,
        action: 'user_password_reset',
        target_type: 'user',
        target_id: targetUserId,
        details: {
          reason: body.reason || 'Admin password reset',
          force_change: body.force_change || false,
          notify_user: body.notify_user !== false,
          error: 'User not found'
        },
        ip_address: clientInfo.ip,
        user_agent: clientInfo.userAgent,
        session_id: clientInfo.sessionId,
        success: false,
        error_code: 'USER_NOT_FOUND',
        error_message: 'Target user not found'
      });

      return Response.json({
        code: 'USER_NOT_FOUND',
        message: 'Target user not found',
        timestamp: new Date().toISOString(),
        request_id: `req_${Date.now()}`
      } as AdminAPIError, { status: 404 });
    }

    // 自分自身への操作チェック
    if (targetUserId === admin.user_id) {
      return Response.json({
        code: 'SELF_OPERATION_NOT_ALLOWED',
        message: 'Cannot reset your own password through admin interface',
        timestamp: new Date().toISOString(),
        request_id: `req_${Date.now()}`
      } as AdminAPIError, { status: 400 });
    }

    // スーパー管理者への操作制限（自分がスーパー管理者でない場合）
    if (targetUser.admin_role === 'super_admin' && admin.role !== 'super_admin') {
      await recordAdminAuditLog({
        admin_id: admin.id,
        action: 'user_password_reset',
        target_type: 'user',
        target_id: targetUserId,
        target_email: targetUser.email,
        details: {
          reason: body.reason || 'Admin password reset',
          admin_role: admin.role,
          target_admin_role: targetUser.admin_role,
          error: 'Insufficient privileges'
        },
        ip_address: clientInfo.ip,
        user_agent: clientInfo.userAgent,
        session_id: clientInfo.sessionId,
        success: false,
        error_code: 'INSUFFICIENT_PRIVILEGES',
        error_message: 'Cannot reset super admin password'
      });

      return Response.json({
        code: 'INSUFFICIENT_PRIVILEGES',
        message: 'Cannot reset super admin password',
        timestamp: new Date().toISOString(),
        request_id: `req_${Date.now()}`
      } as AdminAPIError, { status: 403 });
    }

    // パスワードリセット実行
    const resetResult = await executePasswordReset(
      targetUser.email,
      body.force_change || false,
      body.notify_user !== false
    );

    if (!resetResult.success) {
      // パスワードリセット失敗の監査ログ
      await recordAdminAuditLog({
        admin_id: admin.id,
        action: 'user_password_reset',
        target_type: 'user',
        target_id: targetUserId,
        target_email: targetUser.email,
        details: {
          reason: body.reason || 'Admin password reset',
          force_change: body.force_change || false,
          notify_user: body.notify_user !== false,
          error: resetResult.error
        },
        ip_address: clientInfo.ip,
        user_agent: clientInfo.userAgent,
        session_id: clientInfo.sessionId,
        success: false,
        error_code: 'PASSWORD_RESET_FAILED',
        error_message: resetResult.error
      });

      return Response.json({
        code: 'PASSWORD_RESET_FAILED',
        message: resetResult.error || 'Failed to reset password',
        timestamp: new Date().toISOString(),
        request_id: `req_${Date.now()}`
      } as AdminAPIError, { status: 500 });
    }

    // パスワード履歴への記録
    if (resetResult.passwordHash) {
      await supabaseAdmin
        .from('user_password_history')
        .insert({
          user_id: targetUserId,
          password_hash: resetResult.passwordHash,
          created_by: admin.id,
          is_admin_reset: true
        });
    }

    // 成功の監査ログ記録
    const auditLogId = await recordAdminAuditLog({
      admin_id: admin.id,
      action: 'user_password_reset',
      target_type: 'user',
      target_id: targetUserId,
      target_email: targetUser.email,
      details: {
        reason: body.reason || 'Admin password reset',
        force_change: body.force_change || false,
        notify_user: body.notify_user !== false,
        reset_token_sent: resetResult.emailSent,
        expires_at: resetResult.expiresAt
      },
      ip_address: clientInfo.ip,
      user_agent: clientInfo.userAgent,
      session_id: clientInfo.sessionId,
      success: true
    });

    // レスポンス構築
    const response: AdminPasswordResetResponse = {
      success: true,
      reset_token: resetResult.resetToken,
      email_sent: resetResult.emailSent,
      expires_at: resetResult.expiresAt,
      audit_log_id: auditLogId || `audit_${Date.now()}`
    };

    return Response.json(response);

  } catch (error) {
    console.error('Password reset API error:', error);

    // 予期しないエラーの監査ログ記録
    await recordAdminAuditLog({
      admin_id: admin.id,
      action: 'user_password_reset',
      target_type: 'user',
      target_id: targetUserId,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      ip_address: clientInfo.ip,
      user_agent: clientInfo.userAgent,
      session_id: clientInfo.sessionId,
      success: false,
      error_code: 'UNEXPECTED_ERROR',
      error_message: error instanceof Error ? error.message : 'Unknown error'
    });

    return Response.json({
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
      request_id: `req_${Date.now()}`
    } as AdminAPIError, { status: 500 });
  }
}

/**
 * パスワードリセット実行
 */
async function executePasswordReset(
  email: string,
  forceChange: boolean,
  notifyUser: boolean
): Promise<{
  success: boolean;
  emailSent: boolean;
  resetToken?: string;
  passwordHash?: string;
  expiresAt: string;
  error?: string;
}> {
  try {
    const expiresAt = new Date(Date.now() + (24 * 60 * 60 * 1000)); // 24時間後

    if (notifyUser) {
      // ユーザーにメール通知
      const { error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`
        }
      });

      if (error) {
        return {
          success: false,
          emailSent: false,
          expiresAt: expiresAt.toISOString(),
          error: `Failed to send reset email: ${error.message}`
        };
      }

      return {
        success: true,
        emailSent: true,
        expiresAt: expiresAt.toISOString()
      };
    } else {
      // 緊急時用: 管理者が直接リセットトークンを取得
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email
      });

      if (error || !data.properties?.action_link) {
        return {
          success: false,
          emailSent: false,
          expiresAt: expiresAt.toISOString(),
          error: `Failed to generate reset token: ${error?.message || 'Unknown error'}`
        };
      }

      // リセットトークンをレスポンスに含める（緊急時のみ）
      const resetToken = extractTokenFromLink(data.properties.action_link);

      return {
        success: true,
        emailSent: false,
        resetToken: resetToken,
        expiresAt: expiresAt.toISOString()
      };
    }
  } catch (error) {
    return {
      success: false,
      emailSent: false,
      expiresAt: new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * リセットリンクからトークンを抽出
 */
function extractTokenFromLink(actionLink: string): string {
  try {
    const url = new URL(actionLink);
    return url.searchParams.get('token') || 'token_extraction_failed';
  } catch {
    return 'invalid_link_format';
  }
}
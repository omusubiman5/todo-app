/**
 * 管理者認証・認可システム
 * セキュアな管理者権限管理と監査ログ記録
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import {
  AdminRole,
  AdminAction,
  AdminPermissions,
  AdminPermissionKey,
  SystemAdmin,
  CreateAuditLogData,
  AdminAPIError
} from './types';

// Supabase クライアント（管理者用）
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role key for admin operations
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// 通常のSupabaseクライアント
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ====================================
// 権限定義システム
// ====================================

// 権限定義
export const ADMIN_PERMISSIONS = {
  // ユーザー管理
  'users.view': 'ユーザー一覧表示',
  'users.details': 'ユーザー詳細表示',
  'users.password_reset': 'パスワードリセット',
  'users.suspend': 'アカウント停止',
  'users.delete': 'アカウント削除',

  // セキュリティ管理
  'security.view_logs': 'セキュリティログ表示',
  'security.ip_blocks': 'IP ブロック管理',
  'security.settings': 'セキュリティ設定',

  // 監査
  'audit.view': '監査ログ表示',
  'audit.export': '監査ログエクスポート',

  // システム管理
  'system.settings': 'システム設定',
  'system.admin_manage': '管理者権限管理'
} as const;

// ロール別権限マッピング
export const ROLE_PERMISSIONS: Record<AdminRole, AdminPermissionKey[]> = {
  super_admin: Object.keys(ADMIN_PERMISSIONS) as AdminPermissionKey[],
  security_admin: [
    'users.view', 'users.details',
    'security.view_logs', 'security.ip_blocks', 'security.settings',
    'audit.view'
  ],
  user_admin: [
    'users.view', 'users.details', 'users.password_reset', 'users.suspend',
    'audit.view'
  ],
  audit_admin: [
    'users.view', 'users.details',
    'audit.view', 'audit.export'
  ]
};

// ====================================
// 権限チェック関数
// ====================================

/**
 * 管理者権限チェック
 */
export function hasAdminPermission(
  adminRole: AdminRole,
  customPermissions: Record<string, boolean>,
  requiredPermission: AdminPermissionKey
): boolean {
  // カスタム権限を優先
  if (requiredPermission in customPermissions) {
    return customPermissions[requiredPermission];
  }

  // ロールベース権限
  const rolePermissions = ROLE_PERMISSIONS[adminRole];
  return rolePermissions.includes(requiredPermission);
}

/**
 * 管理者権限の計算
 */
export function calculateAdminPermissions(
  role: AdminRole,
  customPermissions: Record<string, boolean> = {}
): AdminPermissions {
  const permissions = {} as AdminPermissions;

  // 全権限について計算
  for (const permission of Object.keys(ADMIN_PERMISSIONS) as AdminPermissionKey[]) {
    permissions[permission] = hasAdminPermission(role, customPermissions, permission);
  }

  return permissions;
}

/**
 * API エンドポイントから必要権限を推定
 */
export function getRequiredPermissionForEndpoint(
  pathname: string,
  method: string
): AdminPermissionKey | null {
  // API パス解析
  const pathSegments = pathname.split('/').filter(Boolean);

  if (!pathSegments.includes('admin')) {
    return null; // 管理者 API ではない
  }

  // パターンマッチング
  if (pathSegments.includes('users')) {
    if (method === 'GET' && pathSegments.includes('list')) return 'users.view';
    if (method === 'GET') return 'users.details';
    if (method === 'POST' && pathSegments.includes('reset-password')) return 'users.password_reset';
    if (method === 'POST' && pathSegments.includes('suspend')) return 'users.suspend';
    if (method === 'DELETE') return 'users.delete';
  }

  if (pathSegments.includes('security')) {
    if (pathSegments.includes('logs')) return 'security.view_logs';
    if (pathSegments.includes('ip-blocks')) return 'security.ip_blocks';
    if (pathSegments.includes('settings')) return 'security.settings';
  }

  if (pathSegments.includes('audit')) {
    if (pathSegments.includes('export')) return 'audit.export';
    return 'audit.view';
  }

  if (pathSegments.includes('settings')) {
    return 'system.settings';
  }

  // デフォルト: ユーザー表示権限
  return 'users.view';
}

// ====================================
// 管理者認証
// ====================================

/**
 * 管理者情報取得
 */
export async function getAdminUser(userId: string): Promise<SystemAdmin | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('system_admins')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to get admin user:', error);
    return null;
  }
}

/**
 * ユーザーセッション検証
 */
export async function validateUserSession(token: string): Promise<{ user: any; error?: string }> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return { user: null, error: 'Invalid or expired token' };
    }

    return { user };
  } catch (error) {
    return { user: null, error: 'Authentication failed' };
  }
}

/**
 * 管理者セッション検証
 */
export async function validateAdminSession(
  userId: string,
  sessionToken?: string
): Promise<{ isValid: boolean; admin?: SystemAdmin; error?: string }> {
  try {
    // 管理者情報取得
    const admin = await getAdminUser(userId);
    if (!admin) {
      return { isValid: false, error: 'Not an admin user' };
    }

    // アカウントロック確認
    if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
      return {
        isValid: false,
        error: 'Admin account is locked',
        admin
      };
    }

    // セッション確認（セッショントークンがある場合）
    if (sessionToken) {
      const { data: session } = await supabaseAdmin
        .from('admin_sessions')
        .select('*')
        .eq('admin_id', admin.id)
        .eq('session_token', sessionToken)
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .single();

      if (!session) {
        return {
          isValid: false,
          error: 'Invalid or expired admin session',
          admin
        };
      }

      // セッション最終アクティビティ更新
      await supabaseAdmin
        .from('admin_sessions')
        .update({ last_activity: new Date().toISOString() })
        .eq('id', session.id);
    }

    return { isValid: true, admin };
  } catch (error) {
    console.error('Admin session validation failed:', error);
    return { isValid: false, error: 'Session validation failed' };
  }
}

// ====================================
// 監査ログ記録
// ====================================

/**
 * 管理者操作を監査ログに記録
 */
export async function recordAdminAuditLog(data: CreateAuditLogData): Promise<string | null> {
  try {
    // 機密情報の除去
    const sanitizedDetails = sanitizeAuditDetails(data.details || {});

    const { data: logEntry, error } = await supabaseAdmin
      .from('admin_audit_log')
      .insert({
        admin_id: data.admin_id,
        action: data.action,
        target_type: data.target_type,
        target_id: data.target_id,
        target_email: data.target_email,
        details: sanitizedDetails,
        ip_address: data.ip_address,
        user_agent: data.user_agent,
        session_id: data.session_id,
        request_id: data.request_id || generateRequestId(),
        success: data.success ?? true,
        error_code: data.error_code,
        error_message: data.error_message
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to record audit log:', error);
      return null;
    }

    return logEntry.id;
  } catch (error) {
    console.error('Audit log recording failed:', error);
    return null;
  }
}

/**
 * 監査ログの機密情報除去
 */
function sanitizeAuditDetails(details: Record<string, any>): Record<string, any> {
  const sanitized = { ...details };

  // パスワード関連情報の除去
  delete sanitized.password;
  delete sanitized.password_hash;
  delete sanitized.reset_token;
  delete sanitized.session_token;

  // 機密な個人情報のマスキング
  if (sanitized.email) {
    sanitized.email_masked = maskEmail(sanitized.email);
    delete sanitized.email;
  }

  // 長すぎるデータの切り詰め
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'string' && sanitized[key].length > 1000) {
      sanitized[key] = sanitized[key].substring(0, 997) + '...';
    }
  });

  return sanitized;
}

/**
 * メールアドレスのマスキング
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;

  const maskedLocal = local.length <= 3
    ? local
    : local.substring(0, 2) + '*'.repeat(local.length - 2);

  return `${maskedLocal}@${domain}`;
}

/**
 * リクエストID生成
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

// ====================================
// クライアント情報取得
// ====================================

/**
 * リクエストからクライアント情報を抽出
 */
export function extractClientInfo(req: NextRequest) {
  // IP アドレス取得（プロキシ対応）
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0] || realIp || req.ip || 'unknown';

  // User-Agent 取得
  const userAgent = req.headers.get('user-agent') || 'unknown';

  // セッション情報
  const sessionId = req.headers.get('x-session-id') || generateRequestId();

  return {
    ip: ip.trim(),
    userAgent: userAgent.substring(0, 500), // 長すぎる場合は切り詰め
    sessionId
  };
}

// ====================================
// 管理者認証ミドルウェア
// ====================================

/**
 * API ルート用管理者認証ミドルウェア
 */
export async function adminAuthMiddleware(
  req: NextRequest,
  requiredPermission?: AdminPermissionKey
): Promise<NextResponse | { admin: SystemAdmin; clientInfo: any }> {
  try {
    // クライアント情報抽出
    const clientInfo = extractClientInfo(req);

    // 1. Bearer トークン取得
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return createErrorResponse('ADMIN_AUTH_REQUIRED', 'Admin authentication required', 401);
    }

    // 2. ユーザーセッション検証
    const { user, error: userError } = await validateUserSession(token);
    if (userError || !user) {
      return createErrorResponse('ADMIN_AUTH_INVALID', 'Invalid authentication token', 401);
    }

    // 3. 管理者権限確認
    const adminSessionToken = req.headers.get('x-admin-session');
    const { isValid, admin, error: adminError } = await validateAdminSession(
      user.id,
      adminSessionToken || undefined
    );

    if (!isValid || !admin) {
      return createErrorResponse('ADMIN_PERMISSION_DENIED', adminError || 'Admin access required', 403);
    }

    // 4. 必要権限チェック
    if (requiredPermission) {
      const hasPermission = hasAdminPermission(
        admin.role,
        admin.permissions,
        requiredPermission
      );

      if (!hasPermission) {
        // 権限不足を監査ログに記録
        await recordAdminAuditLog({
          admin_id: admin.id,
          action: 'admin_role_grant', // 権限チェック失敗も記録
          target_type: 'permission',
          target_id: requiredPermission,
          details: {
            required_permission: requiredPermission,
            user_role: admin.role,
            endpoint: req.url
          },
          ip_address: clientInfo.ip,
          user_agent: clientInfo.userAgent,
          session_id: clientInfo.sessionId,
          success: false,
          error_code: 'INSUFFICIENT_PERMISSIONS'
        });

        return createErrorResponse(
          'ADMIN_PERMISSION_DENIED',
          `Insufficient permissions: ${requiredPermission} required`,
          403
        );
      }
    }

    // 5. セッション更新（最終ログイン時刻）
    await supabaseAdmin
      .from('system_admins')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', admin.id);

    // 成功: 管理者情報とクライアント情報を返す
    return { admin, clientInfo };

  } catch (error) {
    console.error('Admin auth middleware error:', error);
    return createErrorResponse('ADMIN_AUTH_ERROR', 'Authentication system error', 500);
  }
}

/**
 * エラーレスポンス作成
 */
function createErrorResponse(code: string, message: string, status: number): NextResponse {
  const error: AdminAPIError = {
    code,
    message,
    timestamp: new Date().toISOString(),
    request_id: generateRequestId()
  };

  return NextResponse.json(error, { status });
}

// ====================================
// ユーティリティ関数
// ====================================

/**
 * 管理者セッション作成
 */
export async function createAdminSession(
  adminId: string,
  ipAddress: string,
  userAgent: string,
  mfaVerified: boolean = false
): Promise<{ sessionToken: string; expiresAt: string } | null> {
  try {
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + (30 * 60 * 1000)); // 30分

    const { error } = await supabaseAdmin
      .from('admin_sessions')
      .insert({
        admin_id: adminId,
        session_token: sessionToken,
        ip_address: ipAddress,
        user_agent: userAgent,
        expires_at: expiresAt.toISOString(),
        mfa_verified: mfaVerified
      });

    if (error) {
      console.error('Failed to create admin session:', error);
      return null;
    }

    return {
      sessionToken,
      expiresAt: expiresAt.toISOString()
    };
  } catch (error) {
    console.error('Admin session creation failed:', error);
    return null;
  }
}

/**
 * セッショントークン生成
 */
function generateSessionToken(): string {
  return `ast_${Date.now()}_${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * 管理者セッション終了
 */
export async function terminateAdminSession(sessionToken: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('admin_sessions')
      .update({ is_active: false })
      .eq('session_token', sessionToken);

    return !error;
  } catch (error) {
    console.error('Failed to terminate admin session:', error);
    return false;
  }
}

/**
 * 期限切れセッションのクリーンアップ
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin
      .from('admin_sessions')
      .update({ is_active: false })
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) {
      console.error('Failed to cleanup expired sessions:', error);
      return 0;
    }

    return data.length;
  } catch (error) {
    console.error('Session cleanup failed:', error);
    return 0;
  }
}
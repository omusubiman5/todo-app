/**
 * 管理者用ユーザー一覧・検索 API
 * GET /api/admin/users/list
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { adminAuthMiddleware, recordAdminAuditLog } from '@/lib/adminAuth';
import {
  AdminUsersListRequest,
  AdminUsersListResponse,
  AdminUserDetails,
  AccountStatus
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

export async function GET(req: NextRequest) {
  // 管理者認証
  const authResult = await adminAuthMiddleware(req, 'users.view');
  if ('status' in authResult) {
    return authResult; // エラーレスポンス
  }

  const { admin, clientInfo } = authResult;

  try {
    // クエリパラメータ解析
    const searchParams = req.nextUrl.searchParams;
    const requestData: AdminUsersListRequest = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: Math.min(parseInt(searchParams.get('limit') || '50'), 100), // 最大100件
      search: searchParams.get('search') || undefined,
      filter: {
        status: searchParams.get('filter.status') as AccountStatus || undefined,
        role: searchParams.get('filter.role') as 'admin' | 'user' || undefined,
        last_login: {
          from: searchParams.get('filter.last_login.from') || undefined,
          to: searchParams.get('filter.last_login.to') || undefined
        },
        created: {
          from: searchParams.get('filter.created.from') || undefined,
          to: searchParams.get('filter.created.to') || undefined
        }
      },
      sort: {
        field: searchParams.get('sort.field') as any || 'created_at',
        direction: searchParams.get('sort.direction') as 'asc' | 'desc' || 'desc'
      }
    };

    // バリデーション
    if (requestData.page! < 1) requestData.page = 1;
    if (requestData.limit! < 1) requestData.limit = 50;

    // ベースクエリ構築
    let query = supabaseAdmin
      .from('admin_user_details')
      .select('*', { count: 'exact' });

    // 検索フィルター適用
    if (requestData.search) {
      query = query.ilike('email', `%${requestData.search}%`);
    }

    // ステータスフィルター
    if (requestData.filter?.status) {
      query = query.eq('account_status', requestData.filter.status);
    }

    // 役割フィルター
    if (requestData.filter?.role) {
      if (requestData.filter.role === 'admin') {
        query = query.not('admin_role', 'is', null);
      } else {
        query = query.is('admin_role', null);
      }
    }

    // 最終ログイン日フィルター
    if (requestData.filter?.last_login?.from) {
      query = query.gte('last_sign_in_at', requestData.filter.last_login.from);
    }
    if (requestData.filter?.last_login?.to) {
      query = query.lte('last_sign_in_at', requestData.filter.last_login.to);
    }

    // 作成日フィルター
    if (requestData.filter?.created?.from) {
      query = query.gte('created_at', requestData.filter.created.from);
    }
    if (requestData.filter?.created?.to) {
      query = query.lte('created_at', requestData.filter.created.to);
    }

    // ソート順適用
    const sortField = requestData.sort?.field || 'created_at';
    const sortDirection = requestData.sort?.direction || 'desc';
    query = query.order(sortField, { ascending: sortDirection === 'asc' });

    // ページネーション適用
    const offset = (requestData.page! - 1) * requestData.limit!;
    query = query.range(offset, offset + requestData.limit! - 1);

    // クエリ実行
    const { data: users, error, count } = await query;

    if (error) {
      console.error('Failed to fetch users:', error);

      // エラーを監査ログに記録
      await recordAdminAuditLog({
        admin_id: admin.id,
        action: 'user_password_reset', // 適切なアクションがないため代用
        target_type: 'system',
        details: {
          operation: 'user_list_fetch',
          error: error.message,
          filters: requestData.filter
        },
        ip_address: clientInfo.ip,
        user_agent: clientInfo.userAgent,
        session_id: clientInfo.sessionId,
        success: false,
        error_code: 'DATABASE_QUERY_FAILED',
        error_message: error.message
      });

      return Response.json({
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch users',
        timestamp: new Date().toISOString(),
        request_id: `req_${Date.now()}`
      }, { status: 500 });
    }

    // レスポンス構築
    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / requestData.limit!);

    const response: AdminUsersListResponse = {
      users: users as AdminUserDetails[],
      pagination: {
        total: totalCount,
        page: requestData.page!,
        limit: requestData.limit!,
        pages: totalPages,
        has_more: requestData.page! < totalPages
      },
      filters_applied: {
        search: requestData.search,
        status: requestData.filter?.status,
        role: requestData.filter?.role
      }
    };

    // 成功を監査ログに記録
    await recordAdminAuditLog({
      admin_id: admin.id,
      action: 'user_password_reset', // 適切なアクションがないため代用
      target_type: 'system',
      details: {
        operation: 'user_list_fetch',
        users_count: users.length,
        total_count: totalCount,
        filters: requestData.filter,
        page: requestData.page
      },
      ip_address: clientInfo.ip,
      user_agent: clientInfo.userAgent,
      session_id: clientInfo.sessionId,
      success: true
    });

    return Response.json(response);

  } catch (error) {
    console.error('User list API error:', error);

    // 予期しないエラーを監査ログに記録
    await recordAdminAuditLog({
      admin_id: admin.id,
      action: 'user_password_reset', // 適切なアクションがないため代用
      target_type: 'system',
      details: {
        operation: 'user_list_fetch',
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
    }, { status: 500 });
  }
}
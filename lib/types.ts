// チーム機能の型定義

export interface Team {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  team_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'guest';
  joined_at: string;
  invited_by?: string;
  user?: {
    id: string;
    email: string;
    user_metadata?: {
      full_name?: string;
      avatar_url?: string;
    };
  };
}

export interface TeamInvitation {
  id: string;
  team_id: string;
  email: string;
  role: 'admin' | 'member' | 'guest';
  token: string;
  expires_at: string;
  created_at: string;
  created_by: string;
  team?: {
    name: string;
    description?: string;
  };
}

export interface CreateTeamData {
  name: string;
  description?: string;
  avatar_url?: string;
}

export interface UpdateTeamData {
  name?: string;
  description?: string;
  avatar_url?: string;
}

export interface InviteMemberData {
  email: string;
  role: 'admin' | 'member' | 'guest';
}

export interface TeamWithMembers extends Team {
  members: TeamMember[];
  member_count: number;
  current_user_is_owner?: boolean;
  current_user_role?: string | null;
}

export interface UserTeams {
  owned_teams: Team[];
  member_teams: Team[];
  guest_teams: Team[];
}

// 拡張タスク型定義（チーム共有機能対応）
export interface SharedTask {
  id: string;
  text: string;
  completed: boolean;
  priority: "高" | "中" | "低";
  user_id: string;
  team_id?: string | null;
  assigned_to?: string | null;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  assignee?: {
    id: string;
    email: string;
    user_metadata?: {
      full_name?: string | null;
      avatar_url?: string | null;
    };
  } | null;
  creator?: {
    id: string;
    email: string;
    user_metadata?: {
      full_name?: string | null;
      avatar_url?: string | null;
    };
  } | null;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  mentions: string[];
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    email: string;
    user_metadata?: {
      full_name?: string | null;
      avatar_url?: string | null;
    };
  };
}

export interface TaskHistory {
  id: string;
  task_id: string;
  user_id: string;
  action: 'created' | 'updated' | 'completed' | 'assigned' | 'commented' | 'deleted';
  changes: Record<string, unknown>;
  created_at: string;
  user?: {
    id: string;
    email: string;
    user_metadata?: {
      full_name?: string | null;
      avatar_url?: string | null;
    };
  };
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'task_assigned' | 'task_mentioned' | 'task_deadline' | 'task_completed' | 'task_commented';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read_at?: string | null;
  created_at: string;
}

export interface WorkspaceContext {
  type: 'personal' | 'team';
  team_id?: string | null;
  team_name?: string;
  // Internal field for React change detection
  _switchedAt?: number;
}

// Pagination interfaces
export interface PaginationOptions {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  assigned_to?: string;
  cursor?: string;
}

export interface PaginatedTasksResult {
  tasks: SharedTask[];
  hasMore: boolean;
  totalCount: number;
  nextCursor?: string;
  currentPage: number;
}

// ====================================
// システム管理者機能の型定義
// ====================================

// 管理者役割（チーム内のroleとは別概念）
export type AdminRole = 'super_admin' | 'security_admin' | 'user_admin' | 'audit_admin';

// 管理者操作種別
export type AdminAction =
  | 'user_password_reset'
  | 'user_account_suspend'
  | 'user_account_activate'
  | 'user_account_delete'
  | 'user_session_terminate'
  | 'security_setting_update'
  | 'ip_address_block'
  | 'ip_address_unblock'
  | 'admin_role_grant'
  | 'admin_role_revoke'
  | 'system_setting_update'
  | 'audit_log_export'
  | 'security_alert_dismiss';

// アカウント状態
export type AccountStatus = 'active' | 'suspended' | 'unconfirmed' | 'admin_disabled' | 'deleted';

// ブロック種別
export type BlockType = 'temporary' | 'permanent' | 'whitelist';

// セキュリティ設定種別
export type SettingType = 'system' | 'security' | 'audit';

// ====================================
// システム管理者インターフェース
// ====================================

export interface SystemAdmin {
  id: string;
  user_id: string;
  role: AdminRole;
  permissions: Record<string, boolean>;
  is_active: boolean;
  mfa_enabled: boolean;
  last_login_at?: string;
  login_attempts: number;
  locked_until?: string;
  created_at: string;
  created_by?: string;
  updated_at: string;
}

export interface CreateSystemAdminData {
  user_id: string;
  role: AdminRole;
  permissions?: Record<string, boolean>;
  mfa_enabled?: boolean;
}

export interface UpdateSystemAdminData {
  role?: AdminRole;
  permissions?: Record<string, boolean>;
  is_active?: boolean;
  mfa_enabled?: boolean;
}

// ====================================
// 監査ログインターフェース
// ====================================

export interface AdminAuditLog {
  id: string;
  admin_id?: string;
  action: AdminAction;
  target_type: string;
  target_id?: string;
  target_email?: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  request_id?: string;
  success: boolean;
  error_code?: string;
  error_message?: string;
  created_at: string;
}

export interface AdminAuditLogEntry extends AdminAuditLog {
  admin?: {
    id: string;
    email: string;
    role: AdminRole;
  };
}

export interface CreateAuditLogData {
  admin_id: string;
  action: AdminAction;
  target_type: string;
  target_id?: string;
  target_email?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  request_id?: string;
  success?: boolean;
  error_code?: string;
  error_message?: string;
}

// ====================================
// セキュリティ設定インターフェース
// ====================================

export interface SecuritySettings {
  id: string;
  setting_name: string;
  setting_value: Record<string, any>;
  description?: string;
  is_active: boolean;
  setting_type: SettingType;
  updated_by?: string;
  updated_at: string;
  created_at: string;
}

export interface UpdateSecuritySettingsData {
  setting_value: Record<string, any>;
  description?: string;
  is_active?: boolean;
}

// 特定のセキュリティ設定の型定義
export interface PasswordPolicySettings {
  min_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_numbers: boolean;
  require_symbols: boolean;
  max_history: number;
  prevent_common_passwords: boolean;
}

export interface LoginAttemptPolicySettings {
  max_attempts: number;
  lockout_duration_minutes: number;
  progressive_delay: boolean;
  ip_block_threshold: number;
  ip_block_duration_hours: number;
}

export interface SessionPolicySettings {
  admin_timeout_minutes: number;
  user_timeout_minutes: number;
  require_mfa_for_admin: boolean;
  max_concurrent_sessions: number;
}

// ====================================
// IPアドレスブロックインターフェース
// ====================================

export interface IPAddressBlock {
  id: string;
  ip_address: string;
  block_type: BlockType;
  reason: string;
  blocked_until?: string;
  blocked_by?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateIPBlockData {
  ip_address: string;
  block_type: BlockType;
  reason: string;
  blocked_until?: string;
}

export interface UpdateIPBlockData {
  block_type?: BlockType;
  reason?: string;
  blocked_until?: string;
  is_active?: boolean;
}

// ====================================
// 管理者セッションインターフェース
// ====================================

export interface AdminSession {
  id: string;
  admin_id: string;
  session_token: string;
  ip_address?: string;
  user_agent?: string;
  last_activity: string;
  expires_at: string;
  is_active: boolean;
  mfa_verified: boolean;
  created_at: string;
}

// ====================================
// 拡張ユーザー詳細情報（管理者ビュー用）
// ====================================

export interface AdminUserDetails {
  // 基本ユーザー情報
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
  banned_until?: string;
  confirmation_sent_at?: string;
  recovery_sent_at?: string;
  email_change_sent_at?: string;
  raw_user_metadata?: {
    full_name?: string;
    avatar_url?: string;
    [key: string]: any;
  };
  raw_app_metadata?: Record<string, any>;

  // 管理者情報（該当する場合）
  admin_id?: string;
  admin_role?: AdminRole;
  admin_active?: boolean;
  admin_mfa_enabled?: boolean;
  admin_last_login?: string;

  // 統計情報
  task_count: number;
  team_count: number;

  // セキュリティ情報
  last_login_attempt?: string;
  last_login_success?: boolean;
  is_ip_blocked: boolean;

  // 計算されたアカウント状態
  account_status: AccountStatus;
}

// ====================================
// API リクエスト・レスポンス型定義
// ====================================

// ユーザー一覧API
export interface AdminUsersListRequest {
  page?: number;
  limit?: number;
  search?: string;
  filter?: {
    status?: AccountStatus;
    role?: 'admin' | 'user';
    last_login?: {
      from?: string;
      to?: string;
    };
    created?: {
      from?: string;
      to?: string;
    };
  };
  sort?: {
    field: 'email' | 'created_at' | 'last_sign_in_at' | 'task_count';
    direction: 'asc' | 'desc';
  };
}

export interface AdminUsersListResponse {
  users: AdminUserDetails[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    has_more: boolean;
  };
  filters_applied: {
    search?: string;
    status?: AccountStatus;
    role?: string;
  };
}

// パスワードリセットAPI
export interface AdminPasswordResetRequest {
  user_id: string;
  force_change?: boolean;
  notify_user?: boolean;
  reason?: string;
}

export interface AdminPasswordResetResponse {
  success: boolean;
  reset_token?: string;
  email_sent: boolean;
  expires_at: string;
  audit_log_id: string;
}

// アカウント制御API
export interface AdminAccountControlRequest {
  user_id: string;
  action: 'suspend' | 'activate' | 'delete';
  reason: string;
  duration_hours?: number; // suspend の場合
}

export interface AdminAccountControlResponse {
  success: boolean;
  action_taken: string;
  effective_until?: string;
  audit_log_id: string;
}

// 監査ログAPI
export interface AdminAuditLogsRequest {
  page?: number;
  limit?: number;
  filter?: {
    admin_id?: string;
    action?: AdminAction;
    target_type?: string;
    target_id?: string;
    date_range?: {
      from: string;
      to: string;
    };
    ip_address?: string;
    success?: boolean;
  };
  sort?: {
    field: 'created_at' | 'action' | 'admin_id';
    direction: 'asc' | 'desc';
  };
}

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
  has_more: boolean;
}

export interface AdminAuditLogsResponse {
  logs: AdminAuditLogEntry[];
  pagination: PaginationInfo;
  summary: {
    total_actions: number;
    success_rate: number;
    unique_admins: number;
    date_range: {
      from: string;
      to: string;
    };
  };
}

// ====================================
// エラー型定義
// ====================================

export interface AdminAPIError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  request_id: string;
}

// ====================================
// 権限関連型定義
// ====================================

export interface AdminPermissions {
  // ユーザー管理
  'users.view': boolean;
  'users.details': boolean;
  'users.password_reset': boolean;
  'users.suspend': boolean;
  'users.delete': boolean;

  // セキュリティ管理
  'security.view_logs': boolean;
  'security.ip_blocks': boolean;
  'security.settings': boolean;

  // 監査
  'audit.view': boolean;
  'audit.export': boolean;

  // システム管理
  'system.settings': boolean;
  'system.admin_manage': boolean;
}

export type AdminPermissionKey = keyof AdminPermissions;

// ====================================
// 統計・分析型定義
// ====================================

export interface UserStatistics {
  total_users: number;
  active_users: number;
  new_users_today: number;
  new_users_this_week: number;
  new_users_this_month: number;
  suspended_users: number;
  unconfirmed_users: number;
  admin_users: number;
}

export interface SecurityStatistics {
  total_login_attempts_today: number;
  failed_login_attempts_today: number;
  blocked_ips: number;
  active_admin_sessions: number;
  recent_security_alerts: number;
}

export interface SystemStatistics {
  total_tasks: number;
  completed_tasks: number;
  total_teams: number;
  active_teams: number;
  database_size: string;
  uptime: string;
}

// ====================================
// フロントエンド UI 型定義
// ====================================

export interface AdminTableColumn {
  key: string;
  title: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface AdminFilterConfig {
  type: 'text' | 'select' | 'date' | 'daterange';
  label: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

export interface AdminBreadcrumb {
  label: string;
  href?: string;
}

// ====================================
// 通知・アラート型定義
// ====================================

export interface SecurityAlert {
  id: string;
  type: 'failed_login_spike' | 'new_admin_created' | 'suspicious_activity' | 'system_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  details: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export interface NotificationSettings {
  security_alerts_enabled: boolean;
  failed_login_threshold: number;
  admin_action_notifications: boolean;
  email_notifications: boolean;
}
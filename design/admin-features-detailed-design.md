# 管理者機能詳細設計仕様書

## 1. システムアーキテクチャ

### 1.1 全体アーキテクチャ
```
┌─────────────────────────────────────────────────────────────┐
│                     Admin Dashboard                        │
│  ┌─────────────────┐ ┌─────────────────┐ ┌──────────────── │
│  │   User Mgmt     │ │  Security Mgmt  │ │   Audit Logs   │
│  │   Components    │ │   Components    │ │   Components   │
│  └─────────────────┘ └─────────────────┘ └──────────────── │
└─────────────────────────────────────────────────────────────┘
                                │
                   ┌────────────▼────────────┐
                   │    Admin API Layer      │
                   │  /api/admin/**          │
                   └────────────┬────────────┘
                                │
        ┌──────────────────────▼──────────────────────┐
        │           Supabase Backend                  │
        │  ┌──────────────┐ ┌──────────────────────┐  │
        │  │ PostgreSQL   │ │   Edge Functions     │  │
        │  │   + RLS      │ │   (Admin Logic)      │  │
        │  └──────────────┘ └──────────────────────┘  │
        └─────────────────────────────────────────────┘
```

### 1.2 セキュリティアーキテクチャ
```
Client Request → Auth Middleware → Permission Check → Admin Function → Audit Log
     │              │                    │                │             │
     │              │                    │                │             │
     ▼              ▼                    ▼                ▼             ▼
  JWT Token    System Admin      Fine-grained      Execute        Record
  Validation   Role Check        Permissions       Operation      Operation
```

## 2. データベース設計

### 2.1 新規テーブル設計

#### system_admins テーブル
```sql
CREATE TYPE admin_role AS ENUM (
  'super_admin',
  'security_admin',
  'user_admin',
  'audit_admin'
);

CREATE TABLE system_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role admin_role NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  mfa_enabled BOOLEAN NOT NULL DEFAULT false,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_user_admin UNIQUE(user_id),
  CONSTRAINT valid_permissions CHECK (jsonb_typeof(permissions) = 'object')
);

-- インデックス
CREATE INDEX idx_system_admins_user_id ON system_admins(user_id);
CREATE INDEX idx_system_admins_role ON system_admins(role);
CREATE INDEX idx_system_admins_active ON system_admins(is_active) WHERE is_active = true;
```

#### admin_audit_log テーブル
```sql
CREATE TYPE admin_action AS ENUM (
  'user_password_reset',
  'user_account_suspend',
  'user_account_activate',
  'user_account_delete',
  'user_session_terminate',
  'security_setting_update',
  'ip_address_block',
  'ip_address_unblock',
  'admin_role_grant',
  'admin_role_revoke',
  'system_setting_update'
);

CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES system_admins(id) ON DELETE SET NULL,
  action admin_action NOT NULL,
  target_type TEXT NOT NULL, -- 'user', 'system', 'security'
  target_id TEXT,
  target_email TEXT, -- For user operations
  details JSONB NOT NULL DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_details CHECK (jsonb_typeof(details) = 'object')
);

-- インデックス
CREATE INDEX idx_admin_audit_log_admin_id ON admin_audit_log(admin_id);
CREATE INDEX idx_admin_audit_log_action ON admin_audit_log(action);
CREATE INDEX idx_admin_audit_log_target ON admin_audit_log(target_type, target_id);
CREATE INDEX idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);
CREATE INDEX idx_admin_audit_log_ip ON admin_audit_log(ip_address);
```

#### security_settings テーブル
```sql
CREATE TABLE security_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_name TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID REFERENCES system_admins(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_setting_value CHECK (jsonb_typeof(setting_value) = 'object')
);

-- 初期設定データ
INSERT INTO security_settings (setting_name, setting_value, description) VALUES
('password_policy', '{
  "min_length": 8,
  "require_uppercase": true,
  "require_lowercase": true,
  "require_numbers": true,
  "require_symbols": false,
  "max_history": 5
}', 'パスワード強度ポリシー'),
('login_attempt_policy', '{
  "max_attempts": 5,
  "lockout_duration_minutes": 30,
  "progressive_delay": true
}', 'ログイン試行制限ポリシー'),
('session_policy', '{
  "admin_timeout_minutes": 30,
  "user_timeout_minutes": 1440,
  "require_mfa_for_admin": true
}', 'セッション管理ポリシー');

-- インデックス
CREATE INDEX idx_security_settings_name ON security_settings(setting_name);
CREATE INDEX idx_security_settings_active ON security_settings(is_active) WHERE is_active = true;
```

#### user_password_history テーブル
```sql
CREATE TABLE user_password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL, -- bcrypt hash
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES system_admins(id) -- NULL for user self-change
);

-- インデックス
CREATE INDEX idx_user_password_history_user_id ON user_password_history(user_id, created_at DESC);

-- RLSポリシー
ALTER TABLE user_password_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only system admins can access password history"
  ON user_password_history
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM system_admins
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
```

#### ip_address_blocks テーブル
```sql
CREATE TABLE ip_address_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET NOT NULL,
  block_type TEXT NOT NULL CHECK (block_type IN ('temporary', 'permanent', 'whitelist')),
  reason TEXT,
  blocked_until TIMESTAMP WITH TIME ZONE, -- NULL for permanent
  blocked_by UUID REFERENCES system_admins(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_block_until CHECK (
    (block_type = 'permanent' AND blocked_until IS NULL) OR
    (block_type = 'temporary' AND blocked_until IS NOT NULL) OR
    (block_type = 'whitelist')
  )
);

-- インデックス
CREATE UNIQUE INDEX idx_ip_address_blocks_ip ON ip_address_blocks(ip_address);
CREATE INDEX idx_ip_address_blocks_type ON ip_address_blocks(block_type);
CREATE INDEX idx_ip_address_blocks_until ON ip_address_blocks(blocked_until) WHERE blocked_until IS NOT NULL;
```

### 2.2 既存テーブル拡張

#### auth.users への仮想拡張（ビューで対応）
```sql
CREATE VIEW admin_user_details AS
SELECT
  u.id,
  u.email,
  u.created_at,
  u.updated_at,
  u.last_sign_in_at,
  u.email_confirmed_at,
  u.banned_until,
  u.confirmation_sent_at,
  u.recovery_sent_at,
  u.email_change_sent_at,
  u.raw_user_meta_data,
  u.raw_app_meta_data,
  -- 管理者情報
  sa.role as admin_role,
  sa.is_active as admin_active,
  -- 統計情報
  (SELECT COUNT(*) FROM tasks WHERE user_id = u.id) as task_count,
  (SELECT COUNT(*) FROM team_members WHERE user_id = u.id) as team_count,
  -- 最新ログイン試行
  (SELECT created_at FROM login_attempts WHERE email = u.email ORDER BY created_at DESC LIMIT 1) as last_login_attempt,
  -- ブロック状況
  (SELECT COUNT(*) > 0 FROM ip_address_blocks ib
   JOIN login_attempts la ON la.ip_address = ib.ip_address
   WHERE la.email = u.email AND ib.block_type IN ('temporary', 'permanent')) as is_ip_blocked
FROM auth.users u
LEFT JOIN system_admins sa ON sa.user_id = u.id;
```

## 3. API設計

### 3.1 エンドポイント構造
```
/api/admin/
├── auth/
│   ├── login          POST    管理者ログイン
│   ├── logout         POST    管理者ログアウト
│   └── verify-mfa     POST    MFA認証
├── users/
│   ├── list           GET     ユーザー一覧
│   ├── search         GET     ユーザー検索
│   ├── [id]/
│   │   ├── details    GET     ユーザー詳細
│   │   ├── suspend    POST    アカウント停止
│   │   ├── activate   POST    アカウント有効化
│   │   ├── delete     DELETE  アカウント削除
│   │   ├── reset-password POST パスワードリセット
│   │   └── sessions/
│   │       └── terminate POST セッション終了
├── security/
│   ├── login-attempts GET     ログイン試行履歴
│   ├── ip-blocks/
│   │   ├── list       GET     IPブロック一覧
│   │   ├── add        POST    IPブロック追加
│   │   └── remove     DELETE  IPブロック削除
│   └── settings/
│       ├── list       GET     セキュリティ設定一覧
│       └── update     PUT     セキュリティ設定更新
├── audit/
│   ├── logs           GET     監査ログ
│   └── export         POST    ログエクスポート
└── analytics/
    ├── users          GET     ユーザー統計
    ├── security       GET     セキュリティ統計
    └── system         GET     システム統計
```

### 3.2 API仕様例

#### ユーザー一覧API
```typescript
// GET /api/admin/users/list
interface AdminUsersListRequest {
  page?: number;
  limit?: number;
  search?: string;
  filter?: {
    status?: 'active' | 'suspended' | 'deleted';
    role?: 'admin' | 'user';
    last_login?: {
      from?: string; // ISO date
      to?: string;   // ISO date
    };
  };
  sort?: {
    field: 'email' | 'created_at' | 'last_sign_in_at';
    direction: 'asc' | 'desc';
  };
}

interface AdminUsersListResponse {
  users: AdminUserDetails[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  filters_applied: {
    search?: string;
    status?: string;
    role?: string;
  };
}

interface AdminUserDetails {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
  status: 'active' | 'suspended' | 'deleted';
  admin_role?: AdminRole;
  task_count: number;
  team_count: number;
  last_login_attempt?: string;
  is_ip_blocked: boolean;
  raw_user_meta_data?: {
    full_name?: string;
    avatar_url?: string;
  };
}
```

#### パスワードリセットAPI
```typescript
// POST /api/admin/users/[id]/reset-password
interface AdminPasswordResetRequest {
  user_id: string;
  force_change?: boolean; // 次回ログイン時に変更を強制
  notify_user?: boolean;  // ユーザーにメール通知
  reason?: string;        // リセット理由
}

interface AdminPasswordResetResponse {
  success: boolean;
  reset_token?: string;   // 緊急時用
  email_sent: boolean;
  expires_at: string;
  audit_log_id: string;
}
```

#### 監査ログAPI
```typescript
// GET /api/admin/audit/logs
interface AdminAuditLogsRequest {
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
}

interface AdminAuditLogsResponse {
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

interface AdminAuditLogEntry {
  id: string;
  admin: {
    id: string;
    email: string;
    role: AdminRole;
  };
  action: AdminAction;
  target: {
    type: string;
    id: string;
    email?: string;
  };
  details: Record<string, any>;
  metadata: {
    ip_address: string;
    user_agent: string;
    session_id: string;
  };
  result: {
    success: boolean;
    error_message?: string;
  };
  created_at: string;
}
```

## 4. コンポーネント設計

### 4.1 フロントエンド コンポーネント構造
```
components/admin/
├── layout/
│   ├── AdminLayout.tsx
│   ├── AdminNavigation.tsx
│   └── AdminHeader.tsx
├── users/
│   ├── UsersList.tsx
│   ├── UserDetails.tsx
│   ├── UserActions.tsx
│   ├── PasswordResetDialog.tsx
│   └── UserFilters.tsx
├── security/
│   ├── LoginAttemptsList.tsx
│   ├── IPBlocksList.tsx
│   ├── SecuritySettings.tsx
│   └── SecurityAlerts.tsx
├── audit/
│   ├── AuditLogsList.tsx
│   ├── AuditLogDetails.tsx
│   └── AuditExport.tsx
├── analytics/
│   ├── UserStatistics.tsx
│   ├── SecurityMetrics.tsx
│   └── SystemHealth.tsx
└── shared/
    ├── AdminTable.tsx
    ├── AdminPagination.tsx
    ├── AdminFilters.tsx
    ├── AdminModal.tsx
    └── AdminAlert.tsx
```

### 4.2 主要コンポーネント仕様

#### AdminLayout コンポーネント
```typescript
interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  title,
  description,
  breadcrumbs,
  actions
}) => {
  const { user, adminRole, permissions } = useAdminAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation />
      <div className="flex-1 ml-64">
        <AdminHeader
          title={title}
          description={description}
          breadcrumbs={breadcrumbs}
          actions={actions}
        />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
```

#### UsersList コンポーネント
```typescript
interface UsersListProps {
  filters?: UserFilters;
  onUserSelect?: (user: AdminUserDetails) => void;
  onActionComplete?: () => void;
}

const UsersList: React.FC<UsersListProps> = ({
  filters,
  onUserSelect,
  onActionComplete
}) => {
  const [users, setUsers] = useState<AdminUserDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>();

  const { mutate: resetPassword } = useAdminPasswordReset();
  const { mutate: suspendUser } = useAdminUserSuspend();

  // ユーザー一覧の取得とテーブル表示ロジック

  return (
    <AdminTable
      columns={[
        { key: 'email', title: 'メールアドレス', sortable: true },
        { key: 'created_at', title: '登録日', sortable: true },
        { key: 'last_sign_in_at', title: '最終ログイン', sortable: true },
        { key: 'status', title: 'ステータス' },
        { key: 'actions', title: 'アクション' }
      ]}
      data={users}
      loading={loading}
      pagination={pagination}
      onSort={handleSort}
      onPageChange={handlePageChange}
      renderRow={(user) => (
        <UserRow
          user={user}
          onPasswordReset={() => resetPassword(user.id)}
          onSuspend={() => suspendUser(user.id)}
          onSelect={() => onUserSelect?.(user)}
        />
      )}
    />
  );
};
```

## 5. セキュリティ設計

### 5.1 認証・認可フロー
```typescript
// 管理者認証ミドルウェア
export async function adminAuthMiddleware(req: NextRequest) {
  // 1. JWT トークン検証
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 2. Supabase セッション検証
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return new Response('Invalid token', { status: 401 });
  }

  // 3. 管理者権限確認
  const { data: adminData } = await supabase
    .from('system_admins')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  if (!adminData) {
    return new Response('Admin access required', { status: 403 });
  }

  // 4. 権限レベル確認
  const requiredPermission = getRequiredPermission(req.url, req.method);
  if (!hasPermission(adminData.permissions, requiredPermission)) {
    return new Response('Insufficient permissions', { status: 403 });
  }

  // 5. セッション有効性確認
  if (isSessionExpired(adminData.last_login_at)) {
    return new Response('Session expired', { status: 401 });
  }

  // リクエストにadmin情報を追加
  req.headers.set('X-Admin-User-Id', user.id);
  req.headers.set('X-Admin-Role', adminData.role);

  return NextResponse.next();
}
```

### 5.2 権限管理システム
```typescript
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
export const ROLE_PERMISSIONS = {
  super_admin: Object.keys(ADMIN_PERMISSIONS),
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
} as const;

// 権限チェック関数
export function hasPermission(
  userPermissions: Record<string, boolean>,
  requiredPermission: string
): boolean {
  return userPermissions[requiredPermission] === true;
}

// 動的権限チェック
export function checkAdminPermission(
  adminRole: AdminRole,
  customPermissions: Record<string, boolean>,
  requiredPermission: string
): boolean {
  // カスタム権限を優先
  if (requiredPermission in customPermissions) {
    return customPermissions[requiredPermission];
  }

  // ロールベース権限
  const rolePermissions = ROLE_PERMISSIONS[adminRole];
  return rolePermissions.includes(requiredPermission);
}
```

### 5.3 監査ログ記録システム
```typescript
// 監査ログ記録関数
export async function recordAdminAction(
  adminId: string,
  action: AdminAction,
  targetType: string,
  targetId: string,
  details: Record<string, any>,
  success: boolean = true,
  errorMessage?: string
) {
  const clientInfo = getClientInfo(); // IP, User-Agent etc.

  try {
    await supabase.from('admin_audit_log').insert({
      admin_id: adminId,
      action,
      target_type: targetType,
      target_id: targetId,
      target_email: targetType === 'user' ? details.email : null,
      details: sanitizeLogDetails(details),
      ip_address: clientInfo.ip,
      user_agent: clientInfo.userAgent,
      session_id: clientInfo.sessionId,
      success,
      error_message: errorMessage
    });
  } catch (error) {
    // 監査ログ記録失敗は重要なセキュリティ問題
    console.error('Failed to record audit log:', error);
    // 外部監査システムへの送信も検討
  }
}

// 機密情報除去
function sanitizeLogDetails(details: Record<string, any>): Record<string, any> {
  const sanitized = { ...details };

  // パスワード関連情報の除去
  delete sanitized.password;
  delete sanitized.password_hash;
  delete sanitized.reset_token;

  // 機密な個人情報のマスキング
  if (sanitized.email) {
    sanitized.email_masked = maskEmail(sanitized.email);
    delete sanitized.email;
  }

  return sanitized;
}
```

## 6. パフォーマンス設計

### 6.1 データベース最適化
```sql
-- 複合インデックス（よく使用される検索条件）
CREATE INDEX idx_admin_user_search ON auth.users(email, created_at DESC)
WHERE deleted_at IS NULL;

CREATE INDEX idx_audit_log_admin_date ON admin_audit_log(admin_id, created_at DESC);

CREATE INDEX idx_login_attempts_monitoring ON login_attempts(
  ip_address, created_at DESC, success
) WHERE created_at > NOW() - INTERVAL '24 hours';

-- パーティショニング（監査ログの大量データ対策）
CREATE TABLE admin_audit_log_y2024m01 PARTITION OF admin_audit_log
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- マテリアライズドビュー（統計情報の高速化）
CREATE MATERIALIZED VIEW admin_user_statistics AS
SELECT
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as new_users,
  COUNT(*) FILTER (WHERE last_sign_in_at IS NOT NULL) as active_users,
  COUNT(*) FILTER (WHERE banned_until IS NOT NULL) as suspended_users
FROM auth.users
WHERE deleted_at IS NULL
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date;

-- 自動更新（日次）
CREATE OR REPLACE FUNCTION refresh_admin_statistics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW admin_user_statistics;
END;
$$ LANGUAGE plpgsql;
```

### 6.2 フロントエンド最適化
```typescript
// 仮想化テーブル（大量データ対応）
import { FixedSizeList as List } from 'react-window';

const VirtualizedUserList: React.FC<{users: AdminUserDetails[]}> = ({ users }) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <UserRow user={users[index]} />
    </div>
  );

  return (
    <List
      height={600}
      itemCount={users.length}
      itemSize={60}
      itemData={users}
    >
      {Row}
    </List>
  );
};

// データフェッチング最適化
export function useAdminUsers(filters: UserFilters) {
  return useInfiniteQuery({
    queryKey: ['admin-users', filters],
    queryFn: ({ pageParam = 1 }) =>
      fetchAdminUsers({ ...filters, page: pageParam }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    staleTime: 30000, // 30秒間キャッシュ
    cacheTime: 300000, // 5分間保持
  });
}

// 検索デバウンス
export function useAdminUserSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const { data, isLoading } = useAdminUsers({
    search: debouncedSearchTerm
  });

  return { data, isLoading, setSearchTerm };
}
```

## 7. エラーハンドリング設計

### 7.1 API エラーレスポンス
```typescript
interface AdminAPIError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  request_id: string;
}

// エラーコード定義
export const ADMIN_ERROR_CODES = {
  // 認証・認可エラー
  'ADMIN_AUTH_REQUIRED': 'Admin authentication required',
  'ADMIN_PERMISSION_DENIED': 'Insufficient admin permissions',
  'ADMIN_SESSION_EXPIRED': 'Admin session expired',

  // ユーザー操作エラー
  'USER_NOT_FOUND': 'Target user not found',
  'USER_ALREADY_SUSPENDED': 'User already suspended',
  'USER_CANNOT_SUSPEND_ADMIN': 'Cannot suspend admin user',

  // セキュリティエラー
  'IP_ALREADY_BLOCKED': 'IP address already blocked',
  'INVALID_SECURITY_SETTING': 'Invalid security setting value',

  // システムエラー
  'AUDIT_LOG_FAILED': 'Failed to record audit log',
  'DATABASE_ERROR': 'Database operation failed'
} as const;

// エラーハンドラー
export function handleAdminAPIError(error: any): AdminAPIError {
  const requestId = generateRequestId();

  // Supabaseエラーのマッピング
  if (error.code === 'PGRST116') {
    return {
      code: 'USER_NOT_FOUND',
      message: ADMIN_ERROR_CODES.USER_NOT_FOUND,
      timestamp: new Date().toISOString(),
      request_id: requestId
    };
  }

  // 権限エラー
  if (error.message?.includes('permission')) {
    return {
      code: 'ADMIN_PERMISSION_DENIED',
      message: ADMIN_ERROR_CODES.ADMIN_PERMISSION_DENIED,
      timestamp: new Date().toISOString(),
      request_id: requestId
    };
  }

  // デフォルトエラー
  return {
    code: 'DATABASE_ERROR',
    message: ADMIN_ERROR_CODES.DATABASE_ERROR,
    details: process.env.NODE_ENV === 'development' ? { error } : undefined,
    timestamp: new Date().toISOString(),
    request_id: requestId
  };
}
```

## 8. テスト設計

### 8.1 テスト戦略
```typescript
// ユニットテスト例
describe('Admin Permission System', () => {
  it('should grant correct permissions to super_admin', () => {
    const permissions = calculatePermissions('super_admin', {});
    expect(permissions['users.delete']).toBe(true);
    expect(permissions['system.admin_manage']).toBe(true);
  });

  it('should deny user_admin from deleting users', () => {
    const permissions = calculatePermissions('user_admin', {});
    expect(permissions['users.delete']).toBe(false);
  });

  it('should allow custom permission overrides', () => {
    const customPermissions = { 'users.delete': true };
    const permissions = calculatePermissions('user_admin', customPermissions);
    expect(permissions['users.delete']).toBe(true);
  });
});

// 統合テスト例
describe('Admin User Management API', () => {
  beforeEach(async () => {
    await setupTestDatabase();
    await createTestAdminUser();
  });

  it('should reset user password successfully', async () => {
    const response = await request(app)
      .post('/api/admin/users/test-user-id/reset-password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        force_change: true,
        notify_user: true,
        reason: 'User forgot password'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.email_sent).toBe(true);

    // 監査ログが記録されているか確認
    const auditLog = await getLatestAuditLog();
    expect(auditLog.action).toBe('user_password_reset');
    expect(auditLog.target_id).toBe('test-user-id');
  });
});

// E2Eテスト例
describe('Admin Dashboard E2E', () => {
  it('should allow admin to reset user password', async () => {
    // ログイン
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // ユーザー一覧ページ
    await page.goto('/admin/users');
    await page.waitForSelector('[data-testid="users-list"]');

    // ユーザー検索
    await page.fill('input[name="search"]', 'test@user.com');
    await page.waitForSelector('[data-testid="user-row"]');

    // パスワードリセット
    await page.click('[data-testid="reset-password-button"]');
    await page.click('[data-testid="confirm-reset"]');

    // 成功メッセージ確認
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });
});
```

## 9. モニタリング設計

### 9.1 メトリクス定義
```typescript
// 管理者活動メトリクス
export const ADMIN_METRICS = {
  // 操作数
  'admin.actions.total': 'counter',
  'admin.actions.by_type': 'counter with labels [action_type]',
  'admin.actions.by_admin': 'counter with labels [admin_id]',

  // 応答時間
  'admin.api.response_time': 'histogram with labels [endpoint]',
  'admin.page.load_time': 'histogram with labels [page]',

  // エラー率
  'admin.errors.total': 'counter with labels [error_code]',
  'admin.errors.rate': 'gauge',

  // セキュリティ
  'admin.login_attempts': 'counter with labels [success]',
  'admin.permission_denials': 'counter with labels [permission]',

  // システム健全性
  'admin.active_sessions': 'gauge',
  'admin.database_connections': 'gauge'
};

// アラート定義
export const ADMIN_ALERTS = [
  {
    name: 'High Admin Error Rate',
    condition: 'admin.errors.rate > 0.1',
    duration: '5m',
    severity: 'warning'
  },
  {
    name: 'Admin Permission Denial Spike',
    condition: 'rate(admin.permission_denials[5m]) > 10',
    duration: '2m',
    severity: 'critical'
  },
  {
    name: 'Slow Admin API Response',
    condition: 'admin.api.response_time{quantile="0.95"} > 5000',
    duration: '5m',
    severity: 'warning'
  }
];
```

この詳細設計により、セキュアで拡張性の高い管理者機能を実装できます。次のステップとして、実装フェーズに進みます。
# 管理者機能 API ドキュメント

この文書は、ToDo管理アプリケーションの管理者機能APIについての包括的なドキュメントです。

## 概要

管理者機能APIは、システム管理者が以下の操作を安全に実行するために設計されています：
- ユーザー管理（表示、パスワードリセット、アカウント停止）
- セキュリティ設定管理
- 監査ログの確認とエクスポート
- システム設定の変更

## 認証システム

### 認証方式
すべての管理者APIエンドポイントは、二重認証システムを使用します：

1. **Bearer Token**: 通常のユーザー認証トークン
2. **Admin Session Token**: 管理者専用セッショントークン

### ヘッダー例
```http
Authorization: Bearer <user_jwt_token>
X-Admin-Session: <admin_session_token>
Content-Type: application/json
```

### 管理者ロール
システムには4種類の管理者ロールがあります：

| ロール | 説明 | 主要権限 |
|--------|------|----------|
| `super_admin` | 最高権限管理者 | 全機能へのアクセス |
| `security_admin` | セキュリティ管理者 | セキュリティ設定、ログ確認 |
| `user_admin` | ユーザー管理者 | ユーザー管理、パスワードリセット |
| `audit_admin` | 監査管理者 | 監査ログ確認、エクスポート |

## エンドポイント一覧

### 1. ユーザー一覧取得

**エンドポイント**: `GET /api/admin/users/list`

**必要権限**: `users.view`

**クエリパラメータ**:
```typescript
{
  page?: number;           // ページ番号 (デフォルト: 1)
  limit?: number;          // 1ページあたりの件数 (デフォルト: 50, 最大: 100)
  search?: string;         // メールアドレスでの検索
  "filter.status"?: "active" | "suspended" | "inactive";
  "filter.role"?: "admin" | "user";
  "filter.last_login.from"?: string;  // ISO 8601 format
  "filter.last_login.to"?: string;    // ISO 8601 format
  "filter.created.from"?: string;     // ISO 8601 format
  "filter.created.to"?: string;       // ISO 8601 format
  "sort.field"?: "created_at" | "last_sign_in_at" | "email";
  "sort.direction"?: "asc" | "desc";
}
```

**リクエスト例**:
```http
GET /api/admin/users/list?page=1&limit=25&search=john@example.com&filter.status=active
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-Admin-Session: ast_1234567890_abcdef
```

**レスポンス**:
```typescript
{
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
    role?: "admin" | "user";
  };
}
```

**レスポンス例**:
```json
{
  "users": [
    {
      "id": "user-123",
      "email": "john@example.com",
      "created_at": "2024-01-01T00:00:00Z",
      "last_sign_in_at": "2024-01-15T10:30:00Z",
      "account_status": "active",
      "admin_role": null,
      "task_count": 15,
      "team_count": 2,
      "is_ip_blocked": false
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 25,
    "pages": 6,
    "has_more": true
  },
  "filters_applied": {
    "search": "john@example.com",
    "status": "active"
  }
}
```

**エラーレスポンス**:
```json
{
  "code": "ADMIN_PERMISSION_DENIED",
  "message": "Insufficient permissions: users.view required",
  "timestamp": "2024-01-15T10:30:00Z",
  "request_id": "req_1234567890"
}
```

### 2. パスワードリセット

**エンドポイント**: `POST /api/admin/users/{id}/reset-password`

**必要権限**: `users.password_reset`

**パスパラメータ**:
- `id`: 対象ユーザーのID

**リクエストボディ**:
```typescript
{
  user_id?: string;        // パスのIDと一致する必要がある
  force_change?: boolean;  // 次回ログイン時に強制変更 (デフォルト: false)
  notify_user?: boolean;   // メール通知送信 (デフォルト: true)
  reason?: string;         // リセット理由（監査ログ用）
}
```

**リクエスト例**:
```http
POST /api/admin/users/user-123/reset-password
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-Admin-Session: ast_1234567890_abcdef
Content-Type: application/json

{
  "user_id": "user-123",
  "force_change": true,
  "notify_user": true,
  "reason": "User forgot password and requested reset"
}
```

**レスポンス**:
```typescript
{
  success: boolean;
  reset_token?: string;    // notify_user=falseの場合のみ
  email_sent: boolean;
  expires_at: string;
  audit_log_id: string;
}
```

**レスポンス例**:
```json
{
  "success": true,
  "email_sent": true,
  "expires_at": "2024-01-16T10:30:00Z",
  "audit_log_id": "audit-789"
}
```

**エラーレスポンス例**:
```json
{
  "code": "SELF_OPERATION_NOT_ALLOWED",
  "message": "Cannot reset your own password through admin interface",
  "timestamp": "2024-01-15T10:30:00Z",
  "request_id": "req_1234567890"
}
```

## セキュリティ仕様

### 1. 自己操作防止
管理者は自分自身のアカウントに対して以下の操作を実行できません：
- パスワードリセット
- アカウント停止
- 権限変更

### 2. 権限エスカレーション防止
- `super_admin`以外の管理者は、他の`super_admin`に対する操作を実行できません
- カスタム権限での権限付与は可能ですが、適切な監査ログが記録されます

### 3. 監査ログ
すべての管理者操作は`admin_audit_log`テーブルに記録されます：

```typescript
{
  admin_id: string;        // 操作実行者
  action: AdminAction;     // 実行されたアクション
  target_type: string;     // 操作対象の種類
  target_id?: string;      // 操作対象のID
  target_email?: string;   // 操作対象のメール（マスク済み）
  details: object;         // 操作詳細（機密情報除去済み）
  ip_address: string;      // 実行者のIPアドレス
  user_agent: string;      // 実行者のUser-Agent
  session_id: string;      // セッションID
  request_id: string;      // リクエストID
  success: boolean;        // 操作成功/失敗
  error_code?: string;     // エラーコード
  error_message?: string;  // エラーメッセージ
  created_at: string;      // 実行日時
}
```

### 4. データサニタイゼーション
監査ログに記録される前に、以下の機密情報が除去されます：
- パスワード関連情報
- セッショントークン
- リセットトークン
- メールアドレス（マスク処理）

## 権限システム

### 権限一覧
```typescript
{
  // ユーザー管理
  "users.view": "ユーザー一覧表示",
  "users.details": "ユーザー詳細表示",
  "users.password_reset": "パスワードリセット",
  "users.suspend": "アカウント停止",
  "users.delete": "アカウント削除",

  // セキュリティ管理
  "security.view_logs": "セキュリティログ表示",
  "security.ip_blocks": "IP ブロック管理",
  "security.settings": "セキュリティ設定",

  // 監査
  "audit.view": "監査ログ表示",
  "audit.export": "監査ログエクスポート",

  // システム管理
  "system.settings": "システム設定",
  "system.admin_manage": "管理者権限管理"
}
```

### ロール別権限マトリクス

| 権限 | super_admin | security_admin | user_admin | audit_admin |
|------|-------------|----------------|------------|-------------|
| users.view | ✅ | ✅ | ✅ | ✅ |
| users.details | ✅ | ✅ | ✅ | ✅ |
| users.password_reset | ✅ | ❌ | ✅ | ❌ |
| users.suspend | ✅ | ❌ | ✅ | ❌ |
| users.delete | ✅ | ❌ | ❌ | ❌ |
| security.view_logs | ✅ | ✅ | ❌ | ❌ |
| security.ip_blocks | ✅ | ✅ | ❌ | ❌ |
| security.settings | ✅ | ✅ | ❌ | ❌ |
| audit.view | ✅ | ✅ | ✅ | ✅ |
| audit.export | ✅ | ❌ | ❌ | ✅ |
| system.settings | ✅ | ❌ | ❌ | ❌ |
| system.admin_manage | ✅ | ❌ | ❌ | ❌ |

## エラーコード一覧

| コード | 説明 | HTTPステータス |
|--------|------|----------------|
| `ADMIN_AUTH_REQUIRED` | 管理者認証が必要 | 401 |
| `ADMIN_AUTH_INVALID` | 無効な認証トークン | 401 |
| `ADMIN_PERMISSION_DENIED` | 権限不足 | 403 |
| `INVALID_USER_ID` | 無効なユーザーID | 400 |
| `USER_ID_MISMATCH` | ユーザーID不一致 | 400 |
| `USER_NOT_FOUND` | ユーザーが見つからない | 404 |
| `SELF_OPERATION_NOT_ALLOWED` | 自己操作は許可されていない | 400 |
| `INSUFFICIENT_PRIVILEGES` | 権限不足（特権エスカレーション） | 403 |
| `PASSWORD_RESET_FAILED` | パスワードリセット失敗 | 500 |
| `DATABASE_ERROR` | データベースエラー | 500 |
| `INTERNAL_ERROR` | 内部サーバーエラー | 500 |

## 実装例

### JavaScript/TypeScript クライアント

```typescript
class AdminAPIClient {
  constructor(
    private baseURL: string,
    private userToken: string,
    private adminSessionToken: string
  ) {}

  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.userToken}`,
        'X-Admin-Session': this.adminSessionToken,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API Error: ${error.code} - ${error.message}`);
    }

    return response.json();
  }

  async getUsersList(params: AdminUsersListRequest) {
    const queryString = new URLSearchParams(params as any).toString();
    return this.request(`/api/admin/users/list?${queryString}`);
  }

  async resetUserPassword(userId: string, data: AdminPasswordResetRequest) {
    return this.request(`/api/admin/users/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// 使用例
const adminClient = new AdminAPIClient(
  'https://your-app.com',
  'user_jwt_token',
  'admin_session_token'
);

try {
  const users = await adminClient.getUsersList({
    page: 1,
    limit: 25,
    search: 'john@example.com'
  });
  console.log('Users:', users);

  const resetResult = await adminClient.resetUserPassword('user-123', {
    reason: 'User forgot password',
    force_change: true
  });
  console.log('Password reset successful:', resetResult);
} catch (error) {
  console.error('Admin API error:', error.message);
}
```

### cURL 例

```bash
# ユーザー一覧取得
curl -X GET "https://your-app.com/api/admin/users/list?page=1&limit=25" \
  -H "Authorization: Bearer your_jwt_token" \
  -H "X-Admin-Session: your_admin_session_token"

# パスワードリセット
curl -X POST "https://your-app.com/api/admin/users/user-123/reset-password" \
  -H "Authorization: Bearer your_jwt_token" \
  -H "X-Admin-Session: your_admin_session_token" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-123",
    "force_change": true,
    "notify_user": true,
    "reason": "User forgot password"
  }'
```

## テスト仕様

### 単体テスト
管理者機能には包括的な単体テストが含まれています：

- **権限システムテスト**: 各ロールの権限が正しく機能することを確認
- **バリデーションテスト**: 入力データの検証が適切に動作することを確認
- **セキュリティテスト**: 自己操作防止、権限エスカレーション防止の確認
- **データサニタイゼーションテスト**: 機密情報が適切に除去されることを確認

### テスト実行
```bash
# 管理者機能のテストを実行
npm test -- __tests__/admin/

# 特定のテストファイルを実行
npm test -- __tests__/admin/adminCore.test.js
```

## セットアップ手順

### 1. データベース初期化
```sql
-- supabase-admin-features-setup.sql を実行
psql -h your-host -d your-database -f supabase-admin-features-setup.sql
```

### 2. 環境変数設定
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_APP_URL=your_app_url
```

### 3. 初期管理者作成
```sql
-- 最初のスーパー管理者を作成
INSERT INTO system_admins (user_id, role, is_active, created_by)
VALUES ('your-user-id', 'super_admin', true, 'system');
```

## サポートと保守

### ログ監視
管理者操作は以下のテーブルで監視できます：
- `admin_audit_log`: 全管理者操作の記録
- `admin_sessions`: アクティブな管理者セッション
- `user_password_history`: パスワード変更履歴

### 定期メンテナンス
- 期限切れセッションのクリーンアップ
- 監査ログのアーカイブ（90日以上経過したログ）
- パスワード履歴の定期削除（1年以上経過した履歴）

### トラブルシューティング
一般的な問題と解決方法については、プロジェクトのREADMEファイルまたはサポートドキュメントを参照してください。

---

**最終更新**: 2024年1月15日
**APIバージョン**: 1.0.0
**ドキュメント作成者**: Claude Code Assistant
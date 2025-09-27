-- ====================================
-- 管理者機能データベースセットアップ
-- ====================================

-- 管理者役割の定義
CREATE TYPE admin_role AS ENUM (
  'super_admin',
  'security_admin',
  'user_admin',
  'audit_admin'
);

-- 管理者操作種別の定義
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
  'system_setting_update',
  'audit_log_export',
  'security_alert_dismiss'
);

-- ====================================
-- 1. システム管理者テーブル
-- ====================================
CREATE TABLE system_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role admin_role NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  mfa_enabled BOOLEAN NOT NULL DEFAULT false,
  mfa_secret TEXT, -- MFA secret key (encrypted)
  last_login_at TIMESTAMP WITH TIME ZONE,
  login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_user_admin UNIQUE(user_id),
  CONSTRAINT valid_permissions CHECK (jsonb_typeof(permissions) = 'object'),
  CONSTRAINT valid_login_attempts CHECK (login_attempts >= 0),
  CONSTRAINT valid_lock_status CHECK (
    (locked_until IS NULL) OR
    (locked_until > NOW())
  )
);

-- インデックス
CREATE INDEX idx_system_admins_user_id ON system_admins(user_id);
CREATE INDEX idx_system_admins_role ON system_admins(role);
CREATE INDEX idx_system_admins_active ON system_admins(is_active) WHERE is_active = true;
CREATE INDEX idx_system_admins_locked ON system_admins(locked_until) WHERE locked_until IS NOT NULL;

-- ====================================
-- 2. 管理者監査ログテーブル
-- ====================================
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES system_admins(id) ON DELETE SET NULL,
  action admin_action NOT NULL,
  target_type TEXT NOT NULL, -- 'user', 'system', 'security', 'admin'
  target_id TEXT,
  target_email TEXT, -- For user operations (privacy compliant)
  details JSONB NOT NULL DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  request_id TEXT, -- For error tracking
  success BOOLEAN NOT NULL DEFAULT true,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_details CHECK (jsonb_typeof(details) = 'object'),
  CONSTRAINT valid_target_type CHECK (target_type IN ('user', 'system', 'security', 'admin')),
  CONSTRAINT success_error_consistency CHECK (
    (success = true AND error_code IS NULL AND error_message IS NULL) OR
    (success = false AND error_code IS NOT NULL)
  )
);

-- インデックス（監査ログは大量データになる可能性があるため最適化）
CREATE INDEX idx_admin_audit_log_admin_id ON admin_audit_log(admin_id);
CREATE INDEX idx_admin_audit_log_action ON admin_audit_log(action);
CREATE INDEX idx_admin_audit_log_target ON admin_audit_log(target_type, target_id);
CREATE INDEX idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);
CREATE INDEX idx_admin_audit_log_ip ON admin_audit_log(ip_address);
CREATE INDEX idx_admin_audit_log_success ON admin_audit_log(success, created_at DESC);

-- ====================================
-- 3. セキュリティ設定テーブル
-- ====================================
CREATE TABLE security_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_name TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  setting_type TEXT NOT NULL DEFAULT 'system', -- 'system', 'security', 'audit'
  updated_by UUID REFERENCES system_admins(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_setting_value CHECK (jsonb_typeof(setting_value) = 'object'),
  CONSTRAINT valid_setting_type CHECK (setting_type IN ('system', 'security', 'audit')),
  CONSTRAINT valid_setting_name CHECK (setting_name ~ '^[a-z_]+$')
);

-- インデックス
CREATE INDEX idx_security_settings_name ON security_settings(setting_name);
CREATE INDEX idx_security_settings_active ON security_settings(is_active) WHERE is_active = true;
CREATE INDEX idx_security_settings_type ON security_settings(setting_type);

-- ====================================
-- 4. ユーザーパスワード履歴テーブル
-- ====================================
CREATE TABLE user_password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL, -- bcrypt hash
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES system_admins(id), -- NULL for user self-change
  is_admin_reset BOOLEAN NOT NULL DEFAULT false
);

-- インデックス
CREATE INDEX idx_user_password_history_user_id ON user_password_history(user_id, created_at DESC);
CREATE INDEX idx_user_password_history_created_at ON user_password_history(created_at DESC);

-- ====================================
-- 5. IPアドレスブロックテーブル
-- ====================================
CREATE TABLE ip_address_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET NOT NULL,
  block_type TEXT NOT NULL CHECK (block_type IN ('temporary', 'permanent', 'whitelist')),
  reason TEXT NOT NULL,
  blocked_until TIMESTAMP WITH TIME ZONE, -- NULL for permanent
  blocked_by UUID REFERENCES system_admins(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_block_until CHECK (
    (block_type = 'permanent' AND blocked_until IS NULL) OR
    (block_type = 'temporary' AND blocked_until IS NOT NULL) OR
    (block_type = 'whitelist' AND blocked_until IS NULL)
  )
);

-- インデックス
CREATE UNIQUE INDEX idx_ip_address_blocks_ip_active ON ip_address_blocks(ip_address)
  WHERE is_active = true;
CREATE INDEX idx_ip_address_blocks_type ON ip_address_blocks(block_type);
CREATE INDEX idx_ip_address_blocks_until ON ip_address_blocks(blocked_until)
  WHERE blocked_until IS NOT NULL;
CREATE INDEX idx_ip_address_blocks_active ON ip_address_blocks(is_active, created_at DESC);

-- ====================================
-- 6. 管理者セッションテーブル
-- ====================================
CREATE TABLE admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES system_admins(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  mfa_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- インデックス
CREATE INDEX idx_admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX idx_admin_sessions_token ON admin_sessions(session_token) WHERE is_active = true;
CREATE INDEX idx_admin_sessions_expires ON admin_sessions(expires_at);
CREATE INDEX idx_admin_sessions_active ON admin_sessions(is_active, last_activity DESC);

-- ====================================
-- 7. ビュー: 管理者ユーザー詳細情報
-- ====================================
CREATE OR REPLACE VIEW admin_user_details AS
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
  sa.id as admin_id,
  sa.role as admin_role,
  sa.is_active as admin_active,
  sa.mfa_enabled as admin_mfa_enabled,
  sa.last_login_at as admin_last_login,

  -- 統計情報
  COALESCE(task_stats.task_count, 0) as task_count,
  COALESCE(team_stats.team_count, 0) as team_count,

  -- 最新ログイン試行情報
  latest_attempt.created_at as last_login_attempt,
  latest_attempt.success as last_login_success,

  -- ブロック状況
  CASE
    WHEN ip_block.id IS NOT NULL THEN true
    ELSE false
  END as is_ip_blocked,

  -- アカウント状態
  CASE
    WHEN u.banned_until IS NOT NULL AND u.banned_until > NOW() THEN 'suspended'
    WHEN u.email_confirmed_at IS NULL THEN 'unconfirmed'
    WHEN sa.is_active = false THEN 'admin_disabled'
    ELSE 'active'
  END as account_status

FROM auth.users u
LEFT JOIN system_admins sa ON sa.user_id = u.id
LEFT JOIN (
  SELECT user_id, COUNT(*) as task_count
  FROM tasks
  GROUP BY user_id
) task_stats ON task_stats.user_id = u.id
LEFT JOIN (
  SELECT user_id, COUNT(*) as team_count
  FROM team_members
  GROUP BY user_id
) team_stats ON team_stats.user_id = u.id
LEFT JOIN (
  SELECT DISTINCT ON (email) email, created_at, success
  FROM login_attempts
  ORDER BY email, created_at DESC
) latest_attempt ON latest_attempt.email = u.email
LEFT JOIN (
  SELECT ib.*, la.email
  FROM ip_address_blocks ib
  JOIN login_attempts la ON la.ip_address = ib.ip_address
  WHERE ib.is_active = true
    AND ib.block_type IN ('temporary', 'permanent')
    AND (ib.blocked_until IS NULL OR ib.blocked_until > NOW())
) ip_block ON ip_block.email = u.email;

-- ====================================
-- 8. Row Level Security (RLS) ポリシー
-- ====================================

-- system_admins テーブルのRLS
ALTER TABLE system_admins ENABLE ROW LEVEL SECURITY;

-- 管理者のみ自分の情報を参照可能
CREATE POLICY "Admins can view their own admin record"
  ON system_admins FOR SELECT
  USING (user_id = auth.uid());

-- super_admin のみ他の管理者を管理可能
CREATE POLICY "Super admins can manage all admin records"
  ON system_admins FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM system_admins
      WHERE user_id = auth.uid()
        AND role = 'super_admin'
        AND is_active = true
    )
  );

-- admin_audit_log テーブルのRLS
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- 管理者は監査ログを参照可能（audit_admin は全て、他は自分関連のみ）
CREATE POLICY "Admins can view relevant audit logs"
  ON admin_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM system_admins sa
      WHERE sa.user_id = auth.uid()
        AND sa.is_active = true
        AND (
          sa.role IN ('super_admin', 'audit_admin') OR
          sa.id = admin_audit_log.admin_id
        )
    )
  );

-- 監査ログの挿入は自動化されたシステムのみ
CREATE POLICY "System can insert audit logs"
  ON admin_audit_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM system_admins
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- security_settings テーブルのRLS
ALTER TABLE security_settings ENABLE ROW LEVEL SECURITY;

-- security_admin 以上がセキュリティ設定を管理
CREATE POLICY "Security admins can manage security settings"
  ON security_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM system_admins
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'security_admin')
        AND is_active = true
    )
  );

-- user_password_history テーブルのRLS
ALTER TABLE user_password_history ENABLE ROW LEVEL SECURITY;

-- 管理者のみアクセス可能
CREATE POLICY "Only admins can access password history"
  ON user_password_history FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM system_admins
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- ip_address_blocks テーブルのRLS
ALTER TABLE ip_address_blocks ENABLE ROW LEVEL SECURITY;

-- security_admin 以上がIP ブロックを管理
CREATE POLICY "Security admins can manage IP blocks"
  ON ip_address_blocks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM system_admins
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'security_admin')
        AND is_active = true
    )
  );

-- admin_sessions テーブルのRLS
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- 管理者は自分のセッションのみ参照可能
CREATE POLICY "Admins can view their own sessions"
  ON admin_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM system_admins
      WHERE user_id = auth.uid()
        AND id = admin_sessions.admin_id
        AND is_active = true
    )
  );

-- ====================================
-- 9. 初期データの投入
-- ====================================

-- デフォルトセキュリティ設定
INSERT INTO security_settings (setting_name, setting_value, description, setting_type) VALUES
('password_policy', '{
  "min_length": 8,
  "require_uppercase": true,
  "require_lowercase": true,
  "require_numbers": true,
  "require_symbols": false,
  "max_history": 5,
  "prevent_common_passwords": true
}', 'パスワード強度ポリシー設定', 'security'),

('login_attempt_policy', '{
  "max_attempts": 5,
  "lockout_duration_minutes": 30,
  "progressive_delay": true,
  "ip_block_threshold": 10,
  "ip_block_duration_hours": 24
}', 'ログイン試行制限ポリシー', 'security'),

('session_policy', '{
  "admin_timeout_minutes": 30,
  "user_timeout_minutes": 1440,
  "require_mfa_for_admin": true,
  "max_concurrent_sessions": 3
}', 'セッション管理ポリシー', 'security'),

('notification_settings', '{
  "security_alerts_enabled": true,
  "failed_login_threshold": 3,
  "admin_action_notifications": true,
  "email_notifications": true
}', '通知・アラート設定', 'system'),

('audit_settings', '{
  "retention_days": 365,
  "auto_export_enabled": false,
  "export_format": "json",
  "sensitive_data_masking": true
}', '監査ログ設定', 'audit');

-- ====================================
-- 10. トリガー関数
-- ====================================

-- updated_at の自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの設定
CREATE TRIGGER update_system_admins_updated_at
  BEFORE UPDATE ON system_admins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_security_settings_updated_at
  BEFORE UPDATE ON security_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ip_address_blocks_updated_at
  BEFORE UPDATE ON ip_address_blocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- セッション最終アクティビティ更新
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_sessions_activity
  BEFORE UPDATE ON admin_sessions
  FOR EACH ROW EXECUTE FUNCTION update_session_activity();

-- ====================================
-- 11. パフォーマンス最適化
-- ====================================

-- 監査ログのパーティショニング準備（将来の大量データ対策）
-- CREATE TABLE admin_audit_log_y2024m01 PARTITION OF admin_audit_log
-- FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- 統計情報更新のためのマテリアライズドビュー
CREATE MATERIALIZED VIEW admin_user_statistics AS
SELECT
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as new_users,
  COUNT(*) FILTER (WHERE last_sign_in_at IS NOT NULL) as active_users,
  COUNT(*) FILTER (WHERE banned_until IS NOT NULL AND banned_until > NOW()) as suspended_users,
  COUNT(*) FILTER (WHERE email_confirmed_at IS NULL) as unconfirmed_users
FROM auth.users
WHERE deleted_at IS NULL OR deleted_at IS NULL
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date;

-- インデックス
CREATE UNIQUE INDEX idx_admin_user_statistics_date ON admin_user_statistics(date);

-- 自動更新関数
CREATE OR REPLACE FUNCTION refresh_admin_statistics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW admin_user_statistics;
END;
$$ LANGUAGE plpgsql;

-- ====================================
-- セットアップ完了確認
-- ====================================
DO $$
BEGIN
  RAISE NOTICE '管理者機能データベースセットアップが完了しました。';
  RAISE NOTICE 'テーブル数: %', (
    SELECT count(*)
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name LIKE '%admin%' OR table_name IN ('security_settings', 'user_password_history', 'ip_address_blocks')
  );
  RAISE NOTICE 'インデックス数: %', (
    SELECT count(*)
    FROM pg_indexes
    WHERE indexname LIKE '%admin%' OR indexname LIKE '%security%'
  );
END $$;
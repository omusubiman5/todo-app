-- ログイン試行追跡とブロック機能のためのデータベースセットアップ
-- Login attempt tracking and blocking system database setup

-- 1. ログイン試行記録テーブル
-- Login attempts tracking table
CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET NOT NULL,
    email TEXT,
    user_agent TEXT,
    attempt_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    success BOOLEAN NOT NULL DEFAULT FALSE,
    blocked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. IPブロックテーブル
-- IP blocking table
CREATE TABLE IF NOT EXISTS blocked_ips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET NOT NULL UNIQUE,
    blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    blocked_until TIMESTAMP WITH TIME ZONE,
    block_reason TEXT,
    attempt_count INTEGER DEFAULT 0,
    manual_block BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. システム設定テーブル
-- System configuration table
CREATE TABLE IF NOT EXISTS security_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_name TEXT NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成
-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time ON login_attempts(ip_address, attempt_time DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON login_attempts(email, attempt_time DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_success ON login_attempts(success, attempt_time DESC);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_address ON blocked_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_until ON blocked_ips(blocked_until);
CREATE INDEX IF NOT EXISTS idx_security_settings_name ON security_settings(setting_name);

-- デフォルトのセキュリティ設定
-- Default security settings
INSERT INTO security_settings (setting_name, setting_value, description)
VALUES
    ('max_attempts_per_ip', '{"value": 5, "window_minutes": 15}', '同一IPアドレスからの最大試行回数と時間窓'),
    ('max_attempts_per_email', '{"value": 3, "window_minutes": 15}', '同一メールアドレスでの最大試行回数と時間窓'),
    ('block_duration_minutes', '{"initial": 15, "escalation_multiplier": 2, "max_duration": 1440}', 'ブロック期間の設定（分）'),
    ('whitelist_ips', '{"ips": []}', 'ホワイトリストIPアドレス'),
    ('permanent_block_threshold', '{"value": 10}', '永続ブロックの閾値')
ON CONFLICT (setting_name) DO NOTHING;

-- ログイン試行記録関数
-- Function to record login attempt
CREATE OR REPLACE FUNCTION record_login_attempt(
    p_ip_address INET,
    p_email TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_success BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    attempt_id UUID;
    is_blocked BOOLEAN := FALSE;
BEGIN
    -- ブロック状態をチェック
    SELECT EXISTS(
        SELECT 1 FROM blocked_ips
        WHERE ip_address = p_ip_address
        AND (blocked_until IS NULL OR blocked_until > NOW())
    ) INTO is_blocked;

    -- 試行を記録
    INSERT INTO login_attempts (ip_address, email, user_agent, success, blocked)
    VALUES (p_ip_address, p_email, p_user_agent, p_success, is_blocked)
    RETURNING id INTO attempt_id;

    RETURN attempt_id;
END;
$$;

-- IPブロック状態チェック関数
-- Function to check if IP is blocked
CREATE OR REPLACE FUNCTION is_ip_blocked(p_ip_address INET)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    blocked BOOLEAN := FALSE;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM blocked_ips
        WHERE ip_address = p_ip_address
        AND (blocked_until IS NULL OR blocked_until > NOW())
    ) INTO blocked;

    RETURN blocked;
END;
$$;

-- 自動ブロック評価関数
-- Function to evaluate and apply automatic blocking
CREATE OR REPLACE FUNCTION evaluate_auto_block(p_ip_address INET)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    max_attempts INTEGER;
    window_minutes INTEGER;
    block_duration INTEGER;
    escalation_multiplier INTEGER;
    max_duration INTEGER;
    recent_attempts INTEGER;
    existing_blocks INTEGER;
    block_minutes INTEGER;
    whitelist_ips JSONB;
    permanent_threshold INTEGER;
BEGIN
    -- ホワイトリストチェック
    SELECT setting_value->'ips' INTO whitelist_ips
    FROM security_settings WHERE setting_name = 'whitelist_ips';

    IF whitelist_ips ? p_ip_address::TEXT THEN
        RETURN FALSE;
    END IF;

    -- 設定値を取得
    SELECT (setting_value->>'value')::INTEGER, (setting_value->>'window_minutes')::INTEGER
    INTO max_attempts, window_minutes
    FROM security_settings WHERE setting_name = 'max_attempts_per_ip';

    SELECT (setting_value->>'initial')::INTEGER, (setting_value->>'escalation_multiplier')::INTEGER, (setting_value->>'max_duration')::INTEGER
    INTO block_duration, escalation_multiplier, max_duration
    FROM security_settings WHERE setting_name = 'block_duration_minutes';

    SELECT (setting_value->>'value')::INTEGER
    INTO permanent_threshold
    FROM security_settings WHERE setting_name = 'permanent_block_threshold';

    -- 指定時間内の失敗試行数をカウント
    SELECT COUNT(*)
    INTO recent_attempts
    FROM login_attempts
    WHERE ip_address = p_ip_address
    AND success = FALSE
    AND attempt_time > NOW() - INTERVAL '1 minute' * window_minutes;

    -- ブロックが必要かチェック
    IF recent_attempts >= max_attempts THEN
        -- 既存のブロック回数を取得
        SELECT COUNT(*)
        INTO existing_blocks
        FROM blocked_ips
        WHERE ip_address = p_ip_address;

        -- エスカレーションによるブロック期間計算
        block_minutes := block_duration * POWER(escalation_multiplier, existing_blocks);
        IF block_minutes > max_duration THEN
            block_minutes := max_duration;
        END IF;

        -- 永続ブロックの判定
        IF existing_blocks >= permanent_threshold THEN
            INSERT INTO blocked_ips (ip_address, blocked_until, block_reason, attempt_count)
            VALUES (p_ip_address, NULL, 'Automatic permanent block - exceeded threshold', recent_attempts)
            ON CONFLICT (ip_address) DO UPDATE SET
                blocked_until = NULL,
                block_reason = 'Automatic permanent block - exceeded threshold',
                attempt_count = recent_attempts,
                updated_at = NOW();
        ELSE
            INSERT INTO blocked_ips (ip_address, blocked_until, block_reason, attempt_count)
            VALUES (p_ip_address, NOW() + INTERVAL '1 minute' * block_minutes, 'Automatic block - too many attempts', recent_attempts)
            ON CONFLICT (ip_address) DO UPDATE SET
                blocked_until = NOW() + INTERVAL '1 minute' * block_minutes,
                block_reason = 'Automatic block - too many attempts',
                attempt_count = recent_attempts,
                updated_at = NOW();
        END IF;

        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

-- 期限切れブロックの自動削除関数
-- Function to clean expired blocks
CREATE OR REPLACE FUNCTION cleanup_expired_blocks()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM blocked_ips
    WHERE blocked_until IS NOT NULL
    AND blocked_until < NOW()
    AND manual_block = FALSE;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- 古いログイン試行記録の削除関数
-- Function to clean old login attempts
CREATE OR REPLACE FUNCTION cleanup_old_login_attempts(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM login_attempts
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- RLSポリシーの有効化
-- Enable Row Level Security
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_settings ENABLE ROW LEVEL SECURITY;

-- login_attemptsのRLSポリシー（管理者のみアクセス可能）
-- RLS policies for login_attempts (admin access only)
CREATE POLICY "Admin can view all login attempts" ON login_attempts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            JOIN teams t ON tm.team_id = t.id
            WHERE tm.user_id = auth.uid()
            AND tm.role IN ('owner', 'admin')
        )
    );

-- blocked_ipsのRLSポリシー（管理者のみアクセス可能）
-- RLS policies for blocked_ips (admin access only)
CREATE POLICY "Admin can manage blocked IPs" ON blocked_ips
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            JOIN teams t ON tm.team_id = t.id
            WHERE tm.user_id = auth.uid()
            AND tm.role IN ('owner', 'admin')
        )
    );

-- security_settingsのRLSポリシー（オーナーのみアクセス可能）
-- RLS policies for security_settings (owner access only)
CREATE POLICY "Owner can manage security settings" ON security_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            JOIN teams t ON tm.team_id = t.id
            WHERE tm.user_id = auth.uid()
            AND tm.role = 'owner'
        )
    );

-- 定期クリーンアップ用のcron拡張（Supabase Pro以上で利用可能）
-- Periodic cleanup using cron extension (available in Supabase Pro+)
-- SELECT cron.schedule('cleanup-expired-blocks', '*/15 * * * *', 'SELECT cleanup_expired_blocks();');
-- SELECT cron.schedule('cleanup-old-attempts', '0 2 * * *', 'SELECT cleanup_old_login_attempts(30);');

-- セキュリティ統計ビュー
-- Security statistics view
CREATE OR REPLACE VIEW security_stats AS
SELECT
    'total_attempts' as metric,
    COUNT(*)::TEXT as value,
    'Total login attempts in last 24 hours' as description
FROM login_attempts
WHERE attempt_time > NOW() - INTERVAL '24 hours'

UNION ALL

SELECT
    'failed_attempts' as metric,
    COUNT(*)::TEXT as value,
    'Failed login attempts in last 24 hours' as description
FROM login_attempts
WHERE attempt_time > NOW() - INTERVAL '24 hours'
AND success = FALSE

UNION ALL

SELECT
    'currently_blocked' as metric,
    COUNT(*)::TEXT as value,
    'Currently blocked IP addresses' as description
FROM blocked_ips
WHERE blocked_until IS NULL OR blocked_until > NOW()

UNION ALL

SELECT
    'top_blocked_ip' as metric,
    ip_address::TEXT as value,
    'Most frequently blocked IP address' as description
FROM (
    SELECT ip_address, COUNT(*) as block_count
    FROM blocked_ips
    GROUP BY ip_address
    ORDER BY block_count DESC
    LIMIT 1
) t;

-- セキュリティ統計ビューのRLSポリシー
CREATE POLICY "Admin can view security stats" ON security_stats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            JOIN teams t ON tm.team_id = t.id
            WHERE tm.user_id = auth.uid()
            AND tm.role IN ('owner', 'admin')
        )
    );
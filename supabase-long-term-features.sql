-- 長期的検討機能（低優先度）
-- 1. パーティション化 - 大規模データ対応
-- 2. カスタムワークフロー - 高度な業務対応  
-- 3. プラグインアーキテクチャ - 最大拡張性

-- =============================================================================
-- 1. パーティション化 - 大規模データ対応
-- =============================================================================

-- 既存tasksテーブルのパーティション化準備
-- 注意: 本番環境では慎重に実行する必要があります

-- 新しいパーティション化されたtasksテーブル
CREATE TABLE IF NOT EXISTS tasks_partitioned (
  id UUID DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT,
  priority_id INTEGER REFERENCES task_priorities(id),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  team_id UUID REFERENCES teams(id),
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  custom_fields JSONB DEFAULT '{}',
  
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- 月ごとのパーティション作成例
CREATE TABLE IF NOT EXISTS tasks_y2024m01 PARTITION OF tasks_partitioned
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE IF NOT EXISTS tasks_y2024m02 PARTITION OF tasks_partitioned  
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

CREATE TABLE IF NOT EXISTS tasks_y2024m03 PARTITION OF tasks_partitioned
FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');

-- パーティション自動管理関数
CREATE OR REPLACE FUNCTION create_monthly_partition(target_date DATE)
RETURNS TEXT AS $$
DECLARE
  partition_name TEXT;
  start_date DATE;
  end_date DATE;
  create_sql TEXT;
BEGIN
  -- パーティション名生成
  partition_name := 'tasks_y' || EXTRACT(YEAR FROM target_date) || 
                   'm' || LPAD(EXTRACT(MONTH FROM target_date)::TEXT, 2, '0');
  
  -- 期間計算
  start_date := DATE_TRUNC('month', target_date);
  end_date := start_date + INTERVAL '1 month';
  
  -- パーティション作成SQL
  create_sql := format('CREATE TABLE IF NOT EXISTS %I PARTITION OF tasks_partitioned FOR VALUES FROM (%L) TO (%L)',
                      partition_name, start_date, end_date);
  
  -- 実行
  EXECUTE create_sql;
  
  -- インデックス作成
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (user_id, status, created_at)',
                'idx_' || partition_name || '_user_status', partition_name);
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (team_id, status, created_at)',
                'idx_' || partition_name || '_team_status', partition_name);
  
  RETURN 'パーティション ' || partition_name || ' を作成しました';
END;
$$ LANGUAGE plpgsql;

-- 古いパーティション削除関数
CREATE OR REPLACE FUNCTION drop_old_partitions(months_to_keep INTEGER DEFAULT 24)
RETURNS TEXT AS $$
DECLARE
  partition_record RECORD;
  cutoff_date DATE;
  dropped_count INTEGER := 0;
BEGIN
  cutoff_date := CURRENT_DATE - (months_to_keep || ' months')::INTERVAL;
  
  FOR partition_record IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE tablename LIKE 'tasks_y%'
      AND schemaname = 'public'
  LOOP
    -- パーティション名から日付を抽出して比較
    -- 簡易実装のため省略
    RAISE NOTICE 'パーティション確認: %', partition_record.tablename;
  END LOOP;
  
  RETURN format('%s個のパーティションを削除しました', dropped_count);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 2. カスタムワークフロー - 高度な業務対応
-- =============================================================================

-- ワークフロー定義テーブル
CREATE TABLE IF NOT EXISTS task_workflows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- ワークフローの状態定義
  states JSONB NOT NULL DEFAULT '[]', 
  /* 例: [
    {"id": "draft", "name": "下書き", "color": "#gray-500", "is_initial": true},
    {"id": "review", "name": "レビュー中", "color": "#blue-500"},
    {"id": "approved", "name": "承認済み", "color": "#green-500"},  
    {"id": "published", "name": "公開", "color": "#purple-500", "is_final": true}
  ] */
  
  -- 許可される状態遷移
  transitions JSONB NOT NULL DEFAULT '[]',
  /* 例: [
    {"from": "draft", "to": "review", "label": "レビュー依頼", "required_role": "member"},
    {"from": "review", "to": "approved", "label": "承認", "required_role": "admin"},
    {"from": "review", "to": "draft", "label": "差し戻し", "required_role": "admin"}
  ] */
  
  -- 自動化ルール
  automation_rules JSONB DEFAULT '[]',
  /* 例: [
    {"trigger": "state_changed", "from": "approved", "to": "published", "action": "auto_assign", "target": "creator"},
    {"trigger": "due_date", "condition": "1_day_before", "action": "notify", "target": "assignee"}
  ] */
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(team_id, name)
);

-- ワークフロー適用テーブル  
CREATE TABLE IF NOT EXISTS task_workflow_instances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES task_workflows(id),
  current_state TEXT NOT NULL,
  state_data JSONB DEFAULT '{}', -- 状態固有のデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ワークフロー状態変更ログ
CREATE TABLE IF NOT EXISTS task_workflow_transitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_instance_id UUID REFERENCES task_workflow_instances(id) ON DELETE CASCADE,
  from_state TEXT,
  to_state TEXT NOT NULL,
  transition_data JSONB DEFAULT '{}',
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  comment TEXT
);

-- ワークフロー状態変更関数
CREATE OR REPLACE FUNCTION change_workflow_state(
  p_task_id UUID,
  p_new_state TEXT,
  p_user_id UUID,
  p_comment TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  instance_record RECORD;
  workflow_record RECORD;
  transition_allowed BOOLEAN := false;
  user_role TEXT;
  result JSON;
BEGIN
  -- ワークフローインスタンス取得
  SELECT * INTO instance_record 
  FROM task_workflow_instances 
  WHERE task_id = p_task_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'ワークフローが設定されていません');
  END IF;
  
  -- ワークフロー定義取得
  SELECT * INTO workflow_record
  FROM task_workflows
  WHERE id = instance_record.workflow_id;
  
  -- ユーザーの役割確認（簡易版）
  SELECT COALESCE(tm.role, 'member') INTO user_role
  FROM tasks t
  LEFT JOIN team_members tm ON t.team_id = tm.team_id AND tm.user_id = p_user_id
  WHERE t.id = p_task_id;
  
  -- 遷移許可チェック
  SELECT EXISTS (
    SELECT 1 FROM jsonb_array_elements(workflow_record.transitions) AS t
    WHERE t->>'from' = instance_record.current_state
      AND t->>'to' = p_new_state
      AND (t->>'required_role' IS NULL OR user_role = t->>'required_role' OR user_role IN ('owner', 'admin'))
  ) INTO transition_allowed;
  
  IF NOT transition_allowed THEN
    RETURN jsonb_build_object('success', false, 'message', '許可されていない状態遷移です');
  END IF;
  
  -- 状態更新
  UPDATE task_workflow_instances
  SET current_state = p_new_state,
      updated_at = NOW()
  WHERE id = instance_record.id;
  
  -- 遷移ログ記録
  INSERT INTO task_workflow_transitions (
    workflow_instance_id, from_state, to_state, performed_by, comment
  ) VALUES (
    instance_record.id, instance_record.current_state, p_new_state, p_user_id, p_comment
  );
  
  -- tasksテーブルのstatusも連動更新
  UPDATE tasks 
  SET status = CASE 
    WHEN p_new_state IN (SELECT jsonb_array_elements_text(
      jsonb_path_query_array(workflow_record.states, '$[*] ? (@.is_final == true).id')
    )) THEN 'completed'
    WHEN p_new_state IN (SELECT jsonb_array_elements_text(
      jsonb_path_query_array(workflow_record.states, '$[*] ? (@.is_initial == true).id')
    )) THEN 'pending'
    ELSE 'in_progress'
  END
  WHERE id = p_task_id;
  
  SELECT jsonb_build_object(
    'success', true,
    'message', '状態を変更しました',
    'from_state', instance_record.current_state,
    'to_state', p_new_state
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================  
-- 3. プラグインアーキテクチャ - 最大拡張性
-- =============================================================================

-- プラグイン定義テーブル
CREATE TABLE IF NOT EXISTS task_plugins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  version TEXT NOT NULL,
  author TEXT,
  
  -- プラグインタイプ
  plugin_type TEXT NOT NULL CHECK (plugin_type IN ('field', 'action', 'integration', 'automation', 'view')),
  
  -- 設定スキーマ（JSON Schema形式）
  config_schema JSONB DEFAULT '{}',
  
  -- デフォルト設定
  default_config JSONB DEFAULT '{}',
  
  -- フック定義（どのイベントで実行されるか）
  hooks JSONB DEFAULT '[]',
  /* 例: [
    {"event": "task_created", "function": "on_task_created"},
    {"event": "task_updated", "function": "on_task_updated"},  
    {"event": "before_task_delete", "function": "before_delete_check"}
  ] */
  
  -- 実行コード（JavaScript/SQL関数名など）
  implementation JSONB NOT NULL,
  /* 例: {
    "functions": {
      "on_task_created": "function(task, context) { ... }",
      "validate_field": "SELECT validate_custom_field($1, $2)"
    }
  } */
  
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false, -- システム標準プラグイン
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- チーム別プラグイン有効化
CREATE TABLE IF NOT EXISTS team_plugin_configurations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  plugin_id UUID REFERENCES task_plugins(id) ON DELETE CASCADE,
  
  -- チーム固有の設定
  config JSONB DEFAULT '{}',
  is_enabled BOOLEAN DEFAULT true,
  
  installed_by UUID REFERENCES auth.users(id),
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(team_id, plugin_id)
);

-- プラグイン実行ログ
CREATE TABLE IF NOT EXISTS plugin_execution_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plugin_id UUID REFERENCES task_plugins(id),
  team_id UUID REFERENCES teams(id),
  task_id UUID REFERENCES tasks(id),
  
  hook_event TEXT NOT NULL,
  execution_status TEXT NOT NULL CHECK (execution_status IN ('success', 'error', 'timeout')),
  execution_time_ms INTEGER,
  
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- プラグイン実行関数
CREATE OR REPLACE FUNCTION execute_plugin_hook(
  p_event TEXT,
  p_task_id UUID,
  p_context JSONB DEFAULT '{}'
) RETURNS JSON AS $$
DECLARE
  plugin_record RECORD;
  team_config RECORD;
  execution_result JSON;
  results JSON[] := '{}';
BEGIN
  -- 該当するプラグインを検索
  FOR plugin_record IN
    SELECT p.*, t.id as task_id, t.team_id
    FROM task_plugins p
    CROSS JOIN tasks t
    WHERE t.id = p_task_id
      AND p.is_active = true
      AND p.hooks ? p_event
  LOOP
    -- チーム固有設定確認
    SELECT * INTO team_config
    FROM team_plugin_configurations
    WHERE team_id = plugin_record.team_id
      AND plugin_id = plugin_record.id
      AND is_enabled = true;
    
    IF FOUND THEN
      -- プラグイン実行（ここでは疑似実装）
      execution_result := jsonb_build_object(
        'plugin_id', plugin_record.id,
        'plugin_name', plugin_record.name,
        'status', 'success',
        'message', 'プラグインが実行されました'
      );
      
      results := array_append(results, execution_result);
      
      -- 実行ログ記録
      INSERT INTO plugin_execution_logs (
        plugin_id, team_id, task_id, hook_event, execution_status, execution_time_ms
      ) VALUES (
        plugin_record.id, plugin_record.team_id, p_task_id, p_event, 'success', 50
      );
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'event', p_event,
    'task_id', p_task_id,
    'executed_plugins', results
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- サンプルプラグイン定義
INSERT INTO task_plugins (name, display_name, description, version, plugin_type, hooks, implementation) VALUES
('time_tracker', 'Time Tracker', 'タスクの作業時間を計測', '1.0.0', 'field', 
 '[{"event": "task_status_changed", "function": "track_time"}]',
 '{"functions": {"track_time": "SELECT track_task_time($1, $2)"}}'),
 
('slack_integration', 'Slack Integration', 'Slackへの通知連携', '1.0.0', 'integration',
 '[{"event": "task_assigned", "function": "notify_slack"}]', 
 '{"functions": {"notify_slack": "SELECT send_slack_notification($1, $2)"}}'),
 
('approval_workflow', 'Approval Workflow', '承認ワークフロー', '1.0.0', 'automation',
 '[{"event": "task_completed", "function": "check_approval"}]',
 '{"functions": {"check_approval": "SELECT process_approval($1, $2)"}}')
ON CONFLICT (name) DO NOTHING;

-- 権限設定
GRANT EXECUTE ON FUNCTION create_monthly_partition(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION drop_old_partitions(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION change_workflow_state(UUID, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION execute_plugin_hook(TEXT, UUID, JSONB) TO authenticated;

-- RLS設定
ALTER TABLE task_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_workflow_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_plugins ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_plugin_configurations ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（簡易版）
CREATE POLICY "Team members can view workflows" ON task_workflows
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM team_members WHERE team_id = task_workflows.team_id AND user_id = auth.uid()
  ));

CREATE POLICY "Everyone can view active plugins" ON task_plugins
  FOR SELECT USING (is_active = true);

COMMIT;
-- 完全統合版：TODO-App Supabase セットアップ
-- 全機能を含む統一セットアップスクリプト

-- =============================================================================
-- 基本テーブル構造の更新
-- =============================================================================

-- 1. 優先度マスターテーブル
CREATE TABLE IF NOT EXISTS task_priorities (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  color_code TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- デフォルト優先度データ
INSERT INTO task_priorities (name, display_name, sort_order, color_code, icon, description) VALUES
('critical', '緊急', 1, '#dc2626', '🔴', '即座に対応が必要'),
('high', '高', 2, '#ea580c', '🟠', '重要度が高く優先的に対応'),
('medium', '中', 3, '#ca8a04', '🟡', '標準的な重要度'),
('low', '低', 4, '#16a34a', '🟢', '時間があるときに対応'),
('none', 'なし', 5, '#6b7280', '⚪', '優先度未設定')
ON CONFLICT (name) DO NOTHING;

-- 2. tasksテーブルの拡張
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority_id INTEGER REFERENCES task_priorities(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT;

-- 既存の優先度データを移行
UPDATE tasks 
SET priority_id = (
  SELECT id FROM task_priorities 
  WHERE name = CASE 
    WHEN tasks.priority = '高' THEN 'high'
    WHEN tasks.priority = '中' THEN 'medium' 
    WHEN tasks.priority = '低' THEN 'low'
    ELSE 'none'
  END
)
WHERE priority_id IS NULL;

-- 3. カスタムフィールド定義テーブル
CREATE TABLE IF NOT EXISTS task_field_definitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'boolean', 'select', 'multi_select', 'url', 'email')),
  display_name TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT false,
  default_value JSONB,
  validation_rules JSONB DEFAULT '{}',
  options JSONB DEFAULT '[]',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(team_id, field_name)
);

-- 4. アーカイブテーブル
CREATE TABLE IF NOT EXISTS tasks_archive (
  id UUID,
  title TEXT,
  description TEXT,
  status TEXT,
  priority TEXT,
  priority_id INTEGER,
  user_id UUID,
  team_id UUID,
  assigned_to UUID,
  created_by UUID,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  custom_fields JSONB DEFAULT '{}',
  
  archived_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  archived_by UUID REFERENCES auth.users(id),
  archive_reason TEXT,
  original_task_id UUID NOT NULL,
  
  PRIMARY KEY (id, archived_at)
);

CREATE TABLE IF NOT EXISTS task_comments_archive (
  id UUID,
  task_id UUID,
  user_id UUID,
  content TEXT,
  mentions UUID[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  archived_by UUID REFERENCES auth.users(id),
  
  PRIMARY KEY (id, archived_at)
);

CREATE TABLE IF NOT EXISTS task_history_archive (
  id UUID,
  task_id UUID,
  user_id UUID,
  action TEXT,
  changes JSONB,
  created_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  archived_by UUID REFERENCES auth.users(id),
  
  PRIMARY KEY (id, archived_at)
);

-- =============================================================================
-- 全RPC関数の統合
-- =============================================================================

-- 1. ユーザー統計取得（拡張版）
CREATE OR REPLACE FUNCTION get_user_task_statistics_v2(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  current_week_start DATE;
  last_week_start DATE;
BEGIN
  current_week_start := DATE_TRUNC('week', CURRENT_DATE);
  last_week_start := current_week_start - INTERVAL '7 days';

  SELECT jsonb_build_object(
    'total_tasks', (
      SELECT COUNT(*) FROM tasks 
      WHERE user_id = p_user_id OR assigned_to = p_user_id
    ),
    'completed_tasks', (
      SELECT COUNT(*) FROM tasks 
      WHERE (user_id = p_user_id OR assigned_to = p_user_id) 
        AND status = 'completed'
    ),
    'pending_tasks', (
      SELECT COUNT(*) FROM tasks 
      WHERE (user_id = p_user_id OR assigned_to = p_user_id) 
        AND status = 'pending'
    ),
    'in_progress_tasks', (
      SELECT COUNT(*) FROM tasks 
      WHERE (user_id = p_user_id OR assigned_to = p_user_id) 
        AND status = 'in_progress'
    ),
    'completion_rate', (
      SELECT ROUND(
        COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / 
        NULLIF(COUNT(*), 0), 2
      )
      FROM tasks 
      WHERE user_id = p_user_id OR assigned_to = p_user_id
    ),
    'this_week_created', (
      SELECT COUNT(*) FROM tasks 
      WHERE (user_id = p_user_id OR assigned_to = p_user_id)
        AND created_at >= current_week_start
    ),
    'this_week_completed', (
      SELECT COUNT(*) FROM tasks 
      WHERE (user_id = p_user_id OR assigned_to = p_user_id)
        AND status = 'completed'
        AND updated_at >= current_week_start
    ),
    'last_week_completed', (
      SELECT COUNT(*) FROM tasks 
      WHERE (user_id = p_user_id OR assigned_to = p_user_id)
        AND status = 'completed'
        AND updated_at >= last_week_start
        AND updated_at < current_week_start
    ),
    'overdue_tasks', (
      SELECT COUNT(*) FROM tasks 
      WHERE (user_id = p_user_id OR assigned_to = p_user_id)
        AND due_date < CURRENT_DATE
        AND status != 'completed'
    ),
    'due_today', (
      SELECT COUNT(*) FROM tasks 
      WHERE (user_id = p_user_id OR assigned_to = p_user_id)
        AND DATE(due_date) = CURRENT_DATE
        AND status != 'completed'
    ),
    'priority_breakdown', (
      SELECT jsonb_object_agg(
        COALESCE(tp.display_name, 'なし'),
        task_count
      )
      FROM (
        SELECT t.priority_id, COUNT(*) as task_count
        FROM tasks t
        WHERE (t.user_id = p_user_id OR t.assigned_to = p_user_id)
          AND t.status != 'completed'
        GROUP BY t.priority_id
      ) stats
      LEFT JOIN task_priorities tp ON stats.priority_id = tp.id
    ),
    'recent_activity', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'date', activity_date,
          'completed_count', completed_count,
          'created_count', created_count
        ) ORDER BY activity_date DESC
      )
      FROM (
        SELECT 
          DATE(d.day) as activity_date,
          COUNT(ct.id) as completed_count,
          COUNT(nt.id) as created_count
        FROM generate_series(
          CURRENT_DATE - INTERVAL '6 days',
          CURRENT_DATE,
          '1 day'::interval
        ) d(day)
        LEFT JOIN tasks ct ON DATE(ct.updated_at) = DATE(d.day)
          AND (ct.user_id = p_user_id OR ct.assigned_to = p_user_id)
          AND ct.status = 'completed'
        LEFT JOIN tasks nt ON DATE(nt.created_at) = DATE(d.day)
          AND (nt.user_id = p_user_id OR nt.assigned_to = p_user_id)
        GROUP BY DATE(d.day)
        ORDER BY DATE(d.day) DESC
      ) daily_activity
    ),
    'productivity_score', (
      SELECT ROUND(
        (COUNT(*) FILTER (WHERE status = 'completed' AND updated_at >= current_week_start) * 10.0 +
         COUNT(*) FILTER (WHERE status = 'in_progress') * 5.0 +
         COUNT(*) FILTER (WHERE status = 'pending') * 1.0) / 
        GREATEST(COUNT(*), 1), 2
      )
      FROM tasks 
      WHERE user_id = p_user_id OR assigned_to = p_user_id
    ),
    'custom_field_usage', (
      SELECT jsonb_object_agg(field_name, usage_count)
      FROM (
        SELECT 
          jsonb_object_keys(custom_fields) as field_name,
          COUNT(*) as usage_count
        FROM tasks
        WHERE (user_id = p_user_id OR assigned_to = p_user_id)
          AND custom_fields != '{}'
        GROUP BY jsonb_object_keys(custom_fields)
      ) cf_stats
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 高度検索（カスタムフィールド対応版）
CREATE OR REPLACE FUNCTION get_tasks_with_filters_v2(
  p_user_id UUID,
  p_team_id UUID DEFAULT NULL,
  p_search_text TEXT DEFAULT NULL,
  p_status TEXT[] DEFAULT NULL,
  p_priority_ids INTEGER[] DEFAULT NULL,
  p_assigned_to UUID DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_due_from DATE DEFAULT NULL,
  p_due_to DATE DEFAULT NULL,
  p_has_due_date BOOLEAN DEFAULT NULL,
  p_custom_field_filters JSONB DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
) RETURNS JSON AS $$
DECLARE
  result JSON;
  where_conditions TEXT[] := ARRAY[]::TEXT[];
  query_sql TEXT;
BEGIN
  -- 基本権限フィルター
  where_conditions := array_append(where_conditions, format(
    '(t.user_id = %L OR t.assigned_to = %L OR (t.team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM team_members WHERE team_id = t.team_id AND user_id = %L
    )))', 
    p_user_id, p_user_id, p_user_id
  ));
  
  -- 各種フィルター条件
  IF p_team_id IS NOT NULL THEN
    where_conditions := array_append(where_conditions, format('t.team_id = %L', p_team_id));
  END IF;
  
  IF p_search_text IS NOT NULL AND LENGTH(trim(p_search_text)) > 0 THEN
    where_conditions := array_append(where_conditions, format(
      '(t.title ILIKE %L OR t.description ILIKE %L)', 
      '%' || p_search_text || '%', '%' || p_search_text || '%'
    ));
  END IF;
  
  IF p_status IS NOT NULL AND array_length(p_status, 1) > 0 THEN
    where_conditions := array_append(where_conditions, 
      't.status = ANY(' || quote_literal(p_status) || ')');
  END IF;
  
  IF p_priority_ids IS NOT NULL AND array_length(p_priority_ids, 1) > 0 THEN
    where_conditions := array_append(where_conditions, 
      't.priority_id = ANY(' || quote_literal(p_priority_ids) || ')');
  END IF;
  
  IF p_assigned_to IS NOT NULL THEN
    where_conditions := array_append(where_conditions, format('t.assigned_to = %L', p_assigned_to));
  END IF;
  
  IF p_date_from IS NOT NULL THEN
    where_conditions := array_append(where_conditions, format('t.created_at >= %L', p_date_from));
  END IF;
  
  IF p_date_to IS NOT NULL THEN
    where_conditions := array_append(where_conditions, format('t.created_at <= %L', p_date_to));
  END IF;
  
  IF p_due_from IS NOT NULL THEN
    where_conditions := array_append(where_conditions, format('DATE(t.due_date) >= %L', p_due_from));
  END IF;
  
  IF p_due_to IS NOT NULL THEN
    where_conditions := array_append(where_conditions, format('DATE(t.due_date) <= %L', p_due_to));
  END IF;
  
  IF p_has_due_date IS NOT NULL THEN
    IF p_has_due_date THEN
      where_conditions := array_append(where_conditions, 't.due_date IS NOT NULL');
    ELSE
      where_conditions := array_append(where_conditions, 't.due_date IS NULL');
    END IF;
  END IF;
  
  -- カスタムフィールドフィルター
  IF p_custom_field_filters IS NOT NULL THEN
    where_conditions := array_append(where_conditions, 
      format('t.custom_fields @> %L', p_custom_field_filters));
  END IF;
  
  -- メインクエリ構築
  query_sql := format('
    SELECT jsonb_build_object(
      ''tasks'', COALESCE(jsonb_agg(
        jsonb_build_object(
          ''id'', t.id,
          ''title'', t.title,
          ''description'', t.description,
          ''status'', t.status,
          ''priority'', jsonb_build_object(
            ''id'', tp.id,
            ''name'', tp.name,
            ''display_name'', tp.display_name,
            ''color_code'', tp.color_code,
            ''icon'', tp.icon
          ),
          ''due_date'', t.due_date,
          ''created_at'', t.created_at,
          ''updated_at'', t.updated_at,
          ''custom_fields'', t.custom_fields,
          ''creator'', jsonb_build_object(
            ''id'', creator.id,
            ''email'', creator.email,
            ''display_name'', COALESCE(cp.display_name, creator.email)
          ),
          ''assignee'', CASE WHEN t.assigned_to IS NOT NULL THEN
            jsonb_build_object(
              ''id'', assignee.id,
              ''email'', assignee.email,
              ''display_name'', COALESCE(ap.display_name, assignee.email)
            )
          ELSE NULL END,
          ''team'', CASE WHEN t.team_id IS NOT NULL THEN
            jsonb_build_object(
              ''id'', tm.id,
              ''name'', tm.name
            )
          ELSE NULL END,
          ''comment_count'', (SELECT COUNT(*) FROM task_comments WHERE task_id = t.id),
          ''days_until_due'', CASE 
            WHEN t.due_date IS NULL THEN NULL
            ELSE DATE_PART(''day'', t.due_date - CURRENT_DATE)
          END
        ) ORDER BY t.created_at DESC
      ), ''[]''::jsonb),
      ''total_count'', (
        SELECT COUNT(*) FROM tasks t2
        WHERE %s
      ),
      ''has_more'', (
        SELECT COUNT(*) FROM tasks t2
        WHERE %s
      ) > (%s + %s)
    )
    FROM tasks t
    LEFT JOIN task_priorities tp ON t.priority_id = tp.id
    LEFT JOIN auth.users creator ON t.user_id = creator.id
    LEFT JOIN profiles cp ON t.user_id = cp.id
    LEFT JOIN auth.users assignee ON t.assigned_to = assignee.id  
    LEFT JOIN profiles ap ON t.assigned_to = ap.id
    LEFT JOIN teams tm ON t.team_id = tm.id
    WHERE %s
    ORDER BY t.created_at DESC
    LIMIT %s OFFSET %s',
    array_to_string(where_conditions, ' AND '),
    array_to_string(where_conditions, ' AND '),
    p_limit, p_offset,
    array_to_string(where_conditions, ' AND '),
    p_limit, p_offset
  );
  
  EXECUTE query_sql INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 一括更新（カスタムフィールド対応版）
CREATE OR REPLACE FUNCTION bulk_update_tasks_v2(
  p_task_ids UUID[],
  p_user_id UUID,
  p_updates JSONB
) RETURNS JSON AS $$
DECLARE
  updated_count INTEGER := 0;
  failed_count INTEGER := 0;
  result JSON;
  task_id UUID;
  old_record RECORD;
  update_allowed BOOLEAN;
BEGIN
  FOREACH task_id IN ARRAY p_task_ids
  LOOP
    SELECT INTO update_allowed EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id
        AND (
          t.user_id = p_user_id 
          OR t.assigned_to = p_user_id
          OR (t.team_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM team_members tm 
            WHERE tm.team_id = t.team_id 
              AND tm.user_id = p_user_id
              AND tm.role IN ('owner', 'admin', 'member')
          ))
        )
    );
    
    IF update_allowed THEN
      SELECT * INTO old_record FROM tasks WHERE id = task_id;
      
      UPDATE tasks 
      SET 
        status = COALESCE((p_updates->>'status')::TEXT, status),
        priority_id = COALESCE((p_updates->>'priority_id')::INTEGER, priority_id),
        assigned_to = COALESCE((p_updates->>'assigned_to')::UUID, assigned_to),
        due_date = COALESCE((p_updates->>'due_date')::TIMESTAMPTZ, due_date),
        title = COALESCE((p_updates->>'title')::TEXT, title),
        description = COALESCE((p_updates->>'description')::TEXT, description),
        custom_fields = CASE 
          WHEN p_updates ? 'custom_fields' THEN 
            COALESCE(custom_fields, '{}'::jsonb) || (p_updates->'custom_fields')
          ELSE custom_fields
        END,
        completed_at = CASE 
          WHEN (p_updates->>'status') = 'completed' AND old_record.status != 'completed' THEN NOW()
          WHEN (p_updates->>'status') != 'completed' AND old_record.status = 'completed' THEN NULL
          ELSE completed_at
        END,
        updated_at = NOW()
      WHERE id = task_id;
      
      INSERT INTO task_history (task_id, user_id, action, changes)
      VALUES (
        task_id,
        p_user_id,
        'bulk_updated_v2',
        jsonb_build_object(
          'old_values', to_jsonb(old_record),
          'updates_applied', p_updates,
          'updated_at', NOW()
        )
      );
      
      updated_count := updated_count + 1;
    ELSE
      failed_count := failed_count + 1;
    END IF;
  END LOOP;
  
  SELECT jsonb_build_object(
    'success', updated_count > 0,
    'updated_count', updated_count,
    'failed_count', failed_count,
    'total_requested', array_length(p_task_ids, 1),
    'message', CASE 
      WHEN updated_count = 0 THEN 'タスクを更新できませんでした'
      WHEN failed_count = 0 THEN updated_count || '件のタスクを正常に更新しました'
      ELSE updated_count || '件更新、' || failed_count || '件失敗しました'
    END
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. アーカイブ機能
CREATE OR REPLACE FUNCTION archive_task(
  p_task_id UUID,
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  task_record RECORD;
  archived_count INTEGER := 0;
  result JSON;
BEGIN
  SELECT * INTO task_record FROM tasks WHERE id = p_task_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'タスクが見つかりません');
  END IF;
  
  IF NOT (task_record.user_id = p_user_id 
          OR task_record.assigned_to = p_user_id
          OR (task_record.team_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_id = task_record.team_id 
              AND user_id = p_user_id 
              AND role IN ('owner', 'admin')
          ))) THEN
    RETURN jsonb_build_object('success', false, 'message', '権限がありません');
  END IF;
  
  BEGIN
    INSERT INTO tasks_archive 
    SELECT *, NOW(), p_user_id, p_reason, id
    FROM tasks WHERE id = p_task_id;
    
    INSERT INTO task_comments_archive
    SELECT *, NOW(), p_user_id
    FROM task_comments WHERE task_id = p_task_id;
    
    INSERT INTO task_history_archive
    SELECT *, NOW(), p_user_id
    FROM task_history WHERE task_id = p_task_id;
    
    DELETE FROM task_comments WHERE task_id = p_task_id;
    DELETE FROM task_history WHERE task_id = p_task_id;
    DELETE FROM tasks WHERE id = p_task_id;
    
    archived_count := 1;
    
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      COALESCE(task_record.assigned_to, task_record.user_id),
      'task_archived',
      'タスクがアーカイブされました', 
      'タスク「' || task_record.title || '」がアーカイブされました',
      jsonb_build_object('task_id', p_task_id, 'reason', p_reason)
    );
    
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'アーカイブ処理エラー: %', SQLERRM;
  END;
  
  SELECT jsonb_build_object(
    'success', true,
    'archived_count', archived_count,
    'message', 'タスクを正常にアーカイブしました',
    'archived_task_id', p_task_id
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. カスタムフィールド管理
CREATE OR REPLACE FUNCTION set_task_custom_field(
  p_task_id UUID,
  p_field_name TEXT,
  p_field_value JSONB,
  p_user_id UUID
) RETURNS JSON AS $$
DECLARE
  task_record RECORD;
  updated_fields JSONB;
  result JSON;
BEGIN
  SELECT * INTO task_record FROM tasks WHERE id = p_task_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'タスクが見つかりません');
  END IF;
  
  IF NOT (task_record.user_id = p_user_id 
          OR task_record.assigned_to = p_user_id
          OR (task_record.team_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_id = task_record.team_id AND user_id = p_user_id
          ))) THEN
    RETURN jsonb_build_object('success', false, 'message', '権限がありません');
  END IF;
  
  updated_fields := COALESCE(task_record.custom_fields, '{}'::jsonb) || 
                    jsonb_build_object(p_field_name, p_field_value);
  
  UPDATE tasks 
  SET custom_fields = updated_fields, updated_at = NOW()
  WHERE id = p_task_id;
  
  INSERT INTO task_history (task_id, user_id, action, changes)
  VALUES (p_task_id, p_user_id, 'custom_field_updated', 
          jsonb_build_object(
            'field_name', p_field_name,
            'old_value', task_record.custom_fields->p_field_name,
            'new_value', p_field_value
          ));
  
  SELECT jsonb_build_object(
    'success', true,
    'message', 'カスタムフィールドを更新しました',
    'field_name', p_field_name,
    'new_value', p_field_value
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- インデックスとパフォーマンス最適化
-- =============================================================================

-- 統合インデックス
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_user_status_priority 
ON tasks(user_id, status, priority_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_team_status_priority 
ON tasks(team_id, status, priority_id, created_at DESC) 
WHERE team_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_assigned_status_due 
ON tasks(assigned_to, status, due_date) 
WHERE assigned_to IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_due_date_status 
ON tasks(due_date, status) 
WHERE due_date IS NOT NULL AND status != 'completed';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_custom_fields_gin 
ON tasks USING GIN(custom_fields);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_title_description_gin 
ON tasks USING GIN(to_tsvector('japanese', COALESCE(title, '') || ' ' || COALESCE(description, '')));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_priorities_sort 
ON task_priorities(sort_order, is_active);

-- =============================================================================
-- 権限とRLS
-- =============================================================================

-- 関数実行権限
GRANT EXECUTE ON FUNCTION get_user_task_statistics_v2(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tasks_with_filters_v2(UUID, UUID, TEXT, TEXT[], INTEGER[], UUID, TIMESTAMPTZ, TIMESTAMPTZ, DATE, DATE, BOOLEAN, JSONB, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_update_tasks_v2(UUID[], UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION archive_task(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION set_task_custom_field(UUID, TEXT, JSONB, UUID) TO authenticated;

-- RLS設定
ALTER TABLE task_priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks_archive ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "Everyone can view priorities" ON task_priorities FOR SELECT USING (is_active = true);

CREATE POLICY "Team members can view field definitions" ON task_field_definitions
  FOR SELECT USING (team_id IS NULL OR EXISTS (
    SELECT 1 FROM team_members WHERE team_id = task_field_definitions.team_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can view own archived tasks" ON tasks_archive
  FOR SELECT USING (user_id = auth.uid() OR assigned_to = auth.uid());

-- =============================================================================
-- 初期データとサンプル
-- =============================================================================

-- サンプルカスタムフィールド定義（必要に応じて）
INSERT INTO task_field_definitions (team_id, field_name, field_type, display_name, description, options) VALUES
(NULL, 'estimate_hours', 'number', '見積時間', '作業予定時間（時間）', '{"min": 0, "max": 1000}'),
(NULL, 'department', 'select', '担当部署', '担当する部署', '["営業", "開発", "デザイン", "マーケティング"]'),
(NULL, 'url', 'url', '関連URL', '関連する資料やサイトのURL', '{}'),
(NULL, 'tags', 'multi_select', 'タグ', 'タスクの分類タグ', '["緊急", "バグ", "改善", "新機能", "ドキュメント"]')
ON CONFLICT (team_id, field_name) DO NOTHING;

COMMIT;
-- 中期的実装機能（中優先度）
-- 1. 優先度マスターテーブル化
-- 2. アーカイブ機能  
-- 3. カスタムフィールド対応

-- =============================================================================
-- 1. 優先度マスターテーブル化
-- =============================================================================

-- 優先度マスターテーブル
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

-- デフォルト優先度データ挿入
INSERT INTO task_priorities (name, display_name, sort_order, color_code, icon, description) VALUES
('critical', '緊急', 1, '#dc2626', '🔴', '即座に対応が必要'),
('high', '高', 2, '#ea580c', '🟠', '重要度が高く優先的に対応'),
('medium', '中', 3, '#ca8a04', '🟡', '標準的な重要度'),
('low', '低', 4, '#16a34a', '🟢', '時間があるときに対応'),
('none', 'なし', 5, '#6b7280', '⚪', '優先度未設定')
ON CONFLICT (name) DO NOTHING;

-- 既存データの移行用関数
CREATE OR REPLACE FUNCTION migrate_priority_data()
RETURNS void AS $$
DECLARE
  priority_mapping RECORD;
BEGIN
  -- 既存の優先度データをマスターテーブルのIDに変換
  FOR priority_mapping IN
    SELECT DISTINCT priority as old_priority FROM tasks WHERE priority IS NOT NULL
  LOOP
    UPDATE tasks 
    SET priority_id = (
      SELECT id FROM task_priorities 
      WHERE name = CASE 
        WHEN priority_mapping.old_priority = '高' THEN 'high'
        WHEN priority_mapping.old_priority = '中' THEN 'medium' 
        WHEN priority_mapping.old_priority = '低' THEN 'low'
        ELSE 'none'
      END
    )
    WHERE priority = priority_mapping.old_priority AND priority_id IS NULL;
  END LOOP;
  
  RAISE NOTICE '優先度データの移行が完了しました';
END;
$$ LANGUAGE plpgsql;

-- tasksテーブルに優先度ID列追加
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority_id INTEGER REFERENCES task_priorities(id);

-- 移行実行
SELECT migrate_priority_data();

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_tasks_priority_id ON tasks(priority_id);
CREATE INDEX IF NOT EXISTS idx_task_priorities_sort_order ON task_priorities(sort_order);

-- =============================================================================
-- 2. アーカイブ機能
-- =============================================================================

-- アーカイブテーブル作成
CREATE TABLE IF NOT EXISTS tasks_archive (
  -- 元のtasksテーブルと同じ構造
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
  
  -- アーカイブ固有の列
  archived_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  archived_by UUID REFERENCES auth.users(id),
  archive_reason TEXT,
  original_task_id UUID NOT NULL,
  
  PRIMARY KEY (id, archived_at)
);

-- アーカイブテーブルのパーティション（月ごと）
-- CREATE TABLE tasks_archive_y2024m01 PARTITION OF tasks_archive 
-- FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- アーカイブ関連テーブル
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

-- アーカイブ実行関数
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
  -- タスクの存在と権限チェック
  SELECT * INTO task_record FROM tasks WHERE id = p_task_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'タスクが見つかりません');
  END IF;
  
  -- 権限チェック（所有者、担当者、またはチームメンバー）
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
  
  -- トランザクション開始
  BEGIN
    -- メインタスクをアーカイブ
    INSERT INTO tasks_archive 
    SELECT *, NOW(), p_user_id, p_reason, id
    FROM tasks WHERE id = p_task_id;
    
    -- 関連コメントをアーカイブ
    INSERT INTO task_comments_archive
    SELECT *, NOW(), p_user_id
    FROM task_comments WHERE task_id = p_task_id;
    
    -- 関連履歴をアーカイブ  
    INSERT INTO task_history_archive
    SELECT *, NOW(), p_user_id
    FROM task_history WHERE task_id = p_task_id;
    
    -- 元データ削除
    DELETE FROM task_comments WHERE task_id = p_task_id;
    DELETE FROM task_history WHERE task_id = p_task_id;
    DELETE FROM tasks WHERE id = p_task_id;
    
    archived_count := 1;
    
    -- 通知作成
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

-- アーカイブ復元関数
CREATE OR REPLACE FUNCTION restore_archived_task(
  p_original_task_id UUID,
  p_user_id UUID
) RETURNS JSON AS $$
DECLARE
  archived_record RECORD;
  result JSON;
BEGIN
  -- アーカイブからタスクを検索（最新のもの）
  SELECT * INTO archived_record 
  FROM tasks_archive 
  WHERE original_task_id = p_original_task_id
  ORDER BY archived_at DESC 
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'アーカイブされたタスクが見つかりません');
  END IF;
  
  -- 権限チェック
  IF NOT (archived_record.user_id = p_user_id 
          OR archived_record.assigned_to = p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'message', '復元する権限がありません');
  END IF;
  
  BEGIN
    -- タスクを復元
    INSERT INTO tasks (
      id, title, description, status, priority, priority_id, user_id, team_id,
      assigned_to, created_by, due_date, completed_at, created_at, updated_at, custom_fields
    )
    SELECT 
      id, title, description, status, priority, priority_id, user_id, team_id,
      assigned_to, created_by, due_date, completed_at, created_at, NOW(), custom_fields
    FROM tasks_archive 
    WHERE original_task_id = p_original_task_id AND archived_at = archived_record.archived_at;
    
    -- コメントを復元
    INSERT INTO task_comments (id, task_id, user_id, content, mentions, created_at, updated_at)
    SELECT id, task_id, user_id, content, mentions, created_at, updated_at
    FROM task_comments_archive 
    WHERE task_id = p_original_task_id AND archived_at = archived_record.archived_at;
    
    -- 履歴を復元
    INSERT INTO task_history (id, task_id, user_id, action, changes, created_at)
    SELECT id, task_id, user_id, action, changes, created_at
    FROM task_history_archive 
    WHERE task_id = p_original_task_id AND archived_at = archived_record.archived_at;
    
    -- 復元履歴を記録
    INSERT INTO task_history (task_id, user_id, action, changes)
    VALUES (p_original_task_id, p_user_id, 'restored', 
            jsonb_build_object('restored_from_archive', archived_record.archived_at));
    
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION '復元処理エラー: %', SQLERRM;
  END;
  
  SELECT jsonb_build_object(
    'success', true,
    'message', 'タスクを正常に復元しました',
    'restored_task_id', p_original_task_id
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 3. カスタムフィールド対応
-- =============================================================================

-- tasksテーブルにカスタムフィールド列追加（既に存在する場合はスキップ）
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';

-- カスタムフィールド定義テーブル
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
  options JSONB DEFAULT '[]', -- select/multi_select用
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(team_id, field_name)
);

-- カスタムフィールド操作関数
CREATE OR REPLACE FUNCTION set_task_custom_field(
  p_task_id UUID,
  p_field_name TEXT,
  p_field_value JSONB,
  p_user_id UUID
) RETURNS JSON AS $$
DECLARE
  task_record RECORD;
  field_def RECORD;
  updated_fields JSONB;
  result JSON;
BEGIN
  -- タスクと権限確認
  SELECT * INTO task_record FROM tasks WHERE id = p_task_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'タスクが見つかりません');
  END IF;
  
  -- フィールド定義確認
  SELECT * INTO field_def 
  FROM task_field_definitions 
  WHERE (team_id = task_record.team_id OR team_id IS NULL)
    AND field_name = p_field_name 
    AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'フィールド定義が見つかりません');
  END IF;
  
  -- 権限チェック
  IF NOT (task_record.user_id = p_user_id 
          OR task_record.assigned_to = p_user_id
          OR (task_record.team_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_id = task_record.team_id AND user_id = p_user_id
          ))) THEN
    RETURN jsonb_build_object('success', false, 'message', '権限がありません');
  END IF;
  
  -- バリデーション（簡易版）
  IF field_def.is_required AND (p_field_value IS NULL OR p_field_value = 'null'::jsonb) THEN
    RETURN jsonb_build_object('success', false, 'message', '必須フィールドです');
  END IF;
  
  -- カスタムフィールドを更新
  updated_fields := COALESCE(task_record.custom_fields, '{}'::jsonb) || 
                    jsonb_build_object(p_field_name, p_field_value);
  
  UPDATE tasks 
  SET custom_fields = updated_fields, updated_at = NOW()
  WHERE id = p_task_id;
  
  -- 変更履歴記録
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

-- カスタムフィールド検索用インデックス
CREATE INDEX IF NOT EXISTS idx_tasks_custom_fields ON tasks USING GIN(custom_fields);

-- チーム別フィールド定義取得関数
CREATE OR REPLACE FUNCTION get_team_field_definitions(p_team_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'field_name', field_name,
      'field_type', field_type,
      'display_name', display_name,
      'description', description,
      'is_required', is_required,
      'default_value', default_value,
      'validation_rules', validation_rules,
      'options', options,
      'sort_order', sort_order
    ) ORDER BY sort_order, display_name
  ) INTO result
  FROM task_field_definitions
  WHERE (team_id = p_team_id OR team_id IS NULL) 
    AND is_active = true;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 権限設定
GRANT EXECUTE ON FUNCTION migrate_priority_data() TO authenticated;
GRANT EXECUTE ON FUNCTION archive_task(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_archived_task(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION set_task_custom_field(UUID, TEXT, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_field_definitions(UUID) TO authenticated;

-- RLS設定
ALTER TABLE task_priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_history_archive ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "Everyone can view priorities" ON task_priorities FOR SELECT USING (true);

CREATE POLICY "Team members can view field definitions" ON task_field_definitions
  FOR SELECT USING (team_id IS NULL OR EXISTS (
    SELECT 1 FROM team_members WHERE team_id = task_field_definitions.team_id AND user_id = auth.uid()
  ));

CREATE POLICY "Team admins can manage field definitions" ON task_field_definitions
  FOR ALL USING (EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_id = task_field_definitions.team_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
  ));

COMMIT;
-- TO-DOアプリ用の実用的RPC関数集
-- 高度な機能を効率的に実装するためのデータベース関数

-- =============================================================================
-- 1. ユーザータスク統計取得関数
-- =============================================================================
CREATE OR REPLACE FUNCTION get_user_task_statistics(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  current_week_start DATE;
  last_week_start DATE;
BEGIN
  -- 週の開始日を計算（月曜日基準）
  current_week_start := DATE_TRUNC('week', CURRENT_DATE);
  last_week_start := current_week_start - INTERVAL '7 days';

  SELECT jsonb_build_object(
    -- 基本統計
    'total_tasks', (
      SELECT COUNT(*) FROM tasks 
      WHERE user_id = p_user_id 
        OR assigned_to = p_user_id
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
    
    -- 完了率
    'completion_rate', (
      SELECT ROUND(
        COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / 
        NULLIF(COUNT(*), 0), 2
      )
      FROM tasks 
      WHERE user_id = p_user_id OR assigned_to = p_user_id
    ),
    
    -- 今週の活動量
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
    
    -- 先週との比較
    'last_week_completed', (
      SELECT COUNT(*) FROM tasks 
      WHERE (user_id = p_user_id OR assigned_to = p_user_id)
        AND status = 'completed'
        AND updated_at >= last_week_start
        AND updated_at < current_week_start
    ),
    
    -- 期限切れタスク
    'overdue_tasks', (
      SELECT COUNT(*) FROM tasks 
      WHERE (user_id = p_user_id OR assigned_to = p_user_id)
        AND due_date < CURRENT_DATE
        AND status != 'completed'
    ),
    
    -- 今日期限のタスク
    'due_today', (
      SELECT COUNT(*) FROM tasks 
      WHERE (user_id = p_user_id OR assigned_to = p_user_id)
        AND DATE(due_date) = CURRENT_DATE
        AND status != 'completed'
    ),
    
    -- 優先度別統計
    'priority_breakdown', (
      SELECT jsonb_object_agg(
        COALESCE(priority, 'なし'),
        task_count
      )
      FROM (
        SELECT priority, COUNT(*) as task_count
        FROM tasks 
        WHERE (user_id = p_user_id OR assigned_to = p_user_id)
          AND status != 'completed'
        GROUP BY priority
      ) priority_stats
    ),
    
    -- 最近のアクティビティ（過去7日）
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
    
    -- 生産性指標
    'productivity_score', (
      SELECT ROUND(
        (COUNT(*) FILTER (WHERE status = 'completed' AND updated_at >= current_week_start) * 10.0 +
         COUNT(*) FILTER (WHERE status = 'in_progress') * 5.0 +
         COUNT(*) FILTER (WHERE status = 'pending') * 1.0) / 
        GREATEST(COUNT(*), 1), 2
      )
      FROM tasks 
      WHERE user_id = p_user_id OR assigned_to = p_user_id
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 2. 一括タスク更新関数
-- =============================================================================
CREATE OR REPLACE FUNCTION bulk_update_tasks(
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
  -- 各タスクを個別に処理（権限チェック付き）
  FOREACH task_id IN ARRAY p_task_ids
  LOOP
    -- 権限チェック：タスクの所有者、担当者、またはチームメンバーか確認
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
      -- 更新前の情報を保存（履歴用）
      SELECT * INTO old_record FROM tasks WHERE id = task_id;
      
      -- 動的更新クエリを構築
      UPDATE tasks 
      SET 
        status = COALESCE((p_updates->>'status')::TEXT, status),
        priority = COALESCE((p_updates->>'priority')::TEXT, priority),
        assigned_to = COALESCE((p_updates->>'assigned_to')::UUID, assigned_to),
        due_date = COALESCE((p_updates->>'due_date')::TIMESTAMPTZ, due_date),
        title = COALESCE((p_updates->>'title')::TEXT, title),
        updated_at = NOW()
      WHERE id = task_id;
      
      -- 履歴記録
      INSERT INTO task_history (task_id, user_id, action, changes)
      VALUES (
        task_id,
        p_user_id,
        'bulk_updated',
        jsonb_build_object(
          'old_values', to_jsonb(old_record),
          'updates_applied', p_updates,
          'updated_at', NOW()
        )
      );
      
      -- ステータス変更時の通知生成
      IF (p_updates->>'status') IS NOT NULL 
         AND (p_updates->>'status') != old_record.status 
         AND old_record.assigned_to IS NOT NULL 
         AND old_record.assigned_to != p_user_id THEN
        
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (
          old_record.assigned_to,
          'task_status_changed',
          'タスクのステータスが変更されました',
          'タスク「' || old_record.title || '」のステータスが「' || (p_updates->>'status') || '」に変更されました。',
          jsonb_build_object(
            'task_id', task_id,
            'old_status', old_record.status,
            'new_status', (p_updates->>'status'),
            'changed_by', p_user_id
          )
        );
      END IF;
      
      updated_count := updated_count + 1;
    ELSE
      failed_count := failed_count + 1;
    END IF;
  END LOOP;
  
  -- 結果を構築
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

-- =============================================================================
-- 3. 高度な検索・フィルター関数
-- =============================================================================
CREATE OR REPLACE FUNCTION get_tasks_with_filters(
  p_user_id UUID,
  p_team_id UUID DEFAULT NULL,
  p_search_text TEXT DEFAULT NULL,
  p_status TEXT[] DEFAULT NULL,
  p_priority TEXT[] DEFAULT NULL,
  p_assigned_to UUID DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_due_from DATE DEFAULT NULL,
  p_due_to DATE DEFAULT NULL,
  p_has_due_date BOOLEAN DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
) RETURNS JSON AS $$
DECLARE
  result JSON;
  base_query TEXT;
  where_conditions TEXT[] := ARRAY[]::TEXT[];
  full_query TEXT;
BEGIN
  -- 基本クエリ
  base_query := '
    SELECT 
      t.id,
      t.title,
      t.status,
      t.priority,
      t.due_date,
      t.created_at,
      t.updated_at,
      t.user_id,
      t.team_id,
      t.assigned_to,
      
      -- 作成者情報
      creator.email as creator_email,
      COALESCE(cp.display_name, creator.email) as creator_name,
      
      -- 担当者情報  
      assignee.email as assignee_email,
      COALESCE(ap.display_name, assignee.email) as assignee_name,
      
      -- チーム情報
      tm.name as team_name,
      
      -- 統計情報
      (SELECT COUNT(*) FROM task_comments WHERE task_id = t.id) as comment_count,
      
      -- 期限までの日数
      CASE 
        WHEN t.due_date IS NULL THEN NULL
        ELSE DATE_PART(''day'', t.due_date - CURRENT_DATE)
      END as days_until_due
      
    FROM tasks t
    LEFT JOIN auth.users creator ON t.user_id = creator.id
    LEFT JOIN profiles cp ON t.user_id = cp.id
    LEFT JOIN auth.users assignee ON t.assigned_to = assignee.id  
    LEFT JOIN profiles ap ON t.assigned_to = ap.id
    LEFT JOIN teams tm ON t.team_id = tm.id
  ';
  
  -- 基本権限フィルター（必須）
  where_conditions := array_append(where_conditions, format(
    '(t.user_id = %L OR t.assigned_to = %L OR (t.team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM team_members WHERE team_id = t.team_id AND user_id = %L
    )))', 
    p_user_id, p_user_id, p_user_id
  ));
  
  -- チーム指定
  IF p_team_id IS NOT NULL THEN
    where_conditions := array_append(where_conditions, format('t.team_id = %L', p_team_id));
  END IF;
  
  -- テキスト検索（タイトル・説明での部分一致）
  IF p_search_text IS NOT NULL AND LENGTH(trim(p_search_text)) > 0 THEN
    where_conditions := array_append(where_conditions, format(
      '(t.title ILIKE %L OR t.description ILIKE %L)', 
      '%' || p_search_text || '%', 
      '%' || p_search_text || '%'
    ));
  END IF;
  
  -- ステータス絞り込み
  IF p_status IS NOT NULL AND array_length(p_status, 1) > 0 THEN
    where_conditions := array_append(where_conditions, 
      't.status = ANY(' || quote_literal(p_status) || ')');
  END IF;
  
  -- 優先度絞り込み
  IF p_priority IS NOT NULL AND array_length(p_priority, 1) > 0 THEN
    where_conditions := array_append(where_conditions, 
      't.priority = ANY(' || quote_literal(p_priority) || ')');
  END IF;
  
  -- 担当者絞り込み
  IF p_assigned_to IS NOT NULL THEN
    where_conditions := array_append(where_conditions, format('t.assigned_to = %L', p_assigned_to));
  END IF;
  
  -- 作成日期間絞り込み
  IF p_date_from IS NOT NULL THEN
    where_conditions := array_append(where_conditions, format('t.created_at >= %L', p_date_from));
  END IF;
  IF p_date_to IS NOT NULL THEN
    where_conditions := array_append(where_conditions, format('t.created_at <= %L', p_date_to));
  END IF;
  
  -- 期限日絞り込み
  IF p_due_from IS NOT NULL THEN
    where_conditions := array_append(where_conditions, format('DATE(t.due_date) >= %L', p_due_from));
  END IF;
  IF p_due_to IS NOT NULL THEN
    where_conditions := array_append(where_conditions, format('DATE(t.due_date) <= %L', p_due_to));
  END IF;
  
  -- 期限日の有無
  IF p_has_due_date IS NOT NULL THEN
    IF p_has_due_date THEN
      where_conditions := array_append(where_conditions, 't.due_date IS NOT NULL');
    ELSE
      where_conditions := array_append(where_conditions, 't.due_date IS NULL');
    END IF;
  END IF;
  
  -- クエリ組み立て
  full_query := base_query || ' WHERE ' || array_to_string(where_conditions, ' AND ') ||
                ' ORDER BY t.created_at DESC' ||
                format(' LIMIT %s OFFSET %s', p_limit, p_offset);
  
  -- 件数カウント用クエリ
  EXECUTE 'SELECT COUNT(*) FROM (' || 
          'SELECT t.id FROM tasks t ' ||
          'LEFT JOIN teams tm ON t.team_id = tm.id ' ||
          'WHERE ' || array_to_string(where_conditions, ' AND ') ||
          ') counter' 
  INTO result;
  
  -- メインクエリ実行と結果構築
  EXECUTE format('
    SELECT jsonb_build_object(
      ''tasks'', COALESCE(jsonb_agg(to_jsonb(task_results)), ''[]''::jsonb),
      ''total_count'', %s,
      ''has_more'', %s > (%s + %s),
      ''filters_applied'', jsonb_build_object(
        ''search_text'', %L,
        ''status'', %L,
        ''priority'', %L,
        ''team_id'', %L,
        ''assigned_to'', %L,
        ''date_range'', CASE WHEN %L IS NOT NULL OR %L IS NOT NULL 
                            THEN jsonb_build_object(''from'', %L, ''to'', %L)
                            ELSE NULL END,
        ''due_range'', CASE WHEN %L IS NOT NULL OR %L IS NOT NULL 
                           THEN jsonb_build_object(''from'', %L, ''to'', %L)
                           ELSE NULL END
      )
    ) FROM (' || full_query || ') task_results',
    result, result, p_limit, p_offset,
    p_search_text, p_status, p_priority, p_team_id, p_assigned_to,
    p_date_from, p_date_to, p_date_from, p_date_to,
    p_due_from, p_due_to, p_due_from, p_due_to
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 4. 完了済みタスク整理関数
-- =============================================================================
CREATE OR REPLACE FUNCTION cleanup_completed_tasks(
  p_user_id UUID DEFAULT NULL,
  p_team_id UUID DEFAULT NULL,
  p_days_old INTEGER DEFAULT 180,
  p_keep_important BOOLEAN DEFAULT true,
  p_dry_run BOOLEAN DEFAULT false
) RETURNS JSON AS $$
DECLARE
  result JSON;
  cleanup_count INTEGER := 0;
  archived_count INTEGER := 0;
  error_count INTEGER := 0;
  cutoff_date TIMESTAMPTZ;
  task_record RECORD;
BEGIN
  -- 削除対象の基準日を計算
  cutoff_date := NOW() - (p_days_old || ' days')::INTERVAL;
  
  -- 削除対象のタスクを特定
  FOR task_record IN 
    SELECT t.*
    FROM tasks t
    WHERE t.status = 'completed'
      AND t.updated_at < cutoff_date
      AND (p_user_id IS NULL OR t.user_id = p_user_id)
      AND (p_team_id IS NULL OR t.team_id = p_team_id)
      AND (
        NOT p_keep_important OR (
          -- 重要とみなすタスクは保持
          t.priority != '高' 
          AND (SELECT COUNT(*) FROM task_comments WHERE task_id = t.id) < 5
          AND t.due_date IS NULL OR t.due_date < t.updated_at
        )
      )
  LOOP
    BEGIN
      IF NOT p_dry_run THEN
        -- アーカイブテーブルに移動（存在する場合）
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks_archive') THEN
          INSERT INTO tasks_archive 
          SELECT task_record.*, NOW() as archived_at, p_user_id as archived_by;
          archived_count := archived_count + 1;
        END IF;
        
        -- 関連データの削除（カスケードで自動削除されるが明示的に記録）
        DELETE FROM task_comments WHERE task_id = task_record.id;
        DELETE FROM task_history WHERE task_id = task_record.id;
        DELETE FROM tasks WHERE id = task_record.id;
        
        cleanup_count := cleanup_count + 1;
      ELSE
        -- ドライランモードでは削除しないが、カウントだけ行う
        cleanup_count := cleanup_count + 1;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      -- エラーログ記録（notifications テーブルを活用）
      IF p_user_id IS NOT NULL AND NOT p_dry_run THEN
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (
          p_user_id,
          'cleanup_error',
          'タスク整理エラー',
          'タスクID: ' || task_record.id || ' の整理中にエラーが発生しました',
          jsonb_build_object(
            'task_id', task_record.id,
            'error_message', SQLERRM,
            'cleanup_date', NOW()
          )
        );
      END IF;
    END;
  END LOOP;
  
  -- 統計情報の更新（cleanup後のデータベース統計）
  IF cleanup_count > 0 AND NOT p_dry_run THEN
    -- Postgresの統計情報を更新
    ANALYZE tasks;
    ANALYZE task_comments;
    ANALYZE task_history;
  END IF;
  
  -- 結果の構築
  SELECT jsonb_build_object(
    'success', error_count = 0,
    'dry_run', p_dry_run,
    'cleanup_count', cleanup_count,
    'archived_count', archived_count,
    'error_count', error_count,
    'cutoff_date', cutoff_date,
    'settings', jsonb_build_object(
      'days_old', p_days_old,
      'keep_important', p_keep_important,
      'user_id', p_user_id,
      'team_id', p_team_id
    ),
    'message', CASE
      WHEN p_dry_run THEN format('確認モード: %s件のタスクが削除対象です', cleanup_count)
      WHEN cleanup_count = 0 THEN '削除対象のタスクはありませんでした'
      WHEN error_count = 0 THEN format('%s件のタスクを正常に整理しました', cleanup_count)
      ELSE format('%s件整理、%s件エラー', cleanup_count - error_count, error_count)
    END,
    'recommendations', CASE 
      WHEN cleanup_count > 100 THEN jsonb_build_array(
        '大量のタスクが削除されました。定期的な整理を推奨します。',
        'アーカイブ機能の活用を検討してください。'
      )
      WHEN cleanup_count = 0 AND p_days_old > 30 THEN jsonb_build_array(
        'タスク管理が良好です。現在のペースを維持してください。'
      )
      ELSE jsonb_build_array(
        format('%s件のタスクを整理しました。', cleanup_count)
      )
    END
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- インデックスとパーミッション
-- =============================================================================

-- RPC関数のパーミッション設定
GRANT EXECUTE ON FUNCTION get_user_task_statistics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_update_tasks(UUID[], UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tasks_with_filters(UUID, UUID, TEXT, TEXT[], TEXT[], UUID, TIMESTAMPTZ, TIMESTAMPTZ, DATE, DATE, BOOLEAN, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_completed_tasks(UUID, UUID, INTEGER, BOOLEAN, BOOLEAN) TO authenticated;

-- パフォーマンス向上のための追加インデックス
CREATE INDEX IF NOT EXISTS idx_tasks_status_updated_at ON tasks(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_tasks_title_gin ON tasks USING gin(to_tsvector('japanese', title));
CREATE INDEX IF NOT EXISTS idx_task_comments_count ON task_comments(task_id);

COMMIT;
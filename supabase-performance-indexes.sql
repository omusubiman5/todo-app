-- パフォーマンス改善用インデックス追加
-- 即座に検索性能を向上させる複合インデックス

-- 1. チーム内のタスク一覧表示用（最も頻繁に使用される）
-- チームID + ステータス + 作成日の降順
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_team_status_created 
ON tasks(team_id, status, created_at DESC) 
WHERE team_id IS NOT NULL;

-- 2. 担当者別の未完了タスク検索用（ダッシュボード表示用）
-- 担当者 + ステータス（完了以外のみ）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_assignee_active 
ON tasks(assigned_to, status, priority, due_date) 
WHERE assigned_to IS NOT NULL AND status != 'completed';

-- 3. 個人タスクの高速検索用
-- ユーザーID + ステータス + 作成日
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_user_status_created
ON tasks(user_id, status, created_at DESC)
WHERE team_id IS NULL;

-- 4. 期限切れタスク検索用（通知・アラート用）
-- 期限日 + ステータス（完了以外）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_overdue
ON tasks(due_date, assigned_to, priority)
WHERE due_date IS NOT NULL AND status != 'completed' AND due_date < NOW();

-- 5. 優先度別アクティブタスク検索用
-- 優先度 + ステータス + 作成日（完了タスクを除外）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_priority_active
ON tasks(priority, created_at DESC, team_id)
WHERE status != 'completed';

-- 6. 通知テーブルの最適化
-- ユーザーの未読通知高速検索用
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread
ON notifications(user_id, created_at DESC)
WHERE read_at IS NULL;

-- 7. タスクコメントの最適化
-- タスク別コメント一覧表示用
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_comments_task_created
ON task_comments(task_id, created_at DESC);

-- 8. タスク履歴の最適化
-- タスク別履歴表示用
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_history_task_created
ON task_history(task_id, created_at DESC);

-- インデックスの使用状況確認クエリ（管理用）
/*
-- インデックスの使用状況を確認
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as "使用回数",
    idx_tup_read as "読み取り行数",
    idx_tup_fetch as "取得行数"
FROM pg_stat_user_indexes 
WHERE tablename = 'tasks'
ORDER BY idx_scan DESC;
*/

-- 実行計画確認用のサンプルクエリ
/*
-- チーム内アクティブタスク検索のパフォーマンステスト
EXPLAIN (ANALYZE, BUFFERS) 
SELECT id, title, status, priority, assigned_to, created_at
FROM tasks 
WHERE team_id = 'チームUUID' 
  AND status IN ('pending', 'in_progress')
ORDER BY created_at DESC
LIMIT 50;

-- 担当者の未完了タスク検索のパフォーマンステスト  
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, title, priority, due_date
FROM tasks
WHERE assigned_to = 'ユーザーUUID'
  AND status != 'completed'
ORDER BY priority, due_date NULLS LAST;
*/
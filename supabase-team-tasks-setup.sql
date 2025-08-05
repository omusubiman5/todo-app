-- チーム共有タスク機能のための拡張テーブル設計

-- 1. タスクテーブルの拡張（チーム対応）
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. タスクコメントテーブル
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. タスク変更履歴テーブル
CREATE TABLE IF NOT EXISTS task_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'updated', 'completed', 'assigned', 'commented', 'deleted')),
  changes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 通知テーブル
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('task_assigned', 'task_mentioned', 'task_deadline', 'task_completed', 'task_commented')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLSポリシーの設定

-- task_comments テーブルのRLS
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- チームメンバーはコメントを閲覧可能
DROP POLICY IF EXISTS "Team members can view task comments" ON task_comments;
CREATE POLICY "Team members can view task comments" ON task_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN team_members tm ON tm.team_id = t.team_id
      WHERE t.id = task_comments.task_id 
      AND tm.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_comments.task_id 
      AND t.user_id = auth.uid()
      AND t.team_id IS NULL
    )
  );

-- チームメンバーはコメントを作成可能
DROP POLICY IF EXISTS "Team members can create task comments" ON task_comments;
CREATE POLICY "Team members can create task comments" ON task_comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND (
      EXISTS (
        SELECT 1 FROM tasks t
        JOIN team_members tm ON tm.team_id = t.team_id
        WHERE t.id = task_comments.task_id 
        AND tm.user_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id = task_comments.task_id 
        AND t.user_id = auth.uid()
        AND t.team_id IS NULL
      )
    )
  );

-- コメント作成者は自分のコメントを更新・削除可能
DROP POLICY IF EXISTS "Users can update own comments" ON task_comments;
CREATE POLICY "Users can update own comments" ON task_comments
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON task_comments;
CREATE POLICY "Users can delete own comments" ON task_comments
  FOR DELETE USING (auth.uid() = user_id);

-- task_history テーブルのRLS
ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;

-- チームメンバーは履歴を閲覧可能
DROP POLICY IF EXISTS "Team members can view task history" ON task_history;
CREATE POLICY "Team members can view task history" ON task_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN team_members tm ON tm.team_id = t.team_id
      WHERE t.id = task_history.task_id 
      AND tm.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_history.task_id 
      AND t.user_id = auth.uid()
      AND t.team_id IS NULL
    )
  );

-- システムが履歴を作成
DROP POLICY IF EXISTS "System can create task history" ON task_history;
CREATE POLICY "System can create task history" ON task_history
  FOR INSERT WITH CHECK (true);

-- notifications テーブルのRLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の通知のみ閲覧・更新可能
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- システムが通知を作成
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- タスクテーブルの既存RLSポリシーを更新
DROP POLICY IF EXISTS "Users can view own tasks or team tasks" ON tasks;
CREATE POLICY "Users can view own tasks or team tasks" ON tasks
  FOR SELECT USING (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.team_id = tasks.team_id 
      AND tm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create tasks" ON tasks;
CREATE POLICY "Users can create tasks" ON tasks
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    (team_id IS NULL OR EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.team_id = tasks.team_id 
      AND tm.user_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "Users can update own tasks or team tasks" ON tasks;
CREATE POLICY "Users can update own tasks or team tasks" ON tasks
  FOR UPDATE USING (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.team_id = tasks.team_id 
      AND tm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own tasks or team tasks" ON tasks;
CREATE POLICY "Users can delete own tasks or team tasks" ON tasks
  FOR DELETE USING (
    auth.uid() = user_id 
    OR 
    (tasks.team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.team_id = tasks.team_id 
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    ))
  );

-- トリガー関数: タスク履歴を自動記録
CREATE OR REPLACE FUNCTION log_task_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO task_history (task_id, user_id, action, changes)
    VALUES (NEW.id, NEW.user_id, 'created', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- 変更内容を記録
    DECLARE
      changes_data JSONB;
      action_type VARCHAR(50) := 'updated';
    BEGIN
      changes_data := jsonb_build_object(
        'old', to_jsonb(OLD),
        'new', to_jsonb(NEW)
      );
      
      -- 特定のアクションを判定
      IF OLD.completed != NEW.completed AND NEW.completed = true THEN
        action_type := 'completed';
      ELSIF OLD.assigned_to != NEW.assigned_to THEN
        action_type := 'assigned';
      END IF;
      
      INSERT INTO task_history (task_id, user_id, action, changes)
      VALUES (NEW.id, auth.uid(), action_type, changes_data);
      
      RETURN NEW;
    END;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO task_history (task_id, user_id, action, changes)
    VALUES (OLD.id, auth.uid(), 'deleted', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガーの作成
DROP TRIGGER IF EXISTS task_history_trigger ON tasks;
CREATE TRIGGER task_history_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW EXECUTE FUNCTION log_task_history();

-- 関数: 通知作成
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type VARCHAR(50),
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 関数: タスク割り当て時の通知作成
CREATE OR REPLACE FUNCTION notify_task_assignment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to != NEW.assigned_to) THEN
    PERFORM create_notification(
      NEW.assigned_to,
      'task_assigned',
      'タスクが割り当てられました',
      'タスク「' || NEW.text || '」があなたに割り当てられました。',
      jsonb_build_object('task_id', NEW.id, 'task_text', NEW.text)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- タスク割り当て通知トリガー
DROP TRIGGER IF EXISTS task_assignment_notification_trigger ON tasks;
CREATE TRIGGER task_assignment_notification_trigger
  AFTER UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION notify_task_assignment();

-- 関数: メンション通知
CREATE OR REPLACE FUNCTION notify_mentions()
RETURNS TRIGGER AS $$
DECLARE
  mentioned_user UUID;
BEGIN
  IF NEW.mentions IS NOT NULL THEN
    FOREACH mentioned_user IN ARRAY NEW.mentions
    LOOP
      PERFORM create_notification(
        mentioned_user,
        'task_mentioned',
        'タスクでメンションされました',
        'タスクのコメントであなたがメンションされました。',
        jsonb_build_object('task_id', NEW.task_id, 'comment_id', NEW.id)
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- メンション通知トリガー
DROP TRIGGER IF EXISTS mention_notification_trigger ON task_comments;
CREATE TRIGGER mention_notification_trigger
  AFTER INSERT ON task_comments
  FOR EACH ROW EXECUTE FUNCTION notify_mentions();

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_tasks_team_id ON tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON task_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON task_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_history_user_id ON task_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
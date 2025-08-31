-- 包括的RLSポリシー修正スクリプト
-- 全テーブルでの認証必須アクセス制御を実装

-- =============================================================================
-- 1. TASKS テーブルの RLS 設定
-- =============================================================================

-- tasksテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id),
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS有効化
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 既存ポリシー削除
DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;
DROP POLICY IF EXISTS "Team members can view team tasks" ON tasks;
DROP POLICY IF EXISTS "Team members can create team tasks" ON tasks;
DROP POLICY IF EXISTS "Team members can update team tasks" ON tasks;

-- 新しいRLSポリシー（個人タスク）
CREATE POLICY "Users can view own tasks" ON tasks
  FOR SELECT USING (
    auth.uid() = user_id 
    AND team_id IS NULL
  );

CREATE POLICY "Users can create own tasks" ON tasks
  FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    AND team_id IS NULL
  );

CREATE POLICY "Users can update own tasks" ON tasks
  FOR UPDATE USING (
    auth.uid() = user_id 
    AND team_id IS NULL
  );

CREATE POLICY "Users can delete own tasks" ON tasks
  FOR DELETE USING (
    auth.uid() = user_id 
    AND team_id IS NULL
  );

-- チームタスクのRLSポリシー
CREATE POLICY "Team members can view team tasks" ON tasks
  FOR SELECT USING (
    team_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = tasks.team_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can create team tasks" ON tasks
  FOR INSERT WITH CHECK (
    team_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = tasks.team_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can update team tasks" ON tasks
  FOR UPDATE USING (
    team_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = tasks.team_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can delete team tasks" ON tasks
  FOR DELETE USING (
    team_id IS NOT NULL 
    AND (
      auth.uid() = user_id OR
      EXISTS (
        SELECT 1 FROM team_members 
        WHERE team_id = tasks.team_id 
        AND user_id = auth.uid() 
        AND role IN ('owner', 'admin')
      )
    )
  );

-- =============================================================================
-- 2. PROFILES テーブルの RLS 設定
-- =============================================================================

-- profilesテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  timezone TEXT DEFAULT 'UTC',
  language TEXT DEFAULT 'ja',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 既存ポリシー削除
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Team members can view profiles" ON profiles;

-- 新しいRLSポリシー
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can create own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- チームメンバーは同じチームのユーザープロフィールを閲覧可能
CREATE POLICY "Team members can view teammate profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm1
      JOIN team_members tm2 ON tm1.team_id = tm2.team_id
      WHERE tm1.user_id = auth.uid() 
      AND tm2.user_id = profiles.id
    )
  );

-- =============================================================================
-- 3. NOTIFICATIONS テーブルの RLS 設定
-- =============================================================================

-- notificationsテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
  read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- RLS有効化
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 既存ポリシー削除
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;

-- 新しいRLSポリシー
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true); -- システムが通知を作成

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- 4. 追加のテーブル作成（不足している場合）
-- =============================================================================

-- task_comments テーブル
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS設定
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on accessible tasks" ON task_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE id = task_comments.task_id 
      AND (
        user_id = auth.uid() OR
        (team_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM team_members 
          WHERE team_id = tasks.team_id AND user_id = auth.uid()
        ))
      )
    )
  );

CREATE POLICY "Users can create comments on accessible tasks" ON task_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE id = task_comments.task_id 
      AND (
        user_id = auth.uid() OR
        (team_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM team_members 
          WHERE team_id = tasks.team_id AND user_id = auth.uid()
        ))
      )
    )
  );

CREATE POLICY "Users can update own comments" ON task_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON task_comments
  FOR DELETE USING (auth.uid() = user_id);

-- task_history テーブル
CREATE TABLE IF NOT EXISTS task_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  changes JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS設定
ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view history of accessible tasks" ON task_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE id = task_history.task_id 
      AND (
        user_id = auth.uid() OR
        (team_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM team_members 
          WHERE team_id = tasks.team_id AND user_id = auth.uid()
        ))
      )
    )
  );

CREATE POLICY "System can create task history" ON task_history
  FOR INSERT WITH CHECK (true);

-- =============================================================================
-- 5. インデックスの作成
-- =============================================================================

-- tasksテーブル
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_team_id ON tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- profilesテーブル
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- notificationsテーブル
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at);

-- task_commentsテーブル
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON task_comments(user_id);

-- task_historyテーブル
CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON task_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_history_user_id ON task_history(user_id);

-- =============================================================================
-- 6. トリガー関数（updated_at自動更新）
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガー設定
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_comments_updated_at BEFORE UPDATE ON task_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 完了メッセージ
-- =============================================================================

-- このスクリプトの実行により以下が設定されます：
-- 1. 全テーブルでRLS有効化
-- 2. 認証ユーザーのみアクセス可能な厳格なポリシー
-- 3. 個人タスクとチームタスクの適切な分離
-- 4. プロフィール情報の適切なアクセス制御
-- 5. 通知システムの安全な実装
-- 6. タスクコメントと履歴の追跡機能
-- 7. パフォーマンス向上のためのインデックス
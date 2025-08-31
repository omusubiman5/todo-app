-- RLS包括設定スクリプト (自動生成)
-- 生成日時: 2025-08-30T19:42:52.877Z

-- =============================================================================
-- 1. 全テーブルでRLS有効化
-- =============================================================================


-- tasksテーブルのRLS有効化
ALTER TABLE IF EXISTS public.tasks ENABLE ROW LEVEL SECURITY;

-- profilesテーブルのRLS有効化
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- teamsテーブルのRLS有効化
ALTER TABLE IF EXISTS public.teams ENABLE ROW LEVEL SECURITY;

-- team_membersテーブルのRLS有効化
ALTER TABLE IF EXISTS public.team_members ENABLE ROW LEVEL SECURITY;

-- notificationsテーブルのRLS有効化
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 2. tasksテーブルのRLSポリシー
-- =============================================================================

-- 既存ポリシー削除
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Team members can view team tasks" ON public.tasks;
DROP POLICY IF EXISTS "Team members can create team tasks" ON public.tasks;
DROP POLICY IF EXISTS "Team members can update team tasks" ON public.tasks;

-- 個人タスクのポリシー
CREATE POLICY "Users can view own tasks" ON public.tasks
  FOR SELECT USING (
    auth.uid() = user_id AND team_id IS NULL
  );

CREATE POLICY "Users can create own tasks" ON public.tasks
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND team_id IS NULL
  );

CREATE POLICY "Users can update own tasks" ON public.tasks
  FOR UPDATE USING (
    auth.uid() = user_id AND team_id IS NULL
  );

CREATE POLICY "Users can delete own tasks" ON public.tasks
  FOR DELETE USING (
    auth.uid() = user_id AND team_id IS NULL
  );

-- =============================================================================
-- 3. profilesテーブルのRLSポリシー
-- =============================================================================

-- 既存ポリシー削除
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- プロフィールポリシー
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can create own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- =============================================================================
-- 4. notificationsテーブルのRLSポリシー
-- =============================================================================

-- 既存ポリシー削除
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;

-- 通知ポリシー
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- 5. teamsテーブルのRLSポリシー (存在する場合)
-- =============================================================================

-- 既存ポリシー削除
DROP POLICY IF EXISTS "Users can create teams" ON public.teams;
DROP POLICY IF EXISTS "Team members can view team" ON public.teams;
DROP POLICY IF EXISTS "Team owners and admins can update team" ON public.teams;
DROP POLICY IF EXISTS "Team owners can delete team" ON public.teams;

-- チームポリシー
CREATE POLICY "Users can create teams" ON public.teams
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Team members can view team" ON public.teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE team_id = teams.id AND user_id = auth.uid()
    )
  );

-- =============================================================================
-- 6. team_membersテーブルのRLSポリシー (存在する場合)
-- =============================================================================

-- 既存ポリシー削除
DROP POLICY IF EXISTS "Team members can view members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners and admins can add members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners and admins can update members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners and admins can remove members" ON public.team_members;

-- チームメンバーポリシー
CREATE POLICY "Team members can view members" ON public.team_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 完了メッセージ
-- =============================================================================

-- このスクリプト実行後、verify-rls-fix.js で検証してください

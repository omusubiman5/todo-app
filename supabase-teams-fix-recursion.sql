-- RLS無限再帰問題の修正版

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can create teams" ON teams;
DROP POLICY IF EXISTS "Team members can view team" ON teams;
DROP POLICY IF EXISTS "Team owners and admins can update team" ON teams;
DROP POLICY IF EXISTS "Team owners can delete team" ON teams;

DROP POLICY IF EXISTS "Team members can view members" ON team_members;
DROP POLICY IF EXISTS "Team owners and admins can add members" ON team_members;
DROP POLICY IF EXISTS "Team owners and admins can update members" ON team_members;
DROP POLICY IF EXISTS "Team owners and admins can remove members" ON team_members;

DROP POLICY IF EXISTS "Team owners and admins can create invitations" ON team_invitations;
DROP POLICY IF EXISTS "Team owners and admins can view invitations" ON team_invitations;
DROP POLICY IF EXISTS "Team owners and admins can delete invitations" ON team_invitations;
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON team_invitations;

-- RLSを一時的に無効化
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations DISABLE ROW LEVEL SECURITY;

-- 簡単なポリシーで再設定

-- teams テーブル - RLS有効化
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- すべてのユーザーがチームを作成可能
CREATE POLICY "allow_team_creation" ON teams
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- 認証済みユーザーはすべてのチームを表示可能（一時的に簡素化）
CREATE POLICY "allow_team_select" ON teams
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- チーム作成者のみ更新・削除可能
CREATE POLICY "allow_team_update" ON teams
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "allow_team_delete" ON teams
  FOR DELETE USING (auth.uid() = created_by);

-- team_members テーブル - RLS有効化
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーはすべてのメンバー情報を表示可能（一時的に簡素化）
CREATE POLICY "allow_members_select" ON team_members
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 認証済みユーザーはメンバーを追加可能（一時的に簡素化）
CREATE POLICY "allow_members_insert" ON team_members
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 自分のメンバーシップを更新・削除可能
CREATE POLICY "allow_members_update" ON team_members
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "allow_members_delete" ON team_members
  FOR DELETE USING (auth.uid() = user_id);

-- team_invitations テーブル - RLS有効化
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは招待を作成可能
CREATE POLICY "allow_invitations_insert" ON team_invitations
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- すべてのユーザーが招待を表示可能（トークンアクセス用）
CREATE POLICY "allow_invitations_select" ON team_invitations
  FOR SELECT USING (true);

-- 招待作成者のみ削除可能
CREATE POLICY "allow_invitations_delete" ON team_invitations
  FOR DELETE USING (auth.uid() = created_by);
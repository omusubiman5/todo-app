-- 既存のチーム機能関連のポリシーとテーブルをクリーンアップ

-- ポリシーの削除
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

-- 関数の削除
DROP FUNCTION IF EXISTS accept_team_invitation(TEXT);
DROP FUNCTION IF EXISTS generate_invitation_token();

-- テーブルの削除（必要に応じて）
-- 注意: データが残っている場合はCASCADEが必要
-- DROP TABLE IF EXISTS team_invitations CASCADE;
-- DROP TABLE IF EXISTS team_members CASCADE;
-- DROP TABLE IF EXISTS teams CASCADE;
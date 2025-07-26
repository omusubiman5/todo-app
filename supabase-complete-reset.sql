-- 完全なリセット: すべてのポリシーとテーブルを削除して再作成

-- すべてのポリシーを削除
DROP POLICY IF EXISTS "Users can create teams" ON teams;
DROP POLICY IF EXISTS "Team members can view team" ON teams;
DROP POLICY IF EXISTS "Team owners and admins can update team" ON teams;
DROP POLICY IF EXISTS "Team owners can delete team" ON teams;
DROP POLICY IF EXISTS "allow_team_creation" ON teams;
DROP POLICY IF EXISTS "allow_team_select" ON teams;
DROP POLICY IF EXISTS "allow_team_update" ON teams;
DROP POLICY IF EXISTS "allow_team_delete" ON teams;

DROP POLICY IF EXISTS "Team members can view members" ON team_members;
DROP POLICY IF EXISTS "Team owners and admins can add members" ON team_members;
DROP POLICY IF EXISTS "Team owners and admins can update members" ON team_members;
DROP POLICY IF EXISTS "Team owners and admins can remove members" ON team_members;
DROP POLICY IF EXISTS "allow_members_select" ON team_members;
DROP POLICY IF EXISTS "allow_members_insert" ON team_members;
DROP POLICY IF EXISTS "allow_members_update" ON team_members;
DROP POLICY IF EXISTS "allow_members_delete" ON team_members;

DROP POLICY IF EXISTS "Team owners and admins can create invitations" ON team_invitations;
DROP POLICY IF EXISTS "Team owners and admins can view invitations" ON team_invitations;
DROP POLICY IF EXISTS "Team owners and admins can delete invitations" ON team_invitations;
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON team_invitations;
DROP POLICY IF EXISTS "allow_invitations_insert" ON team_invitations;
DROP POLICY IF EXISTS "allow_invitations_select" ON team_invitations;
DROP POLICY IF EXISTS "allow_invitations_delete" ON team_invitations;

-- 関数を削除
DROP FUNCTION IF EXISTS accept_team_invitation(TEXT);
DROP FUNCTION IF EXISTS generate_invitation_token();

-- RLSを無効化
ALTER TABLE IF EXISTS teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS team_invitations DISABLE ROW LEVEL SECURITY;

-- テーブルを削除（データも削除されます）
DROP TABLE IF EXISTS team_invitations CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;

-- テーブルを再作成
CREATE TABLE teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE team_members (
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'guest')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  invited_by UUID REFERENCES auth.users(id),
  PRIMARY KEY (team_id, user_id)
);

CREATE TABLE team_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'guest')),
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- RLSを有効化
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- 新しいポリシーを作成（シンプル版）

-- teams テーブル
CREATE POLICY "teams_policy_all" ON teams
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- team_members テーブル  
CREATE POLICY "team_members_policy_all" ON team_members
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- team_invitations テーブル
CREATE POLICY "team_invitations_policy_all" ON team_invitations
  FOR ALL USING (true)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 関数を再作成
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$;

CREATE OR REPLACE FUNCTION accept_team_invitation(invitation_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invitation_record team_invitations%ROWTYPE;
BEGIN
  SELECT * INTO invitation_record 
  FROM team_invitations 
  WHERE token = invitation_token 
  AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_id = invitation_record.team_id 
    AND user_id = auth.uid()
  ) THEN
    DELETE FROM team_invitations WHERE id = invitation_record.id;
    RETURN TRUE;
  END IF;
  
  INSERT INTO team_members (team_id, user_id, role, invited_by)
  VALUES (invitation_record.team_id, auth.uid(), invitation_record.role, invitation_record.created_by);
  
  DELETE FROM team_invitations WHERE id = invitation_record.id;
  
  RETURN TRUE;
END;
$$;

-- インデックスを作成
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_invitations_team_id ON team_invitations(team_id);
CREATE INDEX idx_team_invitations_token ON team_invitations(token);
CREATE INDEX idx_team_invitations_email ON team_invitations(email);
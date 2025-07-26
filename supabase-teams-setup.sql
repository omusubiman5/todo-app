-- チーム機能のテーブル設計とRLSポリシー

-- 1. teams テーブル
CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. team_members テーブル
CREATE TABLE IF NOT EXISTS team_members (
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'guest')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  invited_by UUID REFERENCES auth.users(id),
  PRIMARY KEY (team_id, user_id)
);

-- 3. team_invitations テーブル
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'guest')),
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- 4. 既存のtasksテーブルにteam_idを追加（もし存在する場合）
-- ALTER TABLE tasks ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

-- RLSポリシーの設定

-- teams テーブルのRLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- チーム作成者は自分のチームを管理可能
CREATE POLICY "Users can create teams" ON teams
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- チームメンバーはチーム情報を閲覧可能
CREATE POLICY "Team members can view team" ON teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = teams.id AND user_id = auth.uid()
    )
  );

-- チームオーナーと管理者はチーム情報を更新可能
CREATE POLICY "Team owners and admins can update team" ON teams
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = teams.id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- チームオーナーのみ削除可能
CREATE POLICY "Team owners can delete team" ON teams
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = teams.id 
      AND user_id = auth.uid() 
      AND role = 'owner'
    )
  );

-- team_members テーブルのRLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- チームメンバーはメンバーリストを閲覧可能
CREATE POLICY "Team members can view members" ON team_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid()
    )
  );

-- チームオーナーと管理者はメンバーを追加可能
CREATE POLICY "Team owners and admins can add members" ON team_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id 
      AND tm.user_id = auth.uid() 
      AND tm.role IN ('owner', 'admin')
    )
  );

-- チームオーナーと管理者はメンバー権限を更新可能
CREATE POLICY "Team owners and admins can update members" ON team_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id 
      AND tm.user_id = auth.uid() 
      AND tm.role IN ('owner', 'admin')
    )
  );

-- チームオーナーと管理者はメンバーを削除可能（自分以外）
CREATE POLICY "Team owners and admins can remove members" ON team_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id 
      AND tm.user_id = auth.uid() 
      AND tm.role IN ('owner', 'admin')
    ) AND team_members.user_id != auth.uid()
  );

-- team_invitations テーブルのRLS
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- チームオーナーと管理者は招待を作成可能
CREATE POLICY "Team owners and admins can create invitations" ON team_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_invitations.team_id 
      AND tm.user_id = auth.uid() 
      AND tm.role IN ('owner', 'admin')
    )
  );

-- チームオーナーと管理者は招待を閲覧可能
CREATE POLICY "Team owners and admins can view invitations" ON team_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_invitations.team_id 
      AND tm.user_id = auth.uid() 
      AND tm.role IN ('owner', 'admin')
    )
  );

-- チームオーナーと管理者は招待を削除可能
CREATE POLICY "Team owners and admins can delete invitations" ON team_invitations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_invitations.team_id 
      AND tm.user_id = auth.uid() 
      AND tm.role IN ('owner', 'admin')
    )
  );

-- 招待トークンで招待を取得可能（認証不要）
CREATE POLICY "Anyone can view invitation by token" ON team_invitations
  FOR SELECT USING (true);

-- 関数: チーム招待の処理
CREATE OR REPLACE FUNCTION accept_team_invitation(invitation_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invitation_record team_invitations%ROWTYPE;
BEGIN
  -- 招待を取得
  SELECT * INTO invitation_record 
  FROM team_invitations 
  WHERE token = invitation_token 
  AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- 既にメンバーかチェック
  IF EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_id = invitation_record.team_id 
    AND user_id = auth.uid()
  ) THEN
    -- 既にメンバーの場合は招待を削除
    DELETE FROM team_invitations WHERE id = invitation_record.id;
    RETURN TRUE;
  END IF;
  
  -- メンバーとして追加
  INSERT INTO team_members (team_id, user_id, role, invited_by)
  VALUES (invitation_record.team_id, auth.uid(), invitation_record.role, invitation_record.created_by);
  
  -- 招待を削除
  DELETE FROM team_invitations WHERE id = invitation_record.id;
  
  RETURN TRUE;
END;
$$;

-- 関数: チーム招待トークン生成
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$;

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_team_id ON team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email); 
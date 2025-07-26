// チーム機能の型定義

export interface Team {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  team_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'guest';
  joined_at: string;
  invited_by?: string;
  user?: {
    id: string;
    email: string;
    user_metadata?: {
      full_name?: string;
      avatar_url?: string;
    };
  };
}

export interface TeamInvitation {
  id: string;
  team_id: string;
  email: string;
  role: 'admin' | 'member' | 'guest';
  token: string;
  expires_at: string;
  created_at: string;
  created_by: string;
  team?: {
    name: string;
    description?: string;
  };
}

export interface CreateTeamData {
  name: string;
  description?: string;
  avatar_url?: string;
}

export interface UpdateTeamData {
  name?: string;
  description?: string;
  avatar_url?: string;
}

export interface InviteMemberData {
  email: string;
  role: 'admin' | 'member' | 'guest';
}

export interface TeamWithMembers extends Team {
  members: TeamMember[];
  member_count: number;
  current_user_is_owner?: boolean;
  current_user_role?: string | null;
}

export interface UserTeams {
  owned_teams: Team[];
  member_teams: Team[];
  guest_teams: Team[];
} 
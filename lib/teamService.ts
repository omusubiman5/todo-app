import { supabase } from './supabase';
import type { 
  Team, 
  TeamMember, 
  TeamInvitation, 
  CreateTeamData, 
  UpdateTeamData, 
  InviteMemberData,
  TeamWithMembers,
  UserTeams
} from './types';

// チーム作成
export async function createTeam(data: CreateTeamData): Promise<Team> {
  console.log('createTeam called with:', data);
  
  const { data: { user } } = await supabase.auth.getUser();
  console.log('Current user:', user);
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // データベースに挿入するデータを準備
  const insertData = {
    name: data.name,
    description: data.description,
    avatar_url: data.avatar_url,
    created_by: user.id
  };
  
  console.log('Inserting team data:', insertData);
  
  const { data: team, error } = await supabase
    .from('teams')
    .insert([insertData])
    .select()
    .single();

  console.log('Team creation result:', { team, error });
  
  if (error) {
    console.error('Team creation error:', error);
    throw error;
  }

  // 作成者をオーナーとしてメンバーに追加
  console.log('Adding owner to team_members...');
  const { error: memberError } = await supabase
    .from('team_members')
    .insert([{
      team_id: team.id,
      user_id: user.id,
      role: 'owner'
    }]);

  console.log('Member addition result:', { error: memberError });
  
  if (memberError) {
    console.error('Member addition error:', memberError);
    throw memberError;
  }

  return team;
}

// ユーザーのチーム一覧取得（簡素化版）
export async function getUserTeams(): Promise<UserTeams> {
  console.log('getUserTeams called');
  const { data: { user } } = await supabase.auth.getUser();
  console.log('Current user:', user);
  if (!user) throw new Error('User not authenticated');

  try {
    // まずteamsテーブルから全てのチームを取得（一時的に簡素化）
    console.log('Querying teams table...');
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*');

    console.log('Teams query result:', { data: teams, error: teamsError });
    
    if (teamsError) {
      console.error('Teams query error:', teamsError);
      throw teamsError;
    }

    // 空の結果を返す（まずは基本機能の確認）
    return {
      owned_teams: teams?.filter(team => team.created_by === user.id) || [],
      member_teams: [],
      guest_teams: []
    };
  } catch (error) {
    console.error('Error in getUserTeams:', error);
    throw error;
  }
}

// チーム詳細取得（メンバー情報含む）
export async function getTeamDetails(teamId: string): Promise<TeamWithMembers> {
  console.log('getTeamDetails called with teamId:', teamId);
  
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .single();

  console.log('Team query result:', { team, error: teamError });
  if (teamError) throw teamError;

  // まず基本的なメンバー情報のみ取得
  const { data: members, error: membersError } = await supabase
    .from('team_members')
    .select('team_id, user_id, role, joined_at, invited_by')
    .eq('team_id', teamId);

  console.log('Members query result:', { members, error: membersError });
  if (membersError) throw membersError;

  // 現在のユーザー情報を取得してオーナー判定用に追加
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  console.log('Current user for owner check:', currentUser?.id);

  // メンバーにユーザー情報を追加（プロフィール情報も含む）
  const membersWithUser = [];
  if (members) {
    for (const member of members) {
      const isCurrentUser = member.user_id === currentUser?.id;
      
      // プロフィール情報を取得
      let profileData = null;
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', member.user_id)
          .single();
        profileData = profile;
      } catch (error) {
        console.log(`Profile not found for user ${member.user_id}`);
      }

      membersWithUser.push({
        ...member,
        user: {
          id: member.user_id,
          email: isCurrentUser && currentUser?.email 
            ? currentUser.email 
            : profileData?.display_name || `メンバー-${member.user_id.slice(0, 8)}`,
          user_metadata: {
            avatar_url: profileData?.avatar_url,
            full_name: profileData?.display_name
          }
        }
      });
    }
  }

  console.log('Final members with user info:', membersWithUser);

  // チーム作成者（オーナー）の権限情報を追加
  const isOwner = team.created_by === currentUser?.id;
  const userRole = membersWithUser.find(member => member.user_id === currentUser?.id)?.role || null;

  console.log('User permissions:', { isOwner, userRole, teamCreatedBy: team.created_by, currentUserId: currentUser?.id });

  return {
    ...team,
    members: membersWithUser,
    member_count: membersWithUser.length,
    current_user_is_owner: isOwner,
    current_user_role: userRole
  };
}

// チーム更新
export async function updateTeam(teamId: string, data: UpdateTeamData): Promise<Team> {
  const { data: team, error } = await supabase
    .from('teams')
    .update(data)
    .eq('id', teamId)
    .select()
    .single();

  if (error) throw error;
  return team;
}

// チーム削除
export async function deleteTeam(teamId: string): Promise<void> {
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', teamId);

  if (error) throw error;
}

// メンバー招待
export async function inviteMember(teamId: string, data: InviteMemberData): Promise<TeamInvitation> {
  console.log('inviteMember called with:', { teamId, data });
  
  // 現在のユーザーを取得
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // トークン生成
  const { data: tokenData, error: tokenError } = await supabase.rpc('generate_invitation_token');
  console.log('Token generation result:', { tokenData, error: tokenError });
  if (tokenError) throw tokenError;

  const token = tokenData as string;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7日間有効

  const insertData = {
    team_id: teamId,
    email: data.email,
    role: data.role,
    token,
    expires_at: expiresAt.toISOString(),
    created_by: user.id
  };

  console.log('Inserting invitation data:', insertData);

  const { data: invitation, error } = await supabase
    .from('team_invitations')
    .insert([insertData])
    .select()
    .single();

  console.log('Invitation creation result:', { invitation, error });
  if (error) throw error;

  // メール送信（今回は招待リンクのログ出力のみ）
  const invitationLink = generateInvitationLink(invitation.token);
  console.log(`📧 招待メール送信: ${data.email}`);
  console.log(`🔗 招待リンク: ${invitationLink}`);
  console.log(`👤 権限: ${data.role}`);
  console.log(`⏰ 有効期限: ${invitation.expires_at}`);
  
  // 実際のメール送信は別途実装が必要（SendGrid、Resend等）
  // await sendInvitationEmail({
  //   to: data.email,
  //   invitationLink,
  //   teamName: team.name,
  //   role: data.role,
  //   expiresAt: invitation.expires_at
  // });

  return invitation;
}

// 招待一覧取得
export async function getTeamInvitations(teamId: string): Promise<TeamInvitation[]> {
  const { data: invitations, error } = await supabase
    .from('team_invitations')
    .select('*')
    .eq('team_id', teamId)
    .gt('expires_at', new Date().toISOString());

  if (error) throw error;
  return invitations || [];
}

// 招待削除
export async function deleteInvitation(invitationId: string): Promise<void> {
  const { error } = await supabase
    .from('team_invitations')
    .delete()
    .eq('id', invitationId);

  if (error) throw error;
}

// 招待受諾
export async function acceptInvitation(token: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('accept_team_invitation', {
    invitation_token: token
  });

  if (error) throw error;
  return data as boolean;
}

// メンバー権限変更
export async function updateMemberRole(teamId: string, userId: string, role: TeamMember['role']): Promise<void> {
  const { error } = await supabase
    .from('team_members')
    .update({ role })
    .eq('team_id', teamId)
    .eq('user_id', userId);

  if (error) throw error;
}

// メンバー削除
export async function removeMember(teamId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', userId);

  if (error) throw error;
}

// チーム招待リンク生成
export function generateInvitationLink(token: string): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return `${baseUrl}/invite/${token}`;
}

// ユーザーがチームの特定の権限を持っているかチェック
export async function checkTeamPermission(teamId: string, requiredRoles: TeamMember['role'][]): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: membership, error } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', user.id)
    .single();

  if (error || !membership) return false;

  return requiredRoles.includes(membership.role);
}

// 権限レベルのヘルパー関数
export const ROLE_HIERARCHY = {
  'owner': 4,
  'admin': 3,
  'member': 2,
  'guest': 1
} as const;

export const PERMISSIONS = {
  // チーム管理
  EDIT_TEAM: ['owner'] as TeamMember['role'][],
  DELETE_TEAM: ['owner'] as TeamMember['role'][],
  
  // メンバー管理  
  INVITE_MEMBERS: ['owner', 'admin'] as TeamMember['role'][],
  REMOVE_MEMBERS: ['owner', 'admin'] as TeamMember['role'][],
  CHANGE_MEMBER_ROLES: ['owner'] as TeamMember['role'][],
  
  // コンテンツ
  CREATE_TASKS: ['owner', 'admin', 'member'] as TeamMember['role'][],
  EDIT_TASKS: ['owner', 'admin', 'member'] as TeamMember['role'][],
  DELETE_TASKS: ['owner', 'admin', 'member'] as TeamMember['role'][],
  
  // 閲覧
  VIEW_TEAM: ['owner', 'admin', 'member', 'guest'] as TeamMember['role'][],
  VIEW_TASKS: ['owner', 'admin', 'member', 'guest'] as TeamMember['role'][]
};

// 特定の操作の権限チェック
export async function hasPermission(teamId: string, action: keyof typeof PERMISSIONS): Promise<boolean> {
  const allowedRoles = PERMISSIONS[action];
  return await checkTeamPermission(teamId, allowedRoles);
}

// 階層的権限チェック（より高い権限があるかどうか）
export function hasHigherRole(userRole: TeamMember['role'], targetRole: TeamMember['role']): boolean {
  return ROLE_HIERARCHY[userRole] > ROLE_HIERARCHY[targetRole];
} 
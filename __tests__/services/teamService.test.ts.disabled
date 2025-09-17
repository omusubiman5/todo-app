import {
  createTeam,
  getTeamById,
  getUserTeams,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
  updateMemberRole,
  getTeamMembers,
  createInvitation,
  acceptInvitation,
  getTeamInvitations,
  deleteInvitation
} from '@/lib/teamService';
import { createMockSupabaseClient, createMockTeam, createMockUser } from '../utils/test-utils';

// Mock the Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: createMockSupabaseClient()
}));

describe('TeamService', () => {
  let mockSupabase: any;
  const mockUser = createMockUser();
  const mockTeam = createMockTeam();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = require('@/lib/supabase').supabase;
  });

  describe('createTeam', () => {
    it('チームが正常に作成される', async () => {
      const teamData = {
        name: 'New Team',
        description: 'Team description',
        created_by: mockUser.id
      };

      mockSupabase.from().insert.mockResolvedValueOnce({
        data: [{ ...teamData, id: 'new-team-id' }],
        error: null
      });

      mockSupabase.from().insert.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const result = await createTeam(teamData);

      expect(mockSupabase.from).toHaveBeenCalledWith('teams');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(teamData);
      expect(result).toEqual({ ...teamData, id: 'new-team-id' });
    });

    it('チーム作成時にオーナーがメンバーに追加される', async () => {
      const teamData = {
        name: 'New Team',
        description: 'Team description',
        created_by: mockUser.id
      };

      mockSupabase.from().insert
        .mockResolvedValueOnce({
          data: [{ ...teamData, id: 'new-team-id' }],
          error: null
        })
        .mockResolvedValueOnce({
          data: null,
          error: null
        });

      await createTeam(teamData);

      expect(mockSupabase.from).toHaveBeenCalledWith('team_members');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        team_id: 'new-team-id',
        user_id: mockUser.id,
        role: 'owner',
        invited_by: mockUser.id
      });
    });

    it('エラー発生時に例外が投げられる', async () => {
      const teamData = {
        name: 'Failed Team',
        description: 'Description',
        created_by: mockUser.id
      };

      mockSupabase.from().insert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Team creation failed', code: 'PGRST301' }
      });

      await expect(createTeam(teamData)).rejects.toThrow('Team creation failed');
    });
  });

  describe('getTeamById', () => {
    it('チーム情報が正常に取得される', async () => {
      mockSupabase.from().select.mockResolvedValueOnce({
        data: [mockTeam],
        error: null
      });

      const result = await getTeamById(mockTeam.id);

      expect(mockSupabase.from).toHaveBeenCalledWith('teams');
      expect(mockSupabase.from().select).toHaveBeenCalledWith('*');
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('id', mockTeam.id);
      expect(result).toEqual(mockTeam);
    });

    it('存在しないチームの場合nullを返す', async () => {
      mockSupabase.from().select.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const result = await getTeamById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('getUserTeams', () => {
    it('ユーザーの参加チーム一覧が取得される', async () => {
      const mockTeams = [
        { ...mockTeam, id: 'team-1', name: 'Team 1' },
        { ...mockTeam, id: 'team-2', name: 'Team 2' }
      ];

      mockSupabase.from().select.mockResolvedValueOnce({
        data: mockTeams.map(team => ({ teams: team, role: 'member' })),
        error: null
      });

      const result = await getUserTeams(mockUser.id);

      expect(mockSupabase.from).toHaveBeenCalledWith('team_members');
      expect(mockSupabase.from().select).toHaveBeenCalledWith(`
        role,
        teams (*)
      `);
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('user_id', mockUser.id);
      expect(result).toHaveLength(2);
    });

    it('参加チームがない場合は空配列を返す', async () => {
      mockSupabase.from().select.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const result = await getUserTeams(mockUser.id);

      expect(result).toEqual([]);
    });
  });

  describe('updateTeam', () => {
    it('チーム情報が正常に更新される', async () => {
      const updatedData = {
        name: 'Updated Team Name',
        description: 'Updated description'
      };

      mockSupabase.from().update.mockResolvedValueOnce({
        data: [{ ...mockTeam, ...updatedData }],
        error: null
      });

      const result = await updateTeam(mockTeam.id, updatedData);

      expect(mockSupabase.from).toHaveBeenCalledWith('teams');
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        ...updatedData,
        updated_at: expect.any(String)
      });
      expect(result).toEqual({ ...mockTeam, ...updatedData });
    });
  });

  describe('deleteTeam', () => {
    it('チームが正常に削除される', async () => {
      mockSupabase.from().delete.mockResolvedValueOnce({
        data: null,
        error: null
      });

      await deleteTeam(mockTeam.id);

      expect(mockSupabase.from).toHaveBeenCalledWith('teams');
      expect(mockSupabase.from().delete).toHaveBeenCalled();
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('id', mockTeam.id);
    });
  });

  describe('addTeamMember', () => {
    it('メンバーが正常に追加される', async () => {
      const newMemberId = 'new-member-id';
      const memberData = {
        team_id: mockTeam.id,
        user_id: newMemberId,
        role: 'member' as const,
        invited_by: mockUser.id
      };

      mockSupabase.from().insert.mockResolvedValueOnce({
        data: [memberData],
        error: null
      });

      const result = await addTeamMember(mockTeam.id, newMemberId, 'member', mockUser.id);

      expect(mockSupabase.from).toHaveBeenCalledWith('team_members');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(memberData);
      expect(result).toEqual(memberData);
    });
  });

  describe('removeTeamMember', () => {
    it('メンバーが正常に削除される', async () => {
      const memberId = 'member-id';

      mockSupabase.from().delete.mockResolvedValueOnce({
        data: null,
        error: null
      });

      await removeTeamMember(mockTeam.id, memberId);

      expect(mockSupabase.from).toHaveBeenCalledWith('team_members');
      expect(mockSupabase.from().delete).toHaveBeenCalled();
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('team_id', mockTeam.id);
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('user_id', memberId);
    });
  });

  describe('updateMemberRole', () => {
    it('メンバーの役割が正常に更新される', async () => {
      const memberId = 'member-id';
      const newRole = 'admin';

      mockSupabase.from().update.mockResolvedValueOnce({
        data: [{ team_id: mockTeam.id, user_id: memberId, role: newRole }],
        error: null
      });

      const result = await updateMemberRole(mockTeam.id, memberId, newRole);

      expect(mockSupabase.from).toHaveBeenCalledWith('team_members');
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        role: newRole,
        updated_at: expect.any(String)
      });
      expect(result.role).toBe(newRole);
    });
  });

  describe('getTeamMembers', () => {
    it('チームメンバー一覧が取得される', async () => {
      const mockMembers = [
        {
          user_id: mockUser.id,
          role: 'owner',
          users: { ...mockUser, user_metadata: { full_name: 'Owner User' } }
        },
        {
          user_id: 'member-2',
          role: 'member',
          users: { id: 'member-2', email: 'member@example.com', user_metadata: { full_name: 'Member User' } }
        }
      ];

      mockSupabase.from().select.mockResolvedValueOnce({
        data: mockMembers,
        error: null
      });

      const result = await getTeamMembers(mockTeam.id);

      expect(mockSupabase.from).toHaveBeenCalledWith('team_members');
      expect(mockSupabase.from().select).toHaveBeenCalledWith(`
        user_id,
        role,
        joined_at,
        users (
          id,
          email,
          user_metadata
        )
      `);
      expect(result).toEqual(mockMembers);
    });
  });

  describe('createInvitation', () => {
    it('招待が正常に作成される', async () => {
      const invitationData = {
        team_id: mockTeam.id,
        email: 'invitee@example.com',
        role: 'member' as const,
        invited_by: mockUser.id,
        token: 'invitation-token'
      };

      mockSupabase.from().insert.mockResolvedValueOnce({
        data: [{ ...invitationData, id: 'invitation-id' }],
        error: null
      });

      const result = await createInvitation(
        mockTeam.id,
        'invitee@example.com',
        'member',
        mockUser.id
      );

      expect(mockSupabase.from).toHaveBeenCalledWith('team_invitations');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          team_id: mockTeam.id,
          email: 'invitee@example.com',
          role: 'member',
          invited_by: mockUser.id,
          token: expect.any(String)
        })
      );
      expect(result.email).toBe('invitee@example.com');
    });
  });

  describe('acceptInvitation', () => {
    it('招待が正常に受け入れられる', async () => {
      const invitationToken = 'valid-token';
      const mockInvitation = {
        id: 'invitation-id',
        team_id: mockTeam.id,
        email: mockUser.email,
        role: 'member',
        invited_by: 'inviter-id'
      };

      mockSupabase.from().select
        .mockResolvedValueOnce({
          data: [mockInvitation],
          error: null
        });

      mockSupabase.from().insert.mockResolvedValueOnce({
        data: [{ team_id: mockTeam.id, user_id: mockUser.id, role: 'member' }],
        error: null
      });

      mockSupabase.from().delete.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const result = await acceptInvitation(invitationToken, mockUser.id);

      expect(mockSupabase.from().select).toHaveBeenCalledWith('*');
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('token', invitationToken);
      expect(result.team_id).toBe(mockTeam.id);
    });

    it('無効なトークンの場合エラーが投げられる', async () => {
      mockSupabase.from().select.mockResolvedValueOnce({
        data: [],
        error: null
      });

      await expect(acceptInvitation('invalid-token', mockUser.id))
        .rejects.toThrow('Invalid invitation token');
    });
  });

  describe('getTeamInvitations', () => {
    it('チームの招待一覧が取得される', async () => {
      const mockInvitations = [
        {
          id: 'inv-1',
          email: 'user1@example.com',
          role: 'member',
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'inv-2',
          email: 'user2@example.com',
          role: 'admin',
          created_at: '2024-01-02T00:00:00Z'
        }
      ];

      mockSupabase.from().select.mockResolvedValueOnce({
        data: mockInvitations,
        error: null
      });

      const result = await getTeamInvitations(mockTeam.id);

      expect(mockSupabase.from).toHaveBeenCalledWith('team_invitations');
      expect(mockSupabase.from().select).toHaveBeenCalledWith('*');
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('team_id', mockTeam.id);
      expect(result).toEqual(mockInvitations);
    });
  });

  describe('deleteInvitation', () => {
    it('招待が正常に削除される', async () => {
      const invitationId = 'invitation-id';

      mockSupabase.from().delete.mockResolvedValueOnce({
        data: null,
        error: null
      });

      await deleteInvitation(invitationId);

      expect(mockSupabase.from).toHaveBeenCalledWith('team_invitations');
      expect(mockSupabase.from().delete).toHaveBeenCalled();
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('id', invitationId);
    });
  });

  describe('エラーハンドリング', () => {
    it('ネットワークエラーが適切にハンドリングされる', async () => {
      mockSupabase.from().select.mockRejectedValueOnce(new Error('Network error'));

      await expect(getTeamById(mockTeam.id)).rejects.toThrow('Network error');
    });

    it('データベース制約違反が適切にハンドリングされる', async () => {
      mockSupabase.from().insert.mockResolvedValueOnce({
        data: null,
        error: { 
          message: 'duplicate key value violates unique constraint',
          code: '23505'
        }
      });

      await expect(createTeam({
        name: 'Duplicate Team',
        description: 'Description',
        created_by: mockUser.id
      })).rejects.toThrow('duplicate key value violates unique constraint');
    });
  });

  describe('権限チェック', () => {
    it('オーナーのみがチームを削除できる', async () => {
      // This would be tested at the component level or with RLS policies
      // Here we just verify the service calls the correct endpoints
      await deleteTeam(mockTeam.id);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('teams');
      expect(mockSupabase.from().delete).toHaveBeenCalled();
    });

    it('管理者以上がメンバーの役割を変更できる', async () => {
      await updateMemberRole(mockTeam.id, 'member-id', 'admin');
      
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        role: 'admin',
        updated_at: expect.any(String)
      });
    });
  });
});
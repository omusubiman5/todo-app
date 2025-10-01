import type { 
  Task, 
  SharedTask, 
  Team, 
  TeamMember, 
  WorkspaceContext,
  Priority,
  TaskStatus
} from '../lib/types';

describe('Type Definitions', () => {
  describe('Priority Type', () => {
    it('should accept valid priority values', () => {
      const validPriorities: Priority[] = ['高', '中', '低'];
      
      validPriorities.forEach(priority => {
        expect(['高', '中', '低']).toContain(priority);
      });
    });
  });

  describe('TaskStatus Type', () => {
    it('should accept valid status values', () => {
      const validStatuses: TaskStatus[] = ['pending', 'in_progress', 'completed'];
      
      validStatuses.forEach(status => {
        expect(['pending', 'in_progress', 'completed']).toContain(status);
      });
    });
  });

  describe('Task Type', () => {
    it('should have all required properties', () => {
      const mockTask: Task = {
        id: 'task-123',
        title: 'テストタスク',
        description: 'タスクの説明',
        completed: false,
        priority: '中',
        due_date: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        user_id: 'user-123'
      };

      expect(mockTask).toHaveProperty('id');
      expect(mockTask).toHaveProperty('title');
      expect(mockTask).toHaveProperty('completed');
      expect(mockTask).toHaveProperty('priority');
      expect(mockTask).toHaveProperty('created_at');
      expect(mockTask).toHaveProperty('user_id');
    });

    it('should allow optional properties to be null', () => {
      const taskWithNulls: Task = {
        id: 'task-123',
        title: 'テストタスク',
        description: null,
        completed: false,
        priority: '中',
        due_date: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        user_id: 'user-123'
      };

      expect(taskWithNulls.description).toBeNull();
      expect(taskWithNulls.due_date).toBeNull();
    });
  });

  describe('SharedTask Type', () => {
    it('should extend Task with team-specific properties', () => {
      const sharedTask: SharedTask = {
        id: 'shared-task-123',
        title: 'チームタスク',
        description: 'チーム用タスクの説明',
        status: 'pending',
        priority: '高',
        due_date: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        user_id: 'user-123',
        team_id: 'team-123',
        assigned_to: 'user-456',
        assigned_user: null
      };

      // Should have base Task properties
      expect(sharedTask).toHaveProperty('id');
      expect(sharedTask).toHaveProperty('title');
      expect(sharedTask).toHaveProperty('user_id');
      
      // Should have SharedTask-specific properties
      expect(sharedTask).toHaveProperty('status');
      expect(sharedTask).toHaveProperty('team_id');
      expect(sharedTask).toHaveProperty('assigned_to');
      expect(sharedTask).toHaveProperty('assigned_user');
    });

    it('should allow personal tasks (null team_id)', () => {
      const personalTask: SharedTask = {
        id: 'personal-task-123',
        title: '個人タスク',
        description: '個人用タスク',
        status: 'pending',
        priority: '中',
        due_date: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        user_id: 'user-123',
        team_id: null,
        assigned_to: null,
        assigned_user: null
      };

      expect(personalTask.team_id).toBeNull();
      expect(personalTask.assigned_to).toBeNull();
    });
  });

  describe('Team Type', () => {
    it('should have all required properties', () => {
      const team: Team = {
        id: 'team-123',
        name: 'テストチーム',
        description: 'テストチームの説明',
        created_by: 'user-123',
        avatar_url: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      expect(team).toHaveProperty('id');
      expect(team).toHaveProperty('name');
      expect(team).toHaveProperty('created_by');
      expect(team).toHaveProperty('created_at');
    });
  });

  describe('TeamMember Type', () => {
    it('should have valid role values', () => {
      const roles: TeamMember['role'][] = ['owner', 'admin', 'member', 'guest'];
      
      roles.forEach(role => {
        const member: TeamMember = {
          team_id: 'team-123',
          user_id: 'user-123',
          role: role,
          joined_at: '2024-01-01T00:00:00Z',
          invited_by: null,
          user: null
        };

        expect(['owner', 'admin', 'member', 'guest']).toContain(member.role);
      });
    });
  });

  describe('WorkspaceContext Type', () => {
    it('should handle personal workspace', () => {
      const personalWorkspace: WorkspaceContext = {
        type: 'personal',
        team_id: null,
        team_name: '個人タスク'
      };

      expect(personalWorkspace.type).toBe('personal');
      expect(personalWorkspace.team_id).toBeNull();
    });

    it('should handle team workspace', () => {
      const teamWorkspace: WorkspaceContext = {
        type: 'team',
        team_id: 'team-123',
        team_name: 'チーム名'
      };

      expect(teamWorkspace.type).toBe('team');
      expect(teamWorkspace.team_id).toBe('team-123');
      expect(teamWorkspace.team_name).toBe('チーム名');
    });
  });
});
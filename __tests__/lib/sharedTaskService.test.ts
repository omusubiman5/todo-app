import { SharedTaskService } from '@/lib/sharedTaskService';
import { WorkspaceContext } from '@/lib/types';

// Mock Supabase
const mockSupabaseQuery: any = {
  eq: jest.fn(() => mockSupabaseQuery),
  is: jest.fn(() => mockSupabaseQuery),
  order: jest.fn(() => mockSupabaseQuery),
  range: jest.fn(() => Promise.resolve({
    data: [],
    count: 0,
    error: null
  })),
  select: jest.fn(() => mockSupabaseQuery),
  single: jest.fn(() => Promise.resolve({
    data: { id: 'test-task-id', text: 'Test Task', completed: false, priority: '中' },
    error: null
  })),
  insert: jest.fn(() => mockSupabaseQuery),
  update: jest.fn(() => mockSupabaseQuery),
  delete: jest.fn(() => mockSupabaseQuery)
};

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => mockSupabaseQuery),
    auth: {
      getUser: jest.fn(() => Promise.resolve({
        data: { user: { id: 'user-123' } },
        error: null
      }))
    },
    channel: jest.fn(() => ({
      on: jest.fn(() => ({})),
      subscribe: jest.fn()
    }))
  }
}));


describe('SharedTaskService', () => {
  const personalWorkspace: WorkspaceContext = {
    type: 'personal',
    team_id: null
  };

  const teamWorkspace: WorkspaceContext = {
    type: 'team',
    team_id: 'team-123'
  };

  const testUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock implementations
    mockSupabaseQuery.eq.mockReturnValue(mockSupabaseQuery);
    mockSupabaseQuery.is.mockReturnValue(mockSupabaseQuery);
    mockSupabaseQuery.order.mockReturnValue(mockSupabaseQuery);
    mockSupabaseQuery.select.mockReturnValue(mockSupabaseQuery);
    mockSupabaseQuery.insert.mockReturnValue(mockSupabaseQuery);
    mockSupabaseQuery.update.mockReturnValue(mockSupabaseQuery);
    mockSupabaseQuery.range.mockResolvedValue({
      data: [],
      count: 0,
      error: null
    });
    mockSupabaseQuery.single.mockResolvedValue({
      data: { id: 'test-task-id', text: 'Test Task', completed: false, priority: '中' },
      error: null
    });
    mockSupabaseQuery.delete.mockReturnValue(mockSupabaseQuery);
  });

  describe('getTasks', () => {
    it('個人ワークスペース用フィルターが正しく適用される', async () => {
      const { supabase } = require('@/lib/supabase');
      const result = await SharedTaskService.getTasks(personalWorkspace, testUserId);

      // Supabaseクエリの実行を確認
      expect(supabase.from).toHaveBeenCalledWith('tasks');
      expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('user_id', testUserId);
      expect(mockSupabaseQuery.is).toHaveBeenCalledWith('team_id', null);
      expect(Array.isArray(result)).toBe(true);
    });

    it('チームワークスペース用フィルターが正しく適用される', async () => {
      const { supabase } = require('@/lib/supabase');
      const result = await SharedTaskService.getTasks(teamWorkspace, testUserId);

      // Supabaseクエリの実行を確認
      expect(supabase.from).toHaveBeenCalledWith('tasks');
      expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('team_id', 'team-123');
      expect(Array.isArray(result)).toBe(true);
    });

    it('ページネーションオプションが指定された場合の処理', async () => {
      const { supabase } = require('@/lib/supabase');
      const options = { page: 2, limit: 10 };
      const result = await SharedTaskService.getTasks(personalWorkspace, testUserId, options);

      // ページネーション処理の確認
      expect(supabase.from).toHaveBeenCalledWith('tasks');
      expect(mockSupabaseQuery.range).toHaveBeenCalledWith(10, 19); // page 2, limit 10 = range(10, 19)

      // 結果がPaginatedTasksResult形式であることを確認
      expect(result).toHaveProperty('tasks');
      expect(result).toHaveProperty('hasMore');
      expect(result).toHaveProperty('totalCount');
    });
  });

  describe('createTask', () => {
    it('基本的なタスク作成', async () => {
      const taskData = {
        text: 'New Test Task',
        user_id: testUserId,
        team_id: null,
        completed: false,
        priority: '中' as const
      };

      const result = await SharedTaskService.createTask(taskData, personalWorkspace);

      const { supabase } = require('@/lib/supabase');
      expect(supabase.from).toHaveBeenCalledWith('tasks');
      expect(mockSupabaseQuery.insert).toHaveBeenCalledWith({
        text: 'New Test Task',
        completed: false,
        priority: '中',
        user_id: testUserId,
        team_id: null,
        assigned_to: null,
        created_by: testUserId
      });
      expect(result).toHaveProperty('id');
      expect(result.text).toBe('Test Task');
    });

    it('チームタスク作成', async () => {
      const taskData = {
        text: 'Team Task',
        user_id: testUserId,
        team_id: 'team-123',
        completed: false,
        priority: '高' as const
      };

      const result = await SharedTaskService.createTask(taskData, teamWorkspace);

      const { supabase } = require('@/lib/supabase');
      expect(supabase.from).toHaveBeenCalledWith('tasks');
      expect(mockSupabaseQuery.insert).toHaveBeenCalledWith({
        text: 'Team Task',
        completed: false,
        priority: '高',
        user_id: testUserId,
        team_id: 'team-123',
        assigned_to: null,
        created_by: testUserId
      });
      expect(result).toHaveProperty('id');
    });
  });

  describe('updateTask', () => {
    it('タスク更新', async () => {
      const updates = {
        text: 'Updated Task',
        completed: true,
        priority: '低' as const
      };

      const result = await SharedTaskService.updateTask('task-123', updates);

      const { supabase } = require('@/lib/supabase');
      expect(supabase.from).toHaveBeenCalledWith('tasks');
      expect(mockSupabaseQuery.update).toHaveBeenCalledWith(updates);
      expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('id', 'task-123');
      expect(result).toHaveProperty('id');
    });
  });

  describe('deleteTask', () => {
    it('タスク削除', async () => {
      // Reset the mock to handle multiple single() calls
      mockSupabaseQuery.single.mockReset();

      // First single() call - task lookup for permission check
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: {
          id: 'task-123',
          text: 'Test Task',
          user_id: testUserId,
          created_by: testUserId,
          team_id: null,
          assigned_to: null
        },
        error: null
      });

      // Second single() call - existence check before deletion
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: {
          id: 'task-123',
          text: 'Test Task'
        },
        error: null
      });

      // Mock the delete chain: delete().eq().select()
      const deleteMockChain = {
        eq: jest.fn(() => ({
          select: jest.fn(() => Promise.resolve({
            data: [{ id: 'task-123' }],
            error: null
          }))
        }))
      };
      mockSupabaseQuery.delete.mockReturnValueOnce(deleteMockChain);

      await SharedTaskService.deleteTask('task-123');

      const { supabase } = require('@/lib/supabase');
      expect(supabase.from).toHaveBeenCalledWith('tasks');
      expect(mockSupabaseQuery.delete).toHaveBeenCalled();
      expect(deleteMockChain.eq).toHaveBeenCalledWith('id', 'task-123');
    });
  });
});
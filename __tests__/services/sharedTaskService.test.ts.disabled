import { 
  createTask, 
  fetchTasks, 
  updateTask, 
  deleteTask, 
  toggleTaskCompletion,
  getTaskStatistics,
  assignTask
} from '@/lib/sharedTaskService';
import { createMockSupabaseClient, createMockTask, createMockUser } from '../utils/test-utils';

// Mock the Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: createMockSupabaseClient()
}));

describe('SharedTaskService', () => {
  let mockSupabase: any;
  const mockUser = createMockUser();
  const mockTask = createMockTask();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = require('@/lib/supabase').supabase;
  });

  describe('createTask', () => {
    it('個人タスクが正常に作成される', async () => {
      const taskData = {
        text: 'New Personal Task',
        priority: '中' as const,
        user_id: mockUser.id
      };

      mockSupabase.from().insert.mockResolvedValueOnce({
        data: { ...taskData, id: 'new-task-id' },
        error: null
      });

      const result = await createTask(taskData, null);

      expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        text: taskData.text,
        priority: taskData.priority,
        user_id: taskData.user_id,
        team_id: null,
        completed: false,
        created_by: taskData.user_id
      });
      expect(result).toEqual({ ...taskData, id: 'new-task-id' });
    });

    it('チームタスクが正常に作成される', async () => {
      const taskData = {
        text: 'New Team Task',
        priority: '高' as const,
        user_id: mockUser.id
      };
      const teamId = 'team-123';

      mockSupabase.from().insert.mockResolvedValueOnce({
        data: { ...taskData, id: 'new-team-task-id', team_id: teamId },
        error: null
      });

      const result = await createTask(taskData, teamId);

      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        text: taskData.text,
        priority: taskData.priority,
        user_id: taskData.user_id,
        team_id: teamId,
        completed: false,
        created_by: taskData.user_id
      });
      expect(result.team_id).toBe(teamId);
    });

    it('エラー発生時に例外が投げられる', async () => {
      const taskData = {
        text: 'Failed Task',
        priority: '中' as const,
        user_id: mockUser.id
      };

      mockSupabase.from().insert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error', code: 'PGRST301' }
      });

      await expect(createTask(taskData, null)).rejects.toThrow('Database error');
    });
  });

  describe('fetchTasks', () => {
    it('個人タスクが正常に取得される', async () => {
      const mockTasks = [
        createMockTask({ id: '1', text: 'Task 1' }),
        createMockTask({ id: '2', text: 'Task 2' })
      ];

      mockSupabase.from().select.mockResolvedValueOnce({
        data: mockTasks,
        error: null
      });

      const result = await fetchTasks(mockUser.id, null);

      expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
      expect(mockSupabase.from().select).toHaveBeenCalledWith(`
        *,
        assignee:assigned_to(id, email, user_metadata)
      `);
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('user_id', mockUser.id);
      expect(mockSupabase.from().is).toHaveBeenCalledWith('team_id', null);
      expect(result).toEqual(mockTasks);
    });

    it('チームタスクが正常に取得される', async () => {
      const teamId = 'team-123';
      const mockTeamTasks = [
        createMockTask({ id: '1', text: 'Team Task 1', team_id: teamId }),
        createMockTask({ id: '2', text: 'Team Task 2', team_id: teamId })
      ];

      mockSupabase.from().select.mockResolvedValueOnce({
        data: mockTeamTasks,
        error: null
      });

      const result = await fetchTasks(mockUser.id, teamId);

      expect(mockSupabase.from().eq).toHaveBeenCalledWith('team_id', teamId);
      expect(result).toEqual(mockTeamTasks);
    });

    it('エラー発生時に空配列を返す', async () => {
      mockSupabase.from().select.mockResolvedValueOnce({
        data: null,
        error: { message: 'Fetch error' }
      });

      const result = await fetchTasks(mockUser.id, null);

      expect(result).toEqual([]);
    });
  });

  describe('updateTask', () => {
    it('タスクが正常に更新される', async () => {
      const updatedData = {
        text: 'Updated Task',
        priority: '高' as const
      };

      mockSupabase.from().update.mockResolvedValueOnce({
        data: { ...mockTask, ...updatedData },
        error: null
      });

      const result = await updateTask(mockTask.id, updatedData);

      expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        ...updatedData,
        updated_at: expect.any(String)
      });
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('id', mockTask.id);
      expect(result).toEqual({ ...mockTask, ...updatedData });
    });

    it('更新時にupdated_atが設定される', async () => {
      const updatedData = { text: 'Updated Task' };

      mockSupabase.from().update.mockResolvedValueOnce({
        data: { ...mockTask, ...updatedData },
        error: null
      });

      await updateTask(mockTask.id, updatedData);

      const updateCall = mockSupabase.from().update.mock.calls[0][0];
      expect(updateCall.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('エラー発生時に例外が投げられる', async () => {
      mockSupabase.from().update.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' }
      });

      await expect(updateTask(mockTask.id, { text: 'Failed' })).rejects.toThrow('Update failed');
    });
  });

  describe('deleteTask', () => {
    it('タスクが正常に削除される', async () => {
      mockSupabase.from().delete.mockResolvedValueOnce({
        data: null,
        error: null
      });

      await deleteTask(mockTask.id);

      expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
      expect(mockSupabase.from().delete).toHaveBeenCalled();
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('id', mockTask.id);
    });

    it('エラー発生時に例外が投げられる', async () => {
      mockSupabase.from().delete.mockResolvedValueOnce({
        data: null,
        error: { message: 'Delete failed' }
      });

      await expect(deleteTask(mockTask.id)).rejects.toThrow('Delete failed');
    });
  });

  describe('toggleTaskCompletion', () => {
    it('未完了タスクが完了状態になる', async () => {
      const incompleteTask = createMockTask({ completed: false });
      
      mockSupabase.from().update.mockResolvedValueOnce({
        data: { ...incompleteTask, completed: true },
        error: null
      });

      const result = await toggleTaskCompletion(incompleteTask.id, false);

      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        completed: true,
        updated_at: expect.any(String)
      });
      expect(result.completed).toBe(true);
    });

    it('完了タスクが未完了状態になる', async () => {
      const completedTask = createMockTask({ completed: true });
      
      mockSupabase.from().update.mockResolvedValueOnce({
        data: { ...completedTask, completed: false },
        error: null
      });

      const result = await toggleTaskCompletion(completedTask.id, true);

      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        completed: false,
        updated_at: expect.any(String)
      });
      expect(result.completed).toBe(false);
    });
  });

  describe('getTaskStatistics', () => {
    it('統計情報が正常に計算される', async () => {
      const mockTasks = [
        createMockTask({ completed: false, priority: '高' }),
        createMockTask({ completed: true, priority: '中' }),
        createMockTask({ completed: false, priority: '低' }),
        createMockTask({ completed: true, priority: '高' })
      ];

      mockSupabase.from().select.mockResolvedValueOnce({
        data: mockTasks,
        error: null
      });

      const result = await getTaskStatistics(mockUser.id, null);

      expect(result).toEqual({
        total: 4,
        completed: 2,
        pending: 2,
        high: 2,
        medium: 1,
        low: 1,
        completionRate: 50
      });
    });

    it('空のタスクリストで正しい統計が返される', async () => {
      mockSupabase.from().select.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const result = await getTaskStatistics(mockUser.id, null);

      expect(result).toEqual({
        total: 0,
        completed: 0,
        pending: 0,
        high: 0,
        medium: 0,
        low: 0,
        completionRate: 0
      });
    });
  });

  describe('assignTask', () => {
    it('タスクが正常にアサインされる', async () => {
      const assigneeId = 'assignee-123';
      
      mockSupabase.from().update.mockResolvedValueOnce({
        data: { ...mockTask, assigned_to: assigneeId },
        error: null
      });

      const result = await assignTask(mockTask.id, assigneeId);

      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        assigned_to: assigneeId,
        updated_at: expect.any(String)
      });
      expect(result.assigned_to).toBe(assigneeId);
    });

    it('タスクのアサインが解除される', async () => {
      mockSupabase.from().update.mockResolvedValueOnce({
        data: { ...mockTask, assigned_to: null },
        error: null
      });

      const result = await assignTask(mockTask.id, null);

      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        assigned_to: null,
        updated_at: expect.any(String)
      });
      expect(result.assigned_to).toBeNull();
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量のタスクを効率的に処理する', async () => {
      const largeMockTasks = Array.from({ length: 1000 }, (_, i) =>
        createMockTask({ id: `task-${i}`, text: `Task ${i}` })
      );

      mockSupabase.from().select.mockResolvedValueOnce({
        data: largeMockTasks,
        error: null
      });

      const startTime = Date.now();
      const result = await fetchTasks(mockUser.id, null);
      const endTime = Date.now();

      expect(result).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(100); // 100ms以内で処理
    });
  });

  describe('並行処理テスト', () => {
    it('複数のタスク操作が並行して実行される', async () => {
      mockSupabase.from().update.mockResolvedValue({
        data: mockTask,
        error: null
      });

      const promises = [
        updateTask('task-1', { text: 'Updated 1' }),
        updateTask('task-2', { text: 'Updated 2' }),
        updateTask('task-3', { text: 'Updated 3' })
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(mockSupabase.from().update).toHaveBeenCalledTimes(3);
    });
  });
});
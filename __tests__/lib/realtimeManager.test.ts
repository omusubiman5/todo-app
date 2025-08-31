import { RealtimeManager } from '@/lib/realtimeManager';
import { createMockSupabaseClient, createMockTask } from '../utils/test-utils';

// Mock the Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: createMockSupabaseClient()
}));

describe('RealtimeManager', () => {
  let realtimeManager: RealtimeManager;
  let mockSupabase: any;
  let mockChannel: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = require('@/lib/supabase').supabase;
    mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    };
    mockSupabase.channel.mockReturnValue(mockChannel);

    // RealtimeManagerはシングルトンなので、テスト間でリセット
    RealtimeManager['instance'] = undefined as any;
    realtimeManager = RealtimeManager.getInstance();
  });

  afterEach(() => {
    // テスト後にインスタンスをクリーンアップ
    RealtimeManager['instance'] = undefined as any;
  });

  describe('シングルトンパターン', () => {
    it('常に同じインスタンスを返す', () => {
      const instance1 = RealtimeManager.getInstance();
      const instance2 = RealtimeManager.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('タスク購読', () => {
    it('個人タスクの購読が正常に開始される', () => {
      const userId = 'user-123';
      const callback = jest.fn();

      realtimeManager.subscribeToTasks(userId, null, callback);

      expect(mockSupabase.channel).toHaveBeenCalledWith('personal-tasks-user-123');
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`
        }),
        expect.any(Function)
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it('チームタスクの購読が正常に開始される', () => {
      const userId = 'user-123';
      const teamId = 'team-456';
      const callback = jest.fn();

      realtimeManager.subscribeToTasks(userId, teamId, callback);

      expect(mockSupabase.channel).toHaveBeenCalledWith('team-tasks-team-456');
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `team_id=eq.${teamId}`
        }),
        expect.any(Function)
      );
    });

    it('重複購読が防がれる', () => {
      const userId = 'user-123';
      const callback = jest.fn();

      realtimeManager.subscribeToTasks(userId, null, callback);
      realtimeManager.subscribeToTasks(userId, null, callback);

      expect(mockSupabase.channel).toHaveBeenCalledTimes(1);
      expect(mockChannel.subscribe).toHaveBeenCalledTimes(1);
    });

    it('異なるワークスペースの購読は個別に管理される', () => {
      const userId = 'user-123';
      const teamId = 'team-456';
      const callback = jest.fn();

      realtimeManager.subscribeToTasks(userId, null, callback);
      realtimeManager.subscribeToTasks(userId, teamId, callback);

      expect(mockSupabase.channel).toHaveBeenCalledTimes(2);
      expect(mockSupabase.channel).toHaveBeenCalledWith('personal-tasks-user-123');
      expect(mockSupabase.channel).toHaveBeenCalledWith('team-tasks-team-456');
    });
  });

  describe('リアルタイムイベント処理', () => {
    it('INSERT イベントが正しく処理される', () => {
      const userId = 'user-123';
      const callback = jest.fn();
      let eventHandler: any;

      mockChannel.on.mockImplementation((event: any, config: any, handler: any) => {
        eventHandler = handler;
        return mockChannel;
      });

      realtimeManager.subscribeToTasks(userId, null, callback);

      const insertEvent = {
        eventType: 'INSERT',
        new: createMockTask({ id: 'new-task', text: 'New Task' }),
        old: {}
      };

      eventHandler(insertEvent);

      expect(callback).toHaveBeenCalledWith({
        type: 'INSERT',
        record: insertEvent.new
      });
    });

    it('UPDATE イベントが正しく処理される', () => {
      const userId = 'user-123';
      const callback = jest.fn();
      let eventHandler: any;

      mockChannel.on.mockImplementation((event: any, config: any, handler: any) => {
        eventHandler = handler;
        return mockChannel;
      });

      realtimeManager.subscribeToTasks(userId, null, callback);

      const updateEvent = {
        eventType: 'UPDATE',
        new: createMockTask({ id: 'updated-task', text: 'Updated Task' }),
        old: createMockTask({ id: 'updated-task', text: 'Old Task' })
      };

      eventHandler(updateEvent);

      expect(callback).toHaveBeenCalledWith({
        type: 'UPDATE',
        record: updateEvent.new,
        oldRecord: updateEvent.old
      });
    });

    it('DELETE イベントが正しく処理される', () => {
      const userId = 'user-123';
      const callback = jest.fn();
      let eventHandler: any;

      mockChannel.on.mockImplementation((event: any, config: any, handler: any) => {
        eventHandler = handler;
        return mockChannel;
      });

      realtimeManager.subscribeToTasks(userId, null, callback);

      const deleteEvent = {
        eventType: 'DELETE',
        new: {},
        old: createMockTask({ id: 'deleted-task', text: 'Deleted Task' })
      };

      eventHandler(deleteEvent);

      expect(callback).toHaveBeenCalledWith({
        type: 'DELETE',
        record: deleteEvent.old
      });
    });
  });

  describe('スロットリング機能', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('短時間内の複数イベントがスロットリングされる', () => {
      const userId = 'user-123';
      const callback = jest.fn();
      let eventHandler: any;

      mockChannel.on.mockImplementation((event: any, config: any, handler: any) => {
        eventHandler = handler;
        return mockChannel;
      });

      realtimeManager.subscribeToTasks(userId, null, callback);

      // 短時間内に複数のイベントを送信
      const event1 = {
        eventType: 'INSERT',
        new: createMockTask({ id: 'task-1' }),
        old: {}
      };
      const event2 = {
        eventType: 'INSERT',
        new: createMockTask({ id: 'task-2' }),
        old: {}
      };

      eventHandler(event1);
      eventHandler(event2);

      expect(callback).toHaveBeenCalledTimes(1); // スロットリングにより1回のみ

      // タイマーを進める
      jest.advanceTimersByTime(300); // スロットリング時間を超過

      expect(callback).toHaveBeenCalledTimes(2); // 2回目のコールバックが実行
    });

    it('スロットリング時間経過後に正常にイベントが処理される', () => {
      const userId = 'user-123';
      const callback = jest.fn();
      let eventHandler: any;

      mockChannel.on.mockImplementation((event: any, config: any, handler: any) => {
        eventHandler = handler;
        return mockChannel;
      });

      realtimeManager.subscribeToTasks(userId, null, callback);

      const event = {
        eventType: 'INSERT',
        new: createMockTask({ id: 'task-1' }),
        old: {}
      };

      eventHandler(event);
      expect(callback).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(500); // スロットリング時間を超過

      eventHandler(event);
      expect(callback).toHaveBeenCalledTimes(2);
    });
  });

  describe('購読管理', () => {
    it('購読が正常に解除される', () => {
      const userId = 'user-123';
      const callback = jest.fn();

      realtimeManager.subscribeToTasks(userId, null, callback);
      realtimeManager.unsubscribeFromTasks(userId, null);

      expect(mockChannel.unsubscribe).toHaveBeenCalled();
    });

    it('存在しない購読の解除でエラーが発生しない', () => {
      expect(() => {
        realtimeManager.unsubscribeFromTasks('non-existent-user', null);
      }).not.toThrow();
    });

    it('購読の更新が正常に動作する', () => {
      const userId = 'user-123';
      const callback = jest.fn();

      // 個人タスクを購読
      realtimeManager.subscribeToTasks(userId, null, callback);
      expect(mockSupabase.channel).toHaveBeenCalledWith('personal-tasks-user-123');

      // チームタスクに更新
      realtimeManager.updateSubscription(userId, 'team-456', callback);
      
      expect(mockChannel.unsubscribe).toHaveBeenCalledTimes(1); // 古い購読が解除
      expect(mockSupabase.channel).toHaveBeenCalledWith('team-tasks-team-456'); // 新しい購読が開始
    });
  });

  describe('接続状態管理', () => {
    it('接続状態が正しく報告される', () => {
      expect(realtimeManager.isConnected()).toBe(false); // 初期状態

      const userId = 'user-123';
      const callback = jest.fn();

      realtimeManager.subscribeToTasks(userId, null, callback);
      
      // 実際の接続状態はSupabaseのチャンネル状態に依存するため、
      // ここでは基本的な動作確認のみ
      expect(typeof realtimeManager.isConnected()).toBe('boolean');
    });

    it('アクティブな購読数が正しく管理される', () => {
      const userId = 'user-123';
      const callback = jest.fn();

      expect(realtimeManager.getActiveSubscriptions()).toBe(0);

      realtimeManager.subscribeToTasks(userId, null, callback);
      expect(realtimeManager.getActiveSubscriptions()).toBe(1);

      realtimeManager.subscribeToTasks(userId, 'team-456', callback);
      expect(realtimeManager.getActiveSubscriptions()).toBe(2);

      realtimeManager.unsubscribeFromTasks(userId, null);
      expect(realtimeManager.getActiveSubscriptions()).toBe(1);

      realtimeManager.unsubscribeFromTasks(userId, 'team-456');
      expect(realtimeManager.getActiveSubscriptions()).toBe(0);
    });
  });

  describe('エラーハンドリング', () => {
    it('購読エラーが適切にハンドリングされる', () => {
      const userId = 'user-123';
      const callback = jest.fn();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      mockChannel.subscribe.mockImplementation(() => {
        throw new Error('Subscription failed');
      });

      expect(() => {
        realtimeManager.subscribeToTasks(userId, null, callback);
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to subscribe to tasks:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('イベント処理エラーが適切にハンドリングされる', () => {
      const userId = 'user-123';
      const callback = jest.fn(() => {
        throw new Error('Callback failed');
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      let eventHandler: any;

      mockChannel.on.mockImplementation((event: any, config: any, handler: any) => {
        eventHandler = handler;
        return mockChannel;
      });

      realtimeManager.subscribeToTasks(userId, null, callback);

      const event = {
        eventType: 'INSERT',
        new: createMockTask({ id: 'task-1' }),
        old: {}
      };

      eventHandler(event);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error handling realtime event:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('メモリ管理', () => {
    it('全ての購読が正常にクリーンアップされる', () => {
      const userId = 'user-123';
      const callback = jest.fn();

      realtimeManager.subscribeToTasks(userId, null, callback);
      realtimeManager.subscribeToTasks(userId, 'team-456', callback);
      
      expect(realtimeManager.getActiveSubscriptions()).toBe(2);

      realtimeManager.cleanup();

      expect(realtimeManager.getActiveSubscriptions()).toBe(0);
      expect(mockChannel.unsubscribe).toHaveBeenCalledTimes(2);
    });

    it('部分的なクリーンアップが正常に動作する', () => {
      const userId1 = 'user-123';
      const userId2 = 'user-456';
      const callback = jest.fn();

      realtimeManager.subscribeToTasks(userId1, null, callback);
      realtimeManager.subscribeToTasks(userId2, null, callback);

      expect(realtimeManager.getActiveSubscriptions()).toBe(2);

      realtimeManager.unsubscribeFromTasks(userId1, null);

      expect(realtimeManager.getActiveSubscriptions()).toBe(1);
      expect(mockChannel.unsubscribe).toHaveBeenCalledTimes(1);
    });
  });
});
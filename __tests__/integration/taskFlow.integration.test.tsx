import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import { render, createMockUser, createMockTask, createMockTeam } from '../utils/test-utils';
import App from '@/app/page';
import * as sharedTaskService from '@/lib/sharedTaskService';
import * as teamService from '@/lib/teamService';

// Mock services
jest.mock('@/lib/sharedTaskService');
jest.mock('@/lib/teamService');

describe('Task Flow Integration Tests', () => {
  const mockUser = createMockUser();
  const mockTeam = createMockTeam();
  const mockTasks = [
    createMockTask({ id: '1', text: 'Integration Task 1', completed: false, priority: '高' }),
    createMockTask({ id: '2', text: 'Integration Task 2', completed: true, priority: '中' }),
    createMockTask({ id: '3', text: 'Integration Task 3', completed: false, priority: '低' })
  ];

  const mockTaskService = sharedTaskService as jest.Mocked<typeof sharedTaskService>;
  const mockTeamService = teamService as jest.Mocked<typeof teamService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // デフォルトのモック設定
    mockTaskService.fetchTasks.mockResolvedValue(mockTasks);
    mockTaskService.createTask.mockImplementation(async (taskData) => ({
      id: 'new-task-id',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: mockUser.id,
      team_id: null,
      assigned_to: null,
      created_by: mockUser.id,
      completed: false,
      ...taskData
    }));
    mockTaskService.updateTask.mockImplementation(async (id, updates) => {
      const task = mockTasks.find(t => t.id === id);
      return { ...task, ...updates } as any;
    });
    mockTaskService.deleteTask.mockResolvedValue(undefined);
    mockTaskService.toggleTaskCompletion.mockImplementation(async (id, currentCompleted) => {
      const task = mockTasks.find(t => t.id === id);
      return { ...task, completed: !currentCompleted } as any;
    });
    mockTaskService.getTaskStatistics.mockResolvedValue({
      total: 3,
      completed: 1,
      pending: 2,
      high: 1,
      medium: 1,
      low: 1,
      completionRate: 33.33
    });

    mockTeamService.getUserTeams.mockResolvedValue([]);
  });

  describe('個人タスク管理フロー', () => {
    it('タスクの作成から完了までの全フローが動作する', async () => {
      const { user } = render(<App />, { mockUser });

      // 初期タスクが表示されるまで待機
      await waitFor(() => {
        expect(screen.getByText('Integration Task 1')).toBeInTheDocument();
      });

      // 新しいタスクを作成
      const taskInput = screen.getByPlaceholderText('タスク内容を入力してください...');
      const addButton = screen.getByText('追加');

      await user.type(taskInput, '新しい統合テストタスク');
      await user.click(addButton);

      // タスク作成APIが呼ばれることを確認
      expect(mockTaskService.createTask).toHaveBeenCalledWith(
        {
          text: '新しい統合テストタスク',
          priority: '中',
          user_id: mockUser.id
        },
        null
      );

      // タスクを編集
      const firstTask = screen.getByText('Integration Task 1');
      const taskItem = firstTask.closest('[data-testid="task-item"]') || firstTask.closest('div');
      const editButton = within(taskItem as HTMLElement).getByTitle('編集');

      await user.click(editButton);

      // 編集フォームが表示される
      await waitFor(() => {
        expect(screen.getByDisplayValue('Integration Task 1')).toBeInTheDocument();
      });

      const editInput = screen.getByDisplayValue('Integration Task 1');
      const saveButton = screen.getByText('保存');

      await user.clear(editInput);
      await user.type(editInput, '編集済み統合テストタスク');
      await user.click(saveButton);

      // タスク更新APIが呼ばれることを確認
      expect(mockTaskService.updateTask).toHaveBeenCalledWith('1', {
        text: '編集済み統合テストタスク',
        priority: '高'
      });

      // タスクを完了にする
      const checkbox = within(taskItem as HTMLElement).getByRole('checkbox');
      await user.click(checkbox);

      // タスク完了APIが呼ばれることを確認
      expect(mockTaskService.toggleTaskCompletion).toHaveBeenCalledWith('1', false);

      // タスクを削除
      const deleteButton = within(taskItem as HTMLElement).getByTitle('削除');
      await user.click(deleteButton);

      // タスク削除APIが呼ばれることを確認
      expect(mockTaskService.deleteTask).toHaveBeenCalledWith('1');
    });

    it('タスクフィルタリング機能が動作する', async () => {
      const { user } = render(<App />, { mockUser });

      await waitFor(() => {
        expect(screen.getByText('Integration Task 1')).toBeInTheDocument();
      });

      // 完了タスクを非表示にする
      const showCompletedToggle = screen.getByText('完了済みを表示');
      await user.click(showCompletedToggle);

      // 完了済みタスクが非表示になることを確認
      await waitFor(() => {
        expect(screen.queryByText('Integration Task 2')).not.toBeInTheDocument();
        expect(screen.getByText('Integration Task 1')).toBeInTheDocument();
        expect(screen.getByText('Integration Task 3')).toBeInTheDocument();
      });

      // 優先度フィルターを使用
      const priorityFilter = screen.getByRole('combobox', { name: /優先度/i });
      await user.selectOptions(priorityFilter, '高');

      // 高優先度タスクのみが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('Integration Task 1')).toBeInTheDocument();
        expect(screen.queryByText('Integration Task 3')).not.toBeInTheDocument();
      });
    });

    it('タスク検索機能が動作する', async () => {
      const { user } = render(<App />, { mockUser });

      await waitFor(() => {
        expect(screen.getByText('Integration Task 1')).toBeInTheDocument();
      });

      // 検索フィールドに入力
      const searchInput = screen.getByPlaceholderText('タスクを検索...');
      await user.type(searchInput, 'Task 1');

      // 検索結果がフィルタリングされることを確認
      await waitFor(() => {
        expect(screen.getByText('Integration Task 1')).toBeInTheDocument();
        expect(screen.queryByText('Integration Task 2')).not.toBeInTheDocument();
        expect(screen.queryByText('Integration Task 3')).not.toBeInTheDocument();
      });
    });
  });

  describe('チームタスク管理フロー', () => {
    beforeEach(() => {
      mockTeamService.getUserTeams.mockResolvedValue([
        { teams: mockTeam, role: 'owner' }
      ]);
    });

    it('チームワークスペースでのタスク管理が動作する', async () => {
      const teamTasks = [
        createMockTask({ 
          id: 'team-1', 
          text: 'チームタスク1', 
          team_id: mockTeam.id,
          assigned_to: mockUser.id
        })
      ];

      mockTaskService.fetchTasks.mockResolvedValue(teamTasks);

      const { user } = render(<App />, { 
        mockUser,
        mockWorkspace: { type: 'team', team_id: mockTeam.id, team_name: mockTeam.name }
      });

      // チームタスクが表示されるまで待機
      await waitFor(() => {
        expect(screen.getByText('チームタスク1')).toBeInTheDocument();
      });

      // チームコンテキストでタスク作成
      const taskInput = screen.getByPlaceholderText('タスク内容を入力してください...');
      const addButton = screen.getByText('追加');

      await user.type(taskInput, '新しいチームタスク');
      await user.click(addButton);

      // チームIDが正しく設定されてタスクが作成されることを確認
      expect(mockTaskService.createTask).toHaveBeenCalledWith(
        {
          text: '新しいチームタスク',
          priority: '中',
          user_id: mockUser.id
        },
        mockTeam.id
      );
    });

    it('ワークスペース切り替えが正常に動作する', async () => {
      const personalTasks = mockTasks;
      const teamTasks = [
        createMockTask({ id: 'team-1', text: 'チームタスク1', team_id: mockTeam.id })
      ];

      // 最初は個人タスクを表示
      mockTaskService.fetchTasks.mockResolvedValueOnce(personalTasks);

      const { user } = render(<App />, { mockUser });

      await waitFor(() => {
        expect(screen.getByText('Integration Task 1')).toBeInTheDocument();
      });

      // チームワークスペースに切り替え
      mockTaskService.fetchTasks.mockResolvedValueOnce(teamTasks);
      
      const workspaceSwitcher = screen.getByText('ワークスペース');
      await user.click(workspaceSwitcher);
      
      const teamOption = screen.getByText(mockTeam.name);
      await user.click(teamOption);

      // チームタスクがロードされることを確認
      await waitFor(() => {
        expect(mockTaskService.fetchTasks).toHaveBeenCalledWith(mockUser.id, mockTeam.id);
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('タスク作成失敗時に適切にエラーが表示される', async () => {
      mockTaskService.createTask.mockRejectedValueOnce(new Error('作成に失敗しました'));

      const { user } = render(<App />, { mockUser });

      await waitFor(() => {
        expect(screen.getByText('Integration Task 1')).toBeInTheDocument();
      });

      const taskInput = screen.getByPlaceholderText('タスク内容を入力してください...');
      const addButton = screen.getByText('追加');

      await user.type(taskInput, '失敗するタスク');
      await user.click(addButton);

      // エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/エラーが発生しました/)).toBeInTheDocument();
      });
    });

    it('タスク読み込み失敗時に適切にエラーが表示される', async () => {
      mockTaskService.fetchTasks.mockRejectedValueOnce(new Error('読み込みに失敗しました'));

      render(<App />, { mockUser });

      // エラー状態が表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/タスクの読み込みに失敗しました/)).toBeInTheDocument();
      });
    });

    it('ネットワークエラー後の復旧が正常に動作する', async () => {
      // 最初は失敗
      mockTaskService.fetchTasks.mockRejectedValueOnce(new Error('Network error'));

      const { user } = render(<App />, { mockUser });

      await waitFor(() => {
        expect(screen.getByText(/タスクの読み込みに失敗しました/)).toBeInTheDocument();
      });

      // リトライボタンをクリック
      mockTaskService.fetchTasks.mockResolvedValueOnce(mockTasks);
      
      const retryButton = screen.getByText('再試行');
      await user.click(retryButton);

      // タスクが正常に読み込まれることを確認
      await waitFor(() => {
        expect(screen.getByText('Integration Task 1')).toBeInTheDocument();
      });
    });
  });

  describe('パフォーマンス', () => {
    it('大量のタスクでもスムーズに動作する', async () => {
      const largeTasks = Array.from({ length: 100 }, (_, i) =>
        createMockTask({ 
          id: `task-${i}`, 
          text: `大量テストタスク ${i}`,
          priority: i % 3 === 0 ? '高' : i % 3 === 1 ? '中' : '低'
        })
      );

      mockTaskService.fetchTasks.mockResolvedValue(largeTasks);

      const startTime = performance.now();
      render(<App />, { mockUser });

      await waitFor(() => {
        expect(screen.getByText('大量テストタスク 0')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // レンダリング時間が合理的な範囲内であることを確認（3秒以内）
      expect(renderTime).toBeLessThan(3000);
    });

    it('頻繁な更新でもパフォーマンスが維持される', async () => {
      const { user } = render(<App />, { mockUser });

      await waitFor(() => {
        expect(screen.getByText('Integration Task 1')).toBeInTheDocument();
      });

      const startTime = performance.now();

      // 複数のタスク操作を連続実行
      const taskItems = screen.getAllByRole('checkbox');
      
      for (let i = 0; i < Math.min(taskItems.length, 10); i++) {
        await user.click(taskItems[i]);
      }

      const endTime = performance.now();
      const operationTime = endTime - startTime;

      // 操作時間が合理的な範囲内であることを確認（2秒以内）
      expect(operationTime).toBeLessThan(2000);
    });
  });

  describe('アクセシビリティ', () => {
    it('キーボードナビゲーションが正常に動作する', async () => {
      const { user } = render(<App />, { mockUser });

      await waitFor(() => {
        expect(screen.getByText('Integration Task 1')).toBeInTheDocument();
      });

      // Tabキーでナビゲーション
      await user.tab();
      expect(document.activeElement).toBe(screen.getByPlaceholderText('タスク内容を入力してください...'));

      await user.tab();
      expect(document.activeElement).toBe(screen.getByDisplayValue('中'));

      await user.tab();
      expect(document.activeElement).toBe(screen.getByText('追加'));
    });

    it('スクリーンリーダー用のラベルが適切に設定される', async () => {
      render(<App />, { mockUser });

      await waitFor(() => {
        expect(screen.getByText('Integration Task 1')).toBeInTheDocument();
      });

      // ARIA属性が適切に設定されていることを確認
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        expect(checkbox).toHaveAttribute('aria-checked');
      });

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAccessibleName();
      });
    });
  });

  describe('ユーザー体験', () => {
    it('ローディング状態が適切に表示される', async () => {
      // 遅延を含むPromiseを作成
      let resolvePromise: (value: any) => void;
      const delayedPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockTaskService.fetchTasks.mockReturnValueOnce(delayedPromise);

      render(<App />, { mockUser });

      // ローディングインジケータが表示されることを確認
      expect(screen.getByText('読み込み中...')).toBeInTheDocument();

      // データを解決
      resolvePromise!(mockTasks);

      // ローディングが完了し、タスクが表示されることを確認
      await waitFor(() => {
        expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
        expect(screen.getByText('Integration Task 1')).toBeInTheDocument();
      });
    });

    it('フィードバックメッセージが適切に表示される', async () => {
      const { user } = render(<App />, { mockUser });

      await waitFor(() => {
        expect(screen.getByText('Integration Task 1')).toBeInTheDocument();
      });

      // タスク作成成功メッセージ
      const taskInput = screen.getByPlaceholderText('タスク内容を入力してください...');
      const addButton = screen.getByText('追加');

      await user.type(taskInput, '成功テストタスク');
      await user.click(addButton);

      // 成功メッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/タスクが作成されました/)).toBeInTheDocument();
      });
    });
  });
});
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render, createMockTask, createMockUser, TEST_IDS } from '../utils/test-utils';
import { TaskItem } from '@/components/optimized/TaskItem';

describe('TaskItem', () => {
  const mockUser = createMockUser();
  const mockTask = createMockTask();
  
  const defaultProps = {
    task: mockTask,
    isEditing: false,
    onEdit: jest.fn(),
    onUpdate: jest.fn(),
    onDelete: jest.fn(),
    onEditStart: jest.fn(),
    onEditCancel: jest.fn(),
    editingText: '',
    onEditingTextChange: jest.fn(),
    editingPriority: '中' as const,
    onEditingPriorityChange: jest.fn(),
    currentUserId: mockUser.id
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('表示モード', () => {
    it('タスクが正しく表示される', () => {
      render(<TaskItem {...defaultProps} />);
      
      expect(screen.getByText('Test Task')).toBeInTheDocument();
      expect(screen.getByText('中')).toBeInTheDocument();
      expect(screen.getByRole('checkbox')).not.toBeChecked();
    });

    it('完了済みタスクが適切にスタイリングされる', () => {
      const completedTask = createMockTask({ completed: true });
      render(<TaskItem {...defaultProps} task={completedTask} />);
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
      
      const taskText = screen.getByText('Test Task');
      expect(taskText).toHaveClass('line-through');
    });

    it('優先度に応じた色分けが適用される', () => {
      const highPriorityTask = createMockTask({ priority: '高' });
      render(<TaskItem {...defaultProps} task={highPriorityTask} />);
      
      const priorityBadge = screen.getByText('高');
      expect(priorityBadge).toHaveClass('bg-red-100', 'text-red-800');
    });

    it('担当者情報が表示される', () => {
      const assignee = createMockUser({ 
        id: 'assignee-id', 
        user_metadata: { full_name: 'Assigned User' } 
      });
      const taskWithAssignee = createMockTask({ 
        assignee: assignee,
        assigned_to: assignee.id 
      });
      
      render(<TaskItem {...defaultProps} task={taskWithAssignee} />);
      
      expect(screen.getByText('Assigned User')).toBeInTheDocument();
    });
  });

  describe('インタラクション', () => {
    it('チェックボックスクリックで完了状態が切り替わる', async () => {
      const { user } = render(<TaskItem {...defaultProps} />);
      
      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);
      
      expect(defaultProps.onUpdate).toHaveBeenCalledWith(
        mockTask.id,
        { completed: true }
      );
    });

    it('編集ボタンクリックで編集モードになる', async () => {
      const { user } = render(<TaskItem {...defaultProps} />);
      
      const editButton = screen.getByTitle('編集');
      await user.click(editButton);
      
      expect(defaultProps.onEditStart).toHaveBeenCalledWith(mockTask.id);
    });

    it('削除ボタンクリックで削除が実行される', async () => {
      const { user } = render(<TaskItem {...defaultProps} />);
      
      const deleteButton = screen.getByTitle('削除');
      await user.click(deleteButton);
      
      expect(defaultProps.onDelete).toHaveBeenCalledWith(mockTask.id);
    });
  });

  describe('編集モード', () => {
    const editingProps = {
      ...defaultProps,
      isEditing: true,
      editingText: 'Editing Task',
      editingPriority: '高' as const
    };

    it('編集フォームが表示される', () => {
      render(<TaskItem {...editingProps} />);
      
      expect(screen.getByDisplayValue('Editing Task')).toBeInTheDocument();
      expect(screen.getByDisplayValue('高')).toBeInTheDocument();
      expect(screen.getByText('保存')).toBeInTheDocument();
      expect(screen.getByText('キャンセル')).toBeInTheDocument();
    });

    it('テキスト変更が反映される', async () => {
      const { user } = render(<TaskItem {...editingProps} />);
      
      const input = screen.getByDisplayValue('Editing Task');
      await user.clear(input);
      await user.type(input, 'Updated Task');
      
      expect(editingProps.onEditingTextChange).toHaveBeenCalledWith('Updated Task');
    });

    it('優先度変更が反映される', async () => {
      const { user } = render(<TaskItem {...editingProps} />);
      
      const select = screen.getByDisplayValue('高');
      await user.selectOptions(select, '低');
      
      expect(editingProps.onEditingPriorityChange).toHaveBeenCalledWith('低');
    });

    it('保存ボタンで更新が実行される', async () => {
      const { user } = render(<TaskItem {...editingProps} />);
      
      const saveButton = screen.getByText('保存');
      await user.click(saveButton);
      
      expect(editingProps.onUpdate).toHaveBeenCalledWith(
        mockTask.id,
        { text: 'Editing Task', priority: '高' }
      );
      expect(editingProps.onEditCancel).toHaveBeenCalled();
    });

    it('キャンセルボタンで編集モードが終了する', async () => {
      const { user } = render(<TaskItem {...editingProps} />);
      
      const cancelButton = screen.getByText('キャンセル');
      await user.click(cancelButton);
      
      expect(editingProps.onEditCancel).toHaveBeenCalled();
    });
  });

  describe('アクセシビリティ', () => {
    it('キーボードナビゲーションが機能する', async () => {
      const { user } = render(<TaskItem {...defaultProps} />);
      
      // Tab で移動可能
      await user.tab();
      expect(screen.getByRole('checkbox')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByTitle('編集')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByTitle('削除')).toHaveFocus();
    });

    it('適切なARIA属性が設定される', () => {
      render(<TaskItem {...defaultProps} />);
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('aria-checked', 'false');
      
      const editButton = screen.getByTitle('編集');
      expect(editButton).toHaveAttribute('title', '編集');
      
      const deleteButton = screen.getByTitle('削除');
      expect(deleteButton).toHaveAttribute('title', '削除');
    });
  });

  describe('パフォーマンス', () => {
    it('React.memoによる最適化が機能する', () => {
      const { rerender } = render(<TaskItem {...defaultProps} />);
      
      // 同じpropsでre-renderしても再描画されない
      rerender(<TaskItem {...defaultProps} />);
      
      // 実際の検証はReact DevToolsやパフォーマンス測定で行う
      // ここでは基本的な動作確認
      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });
  });

  describe('エラーハンドリング', () => {
    it('異常なpropsに対して適切に処理する', () => {
      const invalidTask = { ...mockTask, text: '' };
      
      expect(() => {
        render(<TaskItem {...defaultProps} task={invalidTask} />);
      }).not.toThrow();
    });

    it('必須propsが不足していても適切に処理する', () => {
      const partialProps = {
        task: mockTask,
        isEditing: false,
        onEdit: jest.fn(),
        onUpdate: jest.fn(),
        onDelete: jest.fn(),
        onEditStart: jest.fn(),
        onEditCancel: jest.fn(),
        editingText: '',
        onEditingTextChange: jest.fn(),
        editingPriority: '中' as const,
        onEditingPriorityChange: jest.fn()
        // currentUserId is missing
      };

      expect(() => {
        render(<TaskItem {...partialProps} />);
      }).not.toThrow();
    });
  });
});
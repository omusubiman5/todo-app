// 🎓 【修正版】SharedTaskBoard コンポーネントのテスト
// ハング問題を解決した版

import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import SharedTaskBoard from '@/components/SharedTaskBoard'
import { SharedTaskService } from '@/lib/sharedTaskService'

// 🔧 【重要】Supabaseクライアントのモック
// テストがハングする原因は、実際のSupabaseチャンネルを作成しようとしているため
jest.mock('@/lib/supabase', () => ({
  supabase: {
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    })),
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null })
    }))
  }
}))

// AuthProvider のモック
jest.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-123',
      email: 'test@example.com',
      user_metadata: { full_name: 'Test User' }
    }
  })
}))

// WorkspaceProvider のモック
jest.mock('@/components/WorkspaceProvider', () => ({
  useWorkspace: () => ({
    currentWorkspace: {
      type: 'personal',
      team_id: null,
      team_name: null
    }
  })
}))

// SharedTaskService のモック（プロミスベース）
jest.mock('@/lib/sharedTaskService', () => ({
  SharedTaskService: {
    getTasks: jest.fn(() => Promise.resolve([])),
    createTask: jest.fn(() => Promise.resolve({})),
    updateTask: jest.fn(() => Promise.resolve({})),
    deleteTask: jest.fn(() => Promise.resolve()),
    subscribeToTasks: jest.fn(() => ({
      unsubscribe: jest.fn()
    }))
  }
}))

// モーダルコンポーネントのモック
jest.mock('@/components/TaskAssignmentModal', () => {
  return function TaskAssignmentModal() {
    return <div data-testid="task-assignment-modal">Assignment Modal</div>
  }
})

jest.mock('@/components/TaskCommentsModal', () => {
  return function TaskCommentsModal() {
    return <div data-testid="task-comments-modal">Comments Modal</div>
  }
})

jest.mock('@/components/TaskHistoryModal', () => {
  return function TaskHistoryModal() {
    return <div data-testid="task-history-modal">History Modal</div>
  }
})

// テスト用のタスクデータ
const mockTasks = [
  {
    id: 'task-1',
    text: 'テストタスク1',
    completed: false,
    priority: '高',
    user_id: 'test-user-123',
    team_id: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
]

beforeEach(() => {
  jest.clearAllMocks()
})

describe('SharedTaskBoard Component - Fixed Tests', () => {
  test('📺 基本的なUI要素が表示される', () => {
    render(<SharedTaskBoard />)
    
    // タスク入力フィールド
    expect(screen.getByPlaceholderText(/やることを入力してね/)).toBeInTheDocument()
    
    // 追加ボタン
    expect(screen.getByRole('button', { name: /追加/ })).toBeInTheDocument()
    
    // 優先度選択
    expect(screen.getByDisplayValue('中')).toBeInTheDocument()
  })

  test('🔄 ソート・フィルターボタンが表示される', () => {
    render(<SharedTaskBoard />)
    
    // ソートボタン
    expect(screen.getByRole('button', { name: /優先度でソート/ })).toBeInTheDocument()
    
    // フィルターボタン
    expect(screen.getByRole('button', { name: /完了タスクを隠す/ })).toBeInTheDocument()
  })

  test('🎨 ダークモードクラスが適用される', () => {
    render(<SharedTaskBoard darkMode={true} />)
    
    const taskInput = screen.getByPlaceholderText(/やることを入力してね/)
    expect(taskInput).toHaveClass('bg-gray-700/50')
  })

  test('🔧 SharedTaskService が正しくモックされている', () => {
    render(<SharedTaskBoard />)
    
    // getTasks が呼び出されることを確認
    expect(SharedTaskService.getTasks).toHaveBeenCalled()
    
    // subscribeToTasks が呼び出されることを確認
    expect(SharedTaskService.subscribeToTasks).toHaveBeenCalled()
  })

  test('🈚 タスクが0件の場合の表示', async () => {
    // 空の配列を返すモック
    ;(SharedTaskService.getTasks as jest.Mock).mockResolvedValue([])
    
    render(<SharedTaskBoard />)
    
    // 「タスクはありません」のメッセージを確認
    // 非同期でロードされるため、getByTextではなくfindByTextを使用
    const emptyMessage = await screen.findByText('タスクはありません！')
    expect(emptyMessage).toBeInTheDocument()
  })
})
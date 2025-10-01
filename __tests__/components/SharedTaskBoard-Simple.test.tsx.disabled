// 🎓 【シンプル版】SharedTaskBoard-Simple コンポーネントのテスト
// リアルタイム機能を除いた基本的な機能のテスト

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import SharedTaskBoardSimple from '@/components/SharedTaskBoard-Simple'
import { SimpleTask } from '@/components/SharedTaskBoard-Simple'

// 基本的なモック設定（必要最小限）
const mockProps = {
  onTaskAdd: jest.fn(),
  onTaskUpdate: jest.fn(),
  onTaskDelete: jest.fn()
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('SharedTaskBoard-Simple Component Tests', () => {
  test('🎯 基本的なUI要素が表示される', () => {
    render(<SharedTaskBoardSimple {...mockProps} />)
    
    // タスク入力フィールド
    expect(screen.getByTestId('task-input')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/やることを入力してね/)).toBeInTheDocument()
    
    // 優先度セレクト
    expect(screen.getByTestId('priority-select')).toBeInTheDocument()
    expect(screen.getByDisplayValue('中')).toBeInTheDocument()
    
    // 追加ボタン
    expect(screen.getByTestId('add-button')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /追加/ })).toBeInTheDocument()
    
    // ソート・フィルターボタン
    expect(screen.getByTestId('sort-button')).toBeInTheDocument()
    expect(screen.getByTestId('filter-button')).toBeInTheDocument()
    
    // 空状態のメッセージ
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(screen.getByText('タスクはありません！')).toBeInTheDocument()
  })

  test('➕ タスクの追加機能', async () => {
    const user = userEvent.setup()
    render(<SharedTaskBoardSimple {...mockProps} />)
    
    const taskInput = screen.getByTestId('task-input')
    const addButton = screen.getByTestId('add-button')
    
    // タスクを入力して追加
    await user.type(taskInput, '新しいタスク')
    await user.click(addButton)
    
    // タスクが表示される
    await waitFor(() => {
      expect(screen.getByText(/新しいタスク/)).toBeInTheDocument()
    })
    
    // 入力フィールドがクリアされる
    expect(taskInput).toHaveValue('')
    
    // コールバックが呼ばれる
    expect(mockProps.onTaskAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        text: '新しいタスク',
        completed: false,
        priority: '中'
      })
    )
    
    // 空状態が非表示になる
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument()
  })

  test('🔄 タスクの完了/未完了切り替え', async () => {
    const user = userEvent.setup()
    render(<SharedTaskBoardSimple {...mockProps} />)
    
    // タスクを追加
    const taskInput = screen.getByTestId('task-input')
    const addButton = screen.getByTestId('add-button')
    await user.type(taskInput, '完了テストタスク')
    await user.click(addButton)
    
    // タスクが追加されるまで待つ
    await waitFor(() => {
      expect(screen.getByText(/完了テストタスク/)).toBeInTheDocument()
    })
    
    // チェックボックスを見つける（動的IDに対応）
    const checkbox = screen.getByRole('checkbox')
    await user.click(checkbox)
    
    // コールバックが呼ばれる（IDは動的なので文字列マッチング）
    expect(mockProps.onTaskUpdate).toHaveBeenCalledWith(
      expect.stringMatching(/^task-\d+$/),
      expect.objectContaining({
        completed: true
      })
    )
  })

  test('🗑️ タスクの削除機能', async () => {
    const user = userEvent.setup()
    render(<SharedTaskBoardSimple {...mockProps} />)
    
    // タスクを追加
    const taskInput = screen.getByTestId('task-input')
    const addButton = screen.getByTestId('add-button')
    await user.type(taskInput, '削除テストタスク')
    await user.click(addButton)
    
    // タスクが追加されるまで待つ
    await waitFor(() => {
      expect(screen.getByText(/削除テストタスク/)).toBeInTheDocument()
    })
    
    // 削除ボタンを見つける（動的IDに対応）
    const allButtons = screen.getAllByRole('button')
    const deleteButton = allButtons.find(button => 
      button.getAttribute('data-testid')?.includes('delete-')
    )
    expect(deleteButton).toBeInTheDocument()
    await user.click(deleteButton!)
    
    // タスクが削除される
    await waitFor(() => {
      expect(screen.queryByText(/削除テストタスク/)).not.toBeInTheDocument()
    })
    
    // コールバックが呼ばれる（動的IDに対応）
    expect(mockProps.onTaskDelete).toHaveBeenCalledWith(
      expect.stringMatching(/^task-\d+$/)
    )
    
    // 空状態が再表示される
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
  })

  test('🔀 優先度でソート機能', async () => {
    const user = userEvent.setup()
    render(<SharedTaskBoardSimple {...mockProps} />)
    
    // 異なる優先度のタスクを追加
    const taskInput = screen.getByTestId('task-input')
    const prioritySelect = screen.getByTestId('priority-select')
    const addButton = screen.getByTestId('add-button')
    
    // 低優先度タスク
    await user.selectOptions(prioritySelect, '低')
    await user.type(taskInput, '低優先度タスク')
    await user.click(addButton)
    
    // 高優先度タスク
    await user.selectOptions(prioritySelect, '高')
    await user.type(taskInput, '高優先度タスク')
    await user.click(addButton)
    
    // 中優先度タスク
    await user.selectOptions(prioritySelect, '中')
    await user.type(taskInput, '中優先度タスク')
    await user.click(addButton)
    
    // ソートボタンをクリック
    const sortButton = screen.getByTestId('sort-button')
    await user.click(sortButton)
    
    // ボタンテキストが変更される
    expect(sortButton).toHaveTextContent('優先度で元に戻す')
    
    // 再度クリックして元に戻す
    await user.click(sortButton)
    expect(sortButton).toHaveTextContent('優先度でソート')
  })

  test('👁️ 完了タスクフィルター機能', async () => {
    const user = userEvent.setup()
    render(<SharedTaskBoardSimple {...mockProps} />)
    
    // タスクを追加して完了させる
    const taskInput = screen.getByTestId('task-input')
    const addButton = screen.getByTestId('add-button')
    
    await user.type(taskInput, '完了させるタスク')
    await user.click(addButton)
    
    // タスクが追加されるまで待つ
    await waitFor(() => {
      expect(screen.getByText(/完了させるタスク/)).toBeInTheDocument()
    })
    
    const checkbox = screen.getByRole('checkbox')
    await user.click(checkbox)
    
    // フィルターボタンをクリック
    const filterButton = screen.getByTestId('filter-button')
    await user.click(filterButton)
    
    // ボタンテキストが変更される
    expect(filterButton).toHaveTextContent('完了タスクを表示')
    
    // 再度クリックして元に戻す
    await user.click(filterButton)
    expect(filterButton).toHaveTextContent('完了タスクを隠す')
  })

  test('🎨 ダークモードの適用', () => {
    render(<SharedTaskBoardSimple {...mockProps} darkMode={true} />)
    
    // ダークモード用のクラスが適用される
    const taskInput = screen.getByTestId('task-input')
    expect(taskInput).toHaveClass('bg-gray-700/50')
    
    const container = screen.getByTestId('shared-task-board-simple')
    expect(container).toHaveClass('w-full')
  })

  test('⌨️ Enterキーでタスク追加', async () => {
    const user = userEvent.setup()
    render(<SharedTaskBoardSimple {...mockProps} />)
    
    const taskInput = screen.getByTestId('task-input')
    
    // Enterキーでタスクを追加
    await user.type(taskInput, 'Enterキーテスト')
    await user.keyboard('{Enter}')
    
    // タスクが追加される
    await waitFor(() => {
      expect(screen.getByText(/Enterキーテスト/)).toBeInTheDocument()
    })
    expect(taskInput).toHaveValue('')
    
    // コールバックが呼ばれる
    expect(mockProps.onTaskAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Enterキーテスト'
      })
    )
  })

  test('🈚 空のタスクは追加されない', async () => {
    const user = userEvent.setup()
    render(<SharedTaskBoardSimple {...mockProps} />)
    
    const addButton = screen.getByTestId('add-button')
    
    // 空の状態で追加ボタンをクリック
    await user.click(addButton)
    
    // コールバックが呼ばれない
    expect(mockProps.onTaskAdd).not.toHaveBeenCalled()
    
    // 空状態が継続
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
  })

  test('🔢 優先度変更機能', async () => {
    const user = userEvent.setup()
    render(<SharedTaskBoardSimple {...mockProps} />)
    
    // タスクを追加
    const taskInput = screen.getByTestId('task-input')
    const addButton = screen.getByTestId('add-button')
    await user.type(taskInput, '優先度変更テスト')
    await user.click(addButton)
    
    // タスクが追加されるまで待つ
    await waitFor(() => {
      expect(screen.getByText(/優先度変更テスト/)).toBeInTheDocument()
    })
    
    // 編集ボタンを見つける（動的IDに対応）
    const editButtons = screen.getAllByRole('button')
    const editButton = editButtons.find(button => 
      button.querySelector('svg') && button.getAttribute('data-testid')?.includes('edit-')
    )
    expect(editButton).toBeInTheDocument()
    
    await user.click(editButton!)
    
    // 編集モードになったら優先度セレクトが表示される
    await waitFor(() => {
      const allSelects = screen.getAllByRole('combobox')
      // メイン優先度セレクトに加えて編集用セレクトも表示される
      expect(allSelects.length).toBeGreaterThan(1)
    }, { timeout: 3000 })
    
    const allSelects = screen.getAllByRole('combobox')
    const editPrioritySelect = allSelects[1] // 2つ目のセレクトボックス（編集用）
    await user.selectOptions(editPrioritySelect, '高')
    
    // 保存ボタンをクリック（チェックマークボタン）
    const saveButtons = screen.getAllByRole('button')
    const saveButton = saveButtons.find(button => 
      button.getAttribute('data-testid')?.includes('save-')
    )
    expect(saveButton).toBeInTheDocument()
    
    await user.click(saveButton!)
    
    expect(mockProps.onTaskUpdate).toHaveBeenCalledWith(
      expect.stringMatching(/^task-\d+$/),
      expect.objectContaining({
        priority: '高'
      })
    )
  })
})
// 🎓 【初心者向け】TaskItem コンポーネントのテスト
// このファイルは初心者がテストの書き方を学ぶためのコメント付きバージョンです

// 📚 必要なライブラリをインポート
import { render, screen } from '@testing-library/react'  // React Testing Library
import userEvent from '@testing-library/user-event'      // ユーザーの操作をシミュレート
import '@testing-library/jest-dom'                       // Jest DOM マッチャー

// 📦 テスト対象のコンポーネントと型定義をインポート
import { TaskItem } from '@/components/optimized/TaskItem'
import { SharedTask } from '@/lib/types'

// 🧪 【テストデータの準備】
// 実際のタスクデータの構造と同じモックデータを作成

const mockTask: SharedTask = {
  id: 'test-task-1',                    // 🆔 タスクの識別ID
  text: 'テスト用のタスク',              // 📝 タスクの内容
  completed: false,                     // ☑️ 完了状態（false = 未完了）
  priority: '中' as const,              // 🔥 優先度（高・中・低）
  user_id: 'user-123',                  // 👤 作成者のユーザーID
  created_at: '2024-01-01T00:00:00Z',   // 📅 作成日時
  updated_at: '2024-01-01T00:00:00Z',   // 🔄 更新日時
}

// 📋 完了済みタスクのデータ（比較用）
const completedMockTask: SharedTask = {
  ...mockTask,                          // 👆 上のデータを全てコピー
  id: 'completed-task',                 // 🆔 IDだけ変更
  text: '完了済みタスク',               // 📝 内容を変更
  completed: true,                      // ✅ 完了状態に変更
}

// 🔧 【モック関数の準備】
// 実際の関数の代わりに使用される「偽の関数」
// 呼び出されたかどうか、どんな引数で呼ばれたかをチェックできる

const mockFunctions = {
  onEdit: jest.fn(),                    // ✏️ 編集処理
  onUpdate: jest.fn(),                  // 💾 更新処理
  onDelete: jest.fn(),                  // 🗑️ 削除処理
  onEditStart: jest.fn(),               // ▶️ 編集開始
  onEditCancel: jest.fn(),              // ❌ 編集キャンセル
  onEditingTextChange: jest.fn(),       // 📝 テキスト変更
  onEditingPriorityChange: jest.fn(),   // 🔥 優先度変更
}

// 📦 【デフォルトプロパティ】
// TaskItemコンポーネントに渡すプロパティの標準セット
const defaultProps = {
  task: mockTask,                       // 📋 タスクデータ
  isEditing: false,                     // ✏️ 編集モード（false = 表示モード）
  editingText: '',                      // 📝 編集中のテキスト
  editingPriority: '中',                // 🔥 編集中の優先度
  currentUserId: 'user-123',            // 👤 現在のユーザーID
  ...mockFunctions,                     // 🔧 上記のモック関数を全て展開
}

// 🧹 【テスト前の準備】
// 各テストの実行前に呼び出される関数
beforeEach(() => {
  // 全てのモック関数の呼び出し履歴をクリア
  // これにより、前のテストの結果が次のテストに影響しない
  jest.clearAllMocks()
})

// 📚 【テストスイート開始】
// describe = テストをグループ化するためのブロック
describe('TaskItem Component - 初心者向けテスト', () => {

  // ========================================
  // 🎯 基本表示のテスト
  // ========================================

  test('📝 タスクのテキストが画面に表示される', () => {
    // 💡 【やっていること】
    // 1. TaskItemコンポーネントを仮想的に「画面」に表示
    // 2. 画面上に期待する文字列があるかチェック

    // 🎬 コンポーネントをレンダリング（画面に表示）
    render(<TaskItem {...defaultProps} />)
    
    // 🔍 画面上から「テスト用のタスク」という文字を探す
    const taskText = screen.getByText('テスト用のタスク')
    
    // ✅ 期待結果：その文字が実際に画面上に存在すること
    expect(taskText).toBeInTheDocument()
  })

  test('🏷️ 優先度ラベルが正しく表示される', () => {
    render(<TaskItem {...defaultProps} />)
    
    // 🔍 優先度「中」のラベルを探す
    const priorityLabel = screen.getByText('中')
    
    // ✅ 優先度ラベルが表示されていることを確認
    expect(priorityLabel).toBeInTheDocument()
  })

  test('📅 作成日時の情報が表示される', () => {
    render(<TaskItem {...defaultProps} />)
    
    // 🔍 「作成:」という文字列を含む要素を探す
    // /作成:/ は正規表現（部分一致で検索）
    const createdDate = screen.getByText(/作成:/)
    
    // ✅ 作成日時の情報が表示されていることを確認
    expect(createdDate).toBeInTheDocument()
  })

  // ========================================
  // ☑️ チェックボックスのテスト
  // ========================================

  test('☑️ 未完了タスクのチェックボックスは空である', () => {
    render(<TaskItem {...defaultProps} />)
    
    // 🔍 チェックボックスを探す
    // screen.getByRole('checkbox') = チェックボックス要素を取得
    const checkbox = screen.getByRole('checkbox')
    
    // ✅ チェックボックスが画面にあることを確認
    expect(checkbox).toBeInTheDocument()
    // ✅ チェックボックスがチェックされていないことを確認
    expect(checkbox).not.toBeChecked()
  })

  test('✅ 完了済みタスクのチェックボックスはチェック済み', () => {
    // 📝 完了済みタスクを使用してテスト
    render(<TaskItem {...defaultProps} task={completedMockTask} />)
    
    const checkbox = screen.getByRole('checkbox')
    
    // ✅ チェックボックスがチェック済みであることを確認
    expect(checkbox).toBeChecked()
  })

  // ========================================
  // 🖱️ クリック操作のテスト
  // ========================================

  test('🖱️ チェックボックスをクリックすると完了状態が変わる', async () => {
    // 👤 ユーザーの操作をシミュレートするための準備
    const user = userEvent.setup()
    
    render(<TaskItem {...defaultProps} />)
    
    // 🔍 チェックボックス要素を取得
    const checkbox = screen.getByRole('checkbox')
    
    // 🖱️ ユーザーがチェックボックスをクリックする操作をシミュレート
    await user.click(checkbox)
    
    // ✅ 【重要】モック関数が正しく呼び出されたかをチェック
    
    // onUpdate関数が1回だけ呼び出されたことを確認
    expect(mockFunctions.onUpdate).toHaveBeenCalledTimes(1)
    
    // onUpdate関数が正しい引数で呼び出されたことを確認
    expect(mockFunctions.onUpdate).toHaveBeenCalledWith(
      'test-task-1',        // タスクID
      { completed: true }   // 更新内容（完了状態をtrueに）
    )
  })

  test('✏️ 編集ボタンをクリックすると編集モードになる', async () => {
    const user = userEvent.setup()
    
    render(<TaskItem {...defaultProps} />)
    
    // 🔍 編集ボタンを探す（title属性で検索）
    const editButton = screen.getByTitle('編集')
    
    // 🖱️ 編集ボタンをクリック
    await user.click(editButton)
    
    // ✅ onEditStart関数が呼び出されたことを確認
    expect(mockFunctions.onEditStart).toHaveBeenCalledTimes(1)
    expect(mockFunctions.onEditStart).toHaveBeenCalledWith('test-task-1')
  })

  test('🗑️ 削除ボタンをクリックすると削除処理が実行される', async () => {
    const user = userEvent.setup()
    
    render(<TaskItem {...defaultProps} />)
    
    // 🔍 削除ボタンを探す
    const deleteButton = screen.getByTitle('削除')
    
    // 🖱️ 削除ボタンをクリック
    await user.click(deleteButton)
    
    // ✅ onDelete関数が正しく呼び出されたことを確認
    expect(mockFunctions.onDelete).toHaveBeenCalledTimes(1)
    expect(mockFunctions.onDelete).toHaveBeenCalledWith('test-task-1')
  })

  // ========================================
  // 📝 編集モードのテスト
  // ========================================

  test('📝 編集モードでは入力フィールドが表示される', () => {
    // 📝 編集モード用のプロパティを作成
    const editingProps = {
      ...defaultProps,              // デフォルトプロパティをコピー
      isEditing: true,              // 編集モードに変更
      editingText: 'テスト用のタスク', // 編集中のテキスト
    }
    
    render(<TaskItem {...editingProps} />)
    
    // 🔍 テキスト入力フィールドを探す（placeholder属性で検索）
    const textInput = screen.getByPlaceholderText('タスク内容を入力...')
    
    // ✅ 入力フィールドが表示されていることを確認
    expect(textInput).toBeInTheDocument()
    // ✅ 入力フィールドに正しい値が入っていることを確認
    expect(textInput).toHaveValue('テスト用のタスク')
  })

  test('💾 保存ボタンをクリックすると変更が保存される', async () => {
    const user = userEvent.setup()
    
    // 📝 編集中の状態を模擬
    const editingProps = {
      ...defaultProps,
      isEditing: true,
      editingText: '更新されたタスク',    // 新しいテキスト
      editingPriority: '高',             // 新しい優先度
    }
    
    render(<TaskItem {...editingProps} />)
    
    // 🔍 保存ボタンを探す
    const saveButton = screen.getByText('保存')
    
    // 🖱️ 保存ボタンをクリック
    await user.click(saveButton)
    
    // ✅ onUpdate関数が正しい更新内容で呼び出されたことを確認
    expect(mockFunctions.onUpdate).toHaveBeenCalledTimes(1)
    expect(mockFunctions.onUpdate).toHaveBeenCalledWith('test-task-1', {
      text: '更新されたタスク',
      priority: '高'
    })
    
    // ✅ 編集モードが終了することを確認
    expect(mockFunctions.onEditCancel).toHaveBeenCalledTimes(1)
  })

  test('❌ キャンセルボタンをクリックすると編集がキャンセルされる', async () => {
    const user = userEvent.setup()
    
    const editingProps = {
      ...defaultProps,
      isEditing: true,
      editingText: '編集中のテキスト',
    }
    
    render(<TaskItem {...editingProps} />)
    
    // 🔍 キャンセルボタンを探す
    const cancelButton = screen.getByText('キャンセル')
    
    // 🖱️ キャンセルボタンをクリック
    await user.click(cancelButton)
    
    // ✅ キャンセル関数が呼び出されたことを確認
    expect(mockFunctions.onEditCancel).toHaveBeenCalledTimes(1)
    
    // ✅ 重要：onUpdate関数は呼び出されないことを確認
    // （キャンセルなので変更を保存しない）
    expect(mockFunctions.onUpdate).not.toHaveBeenCalled()
  })

  // ========================================
  // 🎨 見た目・スタイルのテスト
  // ========================================

  test('🎨 完了済みタスクには取り消し線が表示される', () => {
    render(<TaskItem {...defaultProps} task={completedMockTask} />)
    
    // 🔍 完了済みタスクのテキストを探す
    const taskText = screen.getByText('完了済みタスク')
    
    // ✅ CSSクラスが正しく適用されていることを確認
    expect(taskText).toHaveClass('line-through')    // 取り消し線
    expect(taskText).toHaveClass('text-gray-500')   // 灰色のテキスト
  })

  test('🌈 優先度に応じて正しい色が表示される', () => {
    // 🔴 高優先度のテスト
    const highTask = { ...mockTask, priority: '高' as const }
    const { rerender } = render(<TaskItem {...defaultProps} task={highTask} />)
    
    let priorityLabel = screen.getByText('高')
    expect(priorityLabel).toHaveClass('bg-red-100', 'text-red-800')
    
    // 🟡 中優先度のテスト
    const mediumTask = { ...mockTask, priority: '中' as const }
    rerender(<TaskItem {...defaultProps} task={mediumTask} />)
    
    priorityLabel = screen.getByText('中')
    expect(priorityLabel).toHaveClass('bg-yellow-100', 'text-yellow-800')
    
    // 🟢 低優先度のテスト
    const lowTask = { ...mockTask, priority: '低' as const }
    rerender(<TaskItem {...defaultProps} task={lowTask} />)
    
    priorityLabel = screen.getByText('低')
    expect(priorityLabel).toHaveClass('bg-green-100', 'text-green-800')
  })

  // ========================================
  // 📸 スナップショットテスト
  // ========================================

  test('📸 コンポーネントの見た目が意図しない変更をしていない', () => {
    // 💡 【スナップショットテストとは？】
    // コンポーネントの構造を「写真」のように保存し、
    // 次回のテスト時に変更がないかをチェックする機能
    
    const { container } = render(<TaskItem {...defaultProps} />)
    
    // ✅ 前回のスナップショットと同じ構造であることを確認
    expect(container.firstChild).toMatchSnapshot()
  })
})

// 🎯 【初心者向け解説】テストの重要なポイント

/*
📚 1. テストの基本構造:
   - describe(): テストをグループ化
   - test() または it(): 個別のテスト
   - expect(): 期待する結果をチェック

🔍 2. 要素の見つけ方:
   - getByText(): テキストで要素を探す
   - getByRole(): ロール（checkbox, buttonなど）で探す
   - getByTitle(): title属性で探す
   - getByPlaceholderText(): placeholder属性で探す

🖱️ 3. ユーザー操作のシミュレート:
   - user.click(): クリック操作
   - user.type(): テキスト入力
   - user.clear(): 入力内容をクリア

✅ 4. よく使うマッチャー:
   - toBeInTheDocument(): 要素が画面にあるか
   - toBeChecked(): チェックボックスがチェックされているか
   - toHaveClass(): 特定のCSSクラスがあるか
   - toHaveBeenCalledWith(): 関数が特定の引数で呼ばれたか

🧪 5. モック関数の活用:
   - jest.fn(): 偽の関数を作成
   - toHaveBeenCalledTimes(): 呼び出し回数をチェック
   - toHaveBeenCalledWith(): 引数をチェック
   - not.toHaveBeenCalled(): 呼び出されていないことをチェック
*/
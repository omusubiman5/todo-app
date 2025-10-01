"use client";

import React, {
  useCallback,
  useMemo,
  memo,
  useRef,
  startTransition,
  useDeferredValue
} from 'react';
import { SharedTask } from '@/lib/types';
import { SharedTaskService } from '@/lib/sharedTaskService';
import { useWorkspace } from '../WorkspaceProvider';
import { useAuth } from '../AuthProvider';

// 🚀 パフォーマンス最適化: 個別コンポーネントのmemo化
const TaskItem = memo(function TaskItem({
  task,
  onToggle,
  onEdit,
  onDelete
}: {
  task: SharedTask;
  onToggle: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
}) {
  // 🚀 個別のコールバック最適化
  const handleToggle = useCallback(() => {
    onToggle(task.id);
  }, [task.id, onToggle]);

  const handleEdit = useCallback(() => {
    const newText = prompt('タスクを編集:', task.text);
    if (newText && newText !== task.text) {
      onEdit(task.id, newText);
    }
  }, [task.id, task.text, onEdit]);

  const handleDelete = useCallback(() => {
    if (confirm('このタスクを削除しますか？')) {
      onDelete(task.id);
    }
  }, [task.id, onDelete]);

  // 🚀 優先度によるスタイル最適化（計算結果をmemo化）
  const priorityClass = useMemo(() => {
    switch (task.priority) {
      case '高': return 'border-l-4 border-red-500 bg-red-50';
      case '中': return 'border-l-4 border-yellow-500 bg-yellow-50';
      case '低': return 'border-l-4 border-green-500 bg-green-50';
      default: return 'border-l-4 border-gray-300 bg-gray-50';
    }
  }, [task.priority]);

  return (
    <div className={`p-4 rounded-lg shadow-sm transition-all duration-200 ${priorityClass}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={task.completed}
            onChange={handleToggle}
            className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
          />
          <span
            className={`${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}
          >
            {task.text}
          </span>
          <span className="text-xs px-2 py-1 bg-gray-200 rounded-full">
            {task.priority}
          </span>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleEdit}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            編集
          </button>
          <button
            onClick={handleDelete}
            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            削除
          </button>
        </div>
      </div>
    </div>
  );
});

// 🚀 タスクフォームも最適化
const TaskForm = memo(function TaskForm({
  onAdd
}: {
  onAdd: (text: string, priority: 'high' | 'medium' | 'low') => void;
}) {
  const [text, setText] = React.useState('');
  const [priority, setPriority] = React.useState<'high' | 'medium' | 'low'>('medium');

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onAdd(text.trim(), priority);
      setText('');
      setPriority('medium');
    }
  }, [text, priority, onAdd]);

  return (
    <form onSubmit={handleSubmit} className="mb-6 p-4 bg-white rounded-lg shadow-sm">
      <div className="flex gap-4">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="新しいタスクを入力..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as 'high' | 'medium' | 'low')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="high">高</option>
          <option value="medium">中</option>
          <option value="low">低</option>
        </select>
        <button
          type="submit"
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          追加
        </button>
      </div>
    </form>
  );
});

// 🚀 メインのTaskBoardコンポーネント - 完全最適化版
const PerformanceTaskBoard = memo(function PerformanceTaskBoard() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();

  // 🚀 状態管理の最適化
  const [tasks, setTasks] = React.useState<SharedTask[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [filter, setFilter] = React.useState<'all' | 'completed' | 'pending'>('all');

  // 🚀 ref を使用してレンダリング回数を最小化
  const fetchTasksRef = useRef<(() => Promise<void>) | null>(null);

  // 🚀 タスク取得の最適化 - 依存配列を正確に
  const fetchTasks = useCallback(async () => {
    if (!user || !currentWorkspace) return;

    setIsLoading(true);
    try {
      const data = await SharedTaskService.getTasks(currentWorkspace, user.id);
      setTasks(data);
    } catch (error) {
      console.error('タスク取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, currentWorkspace?.type, currentWorkspace?.team_id]);

  // refに最新のfetchTasksを保存
  fetchTasksRef.current = fetchTasks;

  // 🚀 初期データロード
  React.useEffect(() => {
    fetchTasksRef.current?.();
  }, [fetchTasks]);

  // 🚀 楽観的更新でUXを向上
  const handleToggleTask = useCallback(async (taskId: string) => {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const updatedTask = { ...tasks[taskIndex], completed: !tasks[taskIndex].completed };

    // 楽観的更新: UI を即座に更新
    setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));

    try {
      await SharedTaskService.updateTask(taskId, { completed: updatedTask.completed });
    } catch (error) {
      // エラー時は元に戻す
      setTasks(prev => prev.map(t => t.id === taskId ? tasks[taskIndex] : t));
      console.error('タスク更新エラー:', error);
    }
  }, [tasks]);

  const handleEditTask = useCallback(async (taskId: string, newText: string) => {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const updatedTask = { ...tasks[taskIndex], text: newText };

    // 楽観的更新
    setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));

    try {
      await SharedTaskService.updateTask(taskId, { text: newText });
    } catch (error) {
      // エラー時は元に戻す
      setTasks(prev => prev.map(t => t.id === taskId ? tasks[taskIndex] : t));
      console.error('タスク編集エラー:', error);
    }
  }, [tasks]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    // 楽観的更新
    setTasks(prev => prev.filter(t => t.id !== taskId));

    try {
      await SharedTaskService.deleteTask(taskId);
    } catch (error) {
      // エラー時はリフェッチ
      await fetchTasksRef.current?.();
      console.error('タスク削除エラー:', error);
    }
  }, []);

  const handleAddTask = useCallback(async (text: string, priority: 'high' | 'medium' | 'low') => {
    if (!user || !currentWorkspace) return;

    const priorityMap = { high: '高', medium: '中', low: '低' } as const;

    const tempTask: SharedTask = {
      id: `temp-${Date.now()}`,
      text,
      priority: priorityMap[priority],
      completed: false,
      user_id: user.id,
      team_id: currentWorkspace.type === 'team' ? currentWorkspace.team_id : null,
      assigned_to: null,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 楽観的更新
    setTasks(prev => [tempTask, ...prev]);

    try {
      const newTask = await SharedTaskService.createTask(tempTask, currentWorkspace);
      // 一時IDを実際のIDに置き換え
      setTasks(prev => prev.map(t => t.id === tempTask.id ? newTask : t));
    } catch (error) {
      // エラー時は一時タスクを削除
      setTasks(prev => prev.filter(t => t.id !== tempTask.id));
      console.error('タスク作成エラー:', error);
    }
  }, [user, currentWorkspace]);

  // 🚀 フィルタリングの最適化 - useDeferredValueで遅延
  const deferredFilter = useDeferredValue(filter);
  const filteredTasks = useMemo(() => {
    switch (deferredFilter) {
      case 'completed':
        return tasks.filter(task => task.completed);
      case 'pending':
        return tasks.filter(task => !task.completed);
      default:
        return tasks;
    }
  }, [tasks, deferredFilter]);

  // 🚀 優先度ソートの最適化
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      const priorityOrder = { '高': 3, '中': 2, '低': 1 };
      return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    });
  }, [filteredTasks]);

  // 🚀 フィルター変更をstartTransitionで非同期化
  const handleFilterChange = useCallback((newFilter: typeof filter) => {
    startTransition(() => {
      setFilter(newFilter);
    });
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">タスクを読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        📋 高速タスクボード
      </h1>

      <TaskForm onAdd={handleAddTask} />

      {/* フィルター */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={() => handleFilterChange('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'all'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          すべて ({tasks.length})
        </button>
        <button
          onClick={() => handleFilterChange('pending')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'pending'
              ? 'bg-yellow-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          未完了 ({tasks.filter(t => !t.completed).length})
        </button>
        <button
          onClick={() => handleFilterChange('completed')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'completed'
              ? 'bg-green-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          完了 ({tasks.filter(t => t.completed).length})
        </button>
      </div>

      {/* タスクリスト */}
      <div className="space-y-3">
        {sortedTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {filter === 'all' ? 'タスクがありません' :
             filter === 'completed' ? '完了したタスクがありません' :
             '未完了のタスクがありません'}
          </div>
        ) : (
          sortedTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={handleToggleTask}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
            />
          ))
        )}
      </div>
    </div>
  );
});

export default PerformanceTaskBoard;
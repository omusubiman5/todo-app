// 🎭 【簡略版】SharedTaskBoard - テスト可能な最小実装
// リアルタイム購読機能を除外したシンプル版

import React, { useState } from 'react';
import { FaPlus, FaTrash, FaEdit, FaCheck, FaTimes, FaSort, FaEye, FaEyeSlash } from 'react-icons/fa';

interface SimpleTask {
  id: string;
  text: string;
  completed: boolean;
  priority: "高" | "中" | "低";
  created_at: string;
}

interface SharedTaskBoardSimpleProps {
  darkMode?: boolean;
  initialTasks?: SimpleTask[];
  onTaskAdd?: (task: Omit<SimpleTask, 'id' | 'created_at'>) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<SimpleTask>) => void;
  onTaskDelete?: (taskId: string) => void;
}

export default function SharedTaskBoardSimple({ 
  darkMode = false,
  initialTasks = [],
  onTaskAdd,
  onTaskUpdate,
  onTaskDelete
}: SharedTaskBoardSimpleProps) {
  // 🎯 【シンプルな状態管理】複雑なuseEffectを排除
  const [tasks, setTasks] = useState<SimpleTask[]>(initialTasks);
  const [task, setTask] = useState('');
  const [priority, setPriority] = useState<"高" | "中" | "低">('中');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [editPriority, setEditPriority] = useState<"高" | "中" | "低">('中');
  const [sortByPriority, setSortByPriority] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);

  // 🎯 【シンプルなタスク追加】非同期処理なし
  const handleAddTask = () => {
    if (task.trim() === '') return;

    const newTask: SimpleTask = {
      id: `task-${Date.now()}`,
      text: task.trim(),
      completed: false,
      priority,
      created_at: new Date().toISOString()
    };

    setTasks(prev => [...prev, newTask]);
    onTaskAdd?.(newTask);
    setTask('');
    setPriority('中');
  };

  // 🎯 【シンプルなタスク更新】
  const handleUpdateTask = (taskId: string, updates: Partial<SimpleTask>) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, ...updates } : t
    ));
    onTaskUpdate?.(taskId, updates);
  };

  // 🎯 【シンプルなタスク削除】
  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    onTaskDelete?.(taskId);
  };

  // 🎯 【シンプルな完了状態切り替え】
  const handleToggleTask = (index: number) => {
    const taskToUpdate = tasks[index];
    handleUpdateTask(taskToUpdate.id, {
      completed: !taskToUpdate.completed
    });
  };

  // 🎯 【編集機能】
  const handleEditStart = (index: number) => {
    setEditingIndex(index);
    setEditText(tasks[index].text);
    setEditPriority(tasks[index].priority);
  };

  const handleEditSave = (index: number) => {
    const taskToUpdate = tasks[index];
    handleUpdateTask(taskToUpdate.id, {
      text: editText,
      priority: editPriority
    });
    setEditingIndex(null);
  };

  const handleEditCancel = () => {
    setEditingIndex(null);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddTask();
    }
  };

  // 🎯 【シンプルなソート・フィルタリング】
  const getSortedTasks = () => {
    if (!sortByPriority) return tasks.map((task, index) => ({ ...task, originalIndex: index }));
    const priorityOrder = { "高": 0, "中": 1, "低": 2 };
    return [...tasks]
      .map((task, index) => ({ ...task, originalIndex: index }))
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  };

  const getFilteredTasks = () => {
    const sorted = getSortedTasks();
    if (!hideCompleted) return sorted;
    return sorted.filter(t => !t.completed);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case '高': return 'bg-red-100 text-red-800 border-red-300';
      case '中': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case '低': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="w-full" data-testid="shared-task-board-simple">
      {/* タスク追加フォーム */}
      <div className={`rounded-2xl p-6 mb-8 backdrop-blur-md border transition-all duration-300 ${
        darkMode 
          ? 'bg-gray-800/50 border-gray-700' 
          : 'bg-white/10 border-white/20'
      }`}>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            className={`flex-1 border-2 rounded-xl px-6 py-3 text-lg backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-4 focus:scale-105 ${
              darkMode 
                ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500/50 focus:border-blue-400' 
                : 'bg-white/20 border-white/30 text-black placeholder-gray-600 focus:ring-yellow-300/50 focus:border-yellow-300'
            }`}
            placeholder="✨ やることを入力してね..."
            value={task}
            onChange={e => setTask(e.target.value)}
            onKeyDown={handleInputKeyDown}
            data-testid="task-input"
          />
          <select
            className={`border-2 rounded-xl px-4 py-3 text-lg backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-4 ${
              darkMode 
                ? 'bg-gray-700/50 border-gray-600 text-white focus:ring-blue-500/50 focus:border-blue-400' 
                : 'bg-white/20 border-white/30 text-black focus:ring-yellow-300/50 focus:border-yellow-300'
            }`}
            value={priority}
            onChange={e => setPriority(e.target.value as "高" | "中" | "低")}
            data-testid="priority-select"
          >
            <option value="高" className="text-black">高</option>
            <option value="中" className="text-black">中</option>
            <option value="低" className="text-black">低</option>
          </select>
          <button
            className={`font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
              darkMode 
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white' 
                : 'bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white'
            }`}
            onClick={handleAddTask}
            data-testid="add-button"
          >
            <FaPlus /> 追加
          </button>
        </div>
      </div>

      {/* フィルタ・ソートボタン */}
      <div className="flex flex-wrap justify-center gap-3 mb-6">
        <button
          className={`px-4 py-2 rounded-xl font-bold text-sm shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center gap-2 ${
            sortByPriority 
              ? (darkMode ? 'bg-blue-500 text-white' : 'bg-yellow-400 text-white') 
              : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white/30 text-gray-900 hover:bg-white/40')
          }`}
          onClick={() => setSortByPriority(v => !v)}
          data-testid="sort-button"
        >
          <FaSort /> 優先度で{sortByPriority ? '元に戻す' : 'ソート'}
        </button>
        <button
          className={`px-4 py-2 rounded-xl font-bold text-sm shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center gap-2 ${
            hideCompleted 
              ? (darkMode ? 'bg-green-500 text-white' : 'bg-green-400 text-white') 
              : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white/30 text-gray-900 hover:bg-white/40')
          }`}
          onClick={() => setHideCompleted(v => !v)}
          data-testid="filter-button"
        >
          {hideCompleted ? <FaEye /> : <FaEyeSlash />}
          {hideCompleted ? '完了タスクを表示' : '完了タスクを隠す'}
        </button>
      </div>

      {/* タスクリスト */}
      <div className={`backdrop-blur-md rounded-3xl shadow-2xl p-6 border transition-all duration-300 ${
        darkMode 
          ? 'bg-gray-800/50 border-gray-700' 
          : 'bg-white/10 border-white/20'
      }`}>
        {tasks.length === 0 ? (
          <div className="text-center py-12" data-testid="empty-state">
            <div className="text-6xl mb-4 animate-bounce">🎉</div>
            <p className={`text-lg font-medium mb-2 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              タスクはありません！
            </p>
            <p className={`text-sm ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              新しいタスクを追加してみよう
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="tasks-grid">
            {getFilteredTasks().map((t) => (
              <div
                key={t.id}
                className={`group rounded-2xl p-4 border transition-all duration-300 transform hover:scale-105 hover:shadow-xl animate-fadeIn ${
                  darkMode 
                    ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-600/50' 
                    : 'bg-white/20 border-white/30 hover:bg-white/30'
                } ${
                  t.priority === "高" 
                    ? (darkMode ? "border-red-500 bg-red-500/10" : "border-red-400 bg-red-400/20") 
                    : t.priority === "中" 
                    ? (darkMode ? "border-yellow-500 bg-yellow-500/10" : "border-yellow-400 bg-yellow-400/20") 
                    : (darkMode ? "border-blue-500 bg-blue-500/10" : "border-blue-400 bg-blue-400/20")
                } ${t.completed ? 'opacity-60' : ''}`}
                data-testid={`task-${t.id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={t.completed}
                      onChange={() => handleToggleTask(t.originalIndex)}
                      className={`w-5 h-5 cursor-pointer transition-all duration-200 ${
                        darkMode ? 'accent-blue-400' : 'accent-yellow-400'
                      }`}
                      data-testid={`checkbox-${t.id}`}
                    />
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      t.priority === "高" 
                        ? (darkMode ? "bg-red-500 text-white" : "bg-red-400 text-white") 
                        : t.priority === "中" 
                        ? (darkMode ? "bg-yellow-500 text-white" : "bg-yellow-400 text-white") 
                        : (darkMode ? "bg-blue-500 text-white" : "bg-blue-400 text-white")
                    }`}>
                      {t.priority}
                    </span>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button
                      onClick={() => handleEditStart(t.originalIndex)}
                      className={`p-2 rounded-full transition-all duration-300 transform hover:scale-110 ${
                        darkMode 
                          ? 'text-blue-400 hover:bg-blue-400/20' 
                          : 'text-blue-600 hover:bg-blue-500/30'
                      }`}
                      data-testid={`edit-${t.id}`}
                    >
                      <FaEdit size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(t.id)}
                      className={`p-2 rounded-full transition-all duration-300 transform hover:scale-110 ${
                        darkMode 
                          ? 'text-red-400 hover:bg-red-400/20' 
                          : 'text-red-600 hover:bg-red-500/30'
                      }`}
                      data-testid={`delete-${t.id}`}
                    >
                      <FaTrash size={14} />
                    </button>
                  </div>
                </div>

                {editingIndex === t.originalIndex ? (
                  <div className="space-y-3">
                    <input
                      className={`w-full rounded-lg px-3 py-2 text-lg transition-all duration-200 focus:outline-none focus:ring-2 ${
                        darkMode 
                          ? 'bg-gray-600 text-white border-gray-500 focus:ring-blue-400' 
                          : 'bg-white text-black border-gray-300 focus:ring-yellow-400'
                      }`}
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleEditSave(t.originalIndex); if (e.key === 'Escape') handleEditCancel(); }}
                      autoFocus
                      data-testid={`edit-input-${t.id}`}
                    />
                    <select
                      className={`w-full rounded-lg px-3 py-2 text-lg transition-all duration-200 focus:outline-none focus:ring-2 ${
                        darkMode 
                          ? 'bg-gray-600 text-white border-gray-500 focus:ring-blue-400' 
                          : 'bg-white text-black border-gray-300 focus:ring-yellow-400'
                      }`}
                      value={editPriority}
                      onChange={e => setEditPriority(e.target.value as "高" | "中" | "低")}
                      data-testid={`edit-priority-${t.id}`}
                    >
                      <option value="高">高</option>
                      <option value="中">中</option>
                      <option value="低">低</option>
                    </select>
                    <div className="flex gap-2">
                      <button 
                        className={`flex-1 py-2 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                          darkMode 
                            ? 'bg-green-600 hover:bg-green-700 text-white' 
                            : 'bg-green-500 hover:bg-green-600 text-white'
                        }`}
                        onClick={() => handleEditSave(t.originalIndex)}
                        data-testid={`save-${t.id}`}
                      >
                        <FaCheck /> 保存
                      </button>
                      <button 
                        className={`flex-1 py-2 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                          darkMode 
                            ? 'bg-gray-600 hover:bg-gray-700 text-white' 
                            : 'bg-gray-400 hover:bg-gray-500 text-white'
                        }`}
                        onClick={handleEditCancel}
                        data-testid={`cancel-${t.id}`}
                      >
                        <FaTimes /> キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`font-medium text-lg cursor-pointer transition-all duration-200 hover:scale-105 ${
                      darkMode ? 'text-gray-100' : 'text-gray-900'
                    } ${t.completed ? 'line-through opacity-60' : ''}`}
                    onClick={() => handleEditStart(t.originalIndex)}
                    title="クリックで編集"
                    data-testid={`task-text-${t.id}`}
                  >
                    📝 {t.text}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/*
🎯 【簡略版の特徴】

✅ テスト可能な設計:
- 複雑なuseEffectチェーンを排除
- リアルタイム購読機能なし
- 同期的な状態更新のみ

✅ 包括的なdata-testid:
- 全ての要素にテストID付与
- E2EテストとUnittestの両方で使用可能

✅ コールバック関数対応:
- onTaskAdd, onTaskUpdate, onTaskDelete
- 親コンポーネントでの状態管理可能

✅ 元の機能を保持:
- タスクの CRUD 操作
- ソート・フィルター機能
- 編集モード
- ダークモード対応
*/
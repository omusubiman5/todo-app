"use client";
import { useState, useEffect } from "react";
import { FaPlus, FaTrash, FaRocket, FaMoon, FaSun, FaEdit, FaCheck, FaTimes, FaSort, FaEye, FaEyeSlash } from "react-icons/fa";

const STORAGE_KEY = 'todo-app-tasks';
const DARK_MODE_KEY = 'todo-app-dark-mode';

type Task = {
  id: string;
  text: string;
  completed: boolean;
  priority: "高" | "中" | "低";
};

const saveToStorage = (tasks: Task[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error('タスクの保存に失敗しました:', error);
  }
};

const loadFromStorage = (): Task[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('タスクの読み込みに失敗しました:', error);
  }
  return [];
};

const saveDarkMode = (isDark: boolean) => {
  try {
    localStorage.setItem(DARK_MODE_KEY, JSON.stringify(isDark));
  } catch (error) {
    console.error('ダークモード設定の保存に失敗しました:', error);
  }
};

const loadDarkMode = (): boolean => {
  try {
    const stored = localStorage.getItem(DARK_MODE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('ダークモード設定の読み込みに失敗しました:', error);
  }
  return false;
};

export default function Home() {
  const [task, setTask] = useState("");
  const [priority, setPriority] = useState<"高" | "中" | "低">("中");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editPriority, setEditPriority] = useState<"高" | "中" | "低">("中");
  const [sortByPriority, setSortByPriority] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // ローカルストレージからタスクとダークモード設定を読み込み
  useEffect(() => {
    const savedTasks = loadFromStorage();
    const savedDarkMode = loadDarkMode();
    setTasks(savedTasks);
    setDarkMode(savedDarkMode);
  }, []);

  // ダークモード切替
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    saveDarkMode(newDarkMode);
  };

  // タスク追加
  const handleAddTask = () => {
    if (task.trim() === "") return;
    const newTask: Task = {
      id: Date.now().toString(),
      text: task.trim(),
      completed: false,
      priority
    };
    const newTasks = [...tasks, newTask];
    setTasks(newTasks);
    saveToStorage(newTasks);
    setTask("");
    setPriority("中");
  };

  // タスク削除
  const handleDeleteTask = (index: number) => {
    const newTasks = tasks.filter((_, i) => i !== index);
    setTasks(newTasks);
    saveToStorage(newTasks);
    setEditingIndex(null);
  };

  // タスク完了トグル
  const handleToggleTask = (index: number) => {
    const newTasks = [...tasks];
    newTasks[index] = { ...newTasks[index], completed: !newTasks[index].completed };
    setTasks(newTasks);
    saveToStorage(newTasks);
  };

  // 編集開始
  const handleEditStart = (index: number) => {
    setEditingIndex(index);
    setEditText(tasks[index].text);
    setEditPriority(tasks[index].priority);
  };
  // 編集保存
  const handleEditSave = (index: number) => {
    const newTasks = [...tasks];
    newTasks[index] = { ...newTasks[index], text: editText, priority: editPriority };
    setTasks(newTasks);
    saveToStorage(newTasks);
    setEditingIndex(null);
  };
  const handleEditCancel = () => {
    setEditingIndex(null);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleAddTask();
    }
  };

  const getSortedTasks = () => {
    if (!sortByPriority) return tasks.map((task, index) => ({ ...task, originalIndex: index }));
    const priorityOrder = { "高": 0, "中": 1, "低": 2 };
    return [...tasks].map((task, index) => ({ ...task, originalIndex: index })).sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  };

  const getFilteredTasks = () => {
    const sorted = getSortedTasks();
    if (!hideCompleted) return sorted;
    return sorted.filter(t => !t.completed);
  };

  return (
    <div className={`min-h-screen transition-all duration-500 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600'
    }`}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className={`text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg ${
              darkMode ? 'text-white' : 'text-white'
            }`}>
              🎯 やることリスト 🎯
            </h1>
            <button
              onClick={toggleDarkMode}
              className={`p-3 rounded-full transition-all duration-300 transform hover:scale-110 ${
                darkMode 
                  ? 'bg-yellow-400 text-gray-900 hover:bg-yellow-300' 
                  : 'bg-gray-800 text-yellow-400 hover:bg-gray-700'
              }`}
            >
              {darkMode ? <FaSun size={20} /> : <FaMoon size={20} />}
            </button>
          </div>
          <p className={`text-xl font-medium ${
            darkMode ? 'text-gray-300' : 'text-white/90'
          }`}>
            今日も頑張ろう！ <FaRocket className="inline ml-2 text-yellow-300" />
          </p>
        </div>
      
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
                  : 'bg-white/20 border-white/30 text-white placeholder-white/70 focus:ring-yellow-300/50 focus:border-yellow-300'
              }`}
              placeholder="✨ やることを入力してね..."
              value={task}
              onChange={e => setTask(e.target.value)}
              onKeyDown={handleInputKeyDown}
            />
            <select
              className={`border-2 rounded-xl px-4 py-3 text-lg backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-4 ${
                darkMode 
                  ? 'bg-gray-700/50 border-gray-600 text-white focus:ring-blue-500/50 focus:border-blue-400' 
                  : 'bg-white/20 border-white/30 text-white focus:ring-yellow-300/50 focus:border-yellow-300'
              }`}
              value={priority}
              onChange={e => setPriority(e.target.value as "高" | "中" | "低")}
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
            >
              <FaPlus /> 追加
            </button>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-6">
          <button
            className={`px-4 py-2 rounded-xl font-bold text-sm shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center gap-2 ${
              sortByPriority 
                ? (darkMode ? 'bg-blue-500 text-white' : 'bg-yellow-400 text-white') 
                : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white/30 text-gray-900 hover:bg-white/40')
            }`}
            onClick={() => setSortByPriority(v => !v)}
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
          >
            {hideCompleted ? <FaEye /> : <FaEyeSlash />}
            {hideCompleted ? '完了タスクを表示' : '完了タスクを隠す'}
          </button>
        </div>

        <div className={`backdrop-blur-md rounded-3xl shadow-2xl p-6 border transition-all duration-300 ${
          darkMode 
            ? 'bg-gray-800/50 border-gray-700' 
            : 'bg-white/10 border-white/20'
        }`}>
          {tasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4 animate-bounce">🎉</div>
              <p className={`text-lg font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-white/80'
              }`}>
                タスクはありません！
              </p>
              <p className={`text-sm ${
                darkMode ? 'text-gray-400' : 'text-white/60'
              }`}>
                新しいタスクを追加してみよう
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {getFilteredTasks().map((t, i) => (
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
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={t.completed}
                        onChange={() => handleToggleTask(i)}
                        className={`w-5 h-5 cursor-pointer transition-all duration-200 ${
                          darkMode ? 'accent-blue-400' : 'accent-yellow-400'
                        }`}
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
                        onClick={() => handleEditStart(i)}
                        className={`p-2 rounded-full transition-all duration-300 transform hover:scale-110 ${
                          darkMode 
                            ? 'text-blue-400 hover:bg-blue-400/20' 
                            : 'text-blue-300 hover:bg-blue-500/30'
                        }`}
                      >
                        <FaEdit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(i)}
                        className={`p-2 rounded-full transition-all duration-300 transform hover:scale-110 ${
                          darkMode 
                            ? 'text-red-400 hover:bg-red-400/20' 
                            : 'text-red-300 hover:bg-red-500/30'
                        }`}
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>
                  </div>
                  {editingIndex === i ? (
                    <div className="space-y-3">
                      <input
                        className={`w-full rounded-lg px-3 py-2 text-lg transition-all duration-200 focus:outline-none focus:ring-2 ${
                          darkMode 
                            ? 'bg-gray-600 text-white border-gray-500 focus:ring-blue-400' 
                            : 'bg-white text-black border-gray-300 focus:ring-yellow-400'
                        }`}
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleEditSave(i); if (e.key === 'Escape') handleEditCancel(); }}
                        autoFocus
                      />
                      <select
                        className={`w-full rounded-lg px-3 py-2 text-lg transition-all duration-200 focus:outline-none focus:ring-2 ${
                          darkMode 
                            ? 'bg-gray-600 text-white border-gray-500 focus:ring-blue-400' 
                            : 'bg-white text-black border-gray-300 focus:ring-yellow-400'
                        }`}
                        value={editPriority}
                        onChange={e => setEditPriority(e.target.value as "高" | "中" | "低")}
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
                          onClick={() => handleEditSave(i)}
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
                        >
                          <FaTimes /> キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`font-medium text-lg cursor-pointer transition-all duration-200 hover:scale-105 ${
                        darkMode ? 'text-gray-100' : 'text-white'
                      } ${t.completed ? 'line-through opacity-60' : ''}`}
                      onClick={() => handleEditStart(i)}
                      title="クリックで編集"
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
    </div>
  );
}

// Add CSS animations
const style = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.5s ease-out;
  }
`;

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.type = 'text/css';
  styleSheet.innerText = style;
  document.head.appendChild(styleSheet);
}

"use client";
import { useState } from "react";
import { FaPlus, FaTrash, FaRocket } from "react-icons/fa";

export default function Home() {
  const [task, setTask] = useState("");
  const [priority, setPriority] = useState<"高" | "中" | "低">("中");
  const [tasks, setTasks] = useState<{ text: string; completed: boolean; priority: "高" | "中" | "低" }[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editPriority, setEditPriority] = useState<"高" | "中" | "低">("中");
  const [sortByPriority, setSortByPriority] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);

  const handleAddTask = () => {
    if (task.trim() === "") return;
    setTasks([...tasks, { text: task.trim(), completed: false, priority }]);
    setTask("");
    setPriority("中");
  };

  const handleDeleteTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleToggleTask = (index: number) => {
    setTasks(tasks.map((t, i) => i === index ? { ...t, completed: !t.completed } : t));
  };

  const handleEditStart = (index: number) => {
    setEditingIndex(index);
    setEditText(tasks[index].text);
    setEditPriority(tasks[index].priority);
  };
  const handleEditSave = (index: number) => {
    setTasks(tasks.map((t, i) => i === index ? { ...t, text: editText, priority: editPriority } : t));
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
    <div className="min-h-screen flex flex-col items-center justify-start p-8 bg-gradient-to-br from-purple-400 via-pink-500 to-red-500">
      <div className="text-center mb-8 mt-12">
        <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-lg">
          🎯 やることリスト 🎯
        </h1>
        <p className="text-xl text-white/90 font-medium">
          今日も頑張ろう！ <FaRocket className="inline ml-2 text-yellow-300" />
        </p>
      </div>
      
      <div className="flex gap-3 mb-8 w-full max-w-md">
        <input
          type="text"
          className="flex-1 border-2 border-white/30 rounded-full px-6 py-3 text-lg bg-white/20 backdrop-blur-sm text-white placeholder-white/70 focus:outline-none focus:ring-4 focus:ring-yellow-300/50 focus:border-yellow-300 transition-all duration-300"
          placeholder="✨ やることを入力してね..."
          value={task}
          onChange={e => setTask(e.target.value)}
          onKeyDown={handleInputKeyDown}
        />
        <select
          className="border-2 border-white/30 rounded-full px-4 py-3 text-lg bg-white/20 backdrop-blur-sm text-white focus:outline-none focus:ring-4 focus:ring-yellow-300/50 focus:border-yellow-300 transition-all duration-300"
          value={priority}
          onChange={e => setPriority(e.target.value as "高" | "中" | "低")}
        >
          <option value="高">高</option>
          <option value="中">中</option>
          <option value="低">低</option>
        </select>
        <button
          className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-bold px-6 py-3 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2"
          onClick={handleAddTask}
        >
          <FaPlus /> 追加
        </button>
      </div>

      <div className="flex justify-end w-full max-w-md mb-2 gap-2">
        <button
          className={`px-4 py-2 rounded-full font-bold text-sm shadow transition-all duration-200
            ${sortByPriority ? 'bg-yellow-400 text-white' : 'bg-white/30 text-yellow-900 hover:bg-yellow-200'}`}
          onClick={() => setSortByPriority(v => !v)}
        >
          優先度で{sortByPriority ? '元に戻す' : 'ソート'}
        </button>
        <button
          className={`px-4 py-2 rounded-full font-bold text-sm shadow transition-all duration-200
            ${hideCompleted ? 'bg-green-400 text-white' : 'bg-white/30 text-green-900 hover:bg-green-200'}`}
          onClick={() => setHideCompleted(v => !v)}
        >
          {hideCompleted ? '完了タスクを表示' : '完了タスクを隠す'}
        </button>
      </div>

      <div className="w-full max-w-md bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-6 border border-white/20">
        {tasks.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎉</div>
            <p className="text-white/80 text-lg font-medium">
              タスクはありません！
            </p>
            <p className="text-white/60 text-sm mt-2">
              新しいタスクを追加してみよう
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {getFilteredTasks().map((t, i) => (
              <li
                key={t.originalIndex}
                className={`group rounded-2xl p-4 border hover:bg-white/30 hover:border-white/50 transition-all duration-300 transform hover:scale-102 hover:shadow-lg bg-white/20 backdrop-blur-sm
                  ${t.priority === "高" ? "border-red-400 bg-red-400/20" : t.priority === "中" ? "border-yellow-400 bg-yellow-400/20" : "border-blue-400 bg-blue-400/20"}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1 gap-3">
                    <input
                      type="checkbox"
                      checked={t.completed}
                      onChange={() => handleToggleTask(t.originalIndex)}
                      className="w-5 h-5 accent-yellow-400 cursor-pointer"
                    />
                    {editingIndex === t.originalIndex ? (
                      <>
                        <input
                          className="flex-1 rounded px-2 py-1 text-lg text-black mr-2"
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleEditSave(t.originalIndex); if (e.key === 'Escape') handleEditCancel(); }}
                          autoFocus
                        />
                        <select
                          className="rounded px-2 py-1 text-lg mr-2"
                          value={editPriority}
                          onChange={e => setEditPriority(e.target.value as "高" | "中" | "低")}
                        >
                          <option value="高">高</option>
                          <option value="中">中</option>
                          <option value="低">低</option>
                        </select>
                        <button className="text-green-600 font-bold mr-1" onClick={() => handleEditSave(t.originalIndex)}>保存</button>
                        <button className="text-gray-400 font-bold" onClick={handleEditCancel}>キャンセル</button>
                      </>
                    ) : (
                      <span
                        className={`text-white font-medium text-lg flex-1 ${t.completed ? 'line-through opacity-60' : ''}`}
                        onClick={() => handleEditStart(t.originalIndex)}
                        style={{ cursor: 'pointer' }}
                        title="クリックで編集"
                      >
                        📝 {t.text}
                        <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold
                          ${t.priority === "高" ? "bg-red-400 text-white" : t.priority === "中" ? "bg-yellow-400 text-white" : "bg-blue-400 text-white"}
                        `}>
                          {t.priority}
                        </span>
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteTask(t.originalIndex)}
                    className="ml-4 text-red-300 hover:text-red-100 hover:bg-red-500/30 p-2 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 transform hover:scale-110"
                  >
                    <FaTrash size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

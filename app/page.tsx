"use client";
import { useState } from "react";
import { FaPlus, FaTrash, FaRocket } from "react-icons/fa";

export default function Home() {
  const [task, setTask] = useState("");
  const [tasks, setTasks] = useState<string[]>([]);

  const handleAddTask = () => {
    if (task.trim() === "") return;
    setTasks([...tasks, task.trim()]);
    setTask("");
  };

  const handleDeleteTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleAddTask();
    }
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
        <button
          className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-bold px-6 py-3 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2"
          onClick={handleAddTask}
        >
          <FaPlus /> 追加
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
            {tasks.map((t, i) => (
              <li
                key={i}
                className="group bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30 hover:bg-white/30 hover:border-white/50 transition-all duration-300 transform hover:scale-102 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium text-lg flex-1">
                    📝 {t}
                  </span>
                  <button
                    onClick={() => handleDeleteTask(i)}
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

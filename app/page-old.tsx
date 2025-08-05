"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { FaPlus, FaTrash, FaRocket, FaMoon, FaSun, FaEdit, FaCheck, FaTimes, FaSort, FaEye, FaEyeSlash, FaWifi, FaExclamationTriangle, FaUser, FaSignOutAlt, FaUsers } from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

const STORAGE_KEY = 'todo-app-tasks';
const DARK_MODE_KEY = 'todo-app-dark-mode';

type Task = {
  id: string;
  text: string;
  completed: boolean;
  priority: "高" | "中" | "低";
  user_id: string;
  created_at?: string;
  updated_at?: string;
};

type Profile = {
  id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
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
  const { user } = useAuth();
  const router = useRouter();
  const [task, setTask] = useState("");
  const [priority, setPriority] = useState<"高" | "中" | "低">("中");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editPriority, setEditPriority] = useState<"高" | "中" | "低">("中");
  const [sortByPriority, setSortByPriority] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  // オンライン状態の監視
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ダークモード設定の読み込み
  useEffect(() => {
    const savedDarkMode = loadDarkMode();
    setDarkMode(savedDarkMode);
  }, []);

  // Supabaseからタスク取得とリアルタイム更新
  useEffect(() => {
    if (!user) {
      setTasks([]);
      setEditingIndex(null);
      return;
    }

    const fetchTasks = async () => {
      try {
        const { data, error } = await supabase
          .from("tasks")
          .select("id, text, completed, priority, user_id, created_at, updated_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });
        
        if (error) {
          console.error('Supabase error:', error);
          // オフライン時はローカルストレージから読み込み
          const localTasks = loadFromStorage().map(task => ({ ...task, user_id: user.id }));
          setTasks(localTasks);
        } else {
          setTasks(data || []);
          // Supabaseから取得できた場合はローカルストレージにも保存
          saveToStorage(data || []);
          setLastSyncTime(new Date());
        }
      } catch (err) {
        console.error('Network error:', err);
        // ネットワークエラー時はローカルストレージから読み込み
        const localTasks = loadFromStorage().map(task => ({ ...task, user_id: user.id }));
        setTasks(localTasks);
      }
    };

    fetchTasks();

    // リアルタイムサブスクリプション
    const channel = supabase
      .channel('realtime-tasks')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'tasks',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Real-time update:', payload);
          fetchTasks(); // リアルタイム更新時に再取得
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setIsOnline(true);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // プロフィール情報取得
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setProfile(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching profile:', error);
        } else if (data) {
          setProfile(data);
        } else {
          // プロフィールが存在しない場合は自動作成
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              display_name: null,
              bio: null,
              avatar_url: null
            })
            .select()
            .single();

          if (createError) {
            console.error('Error creating profile:', createError);
          } else {
            setProfile(newProfile);
          }
        }
      } catch (err) {
        console.error('Profile fetch error:', err);
      }
    };

    fetchProfile();
  }, [user]);

  // ダークモード切替
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    saveDarkMode(newDarkMode);
  };

  // ログアウト機能
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // タスク追加
  const handleAddTask = async () => {
    if (!user || task.trim() === "") return;
    const newTask: Task = {
      id: `temp-${Date.now()}`,
      text: task.trim(),
      completed: false,
      priority,
      user_id: user.id
    };

    // 楽観的更新：UIを即座に更新
    const newTasks = [...tasks, newTask];
    setTasks(newTasks);
    setTask("");
    setPriority("中");

    try {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          text: newTask.text,
          completed: newTask.completed,
          priority: newTask.priority,
          user_id: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        // エラー時はローカルストレージに保存
        saveToStorage(newTasks);
      } else {
        // 成功時は一時IDを正式IDに更新
        const updatedTasks = newTasks.map(t => 
          t.id === newTask.id ? { ...data, user_id: user.id } : t
        );
        setTasks(updatedTasks);
        saveToStorage(updatedTasks);
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.error('Network error during insert:', err);
      // ネットワークエラー時はローカルストレージに保存
      saveToStorage(newTasks);
    }
  };

  // タスク削除
  const handleDeleteTask = async (index: number) => {
    if (!user) return;

    const taskToDelete = tasks[index];

    // 楽観的更新：UIから即座に削除
    const newTasks = tasks.filter((_, i) => i !== index);
    setTasks(newTasks);
    setEditingIndex(null);

    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskToDelete.id)
        .eq("user_id", user.id);

      if (error) {
        console.error('Supabase delete error:', error);
        // エラー時は元に戻す
        setTasks(tasks);
      } else {
        saveToStorage(newTasks);
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.error('Network error during delete:', err);
      // ネットワークエラー時はローカルで削除のまま
      saveToStorage(newTasks);
    }
  };

  // タスク完了トグル
  const handleToggleTask = async (index: number) => {
    if (!user) return;

    const taskToUpdate = tasks[index];

    // 楽観的更新：UIを即座に更新
    const newTasks = [...tasks];
    newTasks[index] = { ...newTasks[index], completed: !newTasks[index].completed };
    setTasks(newTasks);

    try {
      const { error } = await supabase
        .from("tasks")
        .update({ completed: !taskToUpdate.completed })
        .eq("id", taskToUpdate.id)
        .eq("user_id", user.id);

      if (error) {
        console.error('Supabase update error:', error);
        // エラー時は元に戻す
        setTasks(tasks);
      } else {
        saveToStorage(newTasks);
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.error('Network error during update:', err);
      // ネットワークエラー時はローカルで更新のまま
      saveToStorage(newTasks);
    }
  };

  // 編集開始
  const handleEditStart = (index: number) => {
    setEditingIndex(index);
    setEditText(tasks[index].text);
    setEditPriority(tasks[index].priority);
  };
  // 編集保存
  const handleEditSave = async (index: number) => {
    if (!user) return;

    const taskToUpdate = tasks[index];

    // 楽観的更新：UIを即座に更新
    const newTasks = [...tasks];
    newTasks[index] = { ...newTasks[index], text: editText, priority: editPriority };
    setTasks(newTasks);
    setEditingIndex(null);

    try {
      const { error } = await supabase
        .from("tasks")
        .update({ 
          text: editText,
          priority: editPriority
        })
        .eq("id", taskToUpdate.id)
        .eq("user_id", user.id);

      if (error) {
        console.error('Supabase update error:', error);
        // エラー時は元に戻す
        setTasks(tasks);
        setEditingIndex(index);
      } else {
        saveToStorage(newTasks);
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.error('Network error during update:', err);
      // ネットワークエラー時はローカルで更新のまま
      saveToStorage(newTasks);
    }
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

  // 認証されていない場合はログインページにリダイレクト
  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-all duration-500 ${
        darkMode 
          ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
          : 'bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600'
      }`}>
        <div className={`text-center p-8 rounded-2xl backdrop-blur-md border ${
          darkMode 
            ? 'bg-gray-800/50 border-gray-700 text-white' 
            : 'bg-white/10 border-white/20 text-white'
        }`}>
          <h1 className="text-3xl font-bold mb-4">🎯 やることリスト</h1>
          <p className="text-lg mb-6">ログインしてタスクを管理しましょう</p>
          <a 
            href="/login"
            className={`inline-block px-6 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 ${
              darkMode 
                ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                : 'bg-white/20 hover:bg-white/30 text-white'
            }`}
          >
            ログインページへ
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-500 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600'
    }`}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* プロフィール情報表示エリア */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div 
            className="flex items-center gap-4 cursor-pointer group transition-all duration-300 hover:scale-105"
            onClick={() => router.push('/profile')}
            title="プロフィール設定へ"
          >
            {/* プロフィール画像 */}
            <div className="w-12 h-12 relative group-hover:shadow-lg transition-all duration-300">
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt="プロフィール画像"
                  width={48}
                  height={48}
                  className="w-full h-full rounded-full object-cover border-2 border-white/30 group-hover:border-white/50"
                  priority
                />
              ) : (
                <div className="w-full h-full bg-white/20 group-hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-all duration-300">
                  <FaUser size={20} />
                </div>
              )}
            </div>
            
            {/* プロフィール情報 */}
            <div className="text-left">
              <p className={`font-semibold group-hover:text-yellow-300 transition-colors duration-300 ${darkMode ? 'text-white' : 'text-white'}`}>
                {profile?.display_name || user?.email || 'ユーザー'}
              </p>
              <p className={`text-sm opacity-80 ${darkMode ? 'text-gray-300' : 'text-white/80'}`}>
                こんにちは！
              </p>
            </div>
          </div>
          
          {/* 右側のボタン群 */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {/* 接続状態とボタンの行 */}
            <div className="flex items-center gap-2 justify-between sm:justify-center w-full sm:w-auto">
              {/* 接続状態インジケーター */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                isOnline 
                  ? (darkMode ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-green-400/20 text-green-300 border border-green-400/30')
                  : (darkMode ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-red-400/20 text-red-300 border border-red-400/30')
              }`}>
                {isOnline ? (
                  <>
                    <FaWifi size={14} />
                    <span className="hidden sm:inline">オンライン</span>
                  </>
                ) : (
                  <>
                    <FaExclamationTriangle size={14} />
                    <span className="hidden sm:inline">オフライン</span>
                  </>
                )}
              </div>
              
              {/* ボタン群 */}
              <div className="flex items-center gap-2">
                <Link href="/teams">
                  <button
                    className={`p-2 sm:p-3 rounded-full transition-all duration-300 transform hover:scale-110 ${
                      darkMode 
                        ? 'bg-green-500 text-white hover:bg-green-600' 
                        : 'bg-green-400 text-white hover:bg-green-500'
                    }`}
                    title="チーム"
                  >
                    <FaUsers size={16} />
                  </button>
                </Link>
                <button
                  onClick={toggleDarkMode}
                  className={`p-2 sm:p-3 rounded-full transition-all duration-300 transform hover:scale-110 ${
                    darkMode 
                      ? 'bg-yellow-400 text-gray-900 hover:bg-yellow-300' 
                      : 'bg-gray-800 text-yellow-400 hover:bg-gray-700'
                  }`}
                  title="ダークモード切替"
                >
                  {darkMode ? <FaSun size={16} /> : <FaMoon size={16} />}
                </button>
                <button
                  onClick={handleLogout}
                  className={`p-2 sm:p-3 rounded-full transition-all duration-300 transform hover:scale-110 ${
                    darkMode 
                      ? 'bg-red-500 text-white hover:bg-red-600' 
                      : 'bg-red-400 text-white hover:bg-red-500'
                  }`}
                  title="ログアウト"
                >
                  <FaSignOutAlt size={16} />
                </button>
              </div>
            </div>
            
            {/* 最終同期時刻 */}
            {lastSyncTime && (
              <div className={`text-xs px-2 py-1 rounded text-center sm:text-left ${
                darkMode ? 'text-gray-400' : 'text-white/60'
              }`}>
                最終同期: {lastSyncTime.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
        
        <div className="text-center mb-8">
          <h1 className={`text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg ${
            darkMode ? 'text-white' : 'text-white'
          }`}>
            🎯 やることリスト 🎯
          </h1>
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
                  }`}
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
                            : 'text-blue-300 hover:bg-blue-500/30'
                        }`}
                      >
                        <FaEdit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(t.originalIndex)}
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
                          onClick={() => handleEditSave(t.originalIndex)}
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
                      onClick={() => handleEditStart(t.originalIndex)}
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
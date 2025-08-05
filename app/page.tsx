"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { FaRocket, FaMoon, FaSun, FaWifi, FaExclamationTriangle, FaUser, FaSignOutAlt } from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { useWorkspace } from "@/components/WorkspaceProvider";
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";
import SharedTaskBoard from "@/components/SharedTaskBoard";
import NotificationCenter from "@/components/NotificationCenter";

const DARK_MODE_KEY = 'todo-app-dark-mode';

type Profile = {
  id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
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
  const { currentWorkspace } = useWorkspace();
  const router = useRouter();
  
  const [darkMode, setDarkMode] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
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
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* ヘッダー */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8">
          {/* 左側: プロフィール & ワークスペース */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* プロフィール情報 */}
            <div 
              className="flex items-center gap-4 cursor-pointer group transition-all duration-300 hover:scale-105"
              onClick={() => router.push('/profile')}
              title="プロフィール設定へ"
            >
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
              
              <div className="text-left">
                <p className={`font-semibold group-hover:text-yellow-300 transition-colors duration-300 ${darkMode ? 'text-white' : 'text-white'}`}>
                  {profile?.display_name || user?.email || 'ユーザー'}
                </p>
                <p className={`text-sm opacity-80 ${darkMode ? 'text-gray-300' : 'text-white/80'}`}>
                  こんにちは！
                </p>
              </div>
            </div>

            {/* ワークスペース切り替え */}
            <WorkspaceSwitcher darkMode={darkMode} />
          </div>
          
          {/* 右側: 状態表示 & ボタン群 */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
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
                <NotificationCenter darkMode={darkMode} />
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
          </div>
        </div>
        
        {/* メインタイトル */}
        <div className="text-center mb-8">
          <h1 className={`text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg ${
            darkMode ? 'text-white' : 'text-white'
          }`}>
            🎯 {currentWorkspace.type === 'team' ? `${currentWorkspace.team_name}` : 'やることリスト'} 🎯
          </h1>
          <p className={`text-xl font-medium ${
            darkMode ? 'text-gray-300' : 'text-white/90'
          }`}>
            {currentWorkspace.type === 'team' 
              ? 'チームで協力して頑張ろう！' 
              : '今日も頑張ろう！'} 
            <FaRocket className="inline ml-2 text-yellow-300" />
          </p>
        </div>

        {/* 共有タスクボード */}
        <SharedTaskBoard darkMode={darkMode} />
      </div>
    </div>
  );
}
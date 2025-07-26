"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FaArrowLeft, FaUserPlus } from 'react-icons/fa';
import { acceptInvitation } from '@/lib/teamService';
import { useAuth } from '@/components/AuthProvider';

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const token = params.token as string;

  const handleAcceptInvitation = async () => {
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      const result = await acceptInvitation(token);
      if (result) {
        setSuccess(true);
        // 3秒後にホームページにリダイレクト
        setTimeout(() => {
          router.push('/');
        }, 3000);
      } else {
        setError('招待の受諾に失敗しました。招待が期限切れまたは無効である可能性があります。');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '招待の受諾に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      // 未ログインの場合はログインページにリダイレクト
      router.push('/login');
      return;
    }

    if (user && token) {
      handleAcceptInvitation();
    }
  }, [user, authLoading, token, router, handleAcceptInvitation]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600">
        <div className="max-w-md mx-auto p-6">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-white font-medium transition-all duration-300 mb-8"
          >
            <FaArrowLeft /> やることリストに戻る
          </button>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <span className="ml-2 text-white">認証中...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // リダイレクト中
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600">
      <div className="max-w-md mx-auto p-6">
        {/* ナビゲーションヘッダー */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-white font-medium transition-all duration-300"
          >
            <FaArrowLeft /> やることリストに戻る
          </button>
          <h1 className="text-2xl font-bold text-white drop-shadow-lg flex items-center gap-2">
            <FaUserPlus /> チーム招待
          </h1>
          <div className="w-[140px]"></div> {/* スペーサー */}
        </div>

        <div className="bg-white/20 backdrop-blur-md rounded-2xl shadow-lg p-8 border border-white/20">
          <div className="text-center">
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <h1 className="text-xl font-semibold text-white drop-shadow-lg mb-2">
                  招待を処理中...
                </h1>
                <p className="text-white/80">
                  チームへの参加を確認しています
                </p>
              </>
            ) : success ? (
              <>
                <div className="w-16 h-16 bg-green-500/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-400/30">
                  <svg className="w-8 h-8 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-xl font-semibold text-white drop-shadow-lg mb-2">
                  チームに参加しました！
                </h1>
                <p className="text-white/80 mb-4">
                  まもなくホームページにリダイレクトされます
                </p>
                <button
                  onClick={() => router.push('/')}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors shadow-lg"
                >
                  今すぐ移動
                </button>
              </>
            ) : error ? (
              <>
                <div className="w-16 h-16 bg-red-500/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-red-400/30">
                  <svg className="w-8 h-8 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h1 className="text-xl font-semibold text-white drop-shadow-lg mb-2">
                  招待の受諾に失敗しました
                </h1>
                <p className="text-white/80 mb-4">
                  {error}
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => router.push('/')}
                    className="w-full px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors shadow-lg"
                  >
                    ホームに戻る
                  </button>
                  <button
                    onClick={handleAcceptInvitation}
                    className="w-full px-6 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors border border-white/30"
                  >
                    再試行
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-blue-500/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-blue-400/30">
                  <svg className="w-8 h-8 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h1 className="text-xl font-semibold text-white drop-shadow-lg mb-2">
                  チーム招待
                </h1>
                <p className="text-white/80 mb-4">
                  チームに参加しますか？
                </p>
                <button
                  onClick={handleAcceptInvitation}
                  className="w-full px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors shadow-lg"
                >
                  参加する
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
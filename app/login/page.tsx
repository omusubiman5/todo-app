"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SecureLoginForm from "@/components/SecureLoginForm";
import { type AuthError } from "@/lib/authErrors";
import { FaExclamationTriangle, FaShieldAlt } from "react-icons/fa";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<AuthError | null>(null);

  useEffect(() => {
    // URLパラメータからメッセージを取得
    const messageParam = searchParams.get('message');
    if (messageParam === 'account_deleted') {
      setMessage('アカウントが削除されました。パスワードリセットメールを確認して、新しいパスワードを設定してください。');
    } else if (messageParam === 'session_expired') {
      setMessage('セッションが期限切れです。再度ログインしてください。');
    } else if (messageParam === 'unauthorized') {
      setMessage('この操作には認証が必要です。');
    }
  }, [searchParams]);

  useEffect(() => {
    // Monitor auth state for automatic redirect
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && event === 'SIGNED_IN') {
        // Clear any errors on successful login
        setAuthError(null);
        setMessage(null);
        
        // Redirect to intended page or home
        const redirectTo = searchParams.get('redirectTo') || '/';
        router.replace(redirectTo);
      }
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router, searchParams]);

  const handleLoginSuccess = () => {
    const redirectTo = searchParams.get('redirectTo') || '/';
    router.replace(redirectTo);
  };

  const handleLoginError = (error: AuthError) => {
    setAuthError(error);
    // Clear URL message when showing auth error
    if (message) {
      setMessage(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600 px-4">
      <div className="w-full max-w-md">
        {/* System Messages */}
        {message && (
          <div className="mb-6 p-4 rounded-xl bg-yellow-500/20 border border-yellow-400/30 text-yellow-300">
            <div className="flex items-start gap-3">
              <FaExclamationTriangle className="text-yellow-400 mt-1 flex-shrink-0" />
              <div>
                <p className="font-semibold mb-1">システム通知</p>
                <p className="text-sm">{message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Secure Login Form */}
        <SecureLoginForm
          onSuccess={handleLoginSuccess}
          onError={handleLoginError}
        />

        {/* Security Features Notice */}
        <div className="mt-6 p-4 rounded-xl bg-green-500/10 border border-green-400/20">
          <div className="flex items-start gap-3 text-green-300">
            <FaShieldAlt className="mt-1 flex-shrink-0" />
            <div>
              <p className="font-semibold mb-2">セキュリティ機能</p>
              <ul className="text-xs space-y-1">
                <li>• レート制限による不正アクセス防止</li>
                <li>• エンドツーエンド暗号化</li>
                <li>• セッション自動管理</li>
                <li>• セキュアなエラーハンドリング</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>読み込み中...</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
} 
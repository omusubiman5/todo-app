"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { FaExclamationTriangle } from "react-icons/fa";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // URLパラメータからメッセージを取得
    const messageParam = searchParams.get('message');
    if (messageParam === 'account_deleted') {
      setMessage('アカウントが削除されました。パスワードリセットメールを確認して、新しいパスワードを設定してください。');
    }
  }, [searchParams]);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.replace("/");
      }
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600">
      <div className="w-full max-w-md p-8 rounded-2xl shadow-2xl backdrop-blur-md border border-white/20 bg-white/10">
        <h1 className="text-3xl font-bold text-center mb-6 text-white drop-shadow-lg">ログイン / 新規登録</h1>
        
        {/* アカウント削除後のメッセージ */}
        {message && (
          <div className="mb-6 p-4 rounded-xl bg-yellow-500/20 border border-yellow-400/30 text-yellow-300">
            <div className="flex items-start gap-3">
              <FaExclamationTriangle className="text-yellow-400 mt-1 flex-shrink-0" />
              <div>
                <p className="font-semibold mb-1">再認証が必要です</p>
                <p className="text-sm">{message}</p>
              </div>
            </div>
          </div>
        )}
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#6366f1',
                  brandAccent: '#a78bfa',
                  inputBorder: '#a5b4fc',
                  inputLabelText: '#fff',
                  inputText: '#fff',
                  messageText: '#fff',
                  anchorTextColor: '#fbbf24',
                  brandButtonText: '#fff',
                  defaultButtonBackground: '#6366f1',
                  defaultButtonBorder: '#a5b4fc',
                  inputBackground: 'rgba(255,255,255,0.1)',
                  inputPlaceholder: '#c7d2fe',
                },
              },
            },
          }}
          providers={[]}
          theme="dark"
        />
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
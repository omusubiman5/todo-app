"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PasswordResetForm from "@/components/PasswordResetForm";
import { type AuthError } from "@/lib/authErrors";
import { FaLock, FaExclamationTriangle } from "react-icons/fa";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [sessionEstablished, setSessionEstablished] = useState(false);

  useEffect(() => {
    const handlePasswordRecovery = async () => {
      try {
        // まず現在のセッションをチェック
        const { data: sessionData } = await supabase.auth.getSession();
        
        // URLパラメータを取得
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const type = searchParams.get('type');
        
        console.log('🔍 パスワードリセットページ:', {
          url: window.location.href,
          params: Object.fromEntries(searchParams.entries()),
          currentSession: sessionData.session ? 'あり' : 'なし',
          accessToken: accessToken ? `あり(${accessToken.slice(0, 10)}...)` : 'なし',
          refreshToken: refreshToken ? `あり(${refreshToken.slice(0, 10)}...)` : 'なし',
          type: type
        });

        // 既にログイン済みでリカバリートークンなしの場合（ログイン後のパスワード変更）
        if (sessionData.session && (!type || type !== 'recovery')) {
          console.log('✅ 既存セッションでパスワード変更');
          setMessage('現在のセッションでパスワードを変更できます。');
          setSessionEstablished(true);
          setIsReady(true);
          
          // URL パラメータをクリア
          window.history.replaceState({}, '', '/reset-password');
          return;
        }

        // リカバリータイプでトークンが存在する場合
        if (type === 'recovery' && accessToken && refreshToken) {
          console.log('🔑 リカバリートークン処理開始...', {
            tokenLength: accessToken.length,
            refreshTokenLength: refreshToken.length
          });
          
          // セッションを設定
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (error) {
            console.error('❌ セッション設定エラー:', {
              message: error.message,
              code: error.code || 'unknown',
              status: error.status || 'unknown',
              details: error
            });
            setAuthError({
              code: 'recovery_failed',
              userMessage: 'パスワードリセットトークンが無効または期限切れです。新しいリセットリンクを要求してください。',
              technicalMessage: error.message
            });
            setIsReady(true);
            return;
          }
          
          if (data.session) {
            console.log('✅ リカバリーセッション確立成功', {
              userId: data.session.user?.id,
              email: data.session.user?.email,
              role: data.session.user?.role,
              expires: data.session.expires_at
            });
            setMessage('パスワードリセット認証成功！新しいパスワードを設定してください。');
            setSessionEstablished(true);
            setIsReady(true);
            
            // URL パラメータをクリア
            window.history.replaceState({}, '', '/reset-password');
            return;
          } else {
            console.error('⚠️ セッションが確立されていません', data);
          }
        }
        
        // トークンなしまたは無効な場合
        setAuthError({
          code: 'no_recovery_token',
          userMessage: 'パスワードリセットリンクが無効です。ログインしてからアクセスするか、新しいリセットメールを要求してください。',
          technicalMessage: 'No valid recovery tokens found'
        });
        setIsReady(true);
        
      } catch (error) {
        console.error('💥 リカバリー処理エラー:', error);
        setAuthError({
          code: 'recovery_failed',
          userMessage: 'パスワードリセット処理中にエラーが発生しました。',
          technicalMessage: error instanceof Error ? error.message : 'Unknown error'
        });
        setIsReady(true);
      }
    };

    handlePasswordRecovery();
  }, [searchParams]);

  const handlePasswordChangeSuccess = () => {
    setMessage('パスワードが正常に変更されました！ログインページに移動します...');
    
    setTimeout(() => {
      router.replace('/login?message=password_changed');
    }, 2000);
  };

  const handlePasswordChangeError = (error: AuthError) => {
    setAuthError(error);
  };

  const handleRequestNewLink = () => {
    router.push('/login');
  };

  const handleReturnToDashboard = () => {
    router.push('/');
  };

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>パスワードリセットを処理中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600 px-4">
      {/* ホームに戻るボタン - 左上に配置 */}
      <div className="pt-4 pl-4">
        <button
          onClick={handleReturnToDashboard}
          className="px-4 py-2 bg-blue-600/50 text-white rounded-xl hover:bg-blue-600/70 transition-colors border border-blue-400/30 font-semibold"
        >
          🏠 ホームに戻る
        </button>
      </div>
      
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md">
        
        {/* System Messages */}
        {message && (
          <div className="mb-6 p-4 rounded-xl bg-green-500/20 border border-green-400/30 text-green-300">
            <div className="flex items-start gap-3">
              <FaLock className="text-green-400 mt-1 flex-shrink-0" />
              <div>
                <p className="font-semibold mb-1">パスワードリセット</p>
                <p className="text-sm">{message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Authentication Error Messages */}
        {authError && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-400/30 text-red-300">
            <div className="flex items-start gap-3">
              <FaExclamationTriangle className="text-red-400 mt-1 flex-shrink-0" />
              <div>
                <p className="font-semibold mb-1">エラー</p>
                <p className="text-sm mb-3">{authError.userMessage}</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleRequestNewLink}
                    className="px-4 py-2 bg-red-600/50 text-white text-sm rounded-lg hover:bg-red-600/70 transition-colors border border-red-400/30"
                  >
                    新しいリセットリンクを要求
                  </button>
                  <button
                    onClick={handleReturnToDashboard}
                    className="px-4 py-2 bg-blue-600/50 text-white text-sm rounded-lg hover:bg-blue-600/70 transition-colors border border-blue-400/30"
                  >
                    ダッシュボードに戻る
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Password Reset Form */}
        {sessionEstablished && !authError && (
          <>
            <PasswordResetForm
              onSuccess={handlePasswordChangeSuccess}
              onError={handlePasswordChangeError}
            />
            
          </>
        )}

        {/* Help Information */}
        <div className="mt-6 p-4 rounded-xl bg-blue-500/10 border border-blue-400/20">
          <div className="flex items-start gap-3 text-blue-300">
            <FaLock className="mt-1 flex-shrink-0" />
            <div>
              <p className="font-semibold mb-2">パスワードリセットについて</p>
              <ul className="text-xs space-y-1">
                <li>• リセットリンクは1時間で期限切れになります</li>
                <li>• パスワードは8文字以上、大文字・小文字・数字・記号を含む</li>
                <li>• 問題がある場合は新しいリセットリンクを要求してください</li>
              </ul>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>読み込み中...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔄 Auth callback処理開始...', {
          url: window.location.href,
          params: Object.fromEntries(searchParams.entries())
        });

        // URLからパラメータを取得
        const accessToken = searchParams.get('access_token');
        const type = searchParams.get('type');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // エラーがある場合
        if (error) {
          console.error('❌ Auth callback エラー:', error, errorDescription);
          setStatus('error');
          setMessage(`認証エラー: ${errorDescription || error}`);
          
          setTimeout(() => {
            router.replace('/login?message=auth_error');
          }, 3000);
          return;
        }

        // リカバリートークンがある場合（パスワードリセット）
        if (type === 'recovery' && accessToken) {
          console.log('🔑 パスワードリセット認証処理...');
          
          // Supabase Auth を使ってトークンを処理
          const { data, error: authError } = await supabase.auth.exchangeCodeForSession(accessToken)

          if (authError) {
            console.error('❌ トークン検証エラー:', authError);
            setStatus('error');
            setMessage('パスワードリセットトークンが無効または期限切れです。');
            
            setTimeout(() => {
              router.replace('/login?message=invalid_token');
            }, 3000);
            return;
          }

          if (data.session) {
            console.log('✅ パスワードリセット認証成功');
            setStatus('success');
            setMessage('パスワードリセット認証成功！リダイレクトしています...');
            
            // パスワードリセットページにリダイレクト
            setTimeout(() => {
              router.replace('/reset-password');
            }, 1500);
            return;
          }
        }

        // トークンがない場合
        console.warn('⚠️ 有効なトークンが見つかりません');
        setStatus('error');
        setMessage('認証トークンが見つかりません。');
        
        setTimeout(() => {
          router.replace('/login?message=no_token');
        }, 3000);

      } catch (error) {
        console.error('💥 Auth callback処理エラー:', error);
        setStatus('error');
        setMessage('認証処理中にエラーが発生しました。');
        
        setTimeout(() => {
          router.replace('/login?message=callback_error');
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600">
      <div className="text-center text-white">
        <div className="mb-6">
          {status === 'loading' && (
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          )}
          {status === 'success' && (
            <div className="text-green-400 text-6xl mb-4">✓</div>
          )}
          {status === 'error' && (
            <div className="text-red-400 text-6xl mb-4">✗</div>
          )}
        </div>
        
        <h1 className="text-2xl font-bold mb-4">
          {status === 'loading' && '認証処理中...'}
          {status === 'success' && '認証成功'}
          {status === 'error' && '認証エラー'}
        </h1>
        
        <p className="text-lg mb-4">{message}</p>
        
        {status === 'loading' && (
          <p className="text-sm opacity-75">しばらくお待ちください...</p>
        )}
        
        {status === 'success' && (
          <p className="text-sm opacity-75">自動的にリダイレクトします</p>
        )}
        
        {status === 'error' && (
          <p className="text-sm opacity-75">ログインページに戻ります</p>
        )}

        <div className="mt-8 text-xs opacity-50">
          <details>
            <summary>デバッグ情報</summary>
            <div className="text-left mt-2 bg-black/20 p-2 rounded">
              <p>Type: {searchParams.get('type') || 'なし'}</p>
              <p>Access Token: {searchParams.get('access_token') ? 'あり' : 'なし'}</p>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold mb-4">認証処理中...</h1>
          <p className="text-lg mb-4">しばらくお待ちください...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}

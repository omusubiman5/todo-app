'use client';

import { useState, useEffect } from 'react';
import { setCookieConsent } from '@/lib/analytics';

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Cookie同意が必要な場合のみ表示
    const consentRequired = process.env.NEXT_PUBLIC_COOKIE_CONSENT_REQUIRED === 'true';
    if (!consentRequired) {
      setIsLoaded(true);
      return;
    }

    // 既に同意済みかチェック
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setShowBanner(true);
    }
    setIsLoaded(true);
  }, []);

  const handleAccept = () => {
    setCookieConsent(true);
    setShowBanner(false);
  };

  const handleDecline = () => {
    setCookieConsent(false);
    setShowBanner(false);
  };

  // ローディング中またはバナー非表示の場合は何も表示しない
  if (!isLoaded || !showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 shadow-lg z-50">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm">
            🍪 このサイトではユーザーエクスペリエンス向上のためにクッキーを使用しています。
            <br />
            <span className="text-xs text-gray-300">
              分析目的でGoogle Analytics 4を使用し、IPアドレス匿名化等のプライバシー保護を実施しています。
            </span>
          </p>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={handleDecline}
            className="px-4 py-2 text-sm border border-gray-600 rounded hover:bg-gray-800 transition-colors"
          >
            拒否
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 text-sm bg-blue-600 rounded hover:bg-blue-700 transition-colors"
          >
            同意する
          </button>
        </div>
      </div>

      {/* プライバシーポリシーリンク */}
      <div className="mt-2 text-xs text-gray-400">
        <a
          href="/privacy"
          className="underline hover:text-gray-200"
          target="_blank"
          rel="noopener noreferrer"
        >
          プライバシーポリシー
        </a>
        {' | '}
        <a
          href="https://policies.google.com/privacy"
          className="underline hover:text-gray-200"
          target="_blank"
          rel="noopener noreferrer"
        >
          Googleプライバシーポリシー
        </a>
      </div>
    </div>
  );
}
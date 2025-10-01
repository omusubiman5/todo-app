'use client';

import { useState, useEffect } from 'react';
import { use2FA } from '@/lib/hooks/use2FA';
import { QRCodeDisplay } from './QRCodeDisplay';

interface TwoFactorSetupProps {
  onClose: () => void;
}

export function TwoFactorSetup({ onClose }: TwoFactorSetupProps) {
  const {
    loading,
    error,
    isEnabled,
    checkMFAStatus,
    disableMFA,
    clearError
  } = use2FA();

  const [showQRSetup, setShowQRSetup] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  useEffect(() => {
    checkMFAStatus();
  }, [checkMFAStatus]);

  const handleEnable = () => {
    clearError();
    setShowQRSetup(true);
  };

  const handleDisable = async () => {
    if (!confirm('二要素認証を無効にしますか？\n\nセキュリティが低下する可能性があります。')) {
      return;
    }

    setIsDisabling(true);
    const success = await disableMFA();
    setIsDisabling(false);

    if (success) {
      await checkMFAStatus();
    }
  };

  const handleSetupComplete = async () => {
    setShowQRSetup(false);
    await checkMFAStatus();
  };

  const handleCancel = () => {
    setShowQRSetup(false);
    clearError();
  };

  if (showQRSetup) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
          <QRCodeDisplay
            onSetupComplete={handleSetupComplete}
            onCancel={handleCancel}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">二要素認証設定</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">二要素認証</h3>
              <p className="text-sm text-gray-600">
                {isEnabled
                  ? 'アカウントは二要素認証で保護されています'
                  : 'ログインのセキュリティを強化します'
                }
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {loading ? (
                <span className="text-sm text-gray-500">確認中...</span>
              ) : (
                <>
                  <span className={`text-sm font-medium ${isEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                    {isEnabled ? '有効' : '無効'}
                  </span>
                  <div className={`w-3 h-3 rounded-full ${isEnabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {!isEnabled ? (
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded text-sm">
                  <p><strong>二要素認証とは？</strong></p>
                  <p>
                    パスワードに加えて、認証アプリで生成される6桁のコードでログインする仕組みです。
                    銀行のATMのように、「知っているもの（パスワード）」と「持っているもの（スマートフォン）」の
                    両方が必要になり、アカウントのセキュリティが大幅に向上します。
                  </p>
                </div>
                <button
                  onClick={handleEnable}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  二要素認証を有効にする
                </button>
              </div>
            ) : (
              <button
                onClick={handleDisable}
                disabled={loading || isDisabling}
                className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {isDisabling ? '無効化中...' : '二要素認証を無効にする'}
              </button>
            )}

            <button
              onClick={onClose}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
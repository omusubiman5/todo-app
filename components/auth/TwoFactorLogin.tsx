'use client';

import { useState } from 'react';
import { use2FA } from '@/lib/hooks/use2FA';

interface TwoFactorLoginProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function TwoFactorLogin({ onSuccess, onCancel }: TwoFactorLoginProps) {
  const {
    loading,
    error,
    createChallenge,
    verifyChallenge,
    clearError
  } = use2FA();

  const [verificationCode, setVerificationCode] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [step, setStep] = useState<'create' | 'verify'>('create');

  const handleCreateChallenge = async () => {
    clearError();
    const id = await createChallenge();
    if (id) {
      setChallengeId(id);
      setStep('verify');
    }
  };

  const handleVerifyCode = async () => {
    if (!challengeId || !verificationCode || verificationCode.length !== 6) {
      return;
    }

    const success = await verifyChallenge(challengeId, verificationCode);
    if (success) {
      onSuccess();
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setVerificationCode(value);
  };

  if (step === 'create') {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 max-w-sm mx-auto">
        <h2 className="text-xl font-semibold mb-4 text-center">
          二要素認証
        </h2>

        <div className="space-y-4 text-sm text-gray-600 mb-6">
          <p className="text-center">
            ログインを完了するには、認証アプリで生成された6桁のコードが必要です。
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            disabled={loading}
          >
            キャンセル
          </button>
          <button
            onClick={handleCreateChallenge}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '準備中...' : '認証開始'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-sm mx-auto">
      <h2 className="text-xl font-semibold mb-4 text-center">
        認証コード入力
      </h2>

      <div className="space-y-4">
        <div className="text-sm text-gray-600 text-center">
          <p>認証アプリに表示された6桁のコードを入力してください</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
            認証コード
          </label>
          <input
            type="text"
            value={verificationCode}
            onChange={handleCodeChange}
            placeholder="123456"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg tracking-widest"
            maxLength={6}
            autoFocus
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            disabled={loading}
          >
            キャンセル
          </button>
          <button
            onClick={handleVerifyCode}
            disabled={loading || verificationCode.length !== 6}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '確認中...' : 'ログイン'}
          </button>
        </div>

        <div className="text-center">
          <button
            onClick={() => setStep('create')}
            className="text-sm text-blue-600 hover:text-blue-800"
            disabled={loading}
          >
            認証コードを再生成
          </button>
        </div>
      </div>
    </div>
  );
}
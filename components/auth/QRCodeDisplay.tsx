'use client';

import { useState } from 'react';
import { use2FA } from '@/lib/hooks/use2FA';

interface QRCodeDisplayProps {
  onSetupComplete: () => void;
  onCancel: () => void;
}

export function QRCodeDisplay({ onSetupComplete, onCancel }: QRCodeDisplayProps) {
  const {
    loading,
    error,
    qrCodeDataURL,
    enrollMFA,
    verifyEnrollment,
    clearError
  } = use2FA();

  const [step, setStep] = useState<'enroll' | 'verify'>('enroll');
  const [verificationCode, setVerificationCode] = useState('');
  const [enrollmentData, setEnrollmentData] = useState<any>(null);

  const handleStartSetup = async () => {
    clearError();
    const data = await enrollMFA();
    if (data) {
      setEnrollmentData(data);
      setStep('verify');
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      return;
    }

    const success = await verifyEnrollment(verificationCode);
    if (success) {
      onSetupComplete();
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setVerificationCode(value);
  };

  if (step === 'enroll') {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
        <h2 className="text-xl font-semibold mb-4 text-center">
          二要素認証の設定
        </h2>

        <div className="space-y-4 text-sm text-gray-600 mb-6">
          <p>
            二要素認証を有効にすると、ログイン時にパスワードに加えて、
            認証アプリで生成される6桁のコードが必要になります。
          </p>
          <p>
            <strong>準備するもの：</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Google Authenticator</li>
            <li>Microsoft Authenticator</li>
            <li>Authy</li>
            <li>その他のTOTP認証アプリ</li>
          </ul>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
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
            onClick={handleStartSetup}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '設定中...' : '設定を開始'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-4 text-center">
        認証アプリの設定
      </h2>

      {qrCodeDataURL && (
        <div className="space-y-4">
          <div className="text-center">
            <img
              src={qrCodeDataURL}
              alt="2FA QR Code"
              className="mx-auto border rounded"
              style={{ width: '200px', height: '200px' }}
            />
          </div>

          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>手順：</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>認証アプリを開く</li>
              <li>「QRコードをスキャン」を選択</li>
              <li>上のQRコードを読み取る</li>
              <li>アプリに表示された6桁のコードを入力</li>
            </ol>
          </div>

          {enrollmentData?.secret && (
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-500 mb-1">
                QRコードが読み取れない場合は、手動で入力：
              </p>
              <code className="text-xs break-all bg-white px-2 py-1 rounded border">
                {enrollmentData.secret}
              </code>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                認証コード（6桁）
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={handleCodeChange}
                placeholder="123456"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg tracking-widest"
                maxLength={6}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => setStep('enroll')}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                disabled={loading}
              >
                戻る
              </button>
              <button
                onClick={handleVerifyCode}
                disabled={loading || verificationCode.length !== 6}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '確認中...' : '確認'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
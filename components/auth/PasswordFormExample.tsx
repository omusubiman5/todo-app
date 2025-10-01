'use client';

import { useState } from 'react';
import { PasswordInputWithStrength } from './PasswordStrengthIndicator';
import {
  checkPasswordStrength,
  DEFAULT_PASSWORD_REQUIREMENTS,
  type PasswordRequirements
} from '@/lib/utils/passwordStrength';

interface PasswordFormExampleProps {
  onSubmit?: (password: string) => void;
  customRequirements?: PasswordRequirements;
  title?: string;
}

export function PasswordFormExample({
  onSubmit,
  customRequirements = DEFAULT_PASSWORD_REQUIREMENTS,
  title = "新しいパスワードを設定"
}: PasswordFormExampleProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setIsSubmitting(true);

    const validationErrors: string[] = [];

    // パスワード強度チェック
    const strengthResult = checkPasswordStrength(password, customRequirements);
    if (!strengthResult.isValid) {
      validationErrors.push('パスワードが要件を満たしていません');
    }

    // 確認パスワードチェック
    if (password !== confirmPassword) {
      validationErrors.push('パスワードが一致しません');
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      if (onSubmit) {
        await onSubmit(password);
      }
      // 成功時の処理
      console.log('パスワード設定完了');
    } catch (error) {
      setErrors(['パスワードの設定に失敗しました']);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-6 text-center">{title}</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* パスワード入力 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            新しいパスワード
          </label>
          <PasswordInputWithStrength
            value={password}
            onChange={setPassword}
            requirements={customRequirements}
            showStrength={true}
          />
        </div>

        {/* パスワード確認入力 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            パスワード確認
          </label>
          <div className="relative">
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="パスワードを再入力"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                confirmPassword && password !== confirmPassword
                  ? 'border-red-500'
                  : 'border-gray-300'
              }`}
            />
          </div>
          {confirmPassword && password !== confirmPassword && (
            <div className="text-red-600 text-sm mt-1">
              パスワードが一致しません
            </div>
          )}
          {confirmPassword && password === confirmPassword && password && (
            <div className="text-green-600 text-sm mt-1 flex items-center">
              <span className="mr-1">✅</span>
              パスワードが一致しています
            </div>
          )}
        </div>

        {/* エラーメッセージ */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <ul className="list-disc list-inside space-y-1">
              {errors.map((error, index) => (
                <li key={index} className="text-sm">{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 送信ボタン */}
        <button
          type="submit"
          disabled={
            isSubmitting ||
            !password ||
            !confirmPassword ||
            password !== confirmPassword ||
            !checkPasswordStrength(password, customRequirements).isValid
          }
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? '設定中...' : 'パスワードを設定'}
        </button>
      </form>

      {/* パスワード要件の説明 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 mb-2">パスワード要件</h3>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• {customRequirements.minLength}文字以上{customRequirements.maxLength}文字以下</li>
          {customRequirements.requireUppercase && <li>• 大文字を含む（A-Z）</li>}
          {customRequirements.requireLowercase && <li>• 小文字を含む（a-z）</li>}
          {customRequirements.requireNumbers && <li>• 数字を含む（0-9）</li>}
          {customRequirements.requireSpecialChars && <li>• 特殊文字を含む（!@#$%等）</li>}
          <li>• 一般的な単語やパターンは避ける</li>
          <li>• 連続する同じ文字は避ける</li>
        </ul>
      </div>
    </div>
  );
}

// 使用例コンポーネント
export function PasswordFormExamples() {
  const [activeExample, setActiveExample] = useState<string>('default');

  // カスタム要件の例
  const strictRequirements: PasswordRequirements = {
    minLength: 12,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    forbiddenPatterns: ['password', '12345', 'qwerty', 'abc'],
    forbiddenWords: ['password', 'admin', 'user', 'login']
  };

  const basicRequirements: PasswordRequirements = {
    minLength: 6,
    maxLength: 128,
    requireUppercase: false,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false
  };

  const examples = {
    default: {
      title: "標準設定",
      requirements: DEFAULT_PASSWORD_REQUIREMENTS,
      description: "一般的なセキュリティ要件"
    },
    strict: {
      title: "厳格設定",
      requirements: strictRequirements,
      description: "高セキュリティ環境向け"
    },
    basic: {
      title: "基本設定",
      requirements: basicRequirements,
      description: "最低限の要件"
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">パスワード強度チェック例</h1>

        {/* 例の選択 */}
        <div className="flex justify-center space-x-4 mb-6">
          {Object.entries(examples).map(([key, example]) => (
            <button
              key={key}
              onClick={() => setActiveExample(key)}
              className={`px-4 py-2 rounded-md text-sm ${
                activeExample === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {example.title}
            </button>
          ))}
        </div>

        <p className="text-gray-600 text-sm mb-6">
          {examples[activeExample as keyof typeof examples].description}
        </p>
      </div>

      <PasswordFormExample
        title={`${examples[activeExample as keyof typeof examples].title} - パスワード設定`}
        customRequirements={examples[activeExample as keyof typeof examples].requirements}
        onSubmit={(password) => {
          console.log('パスワード設定:', password);
          alert('パスワードが設定されました！');
        }}
      />
    </div>
  );
}
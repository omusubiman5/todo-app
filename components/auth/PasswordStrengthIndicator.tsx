'use client';

import { useState, useMemo } from 'react';
import {
  checkPasswordStrength,
  getPasswordStrengthColor,
  getPasswordStrengthLabel,
  type PasswordRequirements,
  type PasswordStrengthResult
} from '@/lib/utils/passwordStrength';

interface PasswordStrengthIndicatorProps {
  password: string;
  requirements?: PasswordRequirements;
  showDetailedFeedback?: boolean;
  className?: string;
}

export function PasswordStrengthIndicator({
  password,
  requirements,
  showDetailedFeedback = true,
  className = ''
}: PasswordStrengthIndicatorProps) {
  const strengthResult = useMemo(() => {
    if (!password) return null;
    return checkPasswordStrength(password, requirements);
  }, [password, requirements]);

  if (!password || !strengthResult) {
    return null;
  }

  const { score, level, feedback, requirements: checks, isValid } = strengthResult;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 強度メーター */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">
            パスワード強度
          </span>
          <span className={`text-sm font-medium ${getPasswordStrengthColor(level).split(' ')[0]}`}>
            {getPasswordStrengthLabel(level)}
          </span>
        </div>

        {/* 強度バー */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              level === 'very-weak' ? 'bg-red-500' :
              level === 'weak' ? 'bg-orange-500' :
              level === 'fair' ? 'bg-yellow-500' :
              level === 'good' ? 'bg-blue-500' :
              'bg-green-500'
            }`}
            style={{ width: `${(score / 4) * 100}%` }}
          />
        </div>

        {/* 強度レベル表示 */}
        <div className="flex justify-between text-xs text-gray-500">
          <span>弱い</span>
          <span>強い</span>
        </div>
      </div>

      {/* 要件チェックリスト */}
      {showDetailedFeedback && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">要件チェック</h4>
          <div className="space-y-1">
            {checks.map((check, index) => (
              <div key={index} className="flex items-center space-x-2 text-sm">
                <span className={`text-sm ${check.passed ? 'text-green-600' : 'text-red-600'}`}>
                  {check.passed ? '✅' : '❌'}
                </span>
                <span className={`${check.passed ? 'text-gray-700' : 'text-red-600'}`}>
                  {check.description}
                </span>
                {check.priority === 'high' && !check.passed && (
                  <span className="text-xs text-red-500 font-medium">必須</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* フィードバックメッセージ */}
      {showDetailedFeedback && feedback.length > 0 && (
        <div className={`p-3 rounded-lg border ${getPasswordStrengthColor(level)}`}>
          <div className="space-y-1">
            {feedback.map((message, index) => (
              <div key={index} className="text-sm">
                {message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 有効性インジケーター */}
      <div className={`flex items-center space-x-2 text-sm ${
        isValid ? 'text-green-600' : 'text-red-600'
      }`}>
        <span>{isValid ? '✅' : '❌'}</span>
        <span>
          {isValid ? 'このパスワードは使用できます' : 'パスワードが要件を満たしていません'}
        </span>
      </div>
    </div>
  );
}

interface PasswordInputWithStrengthProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  requirements?: PasswordRequirements;
  showStrength?: boolean;
  className?: string;
  error?: string;
}

export function PasswordInputWithStrength({
  value,
  onChange,
  placeholder = "パスワードを入力",
  requirements,
  showStrength = true,
  className = '',
  error
}: PasswordInputWithStrengthProps) {
  const [showPassword, setShowPassword] = useState(false);

  const strengthResult = useMemo(() => {
    if (!value) return null;
    return checkPasswordStrength(value, requirements);
  }, [value, requirements]);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* パスワード入力フィールド */}
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
        >
          {showPassword ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464M14.12 14.12l1.415 1.415" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>

      {/* エラーメッセージ */}
      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      {/* 強度インジケーター */}
      {showStrength && value && (
        <PasswordStrengthIndicator
          password={value}
          requirements={requirements}
          showDetailedFeedback={true}
        />
      )}
    </div>
  );
}
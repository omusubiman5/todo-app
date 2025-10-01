'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  checkPasswordStrength,
  DEFAULT_PASSWORD_REQUIREMENTS,
  type PasswordRequirements,
  type PasswordStrengthResult
} from '@/lib/utils/passwordStrength';

interface UsePasswordValidationOptions {
  requirements?: PasswordRequirements;
  debounceMs?: number;
}

interface UsePasswordValidationReturn {
  password: string;
  confirmPassword: string;
  strength: PasswordStrengthResult | null;
  errors: string[];
  isValid: boolean;
  isPasswordMatch: boolean;
  setPassword: (password: string) => void;
  setConfirmPassword: (confirmPassword: string) => void;
  validatePassword: () => boolean;
  clearErrors: () => void;
  reset: () => void;
}

export function usePasswordValidation({
  requirements = DEFAULT_PASSWORD_REQUIREMENTS,
  debounceMs = 300
}: UsePasswordValidationOptions = {}): UsePasswordValidationReturn {
  const [password, setPasswordState] = useState('');
  const [confirmPassword, setConfirmPasswordState] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  // パスワード強度の計算（メモ化）
  const strength = useMemo(() => {
    if (!password) return null;
    return checkPasswordStrength(password, requirements);
  }, [password, requirements]);

  // パスワード一致チェック
  const isPasswordMatch = useMemo(() => {
    if (!password || !confirmPassword) return true; // 空の場合はエラーを表示しない
    return password === confirmPassword;
  }, [password, confirmPassword]);

  // 全体的な有効性チェック
  const isValid = useMemo(() => {
    if (!password || !confirmPassword) return false;
    return strength?.isValid === true && isPasswordMatch;
  }, [password, confirmPassword, strength, isPasswordMatch]);

  // パスワード設定（デバウンス付き）
  const setPassword = useCallback((newPassword: string) => {
    setPasswordState(newPassword);
    setErrors([]); // 新しい入力でエラーをクリア
  }, []);

  // 確認パスワード設定
  const setConfirmPassword = useCallback((newConfirmPassword: string) => {
    setConfirmPasswordState(newConfirmPassword);
    setErrors([]); // 新しい入力でエラーをクリア
  }, []);

  // 手動バリデーション実行
  const validatePassword = useCallback((): boolean => {
    const validationErrors: string[] = [];

    // パスワードが空
    if (!password) {
      validationErrors.push('パスワードを入力してください');
    }

    // 確認パスワードが空
    if (!confirmPassword) {
      validationErrors.push('パスワード確認を入力してください');
    }

    // パスワード強度チェック
    if (password && strength && !strength.isValid) {
      validationErrors.push('パスワードが要件を満たしていません');

      // 具体的な不足要件を追加
      const failedRequirements = strength.requirements
        .filter(req => !req.passed && req.priority === 'high')
        .map(req => req.description);

      if (failedRequirements.length > 0) {
        validationErrors.push(...failedRequirements.map(req => `• ${req}`));
      }
    }

    // パスワード一致チェック
    if (password && confirmPassword && !isPasswordMatch) {
      validationErrors.push('パスワードが一致しません');
    }

    setErrors(validationErrors);
    return validationErrors.length === 0;
  }, [password, confirmPassword, strength, isPasswordMatch]);

  // エラークリア
  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  // リセット
  const reset = useCallback(() => {
    setPasswordState('');
    setConfirmPasswordState('');
    setErrors([]);
  }, []);

  return {
    password,
    confirmPassword,
    strength,
    errors,
    isValid,
    isPasswordMatch,
    setPassword,
    setConfirmPassword,
    validatePassword,
    clearErrors,
    reset
  };
}

// フォーム送信用のヘルパーフック
interface UsePasswordFormOptions extends UsePasswordValidationOptions {
  onSubmit?: (password: string) => Promise<void> | void;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface UsePasswordFormReturn extends UsePasswordValidationReturn {
  isSubmitting: boolean;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  canSubmit: boolean;
}

export function usePasswordForm({
  requirements = DEFAULT_PASSWORD_REQUIREMENTS,
  debounceMs = 300,
  onSubmit,
  onSuccess,
  onError
}: UsePasswordFormOptions = {}): UsePasswordFormReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validation = usePasswordValidation({ requirements, debounceMs });

  // 送信可能かどうか
  const canSubmit = validation.isValid && !isSubmitting;

  // フォーム送信処理
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    // バリデーション実行
    if (!validation.validatePassword()) {
      return;
    }

    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (onSubmit) {
        await onSubmit(validation.password);
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : 'パスワードの設定に失敗しました';

      validation.clearErrors();
      validation.setPassword(''); // エラー時はパスワードをクリア

      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [validation, canSubmit, onSubmit, onSuccess, onError]);

  return {
    ...validation,
    isSubmitting,
    handleSubmit,
    canSubmit
  };
}

// パスワード要件をカスタマイズするためのヘルパー
export function createPasswordRequirements(
  overrides: Partial<PasswordRequirements>
): PasswordRequirements {
  return {
    ...DEFAULT_PASSWORD_REQUIREMENTS,
    ...overrides
  };
}

// よく使われるパスワード要件のプリセット
export const PASSWORD_PRESETS = {
  // 基本的な要件
  BASIC: createPasswordRequirements({
    minLength: 6,
    requireUppercase: false,
    requireSpecialChars: false
  }),

  // 標準的な要件
  STANDARD: DEFAULT_PASSWORD_REQUIREMENTS,

  // 厳格な要件
  STRICT: createPasswordRequirements({
    minLength: 12,
    forbiddenPatterns: [
      'password', 'pass', '12345', 'qwerty', 'abc', 'admin', 'user',
      'login', 'welcome', 'hello', 'test', 'demo', '0000', '1111'
    ]
  }),

  // 企業向け要件
  ENTERPRISE: createPasswordRequirements({
    minLength: 14,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    forbiddenPatterns: [
      'password', 'company', 'welcome', 'admin', 'root', 'test',
      '12345', 'qwerty', 'abcdef', '000', '111', '123'
    ],
    forbiddenWords: [
      'password', 'パスワード', 'company', '会社', 'admin', '管理者',
      'user', 'ユーザー', 'login', 'ログイン', 'welcome', 'ようこそ'
    ]
  })
} as const;
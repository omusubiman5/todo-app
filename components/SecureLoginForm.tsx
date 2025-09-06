"use client";

import React, { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { 
  mapSupabaseError, 
  validateAuthInput, 
  AuthSecurityMonitor, 
  logAuthEvent,
  type AuthError 
} from '@/lib/authErrors';
import { FaEye, FaEyeSlash, FaExclamationTriangle, FaShieldAlt, FaSpinner, FaCheckCircle, FaKey, FaEnvelope, FaArrowLeft } from 'react-icons/fa';

// hCaptchaを動的インポート（SSRを回避）
const HCaptcha = dynamic(() => import('@hcaptcha/react-hcaptcha'), {
  ssr: false,
  loading: () => <div className="h-16 flex items-center justify-center text-white/60">Captcha読み込み中...</div>
});

interface SecureLoginFormProps {
  onSuccess?: () => void;
  onError?: (error: AuthError) => void;
  className?: string;
}

interface FormState {
  email: string;
  password: string;
  isLoading: boolean;
  showPassword: boolean;
  error: AuthError | null;
  isSignUp: boolean;
  rateLimited: boolean;
  retryAfter: number;
  showForgotPassword: boolean;
  resetEmailSent: boolean;
  captchaToken: string | null;
  captchaError: boolean;
}

export default function SecureLoginForm({ 
  onSuccess, 
  onError,
  className = "" 
}: SecureLoginFormProps) {
  const [formState, setFormState] = useState<FormState>({
    email: '',
    password: '',
    isLoading: false,
    showPassword: false,
    error: null,
    isSignUp: false,
    rateLimited: false,
    retryAfter: 0,
    showForgotPassword: false,
    resetEmailSent: false,
    captchaToken: null,
    captchaError: false
  });

  const securityMonitor = AuthSecurityMonitor.getInstance();

  // Rate limit countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (formState.retryAfter > 0) {
      interval = setInterval(() => {
        setFormState(prev => ({
          ...prev,
          retryAfter: Math.max(0, prev.retryAfter - 1),
          rateLimited: prev.retryAfter > 1
        }));
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [formState.retryAfter]);

  const handleInputChange = useCallback((field: 'email' | 'password', value: string) => {
    // Clear error when user starts typing
    setFormState(prev => ({
      ...prev,
      [field]: value,
      error: null
    }));
  }, []);

  const validateForm = useCallback((): boolean => {
    // Validate email
    const emailValidation = validateAuthInput.email(formState.email);
    if (!emailValidation.isValid && emailValidation.error) {
      setFormState(prev => ({ ...prev, error: emailValidation.error! }));
      onError?.(emailValidation.error);
      return false;
    }

    // Validate password
    const passwordValidation = validateAuthInput.password(formState.password);
    if (!passwordValidation.isValid && passwordValidation.error) {
      setFormState(prev => ({ ...prev, error: passwordValidation.error! }));
      onError?.(passwordValidation.error);
      return false;
    }

    return true;
  }, [formState.email, formState.password, onError]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formState.isLoading || formState.rateLimited) return;

    // Client-side validation
    if (!validateForm()) return;

    // Captcha validation (skip in development if configured)
    const skipCaptcha = process.env.NEXT_PUBLIC_SKIP_CAPTCHA === 'true' || process.env.NEXT_PUBLIC_DEV_MODE === 'true';
    const captchaToken = skipCaptcha ? 'dev-bypass-token' : formState.captchaToken;
    
    if (!skipCaptcha && !formState.captchaToken) {
      const captchaError: AuthError = {
        code: 'captcha_required',
        message: 'Captcha verification required',
        severity: 'warning',
        userMessage: 'セキュリティ認証が必要です。Captchaを完了してください。'
      };
      
      setFormState(prev => ({ ...prev, error: captchaError }));
      onError?.(captchaError);
      return;
    }

    // Check rate limiting
    const rateCheck = securityMonitor.checkRateLimit(formState.email);
    if (!rateCheck.allowed) {
      const rateLimitError: AuthError = {
        code: 'rate_limit_exceeded',
        message: 'Too many attempts',
        severity: 'warning',
        userMessage: 'ログイン試行回数が制限を超えました。しばらく時間をおいてから再度お試しください。'
      };
      
      setFormState(prev => ({
        ...prev,
        error: rateLimitError,
        rateLimited: true,
        retryAfter: rateCheck.retryAfter || 300
      }));
      
      onError?.(rateLimitError);
      return;
    }

    setFormState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Log attempt
      logAuthEvent('login_attempt', {
        email: formState.email,
        userAgent: navigator.userAgent
      });

      // Debug: Check Supabase configuration
      console.log('🔍 Debug - Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.log('🔍 Debug - Anon Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      console.log('🔍 Debug - Login attempt for:', formState.email);

      let result;
      
      if (formState.isSignUp) {
        // Sign up
        result = await supabase.auth.signUp({
          email: formState.email.trim().toLowerCase(),
          password: formState.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              email_confirm: true
            },
            captchaToken: captchaToken || undefined
          }
        });
      } else {
        // Sign in
        result = await supabase.auth.signInWithPassword({
          email: formState.email.trim().toLowerCase(),
          password: formState.password,
          options: {
            captchaToken: captchaToken || undefined
          }
        });
      }

      const { data, error } = result;

      if (error) {
        // Debug: Log detailed error information
        console.error('🚨 Supabase Auth Error Details:');
        console.error('- Message:', error.message);
        console.error('- Code:', error.code);
        console.error('- Status:', error.status);
        console.error('- Full error object:', error);
        
        // Map and handle error securely
        const authError = mapSupabaseError(error);
        console.log('🔄 Mapped auth error:', authError);
        
        setFormState(prev => ({ ...prev, error: authError, isLoading: false }));
        onError?.(authError);
        
        // Record failed attempt for rate limiting
        securityMonitor.recordFailedAttempt(formState.email);
        
        // Log failure (no sensitive data)
        logAuthEvent('login_failure', {
          email: formState.email,
          errorCode: authError.code,
          userAgent: navigator.userAgent
        });
        
        return;
      }

      // Success
      if (data.user && data.session) {
        console.log('🎉 Login successful, setting up session persistence');
        
        // 🚨 セキュリティ修正: ローカルストレージ保存を無効化
        console.log('🔒 Security: Local storage session save disabled');
        
        // Record successful attempt (reset rate limiting)
        securityMonitor.recordSuccessfulAttempt(formState.email);
        
        // Log success
        logAuthEvent('login_success', {
          userId: data.user.id,
          email: formState.email,
          userAgent: navigator.userAgent
        });

        setFormState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: null,
          email: '',
          password: ''
        }));
        
        // 少し遅延してからonSuccessを呼び出し、セッション保存を確実にする
        setTimeout(() => {
          onSuccess?.();
        }, 100);
      }

    } catch (err: unknown) {
      // Handle unexpected errors with detailed logging
      const error = err as Error;
      console.error('🚨 Unexpected Error Details:');
      console.error('- Error type:', typeof error);
      console.error('- Error name:', error.name);
      console.error('- Error message:', error.message);
      console.error('- Error stack:', err instanceof Error ? err.stack : 'No stack trace');
      console.error('- Full error object:', err);
      console.error('- Network online:', navigator.onLine);
      
      const unexpectedError = mapSupabaseError(err);
      console.log('🔄 Mapped unexpected error:', unexpectedError);
      
      setFormState(prev => ({ ...prev, error: unexpectedError, isLoading: false }));
      onError?.(unexpectedError);
      
      securityMonitor.recordFailedAttempt(formState.email);
      
      logAuthEvent('login_failure', {
        email: formState.email,
        errorCode: 'unexpected_error',
        userAgent: navigator.userAgent
      });
    }
  }, [formState, validateForm, securityMonitor, onSuccess, onError]);

  const togglePasswordVisibility = useCallback(() => {
    setFormState(prev => ({ ...prev, showPassword: !prev.showPassword }));
  }, []);

  const toggleSignUpMode = useCallback(() => {
    setFormState(prev => ({ 
      ...prev, 
      isSignUp: !prev.isSignUp, 
      error: null,
      email: '',
      password: ''
    }));
  }, []);

  const handlePasswordReset = useCallback(async () => {
    if (!formState.email) {
      setFormState(prev => ({
        ...prev,
        error: {
          code: 'email_required',
          message: 'Email required for password reset',
          severity: 'warning',
          userMessage: 'パスワードリセットにはメールアドレスの入力が必要です。'
        }
      }));
      return;
    }

    const emailValidation = validateAuthInput.email(formState.email);
    if (!emailValidation.isValid && emailValidation.error) {
      setFormState(prev => ({ ...prev, error: emailValidation.error! }));
      return;
    }

    setFormState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        formState.email.trim().toLowerCase(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
          captchaToken: (process.env.NEXT_PUBLIC_SKIP_CAPTCHA === 'true' || process.env.NEXT_PUBLIC_DEV_MODE === 'true') ? 'dev-bypass-token' : (formState.captchaToken || undefined)
        }
      );

      if (error) {
        console.error('Password reset error:', error);
        const authError = mapSupabaseError(error);
        setFormState(prev => ({ ...prev, error: authError, isLoading: false }));
        return;
      }

      setFormState(prev => ({
        ...prev,
        resetEmailSent: true,
        isLoading: false,
        error: null
      }));

    } catch (err: unknown) {
      console.error('Password reset error:', err);
      const unexpectedError = mapSupabaseError(err);
      setFormState(prev => ({ ...prev, error: unexpectedError, isLoading: false }));
    }
  }, [formState.email, formState.captchaToken]);

  const toggleForgotPassword = useCallback(() => {
    setFormState(prev => ({
      ...prev,
      showForgotPassword: !prev.showForgotPassword,
      error: null,
      resetEmailSent: false
    }));
  }, []);

  // hCaptcha handlers
  const handleCaptchaVerify = useCallback((token: string) => {
    setFormState(prev => ({
      ...prev,
      captchaToken: token,
      captchaError: false,
      error: null
    }));
  }, []);

  const handleCaptchaExpire = useCallback(() => {
    setFormState(prev => ({
      ...prev,
      captchaToken: null,
      captchaError: false
    }));
  }, []);

  const handleCaptchaError = useCallback(() => {
    setFormState(prev => ({
      ...prev,
      captchaToken: null,
      captchaError: true,
      error: {
        code: 'captcha_error',
        message: 'Captcha verification failed',
        severity: 'error',
        userMessage: 'Captcha認証に失敗しました。再度お試しください。'
      }
    }));
  }, []);

  const getErrorDisplay = () => {
    if (!formState.error) return null;

    const { severity, userMessage } = formState.error;
    const colors = {
      info: 'bg-blue-500/20 border-blue-400/30 text-blue-300',
      warning: 'bg-yellow-500/20 border-yellow-400/30 text-yellow-300',
      error: 'bg-red-500/20 border-red-400/30 text-red-300',
      critical: 'bg-red-600/20 border-red-500/30 text-red-200'
    };

    return (
      <div className={`mb-4 p-4 rounded-xl border ${colors[severity]}`}>
        <div className="flex items-start gap-3">
          <FaExclamationTriangle className="mt-1 flex-shrink-0" />
          <div>
            <p className="font-semibold mb-1">
              {severity === 'critical' ? '重要なエラー' : 
               severity === 'error' ? 'エラー' : 
               severity === 'warning' ? '警告' : '情報'}
            </p>
            <p className="text-sm">{userMessage}</p>
            {formState.rateLimited && formState.retryAfter > 0 && (
              <p className="text-xs mt-2">
                あと {formState.retryAfter} 秒後に再試行できます
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`w-full max-w-md ${className}`}>
      <div className="p-8 rounded-2xl shadow-2xl backdrop-blur-md border border-white/20 bg-white/10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <FaShieldAlt className="text-green-400" />
            <h1 className="text-3xl font-bold text-white drop-shadow-lg">
              {formState.isSignUp ? '新規登録' : 'ログイン'}
            </h1>
          </div>
          <p className="text-white/70 text-sm">
            セキュアな認証システム
          </p>
        </div>

        {/* Error Display */}
        {getErrorDisplay()}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={formState.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              placeholder="your@example.com"
              required
              disabled={formState.isLoading || formState.rateLimited}
              autoComplete="email"
              maxLength={254}
            />
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
              パスワード
            </label>
            <div className="relative">
              <input
                id="password"
                type={formState.showPassword ? "text" : "password"}
                value={formState.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="w-full px-4 py-3 pr-12 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                placeholder="パスワードを入力"
                required
                disabled={formState.isLoading || formState.rateLimited}
                autoComplete={formState.isSignUp ? "new-password" : "current-password"}
                minLength={8}
                maxLength={128}
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                disabled={formState.isLoading}
                aria-label={formState.showPassword ? "パスワードを隠す" : "パスワードを表示"}
              >
                {formState.showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {formState.isSignUp && (
              <p className="mt-1 text-xs text-white/60">
                8文字以上で入力してください
              </p>
            )}
          </div>

          {/* hCaptcha */}
          {(!process.env.NEXT_PUBLIC_SKIP_CAPTCHA || process.env.NEXT_PUBLIC_SKIP_CAPTCHA !== 'true') && (
            <div className="flex justify-center">
              <HCaptcha
                sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || ''}
                onVerify={handleCaptchaVerify}
                onExpire={handleCaptchaExpire}
                onError={handleCaptchaError}
                theme="dark"
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={formState.isLoading || formState.rateLimited}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold shadow-lg hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
          >
            {formState.isLoading ? (
              <>
                <FaSpinner className="animate-spin" />
                処理中...
              </>
            ) : formState.rateLimited ? (
              <>
                <FaExclamationTriangle />
                制限中 ({formState.retryAfter}秒)
              </>
            ) : (
              <>
                {formState.isSignUp ? (
                  <>
                    <FaCheckCircle />
                    アカウント作成
                  </>
                ) : (
                  <>
                    <FaShieldAlt />
                    ログイン
                  </>
                )}
              </>
            )}
          </button>
        </form>

        {/* Forgot Password Section */}
        {!formState.isSignUp && !formState.showForgotPassword && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={toggleForgotPassword}
              className="text-yellow-300 hover:text-yellow-200 underline transition-colors text-sm"
              disabled={formState.isLoading}
            >
              <FaKey className="inline mr-1" />
              パスワードを忘れた場合
            </button>
          </div>
        )}

        {/* Password Reset Form */}
        {formState.showForgotPassword && (
          <div className="mt-6 p-6 rounded-xl bg-yellow-500/10 border border-yellow-400/30">
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={toggleForgotPassword}
                className="text-white/70 hover:text-white transition-colors"
              >
                <FaArrowLeft />
              </button>
              <h3 className="text-lg font-semibold text-white">パスワードリセット</h3>
            </div>

            {formState.resetEmailSent ? (
              <div className="text-center">
                <FaEnvelope className="text-green-400 text-3xl mx-auto mb-3" />
                <p className="text-green-300 font-semibold mb-2">
                  リセットメールを送信しました！
                </p>
                <p className="text-white/70 text-sm">
                  {formState.email} にパスワードリセットメールを送信しました。
                  メール内のリンクをクリックして新しいパスワードを設定してください。
                </p>
              </div>
            ) : (
              <div>
                <p className="text-white/70 text-sm mb-4">
                  登録済みのメールアドレスを入力してください。パスワードリセット用のリンクを送信します。
                </p>
                <div className="space-y-4">
                  <input
                    type="email"
                    value={formState.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="メールアドレス"
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
                    disabled={formState.isLoading}
                  />
                  <button
                    onClick={handlePasswordReset}
                    disabled={formState.isLoading || !formState.email}
                    className="w-full py-3 px-4 rounded-xl bg-yellow-500 text-black font-semibold hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    {formState.isLoading ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        送信中...
                      </>
                    ) : (
                      <>
                        <FaEnvelope />
                        リセットメールを送信
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Toggle Sign Up/Login */}
        {!formState.showForgotPassword && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={toggleSignUpMode}
              className="text-blue-300 hover:text-blue-200 underline transition-colors"
              disabled={formState.isLoading}
            >
              {formState.isSignUp 
                ? 'すでにアカウントをお持ちですか？ログイン' 
                : 'アカウントをお持ちでない方は新規登録'
              }
            </button>
          </div>
        )}

        {/* Security Notice */}
        <div className="mt-4 text-center">
          <p className="text-xs text-white/50">
            <FaShieldAlt className="inline mr-1" />
            あなたの情報は暗号化されて保護されています
          </p>
        </div>
      </div>
    </div>
  );
}
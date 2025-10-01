"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { type AuthError } from "@/lib/authErrors";
import { FaEye, FaEyeSlash, FaLock, FaCheckCircle } from "react-icons/fa";
import { PasswordInputWithStrength } from "@/components/auth/PasswordStrengthIndicator";
import { usePasswordForm, PASSWORD_PRESETS } from "@/lib/hooks/usePasswordValidation";

interface PasswordResetFormProps {
  onSuccess: () => void;
  onError: (error: AuthError) => void;
}

export default function PasswordResetForm({ onSuccess, onError }: PasswordResetFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    password,
    confirmPassword,
    strength,
    errors: passwordErrors,
    isValid: isPasswordValid,
    setPassword,
    setConfirmPassword,
    validatePassword
  } = usePasswordForm({
    requirements: PASSWORD_PRESETS.STANDARD
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // バリデーション実行
      if (!validatePassword()) {
        // passwordErrors があれば表示
        if (passwordErrors.length > 0) {
          onError({
            code: 'validation_failed',
            userMessage: passwordErrors.join(', '),
            message: 'Validation failed',
            severity: 'error'
          });
        }
        return;
      }

      console.log('🔄 Updating password...');
      
      // セッション確認
      const { data: session } = await supabase.auth.getSession();
      console.log('📊 Current session:', {
        hasSession: !!session.session,
        user: session.session?.user?.email,
        role: session.session?.user?.role,
        recoveryMode: session.session?.user?.recovery_sent_at ? true : false,
        sessionValid: session.session?.expires_at ? new Date(session.session.expires_at * 1000) > new Date() : false
      });

      // セッションが無効な場合の処理
      if (!session.session) {
        console.error('❌ No active session for password update');
        onError({
          code: 'no_session',
          userMessage: 'セッションが無効です。再度リセットリンクをクリックして実行してください。',
          message: 'No active session found',
          severity: 'error'
        });
        return;
      }
      
      try {
        // Update password - リカバリーセッション用の特別な処理
        const { data, error } = await supabase.auth.updateUser({
          password: password
        });

        if (error) {
          console.error('❌ Password update error:', {
            message: error.message,
            code: error.code || 'unknown',
            status: error.status || 'unknown',
            details: error
          });

          // リカバリーセッション特有のエラーの場合、より詳細な案内
          if (error.message.includes('session') || error.message.includes('token')) {
            onError({
              code: 'session_invalid',
              userMessage: 'パスワードリセットセッションが無効です。新しいリセットメールを要求してください。',
              message: error.message,
              severity: 'error'
            });
          } else {
            onError({
              code: 'update_failed',
              userMessage: `パスワードの更新に失敗しました。エラー: ${error.message}`,
              message: error.message,
              severity: 'error'
            });
          }
          return;
        }

        if (data && data.user) {
          console.log('✅ Password update successful:', {
            userId: data.user.id,
            email: data.user.email,
            updatedAt: data.user.updated_at
          });
        }

      } catch (networkError) {
        console.error('🌐 Network error during password update:', networkError);
        onError({
          code: 'network_error',
          userMessage: 'ネットワークエラーが発生しました。接続を確認して再度お試しください。',
          message: networkError instanceof Error ? networkError.message : 'Network error',
          severity: 'error'
        });
        return;
      }

      console.log('Password updated successfully');
      onSuccess();
      
    } catch (error) {
      console.error('Password reset error:', error);
      onError({
        code: 'update_failed',
        userMessage: 'パスワード変更中にエラーが発生しました。',
        message: error instanceof Error ? error.message : 'Unknown error',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/20">
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
          <FaLock className="text-2xl text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">新しいパスワードを設定</h2>
        <p className="text-gray-300 text-sm">セキュアなパスワードを設定してください</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Password Input with Strength Indicator */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            新しいパスワード
          </label>
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="強力なパスワードを入力"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
              required
            />
          </div>

          {/* Password Strength Indicator */}
          {password && strength && (
            <div className="mt-3 p-4 bg-white/5 border border-white/10 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white text-sm font-medium">パスワード強度</span>
                <span className={`text-sm font-medium ${
                  strength.level === 'very-weak' ? 'text-red-300' :
                  strength.level === 'weak' ? 'text-orange-300' :
                  strength.level === 'fair' ? 'text-yellow-300' :
                  strength.level === 'good' ? 'text-blue-300' :
                  'text-green-300'
                }`}>
                  {strength.level === 'very-weak' ? '非常に弱い' :
                   strength.level === 'weak' ? '弱い' :
                   strength.level === 'fair' ? '普通' :
                   strength.level === 'good' ? '良い' : '強い'}
                </span>
              </div>

              {/* Strength Bar */}
              <div className="w-full bg-white/20 rounded-full h-2 mb-3">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    strength.level === 'very-weak' ? 'bg-red-500' :
                    strength.level === 'weak' ? 'bg-orange-500' :
                    strength.level === 'fair' ? 'bg-yellow-500' :
                    strength.level === 'good' ? 'bg-blue-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${(strength.score / 4) * 100}%` }}
                />
              </div>

              {/* Requirements */}
              <div className="space-y-1">
                {strength.requirements.slice(0, 6).map((req, index) => (
                  <div key={index} className="flex items-center text-xs">
                    <span className={`mr-2 ${req.passed ? 'text-green-300' : 'text-red-300'}`}>
                      {req.passed ? '✓' : '✗'}
                    </span>
                    <span className={req.passed ? 'text-white/80' : 'text-red-300'}>
                      {req.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            パスワード確認
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="パスワードを再入力"
            className={`w-full px-4 py-3 bg-white/10 border rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 ${
              confirmPassword && password !== confirmPassword
                ? 'border-red-500'
                : 'border-white/20'
            }`}
            required
          />
          {confirmPassword && password !== confirmPassword && (
            <p className="text-red-300 text-xs mt-1">パスワードが一致しません</p>
          )}
          {confirmPassword && password === confirmPassword && password && (
            <p className="text-green-300 text-xs mt-1 flex items-center">
              <span className="mr-1">✓</span>
              パスワードが一致しています
            </p>
          )}
        </div>

        {/* Error Display */}
        {passwordErrors.length > 0 && (
          <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-4">
            <div className="text-red-300 text-sm">
              {passwordErrors.map((err, index) => (
                <p key={index} className="mb-1">• {err}</p>
              ))}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !isPasswordValid}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 px-4 rounded-xl hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>更新中...</span>
            </div>
          ) : (
            'パスワードを更新'
          )}
        </button>
      </form>
    </div>
  );
}
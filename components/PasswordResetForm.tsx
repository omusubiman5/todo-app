"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { type AuthError } from "@/lib/authErrors";
import { FaEye, FaEyeSlash, FaLock, FaCheckCircle } from "react-icons/fa";

interface PasswordResetFormProps {
  onSuccess: () => void;
  onError: (error: AuthError) => void;
}

export default function PasswordResetForm({ onSuccess, onError }: PasswordResetFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validatePassword = (pwd: string): boolean => {
    // パスワード強度チェック
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(pwd);
    const hasLowerCase = /[a-z]/.test(pwd);
    const hasNumbers = /\d/.test(pwd);
    const hasNonalphas = /\W/.test(pwd);

    return pwd.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasNonalphas;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validation
      if (password !== confirmPassword) {
        onError({
          code: 'password_mismatch',
          userMessage: 'パスワードが一致しません。',
          technicalMessage: 'Password confirmation does not match'
        });
        return;
      }

      if (!validatePassword(password)) {
        onError({
          code: 'weak_password',
          userMessage: 'パスワードは8文字以上で、大文字・小文字・数字・記号を含む必要があります。',
          technicalMessage: 'Password does not meet strength requirements'
        });
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
          technicalMessage: 'No active session found'
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
              technicalMessage: error.message
            });
          } else {
            onError({
              code: 'update_failed',
              userMessage: `パスワードの更新に失敗しました。エラー: ${error.message}`,
              technicalMessage: error.message
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
          technicalMessage: networkError instanceof Error ? networkError.message : 'Network error'
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
        technicalMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = validatePassword(password);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

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
        {/* Password Input */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
            新しいパスワード
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
              placeholder="パスワードを入力してください"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          {password && (
            <div className={`mt-2 text-xs ${passwordStrength ? 'text-green-400' : 'text-red-400'}`}>
              {passwordStrength ? (
                <div className="flex items-center gap-1">
                  <FaCheckCircle />
                  <span>パスワード強度：強い</span>
                </div>
              ) : (
                <span>8文字以上、大文字・小文字・数字・記号を含む</span>
              )}
            </div>
          )}
        </div>

        {/* Confirm Password Input */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
            パスワード確認
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
              placeholder="パスワードを再入力してください"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          {confirmPassword && (
            <div className={`mt-2 text-xs ${passwordsMatch ? 'text-green-400' : 'text-red-400'}`}>
              {passwordsMatch ? (
                <div className="flex items-center gap-1">
                  <FaCheckCircle />
                  <span>パスワードが一致しています</span>
                </div>
              ) : (
                <span>パスワードが一致しません</span>
              )}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !passwordStrength || !passwordsMatch}
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
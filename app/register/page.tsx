"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PasswordInputWithStrength } from "@/components/auth/PasswordStrengthIndicator";
import { usePasswordForm, PASSWORD_PRESETS } from "@/lib/hooks/usePasswordValidation";
import { FaUser, FaEnvelope, FaEye, FaEyeSlash, FaShieldAlt, FaArrowLeft } from "react-icons/fa";
import Link from "next/link";

function RegisterContent() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);

    // バリデーション
    const validationErrors: string[] = [];

    if (!email.trim()) {
      validationErrors.push("メールアドレスを入力してください");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      validationErrors.push("有効なメールアドレスを入力してください");
    }

    if (!name.trim()) {
      validationErrors.push("名前を入力してください");
    } else if (name.trim().length < 2) {
      validationErrors.push("名前は2文字以上で入力してください");
    }

    // パスワードバリデーション
    if (!validatePassword()) {
      validationErrors.push("パスワードが要件を満たしていません");
    }

    if (validationErrors.length > 0) {
      setError(validationErrors.join(", "));
      return;
    }

    setIsSubmitting(true);

    try {
      // Supabaseでユーザー登録
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: name.trim(),
          }
        }
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          setError("このメールアドレスは既に登録されています");
        } else if (signUpError.message.includes("invalid email")) {
          setError("有効なメールアドレスを入力してください");
        } else if (signUpError.message.includes("password")) {
          setError("パスワードの形式が正しくありません");
        } else {
          setError("登録に失敗しました。しばらく時間をおいて再試行してください");
        }
        return;
      }

      if (data.user && !data.session) {
        // メール確認が必要な場合
        setRegistrationSuccess(true);
      } else if (data.session) {
        // 即座にログインされた場合
        router.replace("/home");
      }

    } catch (err) {
      console.error("Registration error:", err);
      setError("予期しないエラーが発生しました。再試行してください");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (registrationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600 px-4">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 text-white text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaEnvelope className="text-2xl text-green-300" />
            </div>
            <h1 className="text-2xl font-bold mb-2">登録完了</h1>
            <p className="text-sm opacity-90">
              確認メールを <strong>{email}</strong> に送信しました
            </p>
          </div>

          <div className="space-y-4 text-sm">
            <div className="bg-blue-500/10 border border-blue-400/20 rounded-lg p-4">
              <h3 className="font-semibold mb-2">次のステップ</h3>
              <ol className="list-decimal list-inside space-y-1 text-left">
                <li>メールボックスを確認</li>
                <li>確認リンクをクリック</li>
                <li>ログインしてアプリを開始</li>
              </ol>
            </div>

            <div className="text-xs opacity-75">
              メールが届かない場合は、迷惑メールフォルダもご確認ください
            </div>
          </div>

          <div className="mt-6">
            <Link href="/login" className="inline-flex items-center justify-center px-6 py-3 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
              <FaArrowLeft className="mr-2" />
              ログイン画面に戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">アカウント作成</h1>
          <p className="text-white/80">新しいアカウントを作成してください</p>
        </div>

        {/* Registration Form */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                <FaUser className="inline mr-2" />
                名前
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="田中太郎"
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
              />
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                <FaEnvelope className="inline mr-2" />
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
              />
            </div>

            {/* Password Field with Strength Indicator */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                パスワード
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="強力なパスワードを入力"
                  required
                  className="w-full px-4 py-3 pr-12 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white/80"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
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
                    {strength.requirements.map((req, index) => (
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

            {/* Confirm Password Field */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                パスワード確認
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="パスワードを再入力"
                required
                className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent ${
                  confirmPassword && password !== confirmPassword
                    ? 'border-red-500'
                    : 'border-white/20'
                }`}
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

            {/* Error Messages */}
            {(error || passwordErrors.length > 0) && (
              <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-4">
                <div className="text-red-300 text-sm">
                  {error && <p className="mb-2">{error}</p>}
                  {passwordErrors.map((err, index) => (
                    <p key={index} className="mb-1">• {err}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !isPasswordValid || !email || !name}
              className="w-full py-3 bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {isSubmitting ? "作成中..." : "アカウント作成"}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-white/80 text-sm">
              既にアカウントをお持ちですか？{" "}
              <Link href="/login" className="text-white font-medium hover:underline">
                ログイン
              </Link>
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 p-4 bg-green-500/10 border border-green-400/20 rounded-xl">
          <div className="flex items-start gap-3 text-green-300">
            <FaShieldAlt className="mt-1 flex-shrink-0" />
            <div>
              <p className="font-semibold mb-2">セキュリティ機能</p>
              <ul className="text-xs space-y-1">
                <li>• 強力なパスワード要件</li>
                <li>• メール確認による本人認証</li>
                <li>• 暗号化されたデータ保存</li>
                <li>• 不正アクセス防止機能</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>読み込み中...</p>
        </div>
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}
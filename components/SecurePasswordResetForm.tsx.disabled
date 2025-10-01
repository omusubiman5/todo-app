"use client";
import { useState } from "react";
import { FaEye, FaEyeSlash, FaLock, FaSpinner } from "react-icons/fa";
import { securityService } from "@/lib/securityService";

interface SecurePasswordResetFormProps {
  onSuccess?: () => void;
  onError?: (error: { message: string }) => void;
}

export default function SecurePasswordResetForm({ 
  onSuccess, 
  onError 
}: SecurePasswordResetFormProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    remaining: number;
    resetTime: number;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      onError?.({ message: "メールアドレスを入力してください。" });
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      onError?.({ message: "有効なメールアドレスを入力してください。" });
      return;
    }

    setIsSubmitting(true);

    try {
      // セキュアなパスワードリセット実行
      const clientIP = await getClientIP();
      const result = await securityService.securePasswordReset(email, clientIP);
      
      if (result.rateLimited) {
        onError?.({ message: result.message });
        
        // レート制限情報を表示
        const rateLimitStatus = securityService.getRateLimitStatus(email, clientIP);
        if (rateLimitStatus.email) {
          setRateLimitInfo({
            remaining: rateLimitStatus.email.remaining,
            resetTime: rateLimitStatus.email.resetTime,
          });
        }
      } else {
        // 常に成功メッセージを表示（セキュリティのため）
        setShowSuccess(true);
        setEmail(""); // フォームをクリア
        onSuccess?.();
      }
      
    } catch (error) {
      console.error("Password reset error:", error);
      onError?.({ 
        message: "システムエラーが発生しました。しばらく待ってから再試行してください。" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // クライアントIPを取得（簡易版）
  const getClientIP = async (): Promise<string | undefined> => {
    try {
      // 実際のIPアドレス取得は本番環境で適切なサービスを使用
      return "client_ip_placeholder";
    } catch {
      return undefined;
    }
  };

  const getRemainingTime = () => {
    if (!rateLimitInfo) return "";
    
    const remaining = Math.max(0, rateLimitInfo.resetTime - Date.now());
    const minutes = Math.floor(remaining / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    
    return `${minutes}分${seconds}秒`;
  };

  if (showSuccess) {
    return (
      <div className="w-full max-w-md mx-auto p-8 bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20">
        <div className="text-center">
          <div className="mb-6">
            <FaLock className="text-green-400 text-4xl mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              メール送信完了
            </h2>
          </div>
          
          <div className="text-green-300 bg-green-500/20 border border-green-400/30 rounded-xl p-4 mb-6">
            <p className="font-semibold mb-2">リセット用メールを送信しました</p>
            <p className="text-sm">
              該当するアカウントがある場合、メールをご確認ください。
              メールが届かない場合は、迷惑メールフォルダもご確認ください。
            </p>
          </div>

          <button
            onClick={() => {
              setShowSuccess(false);
              setRateLimitInfo(null);
            }}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
          >
            別のメールアドレスで再試行
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20">
      <div className="text-center mb-8">
        <FaLock className="text-blue-400 text-4xl mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">
          パスワードリセット
        </h2>
        <p className="text-gray-300 text-sm">
          登録済みのメールアドレスを入力してください
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label 
            htmlFor="email" 
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            メールアドレス
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-gray-300/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            placeholder="your-email@example.com"
            disabled={isSubmitting}
            autoComplete="email"
          />
        </div>

        {/* レート制限情報 */}
        {rateLimitInfo && (
          <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-xl p-4">
            <div className="flex items-center gap-2 text-yellow-300">
              <FaLock className="flex-shrink-0" />
              <div className="text-sm">
                <p className="font-semibold">レート制限中</p>
                <p>
                  残り試行回数: {rateLimitInfo.remaining}回
                  {rateLimitInfo.remaining === 0 && (
                    <span className="block">
                      リセットまで: {getRemainingTime()}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || (rateLimitInfo?.remaining === 0)}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <FaSpinner className="animate-spin" />
              送信中...
            </>
          ) : rateLimitInfo?.remaining === 0 ? (
            <>
              <FaLock />
              制限中 ({getRemainingTime()})
            </>
          ) : (
            "リセットメールを送信"
          )}
        </button>
      </form>

      {/* セキュリティ情報 */}
      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-400/20 rounded-xl">
        <div className="flex items-start gap-3 text-blue-300">
          <FaLock className="mt-1 flex-shrink-0" />
          <div>
            <p className="font-semibold mb-2 text-sm">セキュリティについて</p>
            <ul className="text-xs space-y-1">
              <li>• セキュリティのため、メール送信結果は常に同じメッセージを表示します</li>
              <li>• 15分間に3回まで送信可能です</li>
              <li>• リセットリンクは1時間で期限切れになります</li>
              <li>• メールが届かない場合は迷惑メールフォルダもご確認ください</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
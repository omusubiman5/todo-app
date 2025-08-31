"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { securityService } from "@/lib/securityService";
import { 
  FaShieldAlt, 
  FaExclamationTriangle, 
  FaEye, 
  FaClock,
  FaUser,
  FaEnvelope,
  FaGlobe,
  FaChartLine
} from "react-icons/fa";

interface SecurityEvent {
  event: string;
  email?: string;
  ip?: string;
  timestamp: string;
  success?: boolean;
  error?: string;
  errorDetails?: string;
}

export default function SecurityDashboard() {
  const { user } = useAuth();
  const [securityLogs, setSecurityLogs] = useState<SecurityEvent[]>([]);
  const [stats, setStats] = useState({
    totalAttempts: 0,
    successfulResets: 0,
    rateLimited: 0,
    systemErrors: 0,
  });

  useEffect(() => {
    // セキュリティログの取得
    const logs = securityService.getSecurityLogs();
    setSecurityLogs(logs);

    // 統計の計算
    const totalAttempts = logs.filter(log => 
      log.event === 'password_reset_attempt'
    ).length;
    
    const successfulResets = logs.filter(log => 
      log.event === 'password_reset_attempt' && log.success
    ).length;
    
    const rateLimited = logs.filter(log => 
      log.event === 'password_reset_rate_limited'
    ).length;
    
    const systemErrors = logs.filter(log => 
      log.event === 'password_reset_system_error'
    ).length;

    setStats({
      totalAttempts,
      successfulResets,
      rateLimited,
      systemErrors,
    });

    // 自動更新（10秒ごと）
    const interval = setInterval(() => {
      const updatedLogs = securityService.getSecurityLogs();
      setSecurityLogs(updatedLogs);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'password_reset_attempt':
        return <FaUser className="text-blue-400" />;
      case 'password_reset_rate_limited':
        return <FaClock className="text-yellow-400" />;
      case 'password_reset_system_error':
        return <FaExclamationTriangle className="text-red-400" />;
      default:
        return <FaShieldAlt className="text-gray-400" />;
    }
  };

  const getEventColor = (eventType: string, success?: boolean) => {
    switch (eventType) {
      case 'password_reset_attempt':
        return success ? 'text-green-300' : 'text-orange-300';
      case 'password_reset_rate_limited':
        return 'text-yellow-300';
      case 'password_reset_system_error':
        return 'text-red-300';
      default:
        return 'text-gray-300';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ja-JP');
  };

  const getRecentActivity = () => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    return securityLogs.filter(log => {
      const logTime = new Date(log.timestamp).getTime();
      return (now - logTime) <= oneHour;
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-800 flex items-center justify-center">
        <div className="text-white text-center">
          <FaShieldAlt className="text-4xl mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">認証が必要です</h2>
          <p>セキュリティダッシュボードにアクセスするにはログインが必要です。</p>
        </div>
      </div>
    );
  }

  const recentActivity = getRecentActivity();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <FaShieldAlt className="text-blue-400 text-3xl" />
            <h1 className="text-3xl font-bold text-white">
              セキュリティダッシュボード
            </h1>
          </div>
          <p className="text-gray-300">
            パスワードリセット機能のセキュリティ監視とログ分析
          </p>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <FaChartLine className="text-blue-400" />
              <h3 className="font-semibold text-white">総試行回数</h3>
            </div>
            <p className="text-2xl font-bold text-blue-300">{stats.totalAttempts}</p>
            <p className="text-sm text-gray-400">全期間</p>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <FaUser className="text-green-400" />
              <h3 className="font-semibold text-white">成功回数</h3>
            </div>
            <p className="text-2xl font-bold text-green-300">{stats.successfulResets}</p>
            <p className="text-sm text-gray-400">
              成功率: {stats.totalAttempts > 0 ? Math.round((stats.successfulResets / stats.totalAttempts) * 100) : 0}%
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <FaClock className="text-yellow-400" />
              <h3 className="font-semibold text-white">レート制限</h3>
            </div>
            <p className="text-2xl font-bold text-yellow-300">{stats.rateLimited}</p>
            <p className="text-sm text-gray-400">ブロック回数</p>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <FaExclamationTriangle className="text-red-400" />
              <h3 className="font-semibold text-white">システムエラー</h3>
            </div>
            <p className="text-2xl font-bold text-red-300">{stats.systemErrors}</p>
            <p className="text-sm text-gray-400">要調査</p>
          </div>
        </div>

        {/* 最近のアクティビティ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 直近1時間のアクティビティ */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-6">
              <FaClock className="text-orange-400" />
              <h2 className="text-xl font-bold text-white">
                直近1時間のアクティビティ
              </h2>
              <span className="bg-orange-500/20 text-orange-300 px-2 py-1 rounded-lg text-sm">
                {recentActivity.length}件
              </span>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {recentActivity.length === 0 ? (
                <p className="text-gray-400 text-center py-4">
                  アクティビティはありません
                </p>
              ) : (
                recentActivity.slice(0, 10).map((log, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/5"
                  >
                    {getEventIcon(log.event)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-medium ${getEventColor(log.event, log.success)}`}>
                          {log.event.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </div>
                      {log.email && (
                        <div className="flex items-center gap-1 text-sm text-gray-400">
                          <FaEnvelope className="text-xs" />
                          {log.email}
                        </div>
                      )}
                      {log.ip && (
                        <div className="flex items-center gap-1 text-sm text-gray-400">
                          <FaGlobe className="text-xs" />
                          {log.ip}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 全ログ表示 */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-6">
              <FaEye className="text-blue-400" />
              <h2 className="text-xl font-bold text-white">
                全セキュリティログ
              </h2>
              <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-lg text-sm">
                {securityLogs.length}件
              </span>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {securityLogs.length === 0 ? (
                <p className="text-gray-400 text-center py-4">
                  ログはありません
                </p>
              ) : (
                securityLogs.slice().reverse().map((log, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/5"
                  >
                    {getEventIcon(log.event)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-medium ${getEventColor(log.event, log.success)}`}>
                          {log.event.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </div>
                      {log.email && (
                        <div className="flex items-center gap-1 text-sm text-gray-400">
                          <FaEnvelope className="text-xs" />
                          {log.email}
                        </div>
                      )}
                      {log.ip && (
                        <div className="flex items-center gap-1 text-sm text-gray-400">
                          <FaGlobe className="text-xs" />
                          {log.ip}
                        </div>
                      )}
                      {log.errorDetails && (
                        <div className="text-xs text-red-400 mt-1 bg-red-500/10 p-2 rounded">
                          {log.errorDetails}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* セキュリティ設定状態 */}
        <div className="mt-8 bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <FaShieldAlt className="text-green-400" />
            <h2 className="text-xl font-bold text-white">現在のセキュリティ設定</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 text-green-300">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              レスポンス正規化: 有効
            </div>
            <div className="flex items-center gap-2 text-green-300">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              レート制限: 15分/3回
            </div>
            <div className="flex items-center gap-2 text-green-300">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              セキュリティログ: 記録中
            </div>
            <div className="flex items-center gap-2 text-green-300">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              リダイレクトURL制限: 有効
            </div>
            <div className="flex items-center gap-2 text-yellow-300">
              <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
              CAPTCHA: Supabase設定依存
            </div>
            <div className="flex items-center gap-2 text-yellow-300">
              <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
              メール確認: Supabase設定依存
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
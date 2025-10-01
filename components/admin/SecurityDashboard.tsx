"use client";

import React, { useState, useEffect, useCallback } from 'react';
import LoginAttemptService, {
  type BlockedIP,
  type LoginAttemptRecord,
  type SecuritySettings
} from '@/lib/services/loginAttemptService';
import {
  FaShieldAlt,
  FaBan,
  FaUnlock,
  FaChartBar,
  FaClock,
  FaExclamationTriangle,
  FaTrash,
  FaRefresh,
  FaCog,
  FaEye,
  FaSearch,
  FaFilter,
  FaDownload
} from 'react-icons/fa';

interface SecurityDashboardProps {
  className?: string;
}

interface SecurityStats {
  totalAttempts: { value: string; description: string };
  failedAttempts: { value: string; description: string };
  currentlyBlocked: { value: string; description: string };
  topBlockedIp: { value: string; description: string };
}

export default function SecurityDashboard({ className = "" }: SecurityDashboardProps) {
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<LoginAttemptRecord[]>([]);
  const [settings, setSettings] = useState<SecuritySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters and search
  const [showExpiredBlocks, setShowExpiredBlocks] = useState(false);
  const [searchIP, setSearchIP] = useState('');
  const [searchEmail, setSearchEmail] = useState('');

  // Modals
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedIP, setSelectedIP] = useState<string>('');

  // Block form
  const [blockForm, setBlockForm] = useState({
    ip: '',
    reason: '',
    duration: 60, // minutes
    permanent: false
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsData, blockedData, attemptsData, settingsData] = await Promise.all([
        LoginAttemptService.getSecurityStats(),
        LoginAttemptService.getBlockedIPs(showExpiredBlocks),
        LoginAttemptService.getLoginAttempts(50, searchIP || undefined, searchEmail || undefined),
        LoginAttemptService.getSecuritySettings()
      ]);

      setStats(statsData);
      setBlockedIPs(blockedData);
      setRecentAttempts(attemptsData);
      setSettings(settingsData);

    } catch (err) {
      console.error('Error loading security dashboard data:', err);
      setError('セキュリティダッシュボードのデータ取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [showExpiredBlocks, searchIP, searchEmail]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBlockIP = useCallback(async () => {
    if (!blockForm.ip.trim()) return;

    try {
      const result = await LoginAttemptService.blockIP(
        blockForm.ip.trim(),
        blockForm.reason || 'Manual block by admin',
        blockForm.permanent ? undefined : blockForm.duration
      );

      if (result.success) {
        setShowBlockModal(false);
        setBlockForm({ ip: '', reason: '', duration: 60, permanent: false });
        await loadData();
      } else {
        setError(result.message || 'IPブロックに失敗しました');
      }
    } catch (err) {
      console.error('Error blocking IP:', err);
      setError('IPブロックに失敗しました');
    }
  }, [blockForm, loadData]);

  const handleUnblockIP = useCallback(async (ip: string) => {
    try {
      const result = await LoginAttemptService.unblockIP(ip);

      if (result.success) {
        await loadData();
      } else {
        setError(result.message || 'IPブロック解除に失敗しました');
      }
    } catch (err) {
      console.error('Error unblocking IP:', err);
      setError('IPブロック解除に失敗しました');
    }
  }, [loadData]);

  const handleCleanupExpired = useCallback(async () => {
    try {
      const result = await LoginAttemptService.cleanupExpiredBlocks();

      if (result.success) {
        await loadData();
      } else {
        setError('期限切れブロックのクリーンアップに失敗しました');
      }
    } catch (err) {
      console.error('Error cleaning up expired blocks:', err);
      setError('期限切れブロックのクリーンアップに失敗しました');
    }
  }, [loadData]);

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ja-JP');
  };

  const getRemainingTime = (blockedUntil: string | null) => {
    if (!blockedUntil) return '永続';

    const remaining = new Date(blockedUntil).getTime() - Date.now();
    if (remaining <= 0) return '期限切れ';

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    return hours > 0 ? `${hours}時間${minutes}分` : `${minutes}分`;
  };

  const getStatusColor = (success: boolean, blocked: boolean) => {
    if (blocked) return 'text-red-400';
    return success ? 'text-green-400' : 'text-yellow-400';
  };

  const getStatusIcon = (success: boolean, blocked: boolean) => {
    if (blocked) return <FaBan />;
    return success ? <FaUnlock /> : <FaExclamationTriangle />;
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <FaRefresh className="animate-spin text-2xl text-blue-400" />
          <span className="ml-2 text-white">読み込み中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FaShieldAlt className="text-2xl text-blue-400" />
          <h1 className="text-2xl font-bold text-white">セキュリティダッシュボード</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBlockModal(true)}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
          >
            <FaBan />
            IPをブロック
          </button>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <FaRefresh />
          </button>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            <FaCog />
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/20 border border-red-400/30 text-red-300 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <FaExclamationTriangle />
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-300 hover:text-red-200"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/10 p-4 rounded-lg border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">総ログイン試行数</p>
                <p className="text-2xl font-bold text-white">{stats.totalAttempts?.value || '0'}</p>
              </div>
              <FaChartBar className="text-blue-400 text-2xl" />
            </div>
            <p className="text-white/50 text-xs mt-2">{stats.totalAttempts?.description}</p>
          </div>

          <div className="bg-white/10 p-4 rounded-lg border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">失敗した試行数</p>
                <p className="text-2xl font-bold text-red-400">{stats.failedAttempts?.value || '0'}</p>
              </div>
              <FaExclamationTriangle className="text-red-400 text-2xl" />
            </div>
            <p className="text-white/50 text-xs mt-2">{stats.failedAttempts?.description}</p>
          </div>

          <div className="bg-white/10 p-4 rounded-lg border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">ブロック中のIP数</p>
                <p className="text-2xl font-bold text-orange-400">{stats.currentlyBlocked?.value || '0'}</p>
              </div>
              <FaBan className="text-orange-400 text-2xl" />
            </div>
            <p className="text-white/50 text-xs mt-2">{stats.currentlyBlocked?.description}</p>
          </div>

          <div className="bg-white/10 p-4 rounded-lg border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">最頻出ブロックIP</p>
                <p className="text-lg font-mono text-yellow-400">{stats.topBlockedIp?.value || 'なし'}</p>
              </div>
              <FaEye className="text-yellow-400 text-2xl" />
            </div>
            <p className="text-white/50 text-xs mt-2">{stats.topBlockedIp?.description}</p>
          </div>
        </div>
      )}

      {/* Blocked IPs Section */}
      <div className="bg-white/10 p-6 rounded-lg border border-white/20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <FaBan className="text-red-400" />
            ブロック中のIPアドレス
          </h2>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-white/70 text-sm">
              <input
                type="checkbox"
                checked={showExpiredBlocks}
                onChange={(e) => setShowExpiredBlocks(e.target.checked)}
                className="rounded"
              />
              期限切れも表示
            </label>
            <button
              onClick={handleCleanupExpired}
              className="px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600 transition-colors"
            >
              <FaTrash className="inline mr-1" />
              期限切れを削除
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/60 border-b border-white/20">
                <th className="text-left py-2">IPアドレス</th>
                <th className="text-left py-2">ブロック開始</th>
                <th className="text-left py-2">残り時間</th>
                <th className="text-left py-2">試行回数</th>
                <th className="text-left py-2">理由</th>
                <th className="text-left py-2">種別</th>
                <th className="text-left py-2">アクション</th>
              </tr>
            </thead>
            <tbody>
              {blockedIPs.map((ip) => (
                <tr key={ip.id} className="text-white border-b border-white/10">
                  <td className="py-2 font-mono text-yellow-400">{ip.ipAddress}</td>
                  <td className="py-2">{formatDateTime(ip.blockedAt)}</td>
                  <td className="py-2">
                    <span className={ip.blockedUntil ? 'text-orange-400' : 'text-red-400'}>
                      {getRemainingTime(ip.blockedUntil)}
                    </span>
                  </td>
                  <td className="py-2">{ip.attemptCount}</td>
                  <td className="py-2 max-w-xs truncate" title={ip.blockReason}>
                    {ip.blockReason}
                  </td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      ip.manualBlock ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'
                    }`}>
                      {ip.manualBlock ? '手動' : '自動'}
                    </span>
                  </td>
                  <td className="py-2">
                    <button
                      onClick={() => handleUnblockIP(ip.ipAddress)}
                      className="text-green-400 hover:text-green-300 transition-colors"
                      title="ブロック解除"
                    >
                      <FaUnlock />
                    </button>
                  </td>
                </tr>
              ))}
              {blockedIPs.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-white/60">
                    ブロック中のIPアドレスはありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Login Attempts */}
      <div className="bg-white/10 p-6 rounded-lg border border-white/20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <FaClock className="text-blue-400" />
            最近のログイン試行
          </h2>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="IPアドレスで検索"
              value={searchIP}
              onChange={(e) => setSearchIP(e.target.value)}
              className="px-3 py-1 rounded bg-white/10 border border-white/20 text-white placeholder-white/50 text-sm"
            />
            <input
              type="text"
              placeholder="メールアドレスで検索"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="px-3 py-1 rounded bg-white/10 border border-white/20 text-white placeholder-white/50 text-sm"
            />
            <button
              onClick={loadData}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
            >
              <FaSearch />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/60 border-b border-white/20">
                <th className="text-left py-2">時刻</th>
                <th className="text-left py-2">IPアドレス</th>
                <th className="text-left py-2">メール</th>
                <th className="text-left py-2">状態</th>
                <th className="text-left py-2">ユーザーエージェント</th>
              </tr>
            </thead>
            <tbody>
              {recentAttempts.map((attempt) => (
                <tr key={attempt.id} className="text-white border-b border-white/10">
                  <td className="py-2">{formatDateTime(attempt.attemptTime)}</td>
                  <td className="py-2 font-mono text-yellow-400">{attempt.ipAddress}</td>
                  <td className="py-2">{attempt.email || '-'}</td>
                  <td className="py-2">
                    <span className={`flex items-center gap-1 ${getStatusColor(attempt.success, attempt.blocked)}`}>
                      {getStatusIcon(attempt.success, attempt.blocked)}
                      {attempt.blocked ? 'ブロック' : attempt.success ? '成功' : '失敗'}
                    </span>
                  </td>
                  <td className="py-2 max-w-xs truncate" title={attempt.userAgent || ''}>
                    {attempt.userAgent || '-'}
                  </td>
                </tr>
              ))}
              {recentAttempts.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-white/60">
                    ログイン試行履歴がありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Block IP Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg border border-white/20 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">IPアドレスをブロック</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">IPアドレス</label>
                <input
                  type="text"
                  value={blockForm.ip}
                  onChange={(e) => setBlockForm(prev => ({ ...prev, ip: e.target.value }))}
                  className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white"
                  placeholder="192.168.1.1"
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">理由</label>
                <input
                  type="text"
                  value={blockForm.reason}
                  onChange={(e) => setBlockForm(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white"
                  placeholder="不正なアクセス試行"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-white">
                  <input
                    type="checkbox"
                    checked={blockForm.permanent}
                    onChange={(e) => setBlockForm(prev => ({ ...prev, permanent: e.target.checked }))}
                    className="rounded"
                  />
                  永続ブロック
                </label>

                {!blockForm.permanent && (
                  <div className="flex items-center gap-2">
                    <label className="text-white/70 text-sm">期間（分）:</label>
                    <input
                      type="number"
                      value={blockForm.duration}
                      onChange={(e) => setBlockForm(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                      className="w-20 px-2 py-1 rounded bg-white/10 border border-white/20 text-white text-sm"
                      min="1"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => setShowBlockModal(false)}
                className="px-4 py-2 text-white/70 hover:text-white transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleBlockIP}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                ブロック
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"use client";
import { useState } from 'react';
import { inviteMember, generateInvitationLink } from '@/lib/teamService';
import type { InviteMemberData } from '@/lib/types';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  teamName: string;
  onInvitationSent: () => void;
}

export default function InviteMemberModal({ 
  isOpen, 
  onClose, 
  teamId, 
  teamName, 
  onInvitationSent 
}: InviteMemberModalProps) {
  const [formData, setFormData] = useState<InviteMemberData>({
    email: '',
    role: 'member'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [invitationLink, setInvitationLink] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.trim()) {
      setError('メールアドレスは必須です');
      return;
    }

    if (!formData.email.includes('@')) {
      setError('有効なメールアドレスを入力してください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const invitation = await inviteMember(teamId, formData);
      const link = generateInvitationLink(invitation.token);
      setInvitationLink(link);
      setFormData({ email: '', role: 'member' });
      onInvitationSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : '招待の送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof InviteMemberData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(invitationLink);
      alert('招待リンクをクリップボードにコピーしました');
    } catch (err) {
      console.error('クリップボードへのコピーに失敗しました:', err);
    }
  };

  const handleClose = () => {
    setInvitationLink('');
    setFormData({ email: '', role: 'member' });
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 w-full max-w-md mx-4 border border-white/20 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">メンバーを招待</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
            disabled={loading}
          >
            ×
          </button>
        </div>

        <p className="text-gray-600 mb-4">
          <strong>{teamName}</strong> に新しいメンバーを招待します
        </p>

        {!invitationLink ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス *
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="example@email.com"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                権限
              </label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="member">メンバー</option>
                <option value="admin">管理者</option>
                <option value="guest">ゲスト</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {formData.role === 'admin' && '管理者はメンバーの追加・削除ができます'}
                {formData.role === 'member' && 'メンバーはタスクの作成・編集ができます'}
                {formData.role === 'guest' && 'ゲストは閲覧のみ可能です'}
              </p>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                disabled={loading}
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? '招待中...' : '招待を送信'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-green-800 font-medium">招待が作成されました</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                招待リンク
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={invitationLink}
                  readOnly
                  className="flex-1 border border-gray-300 rounded-l-md px-3 py-2 bg-gray-50 text-sm"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-gray-600 text-white rounded-r-md hover:bg-gray-700 text-sm"
                >
                  コピー
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                このリンクは7日間有効です
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setInvitationLink('')}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                別のメンバーを招待
              </button>
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                完了
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
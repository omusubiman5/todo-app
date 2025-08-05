"use client";

import React, { useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import { InviteMemberData } from '@/lib/types';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite?: (data: InviteMemberData) => Promise<void>;
  teamId?: string;
  teamName?: string;
  onInvitationSent?: () => Promise<void>;
  darkMode?: boolean;
}

export default function InviteMemberModal({ 
  isOpen, 
  onClose, 
  onInvite, 
  darkMode = false 
}: InviteMemberModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member' | 'guest'>('member');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    try {
      if (onInvite) {
        await onInvite({ email: email.trim(), role });
      }
      setEmail('');
      setRole('member');
      onClose();
    } catch (error) {
      console.error('Failed to invite member:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setRole('member');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* オーバーレイ */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* モーダル */}
      <div className={`relative rounded-2xl shadow-2xl border max-w-md w-full mx-4 ${
        darkMode 
          ? 'bg-gray-800 border-gray-600' 
          : 'bg-white border-gray-200'
      }`}>
        {/* ヘッダー */}
        <div className={`flex items-center justify-between p-6 border-b ${
          darkMode ? 'border-gray-600' : 'border-gray-200'
        }`}>
          <h3 className={`text-lg font-bold ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            メンバーを招待
          </h3>
          <button
            onClick={handleClose}
            className={`p-2 rounded-full transition-all duration-200 ${
              darkMode 
                ? 'text-gray-400 hover:bg-gray-700 hover:text-white' 
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
          >
            <FaTimes size={16} />
          </button>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label 
              htmlFor="email" 
              className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              メールアドレス
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              className={`w-full px-3 py-2 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500'
              }`}
              required
            />
          </div>

          <div>
            <label 
              htmlFor="role" 
              className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              役割
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'member' | 'guest')}
              className={`w-full px-3 py-2 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-500' 
                  : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
              }`}
            >
              <option value="guest">ゲスト</option>
              <option value="member">メンバー</option>
              <option value="admin">管理者</option>
            </select>
            <p className={`text-xs mt-1 ${
              darkMode ? 'text-gray-500' : 'text-gray-500'
            }`}>
              {role === 'admin' && '管理者：メンバー管理とチーム設定の変更が可能'}
              {role === 'member' && 'メンバー：タスクの作成・編集が可能'}
              {role === 'guest' && 'ゲスト：タスクの閲覧とコメントのみ可能'}
            </p>
          </div>

          {/* ボタン */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                darkMode 
                  ? 'bg-gray-600 text-white hover:bg-gray-700' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!email.trim() || isLoading}
              className={`px-6 py-2 rounded-lg font-bold text-white transition-all duration-200 ${
                !email.trim() || isLoading
                  ? (darkMode ? 'bg-gray-600 cursor-not-allowed' : 'bg-gray-400 cursor-not-allowed')
                  : (darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600')
              }`}
            >
              {isLoading ? '招待中...' : '招待を送信'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
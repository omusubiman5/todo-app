"use client";
import { useState } from 'react';
import { createTeam } from '@/lib/teamService';
import type { CreateTeamData } from '@/lib/types';

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTeamCreated: () => void;
}

// URL検証関数
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export default function CreateTeamModal({ isOpen, onClose, onTeamCreated }: CreateTeamModalProps) {
  const [formData, setFormData] = useState<CreateTeamData>({
    name: '',
    description: '',
    avatar_url: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('チーム名は必須です');
      return;
    }

    // URL検証（空でない場合のみ）
    if (formData.avatar_url && formData.avatar_url.trim() && !isValidUrl(formData.avatar_url.trim())) {
      setError('有効なURLを入力してください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('Creating team with data:', formData);
      
      // 空のavatar_urlをundefinedに変換（型の整合性のため）
      const cleanedData = {
        ...formData,
        description: formData.description?.trim() || undefined,
        avatar_url: formData.avatar_url?.trim() || undefined
      };
      
      console.log('Cleaned data:', cleanedData);
      await createTeam(cleanedData);
      setFormData({ name: '', description: '', avatar_url: '' });
      onTeamCreated();
      onClose();
    } catch (err) {
      console.error('Team creation error:', err);
      setError(err instanceof Error ? err.message : 'チーム作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateTeamData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">新しいチームを作成</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
            disabled={loading}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              チーム名 *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="チーム名を入力"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              説明
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="チームの説明を入力"
              rows={3}
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="avatar_url" className="block text-sm font-medium text-gray-700 mb-1">
              アバターURL <span className="text-gray-400 text-xs">(オプション)</span>
            </label>
            <input
              type="text"
              id="avatar_url"
              value={formData.avatar_url}
              onChange={(e) => handleInputChange('avatar_url', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/avatar.png (空白可)"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
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
              {loading ? '作成中...' : '作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 
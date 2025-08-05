"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { FaTimes, FaUser, FaCheck } from 'react-icons/fa';
import { SharedTaskService } from '@/lib/sharedTaskService';

interface TeamMember {
  user_id: string;
  role: string;
  user?: {
    id: string;
    email: string;
    user_metadata?: {
      full_name?: string;
      avatar_url?: string;
    };
  };
}

interface TaskAssignmentModalProps {
  taskId: string;
  teamId?: string | null;
  darkMode?: boolean;
  onClose: () => void;
  onAssign: (taskId: string, userId: string | null) => void;
}

export default function TaskAssignmentModal({ 
  taskId, 
  teamId, 
  darkMode = false, 
  onClose, 
  onAssign 
}: TaskAssignmentModalProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!teamId) return;

      setIsLoading(true);
      try {
        const members = await SharedTaskService.getTeamMembers(teamId);
        setTeamMembers(members);
      } catch (error) {
        console.error('Failed to fetch team members:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeamMembers();
  }, [teamId]);

  const handleAssign = () => {
    onAssign(taskId, selectedUserId);
  };

  const handleUnassign = () => {
    onAssign(taskId, null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* オーバーレイ */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* モーダル */}
      <div className={`relative rounded-2xl shadow-2xl border max-w-md w-full mx-4 max-h-[80vh] overflow-hidden ${
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
            担当者を設定
          </h3>
          <button
            onClick={onClose}
            className={`p-2 rounded-full transition-all duration-200 ${
              darkMode 
                ? 'text-gray-400 hover:bg-gray-700 hover:text-white' 
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
          >
            <FaTimes size={16} />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-6 overflow-y-auto max-h-96">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                チームメンバーを読み込み中...
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* 担当者なし */}
              <button
                onClick={() => setSelectedUserId(null)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                  selectedUserId === null
                    ? (darkMode ? 'bg-blue-500/20 border-2 border-blue-500' : 'bg-blue-50 border-2 border-blue-500')
                    : (darkMode ? 'bg-gray-700/50 border-2 border-transparent hover:bg-gray-600/50' : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100')
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  darkMode ? 'bg-gray-600' : 'bg-gray-300'
                }`}>
                  <FaUser size={16} className={darkMode ? 'text-gray-400' : 'text-gray-600'} />
                </div>
                <div className="flex-1 text-left">
                  <div className={`font-medium ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    担当者なし
                  </div>
                  <div className={`text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    誰にも割り当てない
                  </div>
                </div>
                {selectedUserId === null && (
                  <FaCheck size={16} className="text-blue-500" />
                )}
              </button>

              {/* チームメンバー一覧 */}
              {teamMembers.map((member) => (
                <button
                  key={member.user_id}
                  onClick={() => setSelectedUserId(member.user_id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                    selectedUserId === member.user_id
                      ? (darkMode ? 'bg-green-500/20 border-2 border-green-500' : 'bg-green-50 border-2 border-green-500')
                      : (darkMode ? 'bg-gray-700/50 border-2 border-transparent hover:bg-gray-600/50' : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100')
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    darkMode ? 'bg-gray-600' : 'bg-gray-300'
                  }`}>
                    {member.user?.user_metadata?.avatar_url ? (
                      <Image
                        src={member.user.user_metadata.avatar_url}
                        alt="Avatar"
                        width={40}
                        height={40}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <FaUser size={16} className={darkMode ? 'text-gray-400' : 'text-gray-600'} />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className={`font-medium ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {member.user?.user_metadata?.full_name || member.user?.email || 'Unknown User'}
                    </div>
                    <div className={`text-sm ${
                      darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {member.role === 'owner' ? 'オーナー' :
                       member.role === 'admin' ? '管理者' :
                       member.role === 'member' ? 'メンバー' : 'ゲスト'}
                    </div>
                  </div>
                  {selectedUserId === member.user_id && (
                    <FaCheck size={16} className="text-green-500" />
                  )}
                </button>
              ))}

              {teamMembers.length === 0 && !isLoading && (
                <div className="text-center py-8">
                  <div className={`text-4xl mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    👥
                  </div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    チームメンバーがいません
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className={`flex items-center justify-between gap-3 p-6 border-t ${
          darkMode ? 'border-gray-600' : 'border-gray-200'
        }`}>
          <button
            onClick={handleUnassign}
            className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
              darkMode 
                ? 'bg-gray-600 text-white hover:bg-gray-700' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            割り当て解除
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                darkMode 
                  ? 'bg-gray-600 text-white hover:bg-gray-700' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              キャンセル
            </button>
            <button
              onClick={handleAssign}
              className={`px-6 py-2 rounded-xl font-bold text-white transition-all duration-200 ${
                darkMode 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              設定
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
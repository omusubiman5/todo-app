"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { FaUser, FaUsers, FaChevronDown, FaCheck } from 'react-icons/fa';
import { useWorkspace } from './WorkspaceProvider';
import { WorkspaceContext } from '@/lib/types';

interface WorkspaceSwitcherProps {
  darkMode?: boolean;
}

export default function WorkspaceSwitcher({ darkMode = false }: WorkspaceSwitcherProps) {
  const { currentWorkspace, availableWorkspaces, switchWorkspace, isLoading } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);

  const handleWorkspaceSelect = (workspace: WorkspaceContext) => {
    console.log('🎯🎯🎯 WorkspaceSwitcher.handleWorkspaceSelect CALLED!:', {
      workspace,
      timestamp: new Date().toISOString()
    });
    switchWorkspace(workspace);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* ワークスペース選択ボタン */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 min-w-48 ${
          darkMode 
            ? 'bg-gray-700/50 border border-gray-600 text-white hover:bg-gray-600/50' 
            : 'bg-white/20 border border-white/30 text-white hover:bg-white/30'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={isLoading}
      >
        <div className="flex items-center gap-2 flex-1">
          {currentWorkspace.type === 'personal' ? (
            <FaUser size={16} />
          ) : (
            <FaUsers size={16} />
          )}
          <span className="font-medium truncate">
            {currentWorkspace.team_name || '個人タスク'}
          </span>
        </div>
        <FaChevronDown 
          size={14} 
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* ドロップダウンメニュー */}
      {isOpen && (
        <>
          {/* オーバーレイ */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* メニュー */}
          <div className={`absolute top-full left-0 right-0 mt-2 rounded-xl shadow-2xl border z-20 overflow-hidden ${
            darkMode 
              ? 'bg-gray-800 border-gray-600' 
              : 'bg-white border-gray-200'
          }`}>
            {/* 個人ワークスペース */}
            <button
              onClick={() => handleWorkspaceSelect(availableWorkspaces.personal)}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-all duration-200 ${
                currentWorkspace.type === 'personal'
                  ? (darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600')
                  : (darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50')
              }`}
            >
              <FaUser size={16} />
              <span className="font-medium flex-1 text-left">個人タスク</span>
              {currentWorkspace.type === 'personal' && (
                <FaCheck size={14} className="text-blue-500" />
              )}
            </button>

            {/* チームワークスペース */}
            {availableWorkspaces.teams.length > 0 && (
              <>
                <div className={`px-4 py-2 text-xs font-bold uppercase tracking-wide ${
                  darkMode ? 'text-gray-500 bg-gray-750' : 'text-gray-500 bg-gray-100'
                }`}>
                  チーム
                </div>
                {availableWorkspaces.teams.map((workspace) => (
                  <button
                    key={workspace.team_id}
                    onClick={() => handleWorkspaceSelect(workspace)}
                    className={`w-full flex items-center gap-3 px-4 py-3 transition-all duration-200 ${
                      currentWorkspace.team_id === workspace.team_id
                        ? (darkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-50 text-green-600')
                        : (darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50')
                    }`}
                  >
                    <FaUsers size={16} />
                    <div className="flex-1 text-left">
                      <div className="font-medium truncate">{workspace.team_name}</div>
                      <div className={`text-xs ${
                        darkMode ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        {workspace.role === 'owner' ? 'オーナー' : 
                         workspace.role === 'admin' ? '管理者' : 
                         workspace.role === 'member' ? 'メンバー' : 'ゲスト'}
                      </div>
                    </div>
                    {currentWorkspace.team_id === workspace.team_id && (
                      <FaCheck size={14} className="text-green-500" />
                    )}
                  </button>
                ))}
              </>
            )}

            {/* チーム管理へのリンク */}
            <div className={`border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
              <Link
                href="/teams"
                className={`w-full flex items-center gap-3 px-4 py-3 transition-all duration-200 ${
                  darkMode 
                    ? 'text-gray-400 hover:bg-gray-700 hover:text-white' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                onClick={() => setIsOpen(false)}
              >
                <FaUsers size={16} />
                <span className="font-medium">チーム管理</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
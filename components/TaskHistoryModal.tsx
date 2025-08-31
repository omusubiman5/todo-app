"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { FaTimes, FaUser, FaCheck, FaEdit, FaPlus, FaTrash, FaComment, FaUserCheck } from 'react-icons/fa';
import { TaskHistory } from '@/lib/types';
import { SharedTaskService } from '@/lib/sharedTaskService';

interface TaskHistoryModalProps {
  taskId: string;
  darkMode?: boolean;
  onClose: () => void;
}

export default function TaskHistoryModal({ 
  taskId, 
  darkMode = false, 
  onClose 
}: TaskHistoryModalProps) {
  const [history, setHistory] = useState<TaskHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const data = await SharedTaskService.getTaskHistory(taskId);
        setHistory(data);
      } catch (error) {
        console.error('Failed to fetch task history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [taskId]);

  // アクションタイプに応じたアイコンと色を取得
  const getActionDisplay = (action: string) => {
    switch (action) {
      case 'created':
        return {
          icon: <FaPlus size={14} />,
          label: 'タスクを作成',
          color: darkMode ? 'text-green-400' : 'text-green-600'
        };
      case 'updated':
        return {
          icon: <FaEdit size={14} />,
          label: 'タスクを更新',
          color: darkMode ? 'text-blue-400' : 'text-blue-600'
        };
      case 'completed':
        return {
          icon: <FaCheck size={14} />,
          label: 'タスクを完了',
          color: darkMode ? 'text-purple-400' : 'text-purple-600'
        };
      case 'assigned':
        return {
          icon: <FaUserCheck size={14} />,
          label: '担当者を設定',
          color: darkMode ? 'text-orange-400' : 'text-orange-600'
        };
      case 'commented':
        return {
          icon: <FaComment size={14} />,
          label: 'コメントを追加',
          color: darkMode ? 'text-cyan-400' : 'text-cyan-600'
        };
      case 'deleted':
        return {
          icon: <FaTrash size={14} />,
          label: 'タスクを削除',
          color: darkMode ? 'text-red-400' : 'text-red-600'
        };
      default:
        return {
          icon: <FaEdit size={14} />,
          label: action,
          color: darkMode ? 'text-gray-400' : 'text-gray-600'
        };
    }
  };

  // 変更内容の詳細表示
  const renderChangeDetails = (changes: Record<string, unknown>, action: string) => {
    if (!changes) return null;

    const { old: oldData, new: newData } = changes as { old?: Record<string, unknown>, new?: Record<string, unknown> };
    
    if (action === 'created') {
      return (
        <div className={`text-sm mt-2 p-3 rounded-lg ${
          darkMode ? 'bg-gray-700/50' : 'bg-gray-100'
        }`}>
          <div className={`font-medium mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            新規タスク
          </div>
          <div className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            「{newData?.text as string}」を作成しました
          </div>
        </div>
      );
    }

    if (action === 'assigned' && oldData && newData) {
      const oldAssignee = oldData.assigned_to as string;
      const newAssignee = newData.assigned_to as string;
      
      return (
        <div className={`text-sm mt-2 p-3 rounded-lg ${
          darkMode ? 'bg-gray-700/50' : 'bg-gray-100'
        }`}>
          <div className={`font-medium mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            担当者変更
          </div>
          <div className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {oldAssignee ? '前の担当者' : '担当者なし'} → {newAssignee ? '新しい担当者' : '担当者なし'}
          </div>
        </div>
      );
    }

    if (action === 'completed' && oldData && newData) {
      return (
        <div className={`text-sm mt-2 p-3 rounded-lg ${
          darkMode ? 'bg-gray-700/50' : 'bg-gray-100'
        }`}>
          <div className={`font-medium mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            完了状態変更
          </div>
          <div className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {oldData.completed as boolean ? '完了' : '未完了'} → {newData.completed as boolean ? '完了' : '未完了'}
          </div>
        </div>
      );
    }

    if (action === 'updated' && oldData && newData) {
      const changedFields = [];
      
      if (oldData.text !== newData.text) {
        changedFields.push({
          field: 'テキスト',
          old: oldData.text as string,
          new: newData.text as string
        });
      }
      
      if (oldData.priority !== newData.priority) {
        changedFields.push({
          field: '優先度',
          old: oldData.priority as string,
          new: newData.priority as string
        });
      }

      if (changedFields.length > 0) {
        return (
          <div className={`text-sm mt-2 p-3 rounded-lg ${
            darkMode ? 'bg-gray-700/50' : 'bg-gray-100'
          }`}>
            <div className={`font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              変更内容
            </div>
            {changedFields.map((change, index) => (
              <div key={index} className={`mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <span className="font-medium">{change.field}:</span> {change.old} → {change.new}
              </div>
            ))}
          </div>
        );
      }
    }

    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* オーバーレイ */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* モーダル */}
      <div className={`relative rounded-2xl shadow-2xl border max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col ${
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
            タスク履歴
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

        {/* 履歴一覧 */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                履歴を読み込み中...
              </p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <div className={`text-4xl mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                📋
              </div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                履歴はありません
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item, index) => {
                const actionDisplay = getActionDisplay(item.action);
                
                return (
                  <div
                    key={item.id}
                    className={`relative flex gap-4 p-4 rounded-xl ${
                      darkMode ? 'bg-gray-700/30' : 'bg-gray-50'
                    }`}
                  >
                    {/* タイムライン線 */}
                    {index < history.length - 1 && (
                      <div className={`absolute left-8 top-12 w-0.5 h-full ${
                        darkMode ? 'bg-gray-600' : 'bg-gray-300'
                      }`} />
                    )}

                    {/* アイコン */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                      darkMode ? 'bg-gray-700 border-2 border-gray-600' : 'bg-white border-2 border-gray-300'
                    }`}>
                      <span className={actionDisplay.color}>
                        {actionDisplay.icon}
                      </span>
                    </div>

                    {/* 内容 */}
                    <div className="flex-1 min-w-0">
                      {/* ヘッダー */}
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-medium text-sm ${actionDisplay.color}`}>
                              {actionDisplay.label}
                            </span>
                            <span className={`text-xs ${
                              darkMode ? 'text-gray-500' : 'text-gray-500'
                            }`}>
                              {new Date(item.created_at).toLocaleString()}
                            </span>
                          </div>
                          
                          {/* ユーザー */}
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                              darkMode ? 'bg-gray-600' : 'bg-gray-300'
                            }`}>
                              {item.user?.user_metadata?.avatar_url ? (
                                <Image
                                  src={item.user.user_metadata.avatar_url}
                                  alt="Avatar"
                                  width={24}
                                  height={24}
                                  className="rounded-full object-cover"
                                />
                              ) : (
                                <FaUser size={10} className={darkMode ? 'text-gray-400' : 'text-gray-600'} />
                              )}
                            </div>
                            <span className={`text-xs ${
                              darkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {item.user?.user_metadata?.full_name || item.user?.email || 'Unknown User'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 変更詳細 */}
                      {renderChangeDetails(item.changes, item.action)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className={`p-6 border-t ${
          darkMode ? 'border-gray-600' : 'border-gray-200'
        }`}>
          <button
            onClick={onClose}
            className={`w-full px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
              darkMode 
                ? 'bg-gray-600 text-white hover:bg-gray-700' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
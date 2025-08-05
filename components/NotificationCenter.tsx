"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { FaBell, FaTimes, FaCheck, FaComment, FaUserCheck, FaExclamationTriangle } from 'react-icons/fa';
import { Notification } from '@/lib/types';
import { SharedTaskService } from '@/lib/sharedTaskService';
import { useAuth } from './AuthProvider';

interface NotificationCenterProps {
  darkMode?: boolean;
}

export default function NotificationCenter({ darkMode = false }: NotificationCenterProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // 通知取得
  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const data = await SharedTaskService.getNotifications(user.id);
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read_at).length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // リアルタイム通知更新
  useEffect(() => {
    if (!user) return;

    const channel = SharedTaskService.subscribeToNotifications(user.id, (payload) => {
      console.log('Real-time notification update:', payload);
      fetchNotifications();
    });

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [user, fetchNotifications]);

  // 通知を既読にする
  const markAsRead = async (notificationId: string) => {
    try {
      await SharedTaskService.markNotificationAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // 全通知を既読にする
  const markAllAsRead = async () => {
    if (!user) return;

    try {
      await SharedTaskService.markAllNotificationsAsRead(user.id);
      setNotifications(prev => 
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  // 通知タイプに応じたアイコンと色を取得
  const getNotificationDisplay = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return {
          icon: <FaUserCheck size={16} />,
          color: darkMode ? 'text-blue-400' : 'text-blue-600',
          bgColor: darkMode ? 'bg-blue-500/10' : 'bg-blue-50'
        };
      case 'task_mentioned':
        return {
          icon: <FaComment size={16} />,
          color: darkMode ? 'text-purple-400' : 'text-purple-600',
          bgColor: darkMode ? 'bg-purple-500/10' : 'bg-purple-50'
        };
      case 'task_deadline':
        return {
          icon: <FaExclamationTriangle size={16} />,
          color: darkMode ? 'text-orange-400' : 'text-orange-600',
          bgColor: darkMode ? 'bg-orange-500/10' : 'bg-orange-50'
        };
      case 'task_completed':
        return {
          icon: <FaCheck size={16} />,
          color: darkMode ? 'text-green-400' : 'text-green-600',
          bgColor: darkMode ? 'bg-green-500/10' : 'bg-green-50'
        };
      case 'task_commented':
        return {
          icon: <FaComment size={16} />,
          color: darkMode ? 'text-cyan-400' : 'text-cyan-600',
          bgColor: darkMode ? 'bg-cyan-500/10' : 'bg-cyan-50'
        };
      default:
        return {
          icon: <FaBell size={16} />,
          color: darkMode ? 'text-gray-400' : 'text-gray-600',
          bgColor: darkMode ? 'bg-gray-500/10' : 'bg-gray-50'
        };
    }
  };

  return (
    <div className="relative">
      {/* 通知ベルボタン */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 sm:p-3 rounded-full transition-all duration-300 transform hover:scale-110 ${
          darkMode 
            ? 'bg-purple-500 text-white hover:bg-purple-600' 
            : 'bg-purple-400 text-white hover:bg-purple-500'
        }`}
        title="通知"
      >
        <FaBell size={16} />
        
        {/* 未読通知バッジ */}
        {unreadCount > 0 && (
          <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
            darkMode ? 'bg-red-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {/* 通知ドロップダウン */}
      {isOpen && (
        <>
          {/* オーバーレイ */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* 通知パネル */}
          <div className={`absolute top-full right-0 mt-2 w-80 rounded-xl shadow-2xl border z-20 overflow-hidden ${
            darkMode 
              ? 'bg-gray-800 border-gray-600' 
              : 'bg-white border-gray-200'
          }`}>
            {/* ヘッダー */}
            <div className={`flex items-center justify-between p-4 border-b ${
              darkMode ? 'border-gray-600' : 'border-gray-200'
            }`}>
              <h3 className={`font-bold ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                通知
              </h3>
              
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className={`text-xs px-2 py-1 rounded transition-all duration-200 ${
                      darkMode 
                        ? 'text-blue-400 hover:bg-blue-400/20' 
                        : 'text-blue-600 hover:bg-blue-100'
                    }`}
                  >
                    全て既読
                  </button>
                )}
                
                <button
                  onClick={() => setIsOpen(false)}
                  className={`p-1 rounded transition-all duration-200 ${
                    darkMode 
                      ? 'text-gray-400 hover:bg-gray-700 hover:text-white' 
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`}
                >
                  <FaTimes size={14} />
                </button>
              </div>
            </div>

            {/* 通知一覧 */}
            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="p-6 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mx-auto"></div>
                  <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    通知を読み込み中...
                  </p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <div className={`text-4xl mb-2 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    🔔
                  </div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    通知はありません
                  </p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const display = getNotificationDisplay(notification.type);
                  const isUnread = !notification.read_at;
                  
                  return (
                    <div
                      key={notification.id}
                      className={`relative p-4 border-b cursor-pointer transition-all duration-200 hover:bg-opacity-50 ${
                        darkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-100 hover:bg-gray-50'
                      } ${isUnread ? display.bgColor : ''}`}
                      onClick={() => {
                        if (isUnread) {
                          markAsRead(notification.id);
                        }
                      }}
                    >
                      {/* 未読インジケーター */}
                      {isUnread && (
                        <div className={`absolute left-2 top-1/2 transform -translate-y-1/2 w-2 h-2 rounded-full ${
                          darkMode ? 'bg-blue-400' : 'bg-blue-500'
                        }`} />
                      )}

                      <div className="flex gap-3 ml-4">
                        {/* アイコン */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          darkMode ? 'bg-gray-700' : 'bg-gray-100'
                        }`}>
                          <span className={display.color}>
                            {display.icon}
                          </span>
                        </div>

                        {/* 内容 */}
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium text-sm mb-1 ${
                            darkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {notification.title}
                          </div>
                          
                          <div className={`text-sm mb-2 ${
                            darkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            {notification.message}
                          </div>
                          
                          <div className={`text-xs ${
                            darkMode ? 'text-gray-500' : 'text-gray-500'
                          }`}>
                            {new Date(notification.created_at).toLocaleString()}
                          </div>
                        </div>

                        {/* 未読マーク */}
                        {isUnread && (
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${
                            darkMode ? 'bg-blue-400' : 'bg-blue-500'
                          }`} />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* フッター */}
            {notifications.length > 0 && (
              <div className={`p-3 border-t text-center ${
                darkMode ? 'border-gray-600' : 'border-gray-200'
              }`}>
                <button
                  className={`text-sm transition-all duration-200 ${
                    darkMode 
                      ? 'text-gray-400 hover:text-white' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  すべての通知を見る
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
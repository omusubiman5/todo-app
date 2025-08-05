"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { FaTimes, FaUser, FaPaperPlane, FaEdit, FaTrash } from 'react-icons/fa';
import { TaskComment } from '@/lib/types';
import { SharedTaskService } from '@/lib/sharedTaskService';
import { useAuth } from './AuthProvider';

interface TaskCommentsModalProps {
  taskId: string;
  teamId?: string | null;
  darkMode?: boolean;
  onClose: () => void;
}

export default function TaskCommentsModal({ 
  taskId, 
  teamId, 
  darkMode = false, 
  onClose 
}: TaskCommentsModalProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [teamMembers, setTeamMembers] = useState<Array<{ user_id: string; role: string; user?: { id: string; email: string; user_metadata?: { full_name?: string; avatar_url?: string } } }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // コメント取得
  const fetchComments = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await SharedTaskService.getTaskComments(taskId);
      setComments(data);
      
      // 最新のコメントにスクロール
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  // チームメンバー取得
  const fetchTeamMembers = useCallback(async () => {
    if (!teamId) return;

    try {
      const members = await SharedTaskService.getTeamMembers(teamId);
      setTeamMembers(members);
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    }
  }, [teamId]);

  useEffect(() => {
    fetchComments();
    fetchTeamMembers();
  }, [fetchComments, fetchTeamMembers]);

  // リアルタイム更新
  useEffect(() => {
    const channel = SharedTaskService.subscribeToComments(taskId, (payload) => {
      console.log('Real-time comment update:', payload);
      fetchComments();
    });

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [taskId, fetchComments]);

  // コメント投稿
  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;

    setIsSubmitting(true);
    try {
      // @メンションを解析
      const mentions = SharedTaskService.parseMentions(newComment, teamMembers);
      
      const comment = await SharedTaskService.createComment(
        taskId,
        user.id,
        newComment.trim(),
        mentions
      );
      
      setComments(prev => [...prev, comment]);
      setNewComment('');
      
      // 新しいコメントにスクロール
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Failed to create comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // コメント編集開始
  const handleEditStart = (comment: TaskComment) => {
    setEditingCommentId(comment.id);
    setEditingText(comment.content);
  };

  // コメント編集保存
  const handleEditSave = async (commentId: string) => {
    if (!editingText.trim()) return;

    try {
      const mentions = SharedTaskService.parseMentions(editingText, teamMembers);
      
      const updatedComment = await SharedTaskService.updateComment(
        commentId,
        editingText.trim(),
        mentions
      );
      
      setComments(prev => prev.map(c => c.id === commentId ? updatedComment : c));
      setEditingCommentId(null);
      setEditingText('');
    } catch (error) {
      console.error('Failed to update comment:', error);
    }
  };

  // コメント削除
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('このコメントを削除しますか？')) return;

    try {
      await SharedTaskService.deleteComment(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, commentId: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEditSave(commentId);
    } else if (e.key === 'Escape') {
      setEditingCommentId(null);
      setEditingText('');
    }
  };

  // @メンション候補の表示（簡易版）
  const renderMentionHints = () => {
    if (!teamMembers.length || !newComment.includes('@')) return null;

    return (
      <div className={`text-xs mt-2 p-2 rounded-lg ${
        darkMode ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-100 text-gray-600'
      }`}>
        💡 @ユーザー名 でメンションできます
      </div>
    );
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
            タスクコメント
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

        {/* コメント一覧 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                コメントを読み込み中...
              </p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <div className={`text-4xl mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                💬
              </div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                まだコメントはありません
              </p>
            </div>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className={`flex gap-3 p-4 rounded-xl ${
                  darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                }`}
              >
                {/* アバター */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  darkMode ? 'bg-gray-600' : 'bg-gray-300'
                }`}>
                  {comment.user?.user_metadata?.avatar_url ? (
                    <Image
                      src={comment.user.user_metadata.avatar_url}
                      alt="Avatar"
                      width={40}
                      height={40}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <FaUser size={16} className={darkMode ? 'text-gray-400' : 'text-gray-600'} />
                  )}
                </div>

                {/* コメント内容 */}
                <div className="flex-1 min-w-0">
                  {/* ユーザー名・時刻 */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-sm ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {comment.user?.user_metadata?.full_name || comment.user?.email || 'Unknown User'}
                      </span>
                      <span className={`text-xs ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    </div>

                    {/* 編集・削除ボタン（自分のコメントのみ） */}
                    {user?.id === comment.user_id && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditStart(comment)}
                          className={`p-1 rounded transition-all duration-200 ${
                            darkMode 
                              ? 'text-gray-400 hover:bg-gray-600 hover:text-white' 
                              : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                          }`}
                        >
                          <FaEdit size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className={`p-1 rounded transition-all duration-200 ${
                            darkMode 
                              ? 'text-red-400 hover:bg-red-500/20' 
                              : 'text-red-500 hover:bg-red-100'
                          }`}
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* コメントテキスト */}
                  {editingCommentId === comment.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => handleEditKeyDown(e, comment.id)}
                        className={`w-full p-2 rounded-lg text-sm resize-none transition-all duration-200 focus:outline-none focus:ring-2 ${
                          darkMode 
                            ? 'bg-gray-600 text-white border-gray-500 focus:ring-blue-400' 
                            : 'bg-white text-black border-gray-300 focus:ring-blue-500'
                        }`}
                        rows={3}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditSave(comment.id)}
                          className={`px-3 py-1 text-xs rounded-lg font-medium transition-all duration-200 ${
                            darkMode 
                              ? 'bg-green-600 text-white hover:bg-green-700' 
                              : 'bg-green-500 text-white hover:bg-green-600'
                          }`}
                        >
                          保存
                        </button>
                        <button
                          onClick={() => {
                            setEditingCommentId(null);
                            setEditingText('');
                          }}
                          className={`px-3 py-1 text-xs rounded-lg font-medium transition-all duration-200 ${
                            darkMode 
                              ? 'bg-gray-600 text-white hover:bg-gray-700' 
                              : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                          }`}
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={`text-sm whitespace-pre-wrap ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {comment.content}
                    </div>
                  )}

                  {/* メンション表示 */}
                  {comment.mentions && comment.mentions.length > 0 && (
                    <div className={`text-xs mt-2 ${
                      darkMode ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      {comment.mentions.length}人にメンション
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={commentsEndRef} />
        </div>

        {/* コメント入力 */}
        <div className={`p-6 border-t ${
          darkMode ? 'border-gray-600' : 'border-gray-200'
        }`}>
          <div className="space-y-3">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="コメントを入力... (Enterで送信、Shift+Enterで改行)"
              className={`w-full p-3 rounded-xl text-sm resize-none transition-all duration-200 focus:outline-none focus:ring-2 ${
                darkMode 
                  ? 'bg-gray-700 text-white border-gray-600 focus:ring-blue-400 placeholder-gray-400' 
                  : 'bg-gray-50 text-black border-gray-300 focus:ring-blue-500 placeholder-gray-500'
              }`}
              rows={3}
            />
            
            {renderMentionHints()}
            
            <div className="flex justify-between items-center">
              <div className={`text-xs ${
                darkMode ? 'text-gray-500' : 'text-gray-500'
              }`}>
                💡 チームメンバーに通知するには @ユーザー名 でメンションしてください
              </div>
              
              <button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isSubmitting}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                  !newComment.trim() || isSubmitting
                    ? (darkMode ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed')
                    : (darkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600')
                }`}
              >
                <FaPaperPlane size={14} />
                {isSubmitting ? '送信中...' : '送信'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
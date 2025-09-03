"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { FaPlus, FaTrash, FaEdit, FaCheck, FaTimes, FaSort, FaEye, FaEyeSlash, FaUser, FaComment, FaHistory } from 'react-icons/fa';
import { SharedTask } from '@/lib/types';
import { SharedTaskService } from '@/lib/sharedTaskService';
import { useWorkspace } from './WorkspaceProvider';
import { useAuth } from './AuthProvider';
import TaskAssignmentModal from './TaskAssignmentModal';
import TaskCommentsModal from './TaskCommentsModal';
import TaskHistoryModal from './TaskHistoryModal';

interface SharedTaskBoardProps {
  darkMode?: boolean;
}

export default function SharedTaskBoard({ darkMode = false }: SharedTaskBoardProps) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  
  const [tasks, setTasks] = useState<SharedTask[]>([]);
  const [task, setTask] = useState('');
  const [priority, setPriority] = useState<"高" | "中" | "低">('中');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [editPriority, setEditPriority] = useState<"高" | "中" | "低">('中');
  const [sortByPriority, setSortByPriority] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // モーダル状態
  const [assignmentModal, setAssignmentModal] = useState<{ isOpen: boolean; taskId: string | null }>({
    isOpen: false,
    taskId: null
  });
  const [commentsModal, setCommentsModal] = useState<{ isOpen: boolean; taskId: string | null }>({
    isOpen: false,
    taskId: null
  });
  const [historyModal, setHistoryModal] = useState<{ isOpen: boolean; taskId: string | null }>({
    isOpen: false,
    taskId: null
  });

  // タスク取得
  const fetchTasks = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    console.log('📋 タスク取得開始:', {
      workspace_type: currentWorkspace?.type,
      team_id: currentWorkspace?.team_id
    });
    
    setIsLoading(true);
    
    try {
      // ワークスペース変更時は既存タスクを即座にクリア
      setTasks([]);
      
      const data = await SharedTaskService.getTasks(currentWorkspace, user.id);
      
      console.log('✅ タスク取得成功:', {
        workspace_type: currentWorkspace.type,
        team_name: currentWorkspace.team_name,
        tasks_count: data.length,
        tasks: data.map(t => ({ id: t.id, text: t.text, team_id: t.team_id }))
      });
      
      setTasks(data);
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('❌ タスク取得エラー:', error);
      // エラー時は空配列に設定
      setTasks([]);
    } finally {
      // 必ずローディング状態を解除
      setIsLoading(false);
    }
  }, [user, currentWorkspace]);

  // 初期読み込みとワークスペース変更時の更新
  useEffect(() => {
    if (!user || !currentWorkspace) return;
    // ワークスペース変更時は即座にタスクをクリアしてからフェッチ
    setTasks([]);
    fetchTasks();
  }, [user, currentWorkspace, fetchTasks]);

  // リアルタイム更新（デバウンス付き）- ワークスペース変更時は無効化
  useEffect(() => {
    if (!user || !currentWorkspace) return;

    let timeoutId: NodeJS.Timeout;
    let isMounted = true;

    const channel = SharedTaskService.subscribeToTasks(currentWorkspace, (payload) => {
      console.log('Real-time task update:', payload);
      // ワークスペース変更中の場合はリアルタイム更新をスキップ
      if (!isMounted) return;
      
      // 500msのデバウンスでAPI呼び出しを制限
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (isMounted) {
          fetchTasks();
        }
      }, 500);
    });

    return () => {
      isMounted = false;
      if (channel) {
        channel.unsubscribe();
      }
      clearTimeout(timeoutId);
    };
  }, [currentWorkspace, user, fetchTasks]);

  // タスク追加
  const handleAddTask = async () => {
    if (!user || task.trim() === '') return;

    // 詳細なワークスペース状態ログ
    console.log('📝 タスク作成開始 - ワークスペース詳細:', {
      workspace: currentWorkspace,
      workspaceType: currentWorkspace.type,
      teamId: currentWorkspace.team_id,
      teamName: currentWorkspace.team_name,
      taskText: task.trim(),
      priority,
      user_id: user.id,
      expectedTeamId: currentWorkspace.type === 'team' ? currentWorkspace.team_id : null
    });

    try {
      // 作成データを事前ログ出力
      const taskToCreate = {
        text: task.trim(),
        completed: false,
        priority,
        user_id: user.id
      };
      
      console.log('📤 SharedTaskService.createTask呼び出し:', {
        taskData: taskToCreate,
        workspace: currentWorkspace,
        workspaceType: currentWorkspace.type,
        teamId: currentWorkspace.team_id
      });

      const newTask = await SharedTaskService.createTask(taskToCreate, currentWorkspace);

      console.log('✅ タスク作成成功:', {
        id: newTask.id,
        text: newTask.text,
        team_id: newTask.team_id,
        workspace_type: currentWorkspace.type,
        expectedTeamId: currentWorkspace.type === 'team' ? currentWorkspace.team_id : null,
        teamIdMismatch: newTask.team_id !== (currentWorkspace.type === 'team' ? currentWorkspace.team_id : null)
      });

      setTasks(prev => [...prev, newTask]);
      setTask('');
      setPriority('中');
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('❌ タスク作成エラー:', error);
    }
  };

  // タスク更新
  const handleUpdateTask = async (taskId: string, updates: Partial<SharedTask>) => {
    try {
      const updatedTask = await SharedTaskService.updateTask(taskId, updates);
      setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  // タスク削除（ID指定版に修正）
  const handleDeleteTask = async (taskId: string) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    console.log('🗑️ タスク削除開始:', { 
      taskId, 
      taskToDelete,
      currentUser: user?.id,
      currentWorkspace,
      taskOwner: taskToDelete?.user_id,
      taskTeamId: taskToDelete?.team_id,
      isOwner: taskToDelete?.user_id === user?.id,
      isPersonalTask: taskToDelete?.team_id === null,
      isTeamTask: taskToDelete?.team_id !== null
    });

    // 権限チェック表示
    if (taskToDelete) {
      const isPersonal = taskToDelete.team_id === null;
      const isOwner = taskToDelete.user_id === user?.id;
      console.log('🔐 削除権限チェック:', {
        taskType: isPersonal ? '個人タスク' : 'チームタスク',
        canDelete: isPersonal ? isOwner : '要チーム権限確認',
        ownershipMatch: isOwner
      });
    }
    
    try {
      await SharedTaskService.deleteTask(taskId);
      setTasks(prev => prev.filter(task => task.id !== taskId));
      setEditingIndex(null);
      setLastSyncTime(new Date());
      console.log('✅ タスク削除成功:', { taskId });
    } catch (error) {
      console.error('❌ タスク削除エラー:', error);
      console.error('エラーの詳細:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      // RLS権限エラーの可能性を示唆
      if (error.code === '42501' || error.message.includes('permission') || error.message.includes('policy')) {
        console.error('🚫 RLS権限エラーの可能性があります。タスクの所有者または適切なチーム権限が必要です。');
      }
    }
  };

  // タスク完了トグル
  const handleToggleTask = async (index: number) => {
    const taskToUpdate = tasks[index];
    
    try {
      const updatedTask = await SharedTaskService.updateTask(taskToUpdate.id, {
        completed: !taskToUpdate.completed
      });
      setTasks(prev => prev.map((t, i) => i === index ? updatedTask : t));
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  };

  // 編集開始
  const handleEditStart = (index: number) => {
    setEditingIndex(index);
    setEditText(tasks[index].text);
    setEditPriority(tasks[index].priority);
  };

  // 編集保存
  const handleEditSave = async (index: number) => {
    const taskToUpdate = tasks[index];
    
    try {
      const updatedTask = await SharedTaskService.updateTask(taskToUpdate.id, {
        text: editText,
        priority: editPriority
      });
      setTasks(prev => prev.map((t, i) => i === index ? updatedTask : t));
      setEditingIndex(null);
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Failed to save task:', error);
    }
  };

  const handleEditCancel = () => {
    setEditingIndex(null);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddTask();
    }
  };

  // ソート・フィルタリング
  const getSortedTasks = () => {
    if (!sortByPriority) return tasks.map((task, index) => ({ ...task, originalIndex: index }));
    const priorityOrder = { "高": 0, "中": 1, "低": 2 };
    return [...tasks].map((task, index) => ({ ...task, originalIndex: index })).sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  };

  const getFilteredTasks = () => {
    const sorted = getSortedTasks();
    if (!hideCompleted) return sorted;
    return sorted.filter(t => !t.completed);
  };

  // 担当者アサイン
  const handleAssignTask = (taskId: string) => {
    setAssignmentModal({ isOpen: true, taskId });
  };

  // コメント表示
  const handleShowComments = (taskId: string) => {
    setCommentsModal({ isOpen: true, taskId });
  };

  // 履歴表示
  const handleShowHistory = (taskId: string) => {
    setHistoryModal({ isOpen: true, taskId });
  };

  return (
    <div className="w-full">
      {/* チーム名表示 */}
      {currentWorkspace.type === 'team' && currentWorkspace.team_name && (
        <div className={`rounded-2xl p-4 mb-6 backdrop-blur-md border transition-all duration-300 ${
          darkMode 
            ? 'bg-blue-800/50 border-blue-700' 
            : 'bg-blue-500/10 border-blue-400/20'
        }`}>
          <div className="flex items-center justify-center gap-3">
            <div className="text-2xl">👥</div>
            <div>
              <h2 className={`text-xl font-bold ${
                darkMode ? 'text-blue-300' : 'text-blue-200'
              }`}>
                {currentWorkspace.team_name}
              </h2>
              <p className={`text-sm ${
                darkMode ? 'text-blue-400' : 'text-blue-300'
              }`}>
                チームタスクボード
              </p>
            </div>
          </div>
        </div>
      )}

      {/* タスク追加フォーム */}
      <div className={`rounded-2xl p-6 mb-8 backdrop-blur-md border transition-all duration-300 ${
        darkMode 
          ? 'bg-gray-800/50 border-gray-700' 
          : 'bg-white/10 border-white/20'
      }`}>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            className={`flex-1 border-2 rounded-xl px-6 py-3 text-lg backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-4 focus:scale-105 ${
              darkMode 
                ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500/50 focus:border-blue-400' 
                : 'bg-white/20 border-white/30 text-white placeholder-white/70 focus:ring-yellow-300/50 focus:border-yellow-300'
            }`}
            placeholder={`✨ ${currentWorkspace.type === 'team' ? 'チームの' : ''}やることを入力してね...`}
            value={task}
            onChange={e => setTask(e.target.value)}
            onKeyDown={handleInputKeyDown}
          />
          <select
            className={`border-2 rounded-xl px-4 py-3 text-lg backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-4 ${
              darkMode 
                ? 'bg-gray-700/50 border-gray-600 text-white focus:ring-blue-500/50 focus:border-blue-400' 
                : 'bg-white/20 border-white/30 text-white focus:ring-yellow-300/50 focus:border-yellow-300'
            }`}
            value={priority}
            onChange={e => setPriority(e.target.value as "高" | "中" | "低")}
          >
            <option value="高" className="text-black">高</option>
            <option value="中" className="text-black">中</option>
            <option value="低" className="text-black">低</option>
          </select>
          <button
            className={`font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
              darkMode 
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white' 
                : 'bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white'
            }`}
            onClick={handleAddTask}
            disabled={isLoading}
          >
            <FaPlus /> 追加
          </button>
        </div>
      </div>

      {/* フィルタ・ソートボタン */}
      <div className="flex flex-wrap justify-center gap-3 mb-6">
        <button
          className={`px-4 py-2 rounded-xl font-bold text-sm shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center gap-2 ${
            sortByPriority 
              ? (darkMode ? 'bg-blue-500 text-white' : 'bg-yellow-400 text-white') 
              : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white/30 text-gray-900 hover:bg-white/40')
          }`}
          onClick={() => setSortByPriority(v => !v)}
        >
          <FaSort /> 優先度で{sortByPriority ? '元に戻す' : 'ソート'}
        </button>
        <button
          className={`px-4 py-2 rounded-xl font-bold text-sm shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center gap-2 ${
            hideCompleted 
              ? (darkMode ? 'bg-green-500 text-white' : 'bg-green-400 text-white') 
              : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white/30 text-gray-900 hover:bg-white/40')
          }`}
          onClick={() => setHideCompleted(v => !v)}
        >
          {hideCompleted ? <FaEye /> : <FaEyeSlash />}
          {hideCompleted ? '完了タスクを表示' : '完了タスクを隠す'}
        </button>
      </div>

      {/* タスクリスト */}
      <div className={`backdrop-blur-md rounded-3xl shadow-2xl p-6 border transition-all duration-300 ${
        darkMode 
          ? 'bg-gray-800/50 border-gray-700' 
          : 'bg-white/10 border-white/20'
      }`}>
        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4 animate-spin">⏳</div>
            <p className={`text-lg font-medium mb-2 ${
              darkMode ? 'text-gray-300' : 'text-white/80'
            }`}>
              読み込み中...
            </p>
            <p className={`text-sm ${
              darkMode ? 'text-gray-400' : 'text-white/60'
            }`}>
              {currentWorkspace.type === 'team' ? `${currentWorkspace.team_name}のタスクを取得中` : '個人タスクを取得中'}
            </p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4 animate-bounce">🎉</div>
            <p className={`text-lg font-medium mb-2 ${
              darkMode ? 'text-gray-300' : 'text-white/80'
            }`}>
              {currentWorkspace.type === 'team' ? 'チームタスクはありません！' : 'タスクはありません！'}
            </p>
            <p className={`text-sm ${
              darkMode ? 'text-gray-400' : 'text-white/60'
            }`}>
              新しいタスクを追加してみよう
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {getFilteredTasks().map((t) => (
              <div
                key={t.id}
                className={`group rounded-2xl p-4 border transition-all duration-300 transform hover:scale-105 hover:shadow-xl animate-fadeIn ${
                  darkMode 
                    ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-600/50' 
                    : 'bg-white/20 border-white/30 hover:bg-white/30'
                } ${
                  t.priority === "高" 
                    ? (darkMode ? "border-red-500 bg-red-500/10" : "border-red-400 bg-red-400/20") 
                    : t.priority === "中" 
                    ? (darkMode ? "border-yellow-500 bg-yellow-500/10" : "border-yellow-400 bg-yellow-400/20") 
                    : (darkMode ? "border-blue-500 bg-blue-500/10" : "border-blue-400 bg-blue-400/20")
                } ${t.completed ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={t.completed}
                      onChange={() => handleToggleTask(t.originalIndex)}
                      className={`w-5 h-5 cursor-pointer transition-all duration-200 ${
                        darkMode ? 'accent-blue-400' : 'accent-yellow-400'
                      }`}
                    />
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      t.priority === "高" 
                        ? (darkMode ? "bg-red-500 text-white" : "bg-red-400 text-white") 
                        : t.priority === "中" 
                        ? (darkMode ? "bg-yellow-500 text-white" : "bg-yellow-400 text-white") 
                        : (darkMode ? "bg-blue-500 text-white" : "bg-blue-400 text-white")
                    }`}>
                      {t.priority}
                    </span>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {/* チームタスクの場合の追加ボタン */}
                    {currentWorkspace.type === 'team' && (
                      <>
                        <button
                          onClick={() => handleAssignTask(t.id)}
                          className={`p-2 rounded-full transition-all duration-300 transform hover:scale-110 ${
                            darkMode 
                              ? 'text-green-400 hover:bg-green-400/20' 
                              : 'text-green-300 hover:bg-green-500/30'
                          }`}
                          title="担当者設定"
                        >
                          <FaUser size={14} />
                        </button>
                        <button
                          onClick={() => handleShowComments(t.id)}
                          className={`p-2 rounded-full transition-all duration-300 transform hover:scale-110 ${
                            darkMode 
                              ? 'text-purple-400 hover:bg-purple-400/20' 
                              : 'text-purple-300 hover:bg-purple-500/30'
                          }`}
                          title="コメント"
                        >
                          <FaComment size={14} />
                        </button>
                        <button
                          onClick={() => handleShowHistory(t.id)}
                          className={`p-2 rounded-full transition-all duration-300 transform hover:scale-110 ${
                            darkMode 
                              ? 'text-orange-400 hover:bg-orange-400/20' 
                              : 'text-orange-300 hover:bg-orange-500/30'
                          }`}
                          title="履歴"
                        >
                          <FaHistory size={14} />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleEditStart(t.originalIndex)}
                      className={`p-2 rounded-full transition-all duration-300 transform hover:scale-110 ${
                        darkMode 
                          ? 'text-blue-400 hover:bg-blue-400/20' 
                          : 'text-blue-300 hover:bg-blue-500/30'
                      }`}
                    >
                      <FaEdit size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(t.id)}
                      className={`p-2 rounded-full transition-all duration-300 transform hover:scale-110 ${
                        darkMode 
                          ? 'text-red-400 hover:bg-red-400/20' 
                          : 'text-red-300 hover:bg-red-500/30'
                      }`}
                    >
                      <FaTrash size={14} />
                    </button>
                  </div>
                </div>

                {/* チーム名と担当者表示 */}
                <div className="mb-3 space-y-1">
                  {/* チーム名表示 */}
                  {currentWorkspace.type === 'team' && currentWorkspace.team_name && (
                    <div className={`text-xs flex items-center gap-2 ${
                      darkMode ? 'text-blue-400' : 'text-blue-300'
                    }`}>
                      <span className="text-xs">👥</span>
                      <span>{currentWorkspace.team_name}</span>
                    </div>
                  )}
                  
                  {/* 担当者表示 */}
                  {t.assigned_to && t.assignee && (
                    <div className={`text-xs flex items-center gap-2 ${
                      darkMode ? 'text-gray-400' : 'text-white/70'
                    }`}>
                      <FaUser size={10} />
                      <span>担当: {t.assignee.user_metadata?.full_name || t.assignee.email}</span>
                    </div>
                  )}
                </div>

                {editingIndex === t.originalIndex ? (
                  <div className="space-y-3">
                    <input
                      className={`w-full rounded-lg px-3 py-2 text-lg transition-all duration-200 focus:outline-none focus:ring-2 ${
                        darkMode 
                          ? 'bg-gray-600 text-white border-gray-500 focus:ring-blue-400' 
                          : 'bg-white text-black border-gray-300 focus:ring-yellow-400'
                      }`}
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleEditSave(t.originalIndex); if (e.key === 'Escape') handleEditCancel(); }}
                      autoFocus
                    />
                    <select
                      className={`w-full rounded-lg px-3 py-2 text-lg transition-all duration-200 focus:outline-none focus:ring-2 ${
                        darkMode 
                          ? 'bg-gray-600 text-white border-gray-500 focus:ring-blue-400' 
                          : 'bg-white text-black border-gray-300 focus:ring-yellow-400'
                      }`}
                      value={editPriority}
                      onChange={e => setEditPriority(e.target.value as "高" | "中" | "低")}
                    >
                      <option value="高">高</option>
                      <option value="中">中</option>
                      <option value="低">低</option>
                    </select>
                    <div className="flex gap-2">
                      <button 
                        className={`flex-1 py-2 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                          darkMode 
                            ? 'bg-green-600 hover:bg-green-700 text-white' 
                            : 'bg-green-500 hover:bg-green-600 text-white'
                        }`}
                        onClick={() => handleEditSave(t.originalIndex)}
                      >
                        <FaCheck /> 保存
                      </button>
                      <button 
                        className={`flex-1 py-2 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                          darkMode 
                            ? 'bg-gray-600 hover:bg-gray-700 text-white' 
                            : 'bg-gray-400 hover:bg-gray-500 text-white'
                        }`}
                        onClick={handleEditCancel}
                      >
                        <FaTimes /> キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`font-medium text-lg cursor-pointer transition-all duration-200 hover:scale-105 ${
                      darkMode ? 'text-gray-100' : 'text-white'
                    } ${t.completed ? 'line-through opacity-60' : ''}`}
                    onClick={() => handleEditStart(t.originalIndex)}
                    title="クリックで編集"
                  >
                    📝 {t.text}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 最終同期時刻 */}
        {lastSyncTime && (
          <div className={`text-center mt-4 text-xs ${
            darkMode ? 'text-gray-400' : 'text-white/60'
          }`}>
            最終同期: {lastSyncTime.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* モーダル */}
      {assignmentModal.isOpen && assignmentModal.taskId && (
        <TaskAssignmentModal
          taskId={assignmentModal.taskId}
          teamId={currentWorkspace.team_id}
          darkMode={darkMode}
          onClose={() => setAssignmentModal({ isOpen: false, taskId: null })}
          onAssign={(taskId, userId) => {
            const task = tasks.find(t => t.id === taskId);
            if (task) {
              handleUpdateTask(taskId, { assigned_to: userId });
            }
            setAssignmentModal({ isOpen: false, taskId: null });
          }}
        />
      )}

      {commentsModal.isOpen && commentsModal.taskId && (
        <TaskCommentsModal
          taskId={commentsModal.taskId}
          teamId={currentWorkspace.team_id}
          darkMode={darkMode}
          onClose={() => setCommentsModal({ isOpen: false, taskId: null })}
        />
      )}

      {historyModal.isOpen && historyModal.taskId && (
        <TaskHistoryModal
          taskId={historyModal.taskId}
          darkMode={darkMode}
          onClose={() => setHistoryModal({ isOpen: false, taskId: null })}
        />
      )}
    </div>
  );
}
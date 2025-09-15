"use client";

import React, { useReducer, useEffect, useCallback, useMemo, memo } from 'react';
import { FaPlus, FaTrash, FaEdit, FaCheck, FaTimes, FaSort, FaEye, FaEyeSlash, FaUser, FaComment, FaHistory } from 'react-icons/fa';
import { SharedTask } from '@/lib/types';
import { SharedTaskService } from '@/lib/sharedTaskService';
import { useWorkspace } from './WorkspaceProvider';
import { useAuth } from './AuthProvider';
import TaskAssignmentModal from './TaskAssignmentModal';
import TaskCommentsModal from './TaskCommentsModal';
import TaskHistoryModal from './TaskHistoryModal';
import { useTaskBoardReducer } from '@/hooks/useTaskBoardReducer';
import VirtualTaskList from './VirtualTaskList';
import { realtimeManager } from '@/lib/RealtimeConnectionManager';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import AccessibleTaskItem from './accessibility/AccessibleTaskItem';

interface SharedTaskBoardProps {
  darkMode?: boolean;
}

const SharedTaskBoard = memo(function SharedTaskBoard({ darkMode = false }: SharedTaskBoardProps) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  
  // 🚀 Phase 3: useReducer統合によるパフォーマンス最適化
  const { state, actions } = useTaskBoardReducer();
  const {
    tasks,
    task,
    priority,
    editingIndex,
    editText,
    editPriority,
    sortByPriority,
    hideCompleted,
    isLoading,
    lastSyncTime,
    modals
  } = state;

  // 🚀 Phase 3: 最適化されたタスク取得（楽観的更新対応）
  const fetchTasks = useCallback(async () => {
    actions.setLoading(true);
    
    // 開発環境: 認証がない場合でもローディング状態を解除
    if (!user || !currentWorkspace) {
      console.log('⚠️ 認証またはワークスペースが未設定:', { hasUser: !!user, hasWorkspace: !!currentWorkspace });
      // デモ用のサンプルタスクを設定（開発環境用）
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 開発環境: サンプルタスクを表示');
        actions.setTasks([
          {
            id: 'demo-1',
            text: 'デモタスク1: 認証を設定してください',
            completed: false,
            priority: '高' as const,
            user_id: 'demo-user',
            team_id: null,
            assigned_to: null,
            created_by: 'demo-user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'demo-2', 
            text: 'デモタスク2: これは開発環境専用です',
            completed: false,
            priority: '中' as const,
            user_id: 'demo-user',
            team_id: null,
            assigned_to: null,
            created_by: 'demo-user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]);
      } else {
        actions.setTasks([]);
      }
      actions.setLoading(false);
      return;
    }
    
    try {
      console.log('🔍 タスク取得開始:', { workspace: currentWorkspace, userId: user.id });
      const data = await SharedTaskService.getTasks(currentWorkspace, user.id);
      console.log('✅ タスク取得成功:', data);
      actions.setTasks(data);
    } catch (error) {
      console.error('❌ タスク取得エラー:', error);
      actions.setTasks([]);
    } finally {
      // 確実にローディング状態を解除
      actions.setLoading(false);
      console.log('🔄 ローディング状態解除');
    }
  }, [user?.id, currentWorkspace?.type, currentWorkspace?.team_id]);

  // 初期読み込みとワークスペース変更時の更新
  useEffect(() => {
    // 認証なしでもfetchTasksを呼び出し、ローディング状態を解除
    fetchTasks();
  }, [fetchTasks]);

  // 🚀 Phase 3: 統合されたリアルタイム更新管理
  useEffect(() => {
    if (!user || !currentWorkspace) return;

    const subscriptionId = realtimeManager.subscribeToTasks(
      currentWorkspace,
      user.id,
      (payload) => {
        console.log('📡 Optimized realtime update:', payload);
        fetchTasks(); // デバウンスは管理システムが処理
      }
    );

    return () => {
      realtimeManager.unsubscribe(subscriptionId);
    };
  }, [fetchTasks, user, currentWorkspace]);

  // 🚀 Phase 3: 最適化されたタスク追加（楽観的更新）
  const handleAddTask = useCallback(async () => {
    if (!user || task.trim() === '' || !currentWorkspace) return;

    try {
      const taskToCreate = {
        text: task.trim(),
        completed: false,
        priority,
        user_id: user.id
      };

      // 楽観的更新 - 即座にUIに表示
      const optimisticTask = {
        ...taskToCreate,
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        team_id: currentWorkspace.type === 'team' ? currentWorkspace.team_id : null
      } as SharedTask;
      
      actions.optimisticAdd(optimisticTask);
      actions.resetForm();

      // 開発環境でデモユーザーの場合はローカルタスクとして保持
      if (process.env.NODE_ENV === 'development' && user.id === 'demo-user') {
        console.log('🔧 開発環境: デモタスクとしてローカルに作成:', optimisticTask);
        const demoTask = {
          ...optimisticTask,
          id: `demo-${Date.now()}`,
        };
        actions.optimisticUpdate(optimisticTask.id, demoTask);
        console.log('✅ デモタスク作成成功:', demoTask.id);
        return;
      }

      // 実際のユーザーの場合はSupabaseに作成
      const newTask = await SharedTaskService.createTask(taskToCreate, currentWorkspace);

      // 成功時は一時タスクをサーバーデータに置き換え
      actions.optimisticUpdate(optimisticTask.id, newTask);
    } catch (error) {
      // エラー時は楽観的更新をロールバック
      actions.rollbackOptimistic(tasks);
      actions.setForm({ task, priority });
      console.error('❌ タスク作成エラー:', error);
    }
  }, [task, priority, user, currentWorkspace, actions, tasks]);

  // タスク更新
  const handleUpdateTask = useCallback(async (taskId: string, updates: Partial<SharedTask>) => {
    try {
      // 開発環境でデモタスクの場合はローカルで更新
      if (process.env.NODE_ENV === 'development' && taskId.startsWith('demo-')) {
        console.log('🔧 開発環境: デモタスクをローカルで更新:', taskId, updates);
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex >= 0) {
          const currentTask = tasks[taskIndex];
          const updatedTask = { ...currentTask, ...updates, updated_at: new Date().toISOString() };
          actions.updateTask(taskIndex, updatedTask);
          actions.setSyncTime(new Date());
          console.log('✅ デモタスク更新成功:', taskId);
        }
        return;
      }
      
      // 実際のタスクの場合はSupabaseで更新
      const updatedTask = await SharedTaskService.updateTask(taskId, updates);
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      if (taskIndex >= 0) {
        actions.updateTask(taskIndex, updatedTask);
        actions.setSyncTime(new Date());
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  }, [actions, tasks]);

  // 🚀 useCallback: タスク削除関数最適化
  const handleDeleteTask = useCallback(async (taskId: string) => {
    console.log('🗑️ 削除ボタンがクリックされました - taskId:', taskId);
    
    const taskToDelete = tasks.find(t => t.id === taskId);
    console.log('📋 削除対象タスク:', taskToDelete);

    // 権限チェック表示
    if (taskToDelete) {
      const isPersonal = taskToDelete.team_id === null;
      const isOwner = taskToDelete.user_id === user?.id;
      console.log('🔒 権限チェック:', { isPersonal, isOwner, currentUser: user?.id });
    } else {
      console.error('❌ 削除対象タスクが見つかりません:', taskId);
      return;
    }
    
    try {
      // 開発環境でデモタスクの場合はローカルで削除
      if (process.env.NODE_ENV === 'development' && taskId.startsWith('demo-')) {
        console.log('🔧 開発環境: デモタスクをローカルで削除:', taskId);
        actions.setTasks(tasks.filter(task => task.id !== taskId));
        actions.setEditing({ index: null });
        actions.setSyncTime(new Date());
        console.log('✅ デモタスク削除成功:', taskId);
        return;
      }
      
      // 実際のタスクの場合はSupabaseで削除
      await SharedTaskService.deleteTask(taskId);
      actions.setTasks(tasks.filter(task => task.id !== taskId));
      actions.setEditing({ index: null });
      actions.setSyncTime(new Date());
      // Task deleted successfully
    } catch (error) {
      console.error('❌ タスク削除エラー:', error);
      console.error('エラーの詳細:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as Record<string, unknown>).code || 'unknown',
        details: (error as Record<string, unknown>).details || null,
        hint: (error as Record<string, unknown>).hint || null
      });
      
      // RLS権限エラーの可能性を示唆
      if ((error as Record<string, unknown>).code === '42501' || (error instanceof Error && (error.message.includes('permission') || error.message.includes('policy')))) {
        console.error('🚫 RLS権限エラーの可能性があります。タスクの所有者または適切なチーム権限が必要です。');
      }
    }
  }, [tasks, user, currentWorkspace]);

  // 🚀 useCallback: タスク完了トグル関数最適化（楽観的更新）
  const handleToggleTask = useCallback(async (index: number) => {
    const taskToUpdate = tasks[index];
    
    // 🔧 楽観的更新: 即座にUIを更新
    const optimisticUpdate = {
      ...taskToUpdate,
      completed: !taskToUpdate.completed
    };
    
    actions.optimisticUpdate(taskToUpdate.id, { completed: !taskToUpdate.completed });
    
    try {
      // バックグラウンドでDB更新
      const updatedTask = await SharedTaskService.updateTask(taskToUpdate.id, {
        completed: !taskToUpdate.completed
      });
      
      // 成功時は正確なデータで更新
      actions.updateTask(index, updatedTask);
      actions.setSyncTime(new Date());
    } catch (error) {
      // エラー時は元の状態にロールバック
      actions.rollbackOptimistic(tasks);
      console.error('Failed to toggle task:', error);
    }
  }, [tasks, actions]);

  // 編集開始
  const handleEditStart = (index: number) => {
    actions.setEditing({ 
      index, 
      text: tasks[index].text, 
      priority: tasks[index].priority 
    });
  };

  // 編集保存
  const handleEditSave = async (index: number) => {
    const taskToUpdate = tasks[index];
    const originalTask = { ...taskToUpdate };
    
    // 楽観的更新 - 即座にUIを更新
    const optimisticUpdate = {
      ...taskToUpdate,
      text: editText,
      priority: editPriority
    };
    actions.setTasks(tasks.map((t, i) => i === index ? optimisticUpdate : t));
    actions.setEditing({ index: null });
    
    try {
      const updatedTask = await SharedTaskService.updateTask(taskToUpdate.id, {
        text: editText,
        priority: editPriority
      });
      // 成功時はサーバーからの正確なデータで更新
      actions.setTasks(tasks.map((t, i) => i === index ? updatedTask : t));
      actions.setSyncTime(new Date());
    } catch (error) {
      // エラー時は元の状態にロールバック
      actions.setTasks(tasks.map((t, i) => i === index ? originalTask : t));
      actions.setEditing({ index }); // 編集モードに戻す
      console.error('Failed to save task:', error);
    }
  };

  const handleEditCancel = () => {
    actions.setEditing({ index: null });
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddTask();
    }
  };

  // 🚀 useMemo: 統合されたタスク処理（ソート・フィルタリング）
  const processedTasks = useMemo(() => {
    const priorityOrder = { "高": 0, "中": 1, "低": 2 };
    
    let processed = tasks.map((task, index) => ({ ...task, originalIndex: index }));
    
    // フィルタリング
    if (hideCompleted) {
      processed = processed.filter(t => !t.completed);
    }
    
    // ソート
    if (sortByPriority) {
      processed.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    }
    
    return processed;
  }, [tasks, sortByPriority, hideCompleted]);

  // 担当者アサイン
  const handleAssignTask = (taskId: string) => {
    actions.setModal('assignment', true, taskId);
  };

  // コメント表示
  const handleShowComments = (taskId: string) => {
    actions.setModal('comments', true, taskId);
  };

  // 履歴表示
  const handleShowHistory = (taskId: string) => {
    actions.setModal('history', true, taskId);
  };

  // 🚀 Phase 3 Stage 2: キーボードナビゲーション統合
  const keyboardNav = useKeyboardNavigation({
    enabled: true,
    tasks: state.tasks,
    onTaskToggle: async (taskId: string, completed: boolean) => {
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      if (taskIndex >= 0) {
        await handleToggleTask(taskIndex);
      }
    },
    onTaskDelete: handleDeleteTask,
    onTaskEdit: (index) => actions.setEditingIndex(index),
    onTaskSelect: actions.setSelectedIndex,
    onAddTask: () => {
      const addButton = document.getElementById('add-task-button');
      addButton?.focus();
    },
  });

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
            onChange={e => actions.setForm({ task: e.target.value })}
            onKeyDown={handleInputKeyDown}
          />
          <select
            className={`border-2 rounded-xl px-4 py-3 text-lg backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-4 ${
              darkMode 
                ? 'bg-gray-700/50 border-gray-600 text-white focus:ring-blue-500/50 focus:border-blue-400' 
                : 'bg-white/20 border-white/30 text-white focus:ring-yellow-300/50 focus:border-yellow-300'
            }`}
            value={priority}
            onChange={e => actions.setForm({ priority: e.target.value as "高" | "中" | "低" })}
          >
            <option value="高" className="text-black">高</option>
            <option value="中" className="text-black">中</option>
            <option value="低" className="text-black">低</option>
          </select>
          <button
            id="add-task-button"
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
          onClick={() => actions.setFilters({ sortByPriority: !sortByPriority })}
        >
          <FaSort /> 優先度で{sortByPriority ? '元に戻す' : 'ソート'}
        </button>
        <button
          className={`px-4 py-2 rounded-xl font-bold text-sm shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center gap-2 ${
            hideCompleted 
              ? (darkMode ? 'bg-green-500 text-white' : 'bg-green-400 text-white') 
              : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white/30 text-gray-900 hover:bg-white/40')
          }`}
          onClick={() => actions.setFilters({ hideCompleted: !hideCompleted })}
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
            {processedTasks.map((t) => (
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
                      onClick={(e) => {
                        console.log('🖱️ 削除ボタンクリックイベント発生:', { taskId: t.id, event: e });
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🎯 handleDeleteTaskを呼び出します');
                        handleDeleteTask(t.id);
                      }}
                      onMouseEnter={() => console.log('🖱️ 削除ボタンにマウスホバー:', t.id)}
                      className={`p-2 rounded-full transition-all duration-300 transform hover:scale-110 ${
                        darkMode 
                          ? 'text-red-400 hover:bg-red-400/20' 
                          : 'text-red-300 hover:bg-red-500/30'
                      }`}
                      title={`タスク "${t.text}" を削除`}
                      style={{ zIndex: 10 }}
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
                      onChange={e => actions.setEditing({ index: editingIndex, text: e.target.value, priority: editPriority })}
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
                      onChange={e => actions.setEditing({ index: editingIndex, text: editText, priority: e.target.value as "高" | "中" | "低" })}
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
      {modals.assignment.isOpen && modals.assignment.taskId && (
        <TaskAssignmentModal
          taskId={modals.assignment.taskId}
          teamId={currentWorkspace.team_id}
          darkMode={darkMode}
          onClose={() => actions.setModal('assignment', false, null)}
          onAssign={(taskId, userId) => {
            const task = tasks.find(t => t.id === taskId);
            if (task) {
              handleUpdateTask(taskId, { assigned_to: userId });
            }
            actions.setModal('assignment', false, null);
          }}
        />
      )}

      {modals.comments.isOpen && modals.comments.taskId && (
        <TaskCommentsModal
          taskId={modals.comments.taskId}
          teamId={currentWorkspace.team_id}
          darkMode={darkMode}
          onClose={() => actions.setModal('comments', false, null)}
        />
      )}

      {modals.history.isOpen && modals.history.taskId && (
        <TaskHistoryModal
          taskId={modals.history.taskId}
          darkMode={darkMode}
          onClose={() => actions.setModal('history', false, null)}
        />
      )}
    </div>
  );
});

// 🚀 React.memo + カスタム比較関数で最適化
SharedTaskBoard.displayName = 'SharedTaskBoard';

export default SharedTaskBoard;
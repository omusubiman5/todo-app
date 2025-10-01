"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { SharedTask } from '@/lib/types';

// 🚀 Phase 3 Stage 2: 高度なキーボードナビゲーションシステム

interface UseKeyboardNavigationOptions {
  enabled?: boolean;
  tasks: SharedTask[];
  onTaskToggle: (taskId: string, completed: boolean) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskEdit: (index: number) => void;
  onTaskSelect?: (index: number) => void;
  onAddTask?: () => void;
  onBulkActions?: () => void;
}

interface KeyboardNavigationState {
  focusedIndex: number;
  selectedIndices: Set<number>;
  mode: 'navigation' | 'selection' | 'bulk';
  isMultiSelectMode: boolean;
}

const KEYBOARD_SHORTCUTS = {
  // ナビゲーション
  ARROW_DOWN: 'ArrowDown',
  ARROW_UP: 'ArrowUp',
  HOME: 'Home',
  END: 'End',
  PAGE_DOWN: 'PageDown',
  PAGE_UP: 'PageUp',
  
  // アクション
  ENTER: 'Enter',
  SPACE: ' ',
  DELETE: 'Delete',
  BACKSPACE: 'Backspace',
  ESCAPE: 'Escape',
  
  // 編集
  EDIT: 'e',
  ADD_TASK: 'n',
  
  // 選択
  SELECT_ALL: 'a',
  CLEAR_SELECTION: 'c',
  TOGGLE_SELECTION: 's',
  
  // バルクアクション
  BULK_DELETE: 'd',
  BULK_COMPLETE: 'Enter',
  BULK_INCOMPLETE: 'u',
} as const;

export function useKeyboardNavigation({
  enabled = true,
  tasks,
  onTaskToggle,
  onTaskDelete,
  onTaskEdit,
  onTaskSelect,
  onAddTask,
  onBulkActions,
}: UseKeyboardNavigationOptions) {
  const [state, setState] = useState<KeyboardNavigationState>({
    focusedIndex: 0,
    selectedIndices: new Set(),
    mode: 'navigation',
    isMultiSelectMode: false,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const taskRefs = useRef<Map<number, HTMLElement>>(new Map());
  
  // タスク要素の参照を管理
  const setTaskRef = useCallback((index: number, element: HTMLElement | null) => {
    if (element) {
      taskRefs.current.set(index, element);
    } else {
      taskRefs.current.delete(index);
    }
  }, []);

  // フォーカスを特定のタスクに移動
  const focusTask = useCallback((index: number) => {
    const taskElement = taskRefs.current.get(index);
    if (taskElement) {
      taskElement.focus();
      setState(prev => ({ ...prev, focusedIndex: index }));
      
      // 選択コールバック実行
      onTaskSelect?.(index);
      
      // ビューポート内にスクロール
      taskElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [onTaskSelect]);

  // 次のタスクにフォーカス
  const focusNext = useCallback(() => {
    const nextIndex = Math.min(state.focusedIndex + 1, tasks.length - 1);
    if (nextIndex !== state.focusedIndex) {
      focusTask(nextIndex);
    }
  }, [state.focusedIndex, tasks.length, focusTask]);

  // 前のタスクにフォーカス
  const focusPrevious = useCallback(() => {
    const prevIndex = Math.max(state.focusedIndex - 1, 0);
    if (prevIndex !== state.focusedIndex) {
      focusTask(prevIndex);
    }
  }, [state.focusedIndex, focusTask]);

  // 最初のタスクにフォーカス
  const focusFirst = useCallback(() => {
    if (tasks.length > 0) {
      focusTask(0);
    }
  }, [tasks.length, focusTask]);

  // 最後のタスクにフォーカス
  const focusLast = useCallback(() => {
    if (tasks.length > 0) {
      focusTask(tasks.length - 1);
    }
  }, [tasks.length, focusTask]);

  // ページジャンプ（10タスク分）
  const focusPageDown = useCallback(() => {
    const nextIndex = Math.min(state.focusedIndex + 10, tasks.length - 1);
    focusTask(nextIndex);
  }, [state.focusedIndex, tasks.length, focusTask]);

  const focusPageUp = useCallback(() => {
    const prevIndex = Math.max(state.focusedIndex - 10, 0);
    focusTask(prevIndex);
  }, [state.focusedIndex, focusTask]);

  // 選択状態の管理
  const toggleSelection = useCallback((index: number) => {
    setState(prev => {
      const newSelected = new Set(prev.selectedIndices);
      if (newSelected.has(index)) {
        newSelected.delete(index);
      } else {
        newSelected.add(index);
      }
      return {
        ...prev,
        selectedIndices: newSelected,
        mode: newSelected.size > 0 ? 'selection' : 'navigation',
      };
    });
  }, []);

  // 全選択
  const selectAll = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedIndices: new Set(tasks.map((_, index) => index)),
      mode: 'selection',
    }));
  }, [tasks]);

  // 選択解除
  const clearSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedIndices: new Set(),
      mode: 'navigation',
    }));
  }, []);

  // バルクアクション: 完了状態切り替え
  const bulkToggleComplete = useCallback((completed: boolean) => {
    state.selectedIndices.forEach(index => {
      const task = tasks[index];
      if (task && task.completed !== completed) {
        onTaskToggle(task.id, completed);
      }
    });
    clearSelection();
  }, [state.selectedIndices, tasks, onTaskToggle, clearSelection]);

  // バルクアクション: 削除
  const bulkDelete = useCallback(() => {
    if (state.selectedIndices.size === 0) return;
    
    // 確認ダイアログ
    const confirmDelete = window.confirm(
      `選択された ${state.selectedIndices.size} 個のタスクを削除しますか？`
    );
    
    if (confirmDelete) {
      // 逆順で削除（インデックスの整合性のため）
      const sortedIndices = Array.from(state.selectedIndices).sort((a, b) => b - a);
      sortedIndices.forEach(index => {
        const task = tasks[index];
        if (task) {
          onTaskDelete(task.id);
        }
      });
      
      clearSelection();
      
      // フォーカスを適切に調整
      const minDeletedIndex = Math.min(...sortedIndices);
      const newFocusIndex = Math.min(minDeletedIndex, tasks.length - state.selectedIndices.size - 1);
      if (newFocusIndex >= 0) {
        setTimeout(() => focusTask(newFocusIndex), 100);
      }
    }
  }, [state.selectedIndices, tasks, onTaskDelete, clearSelection, focusTask]);

  // キーボードイベントハンドラー
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled || tasks.length === 0) return;
    
    // 修飾キーの状態
    const isCtrl = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;
    const isAlt = e.altKey;

    // 入力フィールドにフォーカスがある場合はスキップ
    const activeElement = document.activeElement;
    const isInputActive = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.getAttribute('contenteditable') === 'true'
    );

    if (isInputActive && !isCtrl) return;

    switch (e.key) {
      // ナビゲーション
      case KEYBOARD_SHORTCUTS.ARROW_DOWN:
        e.preventDefault();
        if (isShift && state.mode === 'navigation') {
          // Shift + 下矢印: 選択範囲を拡張
          toggleSelection(state.focusedIndex);
          setState(prev => ({ ...prev, isMultiSelectMode: true }));
        }
        focusNext();
        if (isShift && state.isMultiSelectMode) {
          toggleSelection(state.focusedIndex + 1);
        }
        break;

      case KEYBOARD_SHORTCUTS.ARROW_UP:
        e.preventDefault();
        if (isShift && state.mode === 'navigation') {
          toggleSelection(state.focusedIndex);
          setState(prev => ({ ...prev, isMultiSelectMode: true }));
        }
        focusPrevious();
        if (isShift && state.isMultiSelectMode) {
          toggleSelection(state.focusedIndex - 1);
        }
        break;

      case KEYBOARD_SHORTCUTS.HOME:
        e.preventDefault();
        focusFirst();
        if (isShift) clearSelection();
        break;

      case KEYBOARD_SHORTCUTS.END:
        e.preventDefault();
        focusLast();
        if (isShift) clearSelection();
        break;

      case KEYBOARD_SHORTCUTS.PAGE_DOWN:
        e.preventDefault();
        focusPageDown();
        break;

      case KEYBOARD_SHORTCUTS.PAGE_UP:
        e.preventDefault();
        focusPageUp();
        break;

      // アクション
      case KEYBOARD_SHORTCUTS.SPACE:
      case KEYBOARD_SHORTCUTS.ENTER:
        e.preventDefault();
        if (state.mode === 'selection' && state.selectedIndices.size > 0) {
          // バルク完了切り替え
          bulkToggleComplete(true);
        } else {
          // 個別タスクの完了切り替え
          const task = tasks[state.focusedIndex];
          if (task) {
            onTaskToggle(task.id, !task.completed);
          }
        }
        break;

      case KEYBOARD_SHORTCUTS.DELETE:
      case KEYBOARD_SHORTCUTS.BACKSPACE:
        e.preventDefault();
        if (state.mode === 'selection' && state.selectedIndices.size > 0) {
          bulkDelete();
        } else {
          const task = tasks[state.focusedIndex];
          if (task) {
            onTaskDelete(task.id);
          }
        }
        break;

      case KEYBOARD_SHORTCUTS.ESCAPE:
        e.preventDefault();
        if (state.mode === 'selection') {
          clearSelection();
        }
        setState(prev => ({ ...prev, isMultiSelectMode: false }));
        break;

      // 編集
      case KEYBOARD_SHORTCUTS.EDIT:
        if (isCtrl) {
          e.preventDefault();
          onTaskEdit(state.focusedIndex);
        }
        break;

      case KEYBOARD_SHORTCUTS.ADD_TASK:
        if (isCtrl) {
          e.preventDefault();
          onAddTask?.();
        }
        break;

      // 選択
      case KEYBOARD_SHORTCUTS.SELECT_ALL:
        if (isCtrl) {
          e.preventDefault();
          selectAll();
        }
        break;

      case KEYBOARD_SHORTCUTS.CLEAR_SELECTION:
        if (isCtrl) {
          e.preventDefault();
          clearSelection();
        }
        break;

      case KEYBOARD_SHORTCUTS.TOGGLE_SELECTION:
        if (isCtrl) {
          e.preventDefault();
          toggleSelection(state.focusedIndex);
        }
        break;

      // バルクアクション
      case KEYBOARD_SHORTCUTS.BULK_DELETE:
        if (isCtrl && state.mode === 'selection') {
          e.preventDefault();
          bulkDelete();
        }
        break;

      case KEYBOARD_SHORTCUTS.BULK_INCOMPLETE:
        if (isCtrl && state.mode === 'selection') {
          e.preventDefault();
          bulkToggleComplete(false);
        }
        break;
    }
  }, [
    enabled,
    tasks,
    state,
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast,
    focusPageDown,
    focusPageUp,
    onTaskToggle,
    onTaskDelete,
    onTaskEdit,
    onAddTask,
    toggleSelection,
    selectAll,
    clearSelection,
    bulkToggleComplete,
    bulkDelete,
  ]);

  // キーボードイベントリスナーの設定
  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  // タスク数が変化した時のフォーカス調整
  useEffect(() => {
    if (tasks.length === 0) {
      setState(prev => ({
        ...prev,
        focusedIndex: 0,
        selectedIndices: new Set(),
        mode: 'navigation',
      }));
    } else if (state.focusedIndex >= tasks.length) {
      focusTask(tasks.length - 1);
    }
  }, [tasks.length, state.focusedIndex, focusTask]);

  return {
    // 状態
    focusedIndex: state.focusedIndex,
    selectedIndices: state.selectedIndices,
    mode: state.mode,
    isMultiSelectMode: state.isMultiSelectMode,
    
    // 参照管理
    containerRef,
    setTaskRef,
    
    // ナビゲーション
    focusTask,
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast,
    
    // 選択管理
    toggleSelection,
    selectAll,
    clearSelection,
    
    // バルクアクション
    bulkToggleComplete,
    bulkDelete,
    
    // ヘルプ情報
    shortcuts: KEYBOARD_SHORTCUTS,
    
    // 統計
    stats: {
      totalTasks: tasks.length,
      selectedCount: state.selectedIndices.size,
      focusedTask: tasks[state.focusedIndex] || null,
    }
  };
}
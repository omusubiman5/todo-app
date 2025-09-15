"use client";

import { useReducer, useCallback } from 'react';
import { SharedTask } from '@/lib/types';

// State型定義
interface TaskBoardState {
  // タスク関連
  tasks: SharedTask[];
  isLoading: boolean;
  lastSyncTime: Date | null;
  
  // フォーム状態
  task: string;
  priority: "高" | "中" | "低";
  
  // 編集状態
  editingIndex: number | null;
  editText: string;
  editPriority: "高" | "中" | "低";
  
  // UI状態
  sortByPriority: boolean;
  hideCompleted: boolean;
  
  // モーダル状態（統合）
  modals: {
    assignment: { isOpen: boolean; taskId: string | null };
    comments: { isOpen: boolean; taskId: string | null };
    history: { isOpen: boolean; taskId: string | null };
  };
}

// アクション型定義
type TaskBoardAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_TASKS'; payload: SharedTask[] }
  | { type: 'ADD_TASK'; payload: SharedTask }
  | { type: 'UPDATE_TASK'; payload: { index: number; task: SharedTask } }
  | { type: 'DELETE_TASK'; payload: number }
  | { type: 'OPTIMISTIC_ADD'; payload: SharedTask }
  | { type: 'OPTIMISTIC_UPDATE'; payload: { id: string; updates: Partial<SharedTask> } }
  | { type: 'OPTIMISTIC_DELETE'; payload: string }
  | { type: 'ROLLBACK_OPTIMISTIC'; payload: SharedTask[] }
  | { type: 'SET_FORM'; payload: { task?: string; priority?: "高" | "中" | "低" } }
  | { type: 'SET_EDITING'; payload: { index: number | null; text?: string; priority?: "高" | "中" | "低" } }
  | { type: 'SET_FILTERS'; payload: { sortByPriority?: boolean; hideCompleted?: boolean } }
  | { type: 'SET_MODAL'; payload: { type: 'assignment' | 'comments' | 'history'; isOpen: boolean; taskId?: string | null } }
  | { type: 'RESET_FORM' }
  | { type: 'SET_SYNC_TIME'; payload: Date };

// 初期状態
const initialState: TaskBoardState = {
  tasks: [],
  isLoading: false,
  lastSyncTime: null,
  task: '',
  priority: '中',
  editingIndex: null,
  editText: '',
  editPriority: '中',
  sortByPriority: false,
  hideCompleted: false,
  modals: {
    assignment: { isOpen: false, taskId: null },
    comments: { isOpen: false, taskId: null },
    history: { isOpen: false, taskId: null }
  }
};

// Reducer実装
function taskBoardReducer(state: TaskBoardState, action: TaskBoardAction): TaskBoardState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_TASKS':
      return { 
        ...state, 
        tasks: action.payload, 
        isLoading: false,
        lastSyncTime: new Date()
      };

    case 'ADD_TASK':
      return { 
        ...state, 
        tasks: [...state.tasks, action.payload]
      };

    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map((task, index) => 
          index === action.payload.index ? action.payload.task : task
        )
      };

    case 'DELETE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter((_, index) => index !== action.payload)
      };

    // 楽観的更新（即座のUI更新）
    case 'OPTIMISTIC_ADD':
      return {
        ...state,
        tasks: [...state.tasks, action.payload]
      };

    case 'OPTIMISTIC_UPDATE':
      return {
        ...state,
        tasks: state.tasks.map(task => 
          task.id === action.payload.id 
            ? { ...task, ...action.payload.updates }
            : task
        )
      };

    case 'OPTIMISTIC_DELETE':
      return {
        ...state,
        tasks: state.tasks.filter(task => task.id !== action.payload)
      };

    case 'ROLLBACK_OPTIMISTIC':
      return {
        ...state,
        tasks: action.payload
      };

    case 'SET_FORM':
      return {
        ...state,
        task: action.payload.task !== undefined ? action.payload.task : state.task,
        priority: action.payload.priority !== undefined ? action.payload.priority : state.priority
      };

    case 'SET_EDITING':
      return {
        ...state,
        editingIndex: action.payload.index,
        editText: action.payload.text !== undefined ? action.payload.text : state.editText,
        editPriority: action.payload.priority !== undefined ? action.payload.priority : state.editPriority
      };

    case 'SET_FILTERS':
      return {
        ...state,
        sortByPriority: action.payload.sortByPriority !== undefined ? action.payload.sortByPriority : state.sortByPriority,
        hideCompleted: action.payload.hideCompleted !== undefined ? action.payload.hideCompleted : state.hideCompleted
      };

    case 'SET_MODAL':
      return {
        ...state,
        modals: {
          ...state.modals,
          [action.payload.type]: {
            isOpen: action.payload.isOpen,
            taskId: action.payload.taskId ?? null
          }
        }
      };

    case 'RESET_FORM':
      return {
        ...state,
        task: '',
        priority: '中',
        editingIndex: null,
        editText: '',
        editPriority: '中'
      };

    case 'SET_SYNC_TIME':
      return {
        ...state,
        lastSyncTime: action.payload
      };

    default:
      return state;
  }
}

// カスタムフック
export function useTaskBoardReducer() {
  const [state, dispatch] = useReducer(taskBoardReducer, initialState);

  // メモ化されたアクションクリエイター
  const actions = {
    setLoading: useCallback((loading: boolean) => 
      dispatch({ type: 'SET_LOADING', payload: loading }), []),
    
    setTasks: useCallback((tasks: SharedTask[]) => 
      dispatch({ type: 'SET_TASKS', payload: tasks }), []),
    
    addTask: useCallback((task: SharedTask) => 
      dispatch({ type: 'ADD_TASK', payload: task }), []),
    
    updateTask: useCallback((index: number, task: SharedTask) => 
      dispatch({ type: 'UPDATE_TASK', payload: { index, task } }), []),
    
    deleteTask: useCallback((index: number) => 
      dispatch({ type: 'DELETE_TASK', payload: index }), []),
    
    // 楽観的更新アクション
    optimisticAdd: useCallback((task: SharedTask) => 
      dispatch({ type: 'OPTIMISTIC_ADD', payload: task }), []),
    
    optimisticUpdate: useCallback((id: string, updates: Partial<SharedTask>) => 
      dispatch({ type: 'OPTIMISTIC_UPDATE', payload: { id, updates } }), []),
    
    optimisticDelete: useCallback((id: string) => 
      dispatch({ type: 'OPTIMISTIC_DELETE', payload: id }), []),
    
    rollbackOptimistic: useCallback((tasks: SharedTask[]) => 
      dispatch({ type: 'ROLLBACK_OPTIMISTIC', payload: tasks }), []),
    
    setForm: useCallback((form: { task?: string; priority?: "高" | "中" | "低" }) => 
      dispatch({ type: 'SET_FORM', payload: form }), []),
    
    setEditing: useCallback((editing: { index: number | null; text?: string; priority?: "高" | "中" | "低" }) => 
      dispatch({ type: 'SET_EDITING', payload: editing }), []),
    
    setFilters: useCallback((filters: { sortByPriority?: boolean; hideCompleted?: boolean }) => 
      dispatch({ type: 'SET_FILTERS', payload: filters }), []),
    
    setModal: useCallback((type: 'assignment' | 'comments' | 'history', isOpen: boolean, taskId?: string | null) => 
      dispatch({ type: 'SET_MODAL', payload: { type, isOpen, taskId } }), []),
    
    resetForm: useCallback(() => 
      dispatch({ type: 'RESET_FORM' }), []),
    
    setSyncTime: useCallback((time: Date) => 
      dispatch({ type: 'SET_SYNC_TIME', payload: time }), [])
  };

  return { state, actions };
}
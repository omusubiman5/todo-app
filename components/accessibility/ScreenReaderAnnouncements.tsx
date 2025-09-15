"use client";

import React, { useEffect, useRef, useState } from 'react';

// 🚀 Phase 3 Stage 2: スクリーンリーダー最適化システム

interface AnnouncementOptions {
  priority?: 'polite' | 'assertive';
  delay?: number;
  clear?: boolean;
}

interface ScreenReaderAnnouncementsProps {
  darkMode?: boolean;
}

// アナウンスメント管理フック
export function useScreenReaderAnnouncements() {
  const politeRef = useRef<HTMLDivElement>(null);
  const assertiveRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const announce = (message: string, options: AnnouncementOptions = {}) => {
    const {
      priority = 'polite',
      delay = 100,
      clear = true
    } = options;
    
    const targetRef = priority === 'assertive' ? assertiveRef : politeRef;
    
    if (!targetRef.current) return;
    
    // 既存のタイムアウトをクリア
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // 必要に応じて既存のメッセージをクリア
    if (clear) {
      targetRef.current.textContent = '';
    }
    
    // 少し遅延させてからメッセージを設定（スクリーンリーダーの確実な読み上げのため）
    timeoutRef.current = setTimeout(() => {
      if (targetRef.current) {
        targetRef.current.textContent = message;
      }
    }, delay);
  };
  
  // タスク固有のアナウンスメント
  const announceTaskAction = (action: string, taskText: string, details?: string) => {
    const message = details 
      ? `${action}: ${taskText}. ${details}`
      : `${action}: ${taskText}`;
    announce(message, { priority: 'polite' });
  };
  
  const announceTaskCreated = (taskText: string, priority: string) => {
    announceTaskAction('新しいタスクが作成されました', taskText, `優先度: ${priority}`);
  };
  
  const announceTaskCompleted = (taskText: string) => {
    announceTaskAction('タスクが完了しました', taskText);
  };
  
  const announceTaskUncompleted = (taskText: string) => {
    announceTaskAction('タスクが未完了に変更されました', taskText);
  };
  
  const announceTaskDeleted = (taskText: string) => {
    announceTaskAction('タスクが削除されました', taskText);
  };
  
  const announceTaskUpdated = (taskText: string, changes: string) => {
    announceTaskAction('タスクが更新されました', taskText, changes);
  };
  
  // ナビゲーション固有のアナウンスメント
  const announceFocusChange = (currentIndex: number, totalTasks: number, taskText: string) => {
    const message = `${currentIndex + 1}番目のタスク、全${totalTasks}件中。${taskText}`;
    announce(message, { priority: 'polite', delay: 200 });
  };
  
  const announceSelectionChange = (selectedCount: number, totalTasks: number) => {
    if (selectedCount === 0) {
      announce('選択が解除されました', { priority: 'polite' });
    } else {
      announce(`${selectedCount}件のタスクが選択されています。全${totalTasks}件中`, { priority: 'polite' });
    }
  };
  
  const announceBulkAction = (action: string, count: number) => {
    announce(`${count}件のタスクに対して${action}を実行しました`, { priority: 'polite' });
  };
  
  // エラーアナウンスメント
  const announceError = (error: string) => {
    announce(`エラー: ${error}`, { priority: 'assertive' });
  };
  
  // 成功アナウンスメント  
  const announceSuccess = (message: string) => {
    announce(`成功: ${message}`, { priority: 'polite' });
  };
  
  // モードチェンジアナウンスメント
  const announceModeChange = (mode: string, description?: string) => {
    const message = description 
      ? `${mode}モードに変更されました。${description}`
      : `${mode}モードに変更されました`;
    announce(message, { priority: 'polite' });
  };
  
  // ショートカットヘルプ
  const announceShortcutHelp = (shortcut: string, description: string) => {
    announce(`ショートカット: ${shortcut}で${description}`, { priority: 'polite' });
  };
  
  // フィルター変更アナウンスメント
  const announceFilterChange = (filterType: string, isActive: boolean, resultCount: number) => {
    const status = isActive ? '有効' : '無効';
    announce(`${filterType}フィルターが${status}になりました。表示中のタスク: ${resultCount}件`, { priority: 'polite' });
  };
  
  return {
    politeRef,
    assertiveRef,
    announce,
    announceTaskAction,
    announceTaskCreated,
    announceTaskCompleted,
    announceTaskUncompleted,
    announceTaskDeleted,
    announceTaskUpdated,
    announceFocusChange,
    announceSelectionChange,
    announceBulkAction,
    announceError,
    announceSuccess,
    announceModeChange,
    announceShortcutHelp,
    announceFilterChange,
  };
}

// スクリーンリーダー用ライブリージョンコンポーネント
const ScreenReaderAnnouncements: React.FC<ScreenReaderAnnouncementsProps> = ({ 
  darkMode = false 
}) => {
  const { politeRef, assertiveRef } = useScreenReaderAnnouncements();
  
  return (
    <>
      {/* Polite announcements - 通常の更新情報 */}
      <div
        ref={politeRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
        aria-label="アプリケーションの状態更新"
      />
      
      {/* Assertive announcements - 重要なエラーや警告 */}
      <div
        ref={assertiveRef}
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        role="alert"
        aria-label="重要な通知"
      />
    </>
  );
};

// スクリーンリーダー最適化のためのユーティリティコンポーネント
export const VisuallyHidden: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="sr-only">
    {children}
  </span>
);

// スクリーンリーダー向けのナビゲーションヘルプ
export const ScreenReaderNavigationHelp: React.FC<{ darkMode?: boolean }> = ({ 
  darkMode = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="sr-only" role="region" aria-label="キーボード操作ガイド">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-controls="navigation-help-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:p-2 focus:bg-blue-600 focus:text-white focus:rounded"
      >
        キーボード操作ガイドを{isExpanded ? '閉じる' : '開く'}
      </button>
      
      {isExpanded && (
        <div 
          id="navigation-help-content"
          className={`
            fixed top-16 left-4 right-4 max-w-md p-4 rounded-lg border shadow-lg z-50
            ${darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}
          `}
          role="dialog"
          aria-labelledby="help-title"
        >
          <h3 id="help-title" className="text-lg font-semibold mb-3">
            キーボード操作ガイド
          </h3>
          
          <div className="space-y-2 text-sm">
            <div><strong>↑/↓:</strong> タスク間を移動</div>
            <div><strong>Space/Enter:</strong> 完了状態を切り替え</div>
            <div><strong>Delete:</strong> タスクを削除</div>
            <div><strong>Ctrl+E:</strong> タスクを編集</div>
            <div><strong>Ctrl+N:</strong> 新しいタスクを追加</div>
            <div><strong>Ctrl+A:</strong> 全て選択</div>
            <div><strong>Ctrl+S:</strong> 現在のタスクを選択/選択解除</div>
            <div><strong>Esc:</strong> 選択解除</div>
          </div>
          
          <button
            onClick={() => setIsExpanded(false)}
            className={`
              mt-3 px-3 py-1 rounded text-sm
              ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}
            `}
          >
            閉じる
          </button>
        </div>
      )}
    </div>
  );
};

// スクリーンリーダー向けの進捗インジケーター
export const ScreenReaderProgress: React.FC<{
  current: number;
  total: number;
  label?: string;
  darkMode?: boolean;
}> = ({ current, total, label = "進捗", darkMode = false }) => {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  
  return (
    <div 
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={`${label}: ${current}件完了、全${total}件中（${percentage}%）`}
      className={`sr-only ${darkMode ? 'text-white' : 'text-gray-900'}`}
    >
      {label}: {current}/{total} ({percentage}%)
    </div>
  );
};

// スクリーンリーダー向けの詳細情報表示
export const ScreenReaderTaskDetails: React.FC<{
  task: {
    text: string;
    priority: string;
    completed: boolean;
    created_at: string;
    assigned_to?: string | null;
  };
  index: number;
  totalTasks: number;
}> = ({ task, index, totalTasks }) => {
  const createdDate = new Date(task.created_at).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  return (
    <VisuallyHidden>
      {`タスク${index + 1}、全${totalTasks}件中。${task.text}。
       優先度: ${task.priority}。
       状態: ${task.completed ? '完了' : '未完了'}。
       作成日: ${createdDate}。
       ${task.assigned_to ? `担当者: ${task.assigned_to}` : '未割り当て'}。`}
    </VisuallyHidden>
  );
};

export default ScreenReaderAnnouncements;
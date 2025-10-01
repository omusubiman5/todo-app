"use client";

import React, { useState } from 'react';
import { FaKeyboard, FaTimes, FaQuestionCircle } from 'react-icons/fa';

// 🚀 Phase 3 Stage 2: キーボードショートカットヘルプシステム

interface ShortcutGroup {
  title: string;
  shortcuts: Array<{
    keys: string[];
    description: string;
    category?: 'navigation' | 'action' | 'selection' | 'bulk';
  }>;
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: '基本ナビゲーション',
    shortcuts: [
      {
        keys: ['↓', '↑'],
        description: 'タスク間を移動',
        category: 'navigation'
      },
      {
        keys: ['Home'],
        description: '最初のタスクに移動',
        category: 'navigation'
      },
      {
        keys: ['End'],
        description: '最後のタスクに移動',
        category: 'navigation'
      },
      {
        keys: ['Page Down'],
        description: '10タスク下に移動',
        category: 'navigation'
      },
      {
        keys: ['Page Up'],
        description: '10タスク上に移動',
        category: 'navigation'
      }
    ]
  },
  {
    title: 'タスクアクション',
    shortcuts: [
      {
        keys: ['Space', 'Enter'],
        description: 'タスクの完了状態を切り替え',
        category: 'action'
      },
      {
        keys: ['Delete', 'Backspace'],
        description: 'タスクを削除',
        category: 'action'
      },
      {
        keys: ['Ctrl', 'E'],
        description: 'タスクを編集',
        category: 'action'
      },
      {
        keys: ['Ctrl', 'N'],
        description: '新しいタスクを追加',
        category: 'action'
      },
      {
        keys: ['Esc'],
        description: '選択解除/キャンセル',
        category: 'action'
      }
    ]
  },
  {
    title: '選択とマルチ選択',
    shortcuts: [
      {
        keys: ['Ctrl', 'S'],
        description: '現在のタスクを選択/選択解除',
        category: 'selection'
      },
      {
        keys: ['Shift', '↓/↑'],
        description: '範囲選択（連続選択）',
        category: 'selection'
      },
      {
        keys: ['Ctrl', 'A'],
        description: '全てのタスクを選択',
        category: 'selection'
      },
      {
        keys: ['Ctrl', 'C'],
        description: '選択を解除',
        category: 'selection'
      }
    ]
  },
  {
    title: 'バルクアクション（複数選択時）',
    shortcuts: [
      {
        keys: ['Enter'],
        description: '選択されたタスクを完了にする',
        category: 'bulk'
      },
      {
        keys: ['Ctrl', 'U'],
        description: '選択されたタスクを未完了にする',
        category: 'bulk'
      },
      {
        keys: ['Delete'],
        description: '選択されたタスクを削除',
        category: 'bulk'
      },
      {
        keys: ['Ctrl', 'D'],
        description: '選択されたタスクを削除（確認付き）',
        category: 'bulk'
      }
    ]
  }
];

interface KeyboardShortcutsHelpProps {
  darkMode?: boolean;
  compact?: boolean;
}

const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  darkMode = false,
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'navigation':
        return darkMode 
          ? 'bg-blue-500/20 text-blue-300 border-blue-400/30'
          : 'bg-blue-50 text-blue-700 border-blue-200';
      case 'action':
        return darkMode
          ? 'bg-green-500/20 text-green-300 border-green-400/30'
          : 'bg-green-50 text-green-700 border-green-200';
      case 'selection':
        return darkMode
          ? 'bg-purple-500/20 text-purple-300 border-purple-400/30'
          : 'bg-purple-50 text-purple-700 border-purple-200';
      case 'bulk':
        return darkMode
          ? 'bg-orange-500/20 text-orange-300 border-orange-400/30'
          : 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return darkMode
          ? 'bg-gray-500/20 text-gray-300 border-gray-400/30'
          : 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const formatKeys = (keys: string[]) => {
    return keys.map((key, index) => (
      <React.Fragment key={key}>
        <kbd 
          className={`
            px-2 py-1 text-xs font-mono font-semibold rounded border
            ${darkMode 
              ? 'bg-gray-700 text-gray-200 border-gray-600' 
              : 'bg-white text-gray-800 border-gray-300'
            }
          `}
        >
          {key}
        </kbd>
        {index < keys.length - 1 && (
          <span className={`mx-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            +
          </span>
        )}
      </React.Fragment>
    ));
  };

  if (compact) {
    return (
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          p-2 rounded-full transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500
          ${darkMode
            ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/20'
            : 'text-gray-600 hover:text-blue-600 hover:bg-blue-100'
          }
        `}
        aria-label="キーボードショートカットヘルプを表示"
        title="キーボードショートカット (? キー)"
      >
        <FaKeyboard size={16} />
      </button>
    );
  }

  return (
    <>
      {/* ヘルプボタン */}
      <button
        onClick={() => setIsOpen(true)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
          transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500
          ${darkMode
            ? 'text-gray-300 hover:text-blue-300 hover:bg-blue-500/20 border border-gray-600'
            : 'text-gray-700 hover:text-blue-700 hover:bg-blue-50 border border-gray-300'
          }
        `}
        aria-label="キーボードショートカットヘルプを表示"
      >
        <FaKeyboard size={14} />
        <span>ショートカット</span>
        <kbd className={`
          px-1.5 py-0.5 text-xs rounded
          ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}
        `}>
          ?
        </kbd>
      </button>

      {/* ヘルプモーダル */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className={`
              w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl shadow-2xl
              ${darkMode 
                ? 'bg-gray-800 border border-gray-700' 
                : 'bg-white border border-gray-200'
              }
            `}
            onClick={e => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className={`
              flex items-center justify-between p-6 border-b
              ${darkMode ? 'border-gray-700' : 'border-gray-200'}
            `}>
              <div className="flex items-center gap-3">
                <FaKeyboard className={`
                  ${darkMode ? 'text-blue-400' : 'text-blue-600'}
                `} size={24} />
                <h2 className={`
                  text-xl font-semibold
                  ${darkMode ? 'text-white' : 'text-gray-900'}
                `}>
                  キーボードショートカット
                </h2>
              </div>
              
              <button
                onClick={() => setIsOpen(false)}
                className={`
                  p-2 rounded-full transition-colors
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                  ${darkMode
                    ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }
                `}
                aria-label="ヘルプを閉じる"
              >
                <FaTimes size={18} />
              </button>
            </div>

            {/* コンテンツ */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid gap-6 md:grid-cols-2">
                {shortcutGroups.map((group, groupIndex) => (
                  <div 
                    key={groupIndex}
                    className={`
                      p-4 rounded-lg border
                      ${darkMode 
                        ? 'bg-gray-750 border-gray-600' 
                        : 'bg-gray-50 border-gray-200'
                      }
                    `}
                  >
                    <h3 className={`
                      text-lg font-semibold mb-4 flex items-center gap-2
                      ${darkMode ? 'text-white' : 'text-gray-900'}
                    `}>
                      {group.title}
                    </h3>
                    
                    <div className="space-y-3">
                      {group.shortcuts.map((shortcut, shortcutIndex) => (
                        <div 
                          key={shortcutIndex}
                          className={`
                            flex items-center justify-between p-3 rounded-lg
                            transition-all duration-200
                            ${activeCategory === shortcut.category
                              ? getCategoryColor(shortcut.category)
                              : darkMode
                                ? 'bg-gray-700/50 hover:bg-gray-700'
                                : 'bg-white hover:bg-gray-50'
                            }
                            border
                            ${darkMode ? 'border-gray-600' : 'border-gray-200'}
                          `}
                          onMouseEnter={() => setActiveCategory(shortcut.category || null)}
                          onMouseLeave={() => setActiveCategory(null)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              {formatKeys(shortcut.keys)}
                            </div>
                            <span className={`
                              text-sm
                              ${darkMode ? 'text-gray-300' : 'text-gray-700'}
                            `}>
                              {shortcut.description}
                            </span>
                          </div>
                          
                          {shortcut.category && (
                            <span className={`
                              px-2 py-1 text-xs font-medium rounded-full
                              ${getCategoryColor(shortcut.category)}
                            `}>
                              {shortcut.category}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* 追加情報 */}
              <div className={`
                mt-6 p-4 rounded-lg border-l-4 border-blue-500
                ${darkMode 
                  ? 'bg-blue-500/10 border-blue-400' 
                  : 'bg-blue-50 border-blue-500'
                }
              `}>
                <div className="flex items-start gap-3">
                  <FaQuestionCircle className={`
                    mt-0.5 flex-shrink-0
                    ${darkMode ? 'text-blue-400' : 'text-blue-600'}
                  `} size={16} />
                  <div>
                    <h4 className={`
                      font-semibold mb-2
                      ${darkMode ? 'text-blue-300' : 'text-blue-800'}
                    `}>
                      使用のヒント
                    </h4>
                    <ul className={`
                      text-sm space-y-1 list-disc list-inside
                      ${darkMode ? 'text-blue-200' : 'text-blue-700'}
                    `}>
                      <li>入力フィールドにフォーカスがある時は、Ctrlキーと組み合わせたショートカットのみ有効です</li>
                      <li>複数選択時は、バルクアクションが優先されます</li>
                      <li>Escキーで選択状態をリセットできます</li>
                      <li>?キーでこのヘルプを素早く表示できます</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default KeyboardShortcutsHelp;
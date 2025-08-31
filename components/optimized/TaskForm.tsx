import React, { memo, useState, useCallback } from 'react';
import { FaPlus, FaSpinner } from 'react-icons/fa';

interface TaskFormProps {
  onSubmit: (taskData: { text: string; priority: '高' | '中' | '低' }) => Promise<void>;
  darkMode?: boolean;
  isLoading?: boolean;
}

export const TaskForm = memo<TaskFormProps>(({
  onSubmit,
  darkMode = false,
  isLoading = false
}) => {
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<'高' | '中' | '低'>('中');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!text.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit({ text: text.trim(), priority });
      setText('');
      setPriority('中');
    } catch (err) {
      console.error('Task creation failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [text, priority, onSubmit, isSubmitting]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
  }, []);

  const handlePriorityChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setPriority(e.target.value as '高' | '中' | '低');
  }, []);

  return (
    <div className={`mb-8 p-6 rounded-lg shadow-sm ${
      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    } border`}>
      <h2 className="text-lg font-semibold mb-4">新しいタスクを追加</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={text}
              onChange={handleTextChange}
              placeholder="タスク内容を入力してください..."
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
              disabled={isSubmitting || isLoading}
              maxLength={500}
            />
            <div className="mt-1 text-sm text-gray-500">
              {text.length}/500 文字
            </div>
          </div>
          
          <div className="md:w-48">
            <select
              value={priority}
              onChange={handlePriorityChange}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              disabled={isSubmitting || isLoading}
            >
              <option value="高">高優先度</option>
              <option value="中">中優先度</option>
              <option value="低">低優先度</option>
            </select>
          </div>
          
          <button
            type="submit"
            disabled={!text.trim() || isSubmitting || isLoading}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 min-w-[120px] ${
              !text.trim() || isSubmitting || isLoading
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
            }`}
          >
            {isSubmitting ? (
              <>
                <FaSpinner className="animate-spin" />
                <span>追加中...</span>
              </>
            ) : (
              <>
                <FaPlus />
                <span>追加</span>
              </>
            )}
          </button>
        </div>

        {/* クイック優先度ボタン */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">クイック選択:</span>
          {(['高', '中', '低'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                priority === p
                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                  : darkMode
                    ? 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
              }`}
              disabled={isSubmitting || isLoading}
            >
              {p}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
});

TaskForm.displayName = 'TaskForm';
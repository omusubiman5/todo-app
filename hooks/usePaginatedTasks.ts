import { useState, useEffect, useCallback } from 'react';
import { SharedTask, WorkspaceContext, PaginationOptions } from '@/lib/types';
import { SharedTaskService } from '@/lib/sharedTaskService';

interface UsePaginatedTasksOptions {
  workspace: WorkspaceContext;
  userId: string;
  limit?: number;
  status?: string;
  priority?: string;
  assigned_to?: string;
}

interface PaginatedTasksState {
  tasks: SharedTask[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  totalCount: number;
  currentPage: number;
}

export const usePaginatedTasks = ({
  workspace,
  userId,
  limit = 50,
  status,
  priority,
  assigned_to
}: UsePaginatedTasksOptions) => {
  const [state, setState] = useState<PaginatedTasksState>({
    tasks: [],
    isLoading: true,
    error: null,
    hasMore: false,
    totalCount: 0,
    currentPage: 1
  });

  const [cursor, setCursor] = useState<string | undefined>();

  const loadTasks = useCallback(async (
    page: number = 1,
    reset: boolean = false
  ) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const options: PaginationOptions = {
        page,
        limit,
        status,
        priority,
        assigned_to,
        cursor: reset ? undefined : cursor
      };
      
      const result = await SharedTaskService.getTasks(workspace, userId, options);

      setState(prev => ({
        ...prev,
        tasks: reset ? result.tasks : [...prev.tasks, ...result.tasks],
        hasMore: result.hasMore,
        totalCount: result.totalCount,
        currentPage: page,
        isLoading: false
      }));

      setCursor(result.nextCursor);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Unknown error'),
        isLoading: false
      }));
    }
  }, [workspace, userId, limit, status, priority, assigned_to, cursor]);

  const loadMore = useCallback(() => {
    if (state.hasMore && !state.isLoading) {
      loadTasks(state.currentPage + 1, false);
    }
  }, [state.hasMore, state.isLoading, state.currentPage, loadTasks]);

  const refresh = useCallback(() => {
    setCursor(undefined);
    loadTasks(1, true);
  }, [loadTasks]);

  const updateTask = useCallback((updatedTask: SharedTask) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(task => 
        task.id === updatedTask.id ? updatedTask : task
      )
    }));
  }, []);

  const removeTask = useCallback((taskId: string) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.filter(task => task.id !== taskId),
      totalCount: prev.totalCount - 1
    }));
  }, []);

  const addTask = useCallback((newTask: SharedTask) => {
    setState(prev => ({
      ...prev,
      tasks: [newTask, ...prev.tasks],
      totalCount: prev.totalCount + 1
    }));
  }, []);

  // 初期ロードとフィルター変更時のリロード
  useEffect(() => {
    refresh();
  }, [workspace, userId, status, priority, assigned_to]);

  return {
    ...state,
    loadMore,
    refresh,
    updateTask,
    removeTask,
    addTask,
    // 便利なメソッド
    isEmpty: state.tasks.length === 0 && !state.isLoading,
    isFirstPage: state.currentPage === 1,
    totalPages: Math.ceil(state.totalCount / limit)
  };
};

// 無限スクロール用のカスタムフック
export const useInfiniteScroll = (
  callback: () => void,
  hasMore: boolean,
  isLoading: boolean,
  threshold = 300
) => {
  useEffect(() => {
    if (!hasMore || isLoading) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      
      if (scrollHeight - scrollTop <= clientHeight + threshold) {
        callback();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [callback, hasMore, isLoading, threshold]);
};

// フィルター管理用のカスタムフック
export const useTaskFilters = () => {
  const [filters, setFilters] = useState<{
    status?: string;
    priority?: string;
    assigned_to?: string;
  }>({});

  const updateFilter = useCallback((key: string, value?: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined);

  return {
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters
  };
};
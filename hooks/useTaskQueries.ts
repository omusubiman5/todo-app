"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SharedTaskService } from '@/lib/sharedTaskService';
import { SharedTask, WorkspaceContext } from '@/lib/types';
import { queryKeys, invalidateQueries } from '@/providers/QueryProvider';
import { realtimeManager } from '@/lib/RealtimeConnectionManager';
import { useEffect } from 'react';

// 🚀 Phase 3 Stage 2: React Query統合によるサーバー状態管理最適化

interface UseTasksOptions {
  enabled?: boolean;
  refetchInterval?: number;
  staleTime?: number;
}

// タスク一覧取得フック
export function useTasks(
  workspace: WorkspaceContext, 
  userId: string,
  options: UseTasksOptions = {}
) {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: workspace.type === 'team' 
      ? queryKeys.tasks.team(workspace.team_id!)
      : queryKeys.tasks.personal(userId),
    
    queryFn: async () => {
      const tasks = await SharedTaskService.getTasks(workspace, userId);
      return tasks;
    },
    
    enabled: !!userId && options.enabled !== false,
    staleTime: options.staleTime ?? 30000, // 30秒
    refetchInterval: options.refetchInterval,
    
    // エラーハンドリング
    throwOnError: false,
    retry: (failureCount, error) => {
      console.error('Task fetch error:', error);
      return failureCount < 2;
    }
  });

  // リアルタイム更新の統合
  useEffect(() => {
    if (!userId || !workspace) return;

    const subscriptionId = realtimeManager.subscribeToTasks(
      workspace,
      userId,
      () => {
        // リアルタイム更新時にキャッシュを無効化
        invalidateQueries.tasks(queryClient, 
          workspace.type === 'team' ? workspace.team_id! : userId
        );
      }
    );

    return () => {
      realtimeManager.unsubscribe(subscriptionId);
    };
  }, [userId, workspace, queryClient]);

  return {
    ...query,
    tasks: query.data || [],
  };
}

// タスク作成ミューテーション
export function useCreateTask(workspace: WorkspaceContext, userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (taskData: {
      text: string;
      priority: "高" | "中" | "低";
      user_id: string;
    }) => {
      const fullTaskData = {
        ...taskData,
        completed: false,
        team_id: workspace.type === 'team' ? workspace.team_id : null,
        assigned_to: null,
        created_by: taskData.user_id
      };
      return await SharedTaskService.createTask(fullTaskData, workspace);
    },
    
    // 楽観的更新
    onMutate: async (newTask) => {
      const queryKey = workspace.type === 'team' 
        ? queryKeys.tasks.team(workspace.team_id!)
        : queryKeys.tasks.personal(userId);
      
      // 進行中のリフェッチをキャンセル
      await queryClient.cancelQueries({ queryKey });
      
      // 現在のデータを保存
      const previousTasks = queryClient.getQueryData<SharedTask[]>(queryKey) || [];
      
      // 楽観的更新
      const optimisticTask: SharedTask = {
        id: `temp-${Date.now()}`,
        text: newTask.text,
        completed: false,
        priority: newTask.priority,
        user_id: newTask.user_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        team_id: workspace.type === 'team' ? workspace.team_id : null,
        assigned_to: null,
        created_by: userId
      };
      
      queryClient.setQueryData<SharedTask[]>(queryKey, [...previousTasks, optimisticTask]);
      
      return { previousTasks, optimisticTask };
    },
    
    // 成功時
    onSuccess: (newTask, variables, context) => {
      const queryKey = workspace.type === 'team' 
        ? queryKeys.tasks.team(workspace.team_id!)
        : queryKeys.tasks.personal(userId);
      
      // 楽観的タスクを実際のデータに置き換え
      queryClient.setQueryData<SharedTask[]>(queryKey, (old) =>
        old ? old.map(task => 
          task.id === context?.optimisticTask.id ? newTask : task
        ) : [newTask]
      );
      
      // 関連キャッシュも更新
      invalidateQueries.stats(queryClient, workspace.type === 'team' ? workspace.team_id! : userId);
    },
    
    // エラー時のロールバック
    onError: (error, variables, context) => {
      const queryKey = workspace.type === 'team' 
        ? queryKeys.tasks.team(workspace.team_id!)
        : queryKeys.tasks.personal(userId);
      
      if (context?.previousTasks) {
        queryClient.setQueryData<SharedTask[]>(queryKey, context.previousTasks);
      }
      
      console.error('Task creation failed:', error);
    },
  });
}

// タスク更新ミューテーション
export function useUpdateTask(workspace: WorkspaceContext, userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ taskId, updates }: { 
      taskId: string; 
      updates: Partial<SharedTask> 
    }) => {
      return await SharedTaskService.updateTask(taskId, updates);
    },
    
    // 楽観的更新
    onMutate: async ({ taskId, updates }) => {
      const queryKey = workspace.type === 'team' 
        ? queryKeys.tasks.team(workspace.team_id!)
        : queryKeys.tasks.personal(userId);
      
      await queryClient.cancelQueries({ queryKey });
      
      const previousTasks = queryClient.getQueryData<SharedTask[]>(queryKey) || [];
      
      // 楽観的更新
      queryClient.setQueryData<SharedTask[]>(queryKey, 
        previousTasks.map(task => 
          task.id === taskId 
            ? { ...task, ...updates, updated_at: new Date().toISOString() }
            : task
        )
      );
      
      return { previousTasks };
    },
    
    onSuccess: (updatedTask) => {
      const queryKey = workspace.type === 'team' 
        ? queryKeys.tasks.team(workspace.team_id!)
        : queryKeys.tasks.personal(userId);
      
      queryClient.setQueryData<SharedTask[]>(queryKey, (old) =>
        old ? old.map(task => 
          task.id === updatedTask.id ? updatedTask : task
        ) : []
      );
      
      invalidateQueries.stats(queryClient, workspace.type === 'team' ? workspace.team_id! : userId);
    },
    
    onError: (error, variables, context) => {
      const queryKey = workspace.type === 'team' 
        ? queryKeys.tasks.team(workspace.team_id!)
        : queryKeys.tasks.personal(userId);
      
      if (context?.previousTasks) {
        queryClient.setQueryData<SharedTask[]>(queryKey, context.previousTasks);
      }
      
      console.error('Task update failed:', error);
    },
  });
}

// タスク削除ミューテーション
export function useDeleteTask(workspace: WorkspaceContext, userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (taskId: string) => {
      await SharedTaskService.deleteTask(taskId);
      return taskId;
    },
    
    // 楽観的更新
    onMutate: async (taskId) => {
      const queryKey = workspace.type === 'team' 
        ? queryKeys.tasks.team(workspace.team_id!)
        : queryKeys.tasks.personal(userId);
      
      await queryClient.cancelQueries({ queryKey });
      
      const previousTasks = queryClient.getQueryData<SharedTask[]>(queryKey) || [];
      
      // 楽観的削除
      queryClient.setQueryData<SharedTask[]>(queryKey, 
        previousTasks.filter(task => task.id !== taskId)
      );
      
      return { previousTasks };
    },
    
    onSuccess: () => {
      invalidateQueries.stats(queryClient, workspace.type === 'team' ? workspace.team_id! : userId);
    },
    
    onError: (error, taskId, context) => {
      const queryKey = workspace.type === 'team' 
        ? queryKeys.tasks.team(workspace.team_id!)
        : queryKeys.tasks.personal(userId);
      
      if (context?.previousTasks) {
        queryClient.setQueryData<SharedTask[]>(queryKey, context.previousTasks);
      }
      
      console.error('Task deletion failed:', error);
    },
  });
}

// タスク統計取得フック  
export function useTaskStats(workspace: WorkspaceContext, userId: string) {
  return useQuery({
    queryKey: workspace.type === 'team' 
      ? queryKeys.stats.team(workspace.team_id!)
      : queryKeys.stats.personal(userId),
    
    queryFn: async () => {
      const tasks = await SharedTaskService.getTasks(workspace, userId);
      
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(task => task.completed).length;
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
      
      const priorityStats = tasks.reduce((acc, task) => {
        acc[task.priority] = (acc[task.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      return {
        totalTasks,
        completedTasks,
        completionRate,
        priorityStats,
        recentActivity: tasks.slice(-7) // 最新7件
      };
    },
    
    enabled: !!userId,
    staleTime: 60000, // 1分
    
    // タスクデータに依存
    select: (data) => data,
  });
}
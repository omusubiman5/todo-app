// タスクのstatus/completed統一のためのヘルパー関数

export type TaskStatus = 'pending' | 'in_progress' | 'completed';

/**
 * completedフィールドからstatusを推定する（移行期間中の互換性関数）
 */
export const getStatusFromCompleted = (completed: boolean): TaskStatus => {
  return completed ? 'completed' : 'pending';
};

/**
 * statusからcompletedフィールドを推定する（移行期間中の互換性関数）
 */
export const getCompletedFromStatus = (status: TaskStatus): boolean => {
  return status === 'completed';
};

/**
 * タスクが完了状態かどうかを判定（新しい方法）
 */
export const isTaskCompleted = (task: { status?: TaskStatus; completed?: boolean }): boolean => {
  // statusが存在する場合はそれを優先
  if (task.status !== undefined) {
    return task.status === 'completed';
  }
  // 後方互換性のためcompletedも確認
  return task.completed === true;
};

/**
 * タスクが進行中状態かどうかを判定
 */
export const isTaskInProgress = (task: { status?: TaskStatus }): boolean => {
  return task.status === 'in_progress';
};

/**
 * タスクが未着手状態かどうかを判定
 */
export const isTaskPending = (task: { status?: TaskStatus }): boolean => {
  return task.status === 'pending';
};

/**
 * ステータスの日本語表示名を取得
 */
export const getStatusDisplayName = (status: TaskStatus): string => {
  const statusNames: Record<TaskStatus, string> = {
    pending: '未着手',
    in_progress: '進行中',
    completed: '完了'
  };
  return statusNames[status] || '不明';
};

/**
 * ステータスのカラーコードを取得（UI用）
 */
export const getStatusColor = (status: TaskStatus): string => {
  const statusColors: Record<TaskStatus, string> = {
    pending: '#6b7280', // gray-500
    in_progress: '#3b82f6', // blue-500
    completed: '#10b981' // green-500
  };
  return statusColors[status] || '#6b7280';
};

/**
 * 次のステータスに進める（ワークフロー用）
 */
export const getNextStatus = (currentStatus: TaskStatus): TaskStatus | null => {
  const workflow: Record<TaskStatus, TaskStatus | null> = {
    pending: 'in_progress',
    in_progress: 'completed',
    completed: null // 完了済みは次のステータスなし
  };
  return workflow[currentStatus] ?? null;
};

/**
 * 前のステータスに戻す（ワークフロー用）
 */
export const getPreviousStatus = (currentStatus: TaskStatus): TaskStatus | null => {
  const reverseWorkflow: Record<TaskStatus, TaskStatus | null> = {
    pending: null, // 未着手は前のステータスなし
    in_progress: 'pending',
    completed: 'in_progress'
  };
  return reverseWorkflow[currentStatus] ?? null;
};

/**
 * ステータス変更が可能かどうかを判定
 */
export const canChangeStatus = (
  fromStatus: TaskStatus, 
  toStatus: TaskStatus,
  userRole?: 'owner' | 'admin' | 'member' | 'guest'
): boolean => {
  // ゲストは変更不可
  if (userRole === 'guest') {
    return false;
  }

  // 同じステータスへの変更は不要
  if (fromStatus === toStatus) {
    return false;
  }

  // すべての有効なステータス遷移
  const validTransitions: Record<TaskStatus, TaskStatus[]> = {
    pending: ['in_progress', 'completed'],
    in_progress: ['pending', 'completed'],
    completed: ['pending', 'in_progress']
  };

  return (validTransitions[fromStatus] || []).includes(toStatus);
};

/**
 * タスクのステータス統計を計算
 */
export const calculateStatusStats = (tasks: Array<{ status?: TaskStatus; completed?: boolean }>) => {
  const stats = {
    pending: 0,
    in_progress: 0,
    completed: 0,
    total: tasks.length
  };

  tasks.forEach(task => {
    if (isTaskCompleted(task)) {
      stats.completed++;
    } else if (isTaskInProgress(task)) {
      stats.in_progress++;
    } else {
      stats.pending++;
    }
  });

  return {
    ...stats,
    completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
    activeCount: stats.pending + stats.in_progress
  };
};

/**
 * レガシータスクデータを新形式に正規化する
 */
export const normalizeTaskStatus = (task: { 
  status?: TaskStatus; 
  completed?: boolean;
  [key: string]: unknown;
}): { status: TaskStatus; [key: string]: unknown } => {
  let normalizedStatus: TaskStatus;

  if (task.status) {
    // statusが存在する場合はそれを使用
    normalizedStatus = task.status;
  } else if (task.completed !== undefined) {
    // completedのみの場合は変換
    normalizedStatus = getStatusFromCompleted(task.completed);
  } else {
    // どちらも存在しない場合はpending
    normalizedStatus = 'pending';
  }

  const { completed, ...restTask } = task;
  return {
    ...restTask,
    status: normalizedStatus
  };
};
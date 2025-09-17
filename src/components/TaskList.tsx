import React, { useState } from 'react';
import { useTasks, taskCacheMutations } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';

export function TaskList() {
  const { user } = useAuth();
  const { tasks, isLoading, error, mutate } = useTasks(user?.id);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // タスク追加（楽観的更新付き）
  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !user) return;

    try {
      await taskCacheMutations.createTask(
        {
          title: newTaskTitle,
          status: 'pending',
          user_id: user.id,
        },
        user.id
      );
      setNewTaskTitle('');
    } catch (error) {
      console.error('Failed to add task:', error);
      // エラー時はキャッシュを再検証
      mutate();
    }
  };

  // タスクステータス更新（楽観的更新付き）
  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    if (!user) return;

    try {
      await taskCacheMutations.updateTask(
        taskId,
        { status: newStatus },
        user.id
      );
    } catch (error) {
      console.error('Failed to update task:', error);
      mutate();
    }
  };

  // タスク削除（楽観的更新付き）
  const handleDeleteTask = async (taskId: string) => {
    if (!user) return;

    try {
      await taskCacheMutations.deleteTask(taskId, user.id);
    } catch (error) {
      console.error('Failed to delete task:', error);
      mutate();
    }
  };

  // 手動でキャッシュを更新
  const handleRefresh = () => {
    mutate();
  };

  if (isLoading) return <div className="loading">Loading tasks...</div>;
  if (error) return <div className="error">Error loading tasks: {error.message}</div>;

  return (
    <div className="task-list">
      <div className="task-header">
        <h2>Tasks</h2>
        <button onClick={handleRefresh} className="refresh-btn">
          Refresh
        </button>
      </div>

      <div className="add-task">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Add new task..."
          onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
        />
        <button onClick={handleAddTask}>Add</button>
      </div>

      <div className="tasks">
        {tasks?.map(task => (
          <div key={task.id} className="task-item">
            <h3>{task.title}</h3>
            <p>{task.description}</p>
            <select
              value={task.status}
              onChange={(e) => handleUpdateStatus(task.id, e.target.value)}
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            <button onClick={() => handleDeleteTask(task.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
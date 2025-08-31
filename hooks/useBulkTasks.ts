import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useBulkTasks() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const bulkUpdateTasks = async (taskIds: string[], updates: object) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase.rpc('bulk_update_tasks', {
        task_ids: taskIds,
        user_id: null,
        updates: updates
      })

      if (error) throw error
      
      return data
    } catch (error) {
      console.error('一括更新エラー:', error)
      setError(error instanceof Error ? error.message : '一括更新に失敗しました')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const bulkCompleteAsTasks = async (taskIds: string[]) => {
    return bulkUpdateTasks(taskIds, { completed: true })
  }

  const bulkSetPriority = async (taskIds: string[], priority: string) => {
    return bulkUpdateTasks(taskIds, { priority })
  }

  return {
    bulkUpdateTasks,
    bulkCompleteAsTasks,
    bulkSetPriority,
    loading,
    error
  }
}
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface CleanupResult {
  total_found: number
  would_delete: number
  actually_deleted: number
  archived_count: number
  success: boolean
  message: string
  affected_task_ids: string[]
}

export function useCleanupTasks() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cleanupCompletedTasks = async (
    options: {
      userId?: string
      teamId?: string
      daysOld?: number
      dryRun?: boolean
      archiveBeforeDelete?: boolean
    } = {}
  ): Promise<CleanupResult | null> => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase.rpc('cleanup_completed_tasks', {
        filter_user_id: options.userId || null,
        filter_team_id: options.teamId || null,
        days_old: options.daysOld || 30,
        dry_run: options.dryRun ?? true,
        archive_before_delete: options.archiveBeforeDelete ?? true
      })

      if (error) throw error
      
      return data?.[0] || null
    } catch (error) {
      console.error('クリーンアップエラー:', error)
      setError(error instanceof Error ? error.message : 'クリーンアップに失敗しました')
      return null
    } finally {
      setLoading(false)
    }
  }

  const previewCleanup = async (daysOld: number = 30) => {
    return cleanupCompletedTasks({
      daysOld,
      dryRun: true
    })
  }

  const executeCleanup = async (daysOld: number = 30) => {
    return cleanupCompletedTasks({
      daysOld,
      dryRun: false,
      archiveBeforeDelete: true
    })
  }

  return {
    cleanupCompletedTasks,
    previewCleanup,
    executeCleanup,
    loading,
    error
  }
}
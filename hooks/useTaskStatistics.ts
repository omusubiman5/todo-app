import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface TaskStatistics {
  user_id: string
  display_name: string
  total_tasks: number
  completed_tasks: number
  incomplete_tasks: number
  completion_rate: number
  priority_high: number
  priority_medium: number
  priority_low: number
  first_task_date: string
  last_activity_date: string
  avg_completion_days: number
  days_since_first_task: number
}

export function useTaskStatistics(userId?: string) {
  const [statistics, setStatistics] = useState<TaskStatistics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStatistics()
  }, [userId])

  const fetchStatistics = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.rpc('get_user_task_statistics', {
        target_user_id: userId || null
      })

      if (error) throw error
      setStatistics(data || [])
      setError(null)
    } catch (error) {
      console.error('統計取得エラー:', error)
      setError(error instanceof Error ? error.message : '統計取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return { statistics, loading, error, refetch: fetchStatistics }
}
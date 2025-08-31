import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Task {
  id: string
  text: string
  completed: boolean
  priority: string
  user_id: string
  assigned_to: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  team_id: string | null
  creator_name: string | null
  assignee_name: string | null
  owner_name: string | null
}

interface FilterOptions {
  userId?: string
  teamId?: string
  searchText?: string
  statuses?: string[]
  priorities?: string[]
  assignedUserId?: string
  includeCompleted?: boolean
  limit?: number
  offset?: number
}

export function useFilteredTasks(filters: FilterOptions = {}) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTasks()
  }, [filters])

  const fetchTasks = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase.rpc('get_tasks_with_filters', {
        filter_user_id: filters.userId || null,
        filter_team_id: filters.teamId || null,
        search_text: filters.searchText || null,
        statuses: filters.statuses || null,
        priorities: filters.priorities || null,
        assigned_user_id: filters.assignedUserId || null,
        created_after: null,
        created_before: null,
        due_after: null,
        due_before: null,
        include_completed: filters.includeCompleted ?? true,
        limit_count: filters.limit || 100,
        offset_count: filters.offset || 0
      })

      if (error) throw error
      setTasks(data || [])
    } catch (error) {
      console.error('タスク取得エラー:', error)
      setError(error instanceof Error ? error.message : 'タスク取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return {
    tasks,
    loading,
    error,
    refetch: fetchTasks
  }
}
import { supabase } from '../supabase'

// ログイン試行とブロック管理のサービス
export interface LoginAttemptResult {
  success: boolean
  blocked: boolean
  message?: string
  blockDuration?: number
}

export interface SecuritySettings {
  maxAttemptsPerIp: { value: number; windowMinutes: number }
  maxAttemptsPerEmail: { value: number; windowMinutes: number }
  blockDuration: { initial: number; escalationMultiplier: number; maxDuration: number }
  whitelistIps: { ips: string[] }
  permanentBlockThreshold: { value: number }
}

export interface BlockedIP {
  id: string
  ipAddress: string
  blockedAt: string
  blockedUntil: string | null
  blockReason: string
  attemptCount: number
  manualBlock: boolean
}

export interface LoginAttemptRecord {
  id: string
  ipAddress: string
  email?: string
  userAgent?: string
  attemptTime: string
  success: boolean
  blocked: boolean
}

export class LoginAttemptService {

  /**
   * ログイン試行を記録し、ブロック状態を確認
   */
  static async recordAttempt(
    ipAddress: string,
    email?: string,
    userAgent?: string,
    success: boolean = false
  ): Promise<LoginAttemptResult> {
    try {
      // 1. まずIPがブロックされているかチェック
      const { data: blockCheck, error: blockError } = await supabase
        .rpc('is_ip_blocked', { p_ip_address: ipAddress })

      if (blockError) {
        console.error('Error checking IP block status:', blockError)
        return { success: false, blocked: false, message: 'ブロック状態の確認に失敗しました' }
      }

      if (blockCheck) {
        // 既にブロックされている場合、記録だけして終了
        await supabase.rpc('record_login_attempt', {
          p_ip_address: ipAddress,
          p_email: email,
          p_user_agent: userAgent,
          p_success: false
        })

        const blockInfo = await this.getBlockInfo(ipAddress)
        return {
          success: false,
          blocked: true,
          message: 'IPアドレスがブロックされています',
          blockDuration: blockInfo?.remainingMinutes
        }
      }

      // 2. ログイン試行を記録
      const { error: recordError } = await supabase
        .rpc('record_login_attempt', {
          p_ip_address: ipAddress,
          p_email: email,
          p_user_agent: userAgent,
          p_success: success
        })

      if (recordError) {
        console.error('Error recording login attempt:', recordError)
        return { success: false, blocked: false, message: 'ログイン試行の記録に失敗しました' }
      }

      // 3. 失敗の場合、自動ブロック評価を実行
      if (!success) {
        const { data: autoBlock, error: autoBlockError } = await supabase
          .rpc('evaluate_auto_block', { p_ip_address: ipAddress })

        if (autoBlockError) {
          console.error('Error evaluating auto block:', autoBlockError)
        } else if (autoBlock) {
          const blockInfo = await this.getBlockInfo(ipAddress)
          return {
            success: false,
            blocked: true,
            message: '試行回数が上限に達したためブロックされました',
            blockDuration: blockInfo?.remainingMinutes
          }
        }
      }

      return { success: true, blocked: false }

    } catch (error) {
      console.error('Error in recordAttempt:', error)
      return { success: false, blocked: false, message: 'システムエラーが発生しました' }
    }
  }

  /**
   * IPアドレスのブロック情報を取得
   */
  static async getBlockInfo(ipAddress: string): Promise<{
    blocked: boolean
    blockedUntil?: string | null
    remainingMinutes?: number
    blockReason?: string
  } | null> {
    try {
      const { data, error } = await supabase
        .from('blocked_ips')
        .select('*')
        .eq('ip_address', ipAddress)
        .maybeSingle()

      if (error) {
        console.error('Error getting block info:', error)
        return null
      }

      if (!data) {
        return { blocked: false }
      }

      const now = new Date()
      const blockedUntil = data.blocked_until ? new Date(data.blocked_until) : null

      if (blockedUntil && blockedUntil <= now) {
        return { blocked: false }
      }

      const remainingMinutes = blockedUntil
        ? Math.ceil((blockedUntil.getTime() - now.getTime()) / (1000 * 60))
        : undefined

      return {
        blocked: true,
        blockedUntil: data.blocked_until,
        remainingMinutes,
        blockReason: data.block_reason
      }

    } catch (error) {
      console.error('Error in getBlockInfo:', error)
      return null
    }
  }

  /**
   * ブロックされたIPアドレス一覧を取得
   */
  static async getBlockedIPs(includeExpired = false): Promise<BlockedIP[]> {
    try {
      let query = supabase
        .from('blocked_ips')
        .select('*')
        .order('created_at', { ascending: false })

      if (!includeExpired) {
        query = query.or('blocked_until.is.null,blocked_until.gt.now()')
      }

      const { data, error } = await query

      if (error) {
        console.error('Error getting blocked IPs:', error)
        return []
      }

      return data?.map(item => ({
        id: item.id,
        ipAddress: item.ip_address,
        blockedAt: item.blocked_at,
        blockedUntil: item.blocked_until,
        blockReason: item.block_reason,
        attemptCount: item.attempt_count,
        manualBlock: item.manual_block
      })) || []

    } catch (error) {
      console.error('Error in getBlockedIPs:', error)
      return []
    }
  }

  /**
   * 手動でIPアドレスをブロック
   */
  static async blockIP(
    ipAddress: string,
    reason: string,
    durationMinutes?: number,
    userId?: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const blockedUntil = durationMinutes
        ? new Date(Date.now() + durationMinutes * 60 * 1000).toISOString()
        : null

      const { error } = await supabase
        .from('blocked_ips')
        .upsert({
          ip_address: ipAddress,
          blocked_until: blockedUntil,
          block_reason: reason,
          manual_block: true,
          created_by: userId,
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error blocking IP:', error)
        return { success: false, message: 'IPブロックに失敗しました' }
      }

      return { success: true }

    } catch (error) {
      console.error('Error in blockIP:', error)
      return { success: false, message: 'システムエラーが発生しました' }
    }
  }

  /**
   * IPアドレスのブロックを解除
   */
  static async unblockIP(ipAddress: string): Promise<{ success: boolean; message?: string }> {
    try {
      const { error } = await supabase
        .from('blocked_ips')
        .delete()
        .eq('ip_address', ipAddress)

      if (error) {
        console.error('Error unblocking IP:', error)
        return { success: false, message: 'IPブロック解除に失敗しました' }
      }

      return { success: true }

    } catch (error) {
      console.error('Error in unblockIP:', error)
      return { success: false, message: 'システムエラーが発生しました' }
    }
  }

  /**
   * セキュリティ設定を取得
   */
  static async getSecuritySettings(): Promise<SecuritySettings | null> {
    try {
      const { data, error } = await supabase
        .from('security_settings')
        .select('setting_name, setting_value')

      if (error) {
        console.error('Error getting security settings:', error)
        return null
      }

      const settings: any = {}
      data?.forEach(item => {
        settings[item.setting_name] = item.setting_value
      })

      return {
        maxAttemptsPerIp: settings.max_attempts_per_ip || { value: 5, windowMinutes: 15 },
        maxAttemptsPerEmail: settings.max_attempts_per_email || { value: 3, windowMinutes: 15 },
        blockDuration: settings.block_duration_minutes || { initial: 15, escalationMultiplier: 2, maxDuration: 1440 },
        whitelistIps: settings.whitelist_ips || { ips: [] },
        permanentBlockThreshold: settings.permanent_block_threshold || { value: 10 }
      }

    } catch (error) {
      console.error('Error in getSecuritySettings:', error)
      return null
    }
  }

  /**
   * セキュリティ設定を更新
   */
  static async updateSecuritySettings(
    settingName: string,
    settingValue: any,
    userId?: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const { error } = await supabase
        .from('security_settings')
        .upsert({
          setting_name: settingName,
          setting_value: settingValue,
          updated_by: userId,
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error updating security settings:', error)
        return { success: false, message: 'セキュリティ設定の更新に失敗しました' }
      }

      return { success: true }

    } catch (error) {
      console.error('Error in updateSecuritySettings:', error)
      return { success: false, message: 'システムエラーが発生しました' }
    }
  }

  /**
   * ログイン試行履歴を取得
   */
  static async getLoginAttempts(
    limit = 100,
    ipAddress?: string,
    email?: string
  ): Promise<LoginAttemptRecord[]> {
    try {
      let query = supabase
        .from('login_attempts')
        .select('*')
        .order('attempt_time', { ascending: false })
        .limit(limit)

      if (ipAddress) {
        query = query.eq('ip_address', ipAddress)
      }

      if (email) {
        query = query.eq('email', email)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error getting login attempts:', error)
        return []
      }

      return data?.map(item => ({
        id: item.id,
        ipAddress: item.ip_address,
        email: item.email,
        userAgent: item.user_agent,
        attemptTime: item.attempt_time,
        success: item.success,
        blocked: item.blocked
      })) || []

    } catch (error) {
      console.error('Error in getLoginAttempts:', error)
      return []
    }
  }

  /**
   * 期限切れブロックをクリーンアップ
   */
  static async cleanupExpiredBlocks(): Promise<{ success: boolean; deletedCount?: number }> {
    try {
      const { data, error } = await supabase
        .rpc('cleanup_expired_blocks')

      if (error) {
        console.error('Error cleaning up expired blocks:', error)
        return { success: false }
      }

      return { success: true, deletedCount: data }

    } catch (error) {
      console.error('Error in cleanupExpiredBlocks:', error)
      return { success: false }
    }
  }

  /**
   * 古いログイン試行記録をクリーンアップ
   */
  static async cleanupOldAttempts(daysToKeep = 30): Promise<{ success: boolean; deletedCount?: number }> {
    try {
      const { data, error } = await supabase
        .rpc('cleanup_old_login_attempts', { days_to_keep: daysToKeep })

      if (error) {
        console.error('Error cleaning up old attempts:', error)
        return { success: false }
      }

      return { success: true, deletedCount: data }

    } catch (error) {
      console.error('Error in cleanupOldAttempts:', error)
      return { success: false }
    }
  }

  /**
   * セキュリティ統計を取得
   */
  static async getSecurityStats(): Promise<Record<string, { value: string; description: string }> | null> {
    try {
      const { data, error } = await supabase
        .from('security_stats')
        .select('*')

      if (error) {
        console.error('Error getting security stats:', error)
        return null
      }

      const stats: Record<string, { value: string; description: string }> = {}
      data?.forEach(item => {
        stats[item.metric] = {
          value: item.value,
          description: item.description
        }
      })

      return stats

    } catch (error) {
      console.error('Error in getSecurityStats:', error)
      return null
    }
  }

  /**
   * クライアントサイドでIPアドレスを取得（フォールバック付き）
   */
  static async getClientIP(): Promise<string> {
    try {
      // まず実際のIPアドレス取得を試行
      const response = await fetch('/api/client-ip')
      if (response.ok) {
        const data = await response.json()
        return data.ip || '127.0.0.1'
      }
    } catch (error) {
      console.warn('Failed to get client IP:', error)
    }

    // フォールバック: ローカルhost
    return '127.0.0.1'
  }
}

export default LoginAttemptService
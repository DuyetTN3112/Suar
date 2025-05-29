import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

/**
 * Ace Command: Cleanup Expired Invitations
 *
 * Migrate từ MySQL Event: event_cleanup_expired_invitations
 * Schedule: Daily 2:00 AM
 *
 * Logic:
 * - Update task_invitations với status = 'pending' và expires_at < NOW()
 * - Set status = 'expired'
 * - Log vào audit_logs
 *
 * Usage: node ace scheduler:cleanup-invitations
 * Cron: 0 2 * * * (mỗi ngày lúc 2:00 AM)
 */
export default class CleanupExpiredInvitations extends BaseCommand {
  static commandName = 'scheduler:cleanup-invitations'
  static description = 'Cleanup expired task invitations'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.info('Starting cleanup expired invitations...')

    try {
      // Update expired invitations
      const result = await db
        .from('task_invitations')
        .where('invitation_status', 'pending')
        .whereRaw('expires_at < CURRENT_TIMESTAMP')
        .update({
          invitation_status: 'expired',
        })

      const expiredCount = result as unknown as number

      // Log to audit_logs
      await db.table('audit_logs').insert({
        user_id: null,
        action: 'auto_cleanup',
        entity_type: 'task_invitations',
        entity_id: null,
        old_values: null,
        new_values: JSON.stringify({
          expired_count: expiredCount,
          run_at: new Date().toISOString(),
        }),
        ip_address: 'system',
        user_agent: 'Ace Scheduler',
        created_at: new Date(),
      })

      this.logger.success(`Cleanup completed. ${expiredCount} invitations marked as expired.`)
    } catch (error) {
      this.logger.error('Cleanup failed:', error)
      throw error
    }
  }
}

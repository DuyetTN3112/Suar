import { BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

/**
 * Ace Command: Recalculate Freelancer Stats
 *
 * Migrate từ MySQL Event: event_recalculate_freelancer_stats
 * Schedule: Weekly
 *
 * Logic:
 * - Lấy tất cả users có is_freelancer = true
 * - Với mỗi freelancer, tính và cập nhật stats
 * - Log vào audit_logs
 *
 * Usage: node ace scheduler:recalculate-freelancer-stats
 * Cron: 0 3 * * 0 (mỗi tuần vào Chủ nhật lúc 3:00 AM)
 */
export default class RecalculateFreelancerStats extends BaseCommand {
  static commandName = 'scheduler:recalculate-freelancer-stats'
  static description = 'Recalculate stats for all freelancers'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.info('Starting recalculate freelancer stats...')

    try {
      // Get all freelancers
      const freelancers = await db
        .from('user_details')
        .where('is_freelancer', true)
        .select('user_id')

      this.logger.info(`Found ${freelancers.length} freelancers`)

      let successCount = 0
      let errorCount = 0

      for (const freelancer of freelancers) {
        try {
          await this.calculateFreelancerStats(freelancer.user_id)
          successCount++
        } catch (error) {
          errorCount++
          this.logger.warning(`Error calculating stats for user ${freelancer.user_id}:`, error)
        }
      }

      // Log to audit_logs
      await db.table('audit_logs').insert({
        user_id: null,
        action: 'auto_recalculate_stats',
        entity_type: 'user_details',
        entity_id: null,
        old_values: null,
        new_values: JSON.stringify({
          run_at: new Date().toISOString(),
          total_freelancers: freelancers.length,
          success_count: successCount,
          error_count: errorCount,
        }),
        ip_address: 'system',
        user_agent: 'Ace Scheduler',
        created_at: new Date(),
      })

      this.logger.success(
        `Recalculation completed. Success: ${successCount}, Errors: ${errorCount}`
      )
    } catch (error) {
      this.logger.error('Recalculation failed:', error)
      throw error
    }
  }

  /**
   * Calculate freelancer stats
   * Replaces: CALL calculate_freelancer_stats(v_user_id)
   */
  private async calculateFreelancerStats(userId: number): Promise<void> {
    // Get completed task assignments
    const assignmentStats = await db
      .from('task_assignments')
      .where('assignee_id', userId)
      .where('assignment_type', 'freelancer')
      .select(
        db.raw('COUNT(*) as total_assignments'),
        db.raw("SUM(CASE WHEN assignment_status = 'completed' THEN 1 ELSE 0 END) as completed"),
        db.raw("SUM(CASE WHEN assignment_status = 'active' THEN 1 ELSE 0 END) as active"),
        db.raw('AVG(progress_percentage) as avg_progress')
      )
      .first()

    // Get earnings
    const earningsResult = await db
      .from('task_assignments')
      .join('tasks', 'task_assignments.task_id', 'tasks.id')
      .where('task_assignments.assignee_id', userId)
      .where('task_assignments.assignment_status', 'completed')
      .select(db.raw('COALESCE(SUM(tasks.estimated_budget), 0) as total_earnings'))
      .first()

    // Get review stats
    const reviewStats = await db
      .from('skill_reviews')
      .join('review_sessions', 'skill_reviews.review_session_id', 'review_sessions.id')
      .where('review_sessions.reviewee_id', userId)
      .where('review_sessions.status', 'completed')
      .select(db.raw('COUNT(*) as total_reviews'))
      .first()

    // Update user_details
    await db
      .from('user_details')
      .where('user_id', userId)
      .update({
        total_projects: assignmentStats?.total_assignments || 0,
        completed_projects: assignmentStats?.completed || 0,
        updated_at: new Date(),
      })
  }
}

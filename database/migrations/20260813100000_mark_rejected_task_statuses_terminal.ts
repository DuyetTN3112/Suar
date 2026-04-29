import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Align the legacy/default "rejected" status with its terminal outcome.
 * It remains separately reportable from a general cancellation.
 */
export default class extends BaseSchema {
  override async up(): Promise<void> {
    await this.db.rawQuery(`
      UPDATE task_statuses
      SET category = 'cancelled', updated_at = NOW()
      WHERE slug = 'rejected'
        AND category = 'in_progress'
        AND deleted_at IS NULL;
    `)
  }

  override async down(): Promise<void> {
    await this.db.rawQuery(`
      UPDATE task_statuses
      SET category = 'in_progress', updated_at = NOW()
      WHERE slug = 'rejected'
        AND category = 'cancelled'
        AND deleted_at IS NULL;
    `)
  }
}

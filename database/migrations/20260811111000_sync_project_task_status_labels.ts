import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Keep the legacy task.status mirror aligned after workflow statuses become
 * project-owned. Older board payloads still use this value as a safe fallback.
 */
export default class extends BaseSchema {
  override async up(): Promise<void> {
    await this.db.rawQuery(`
      UPDATE tasks AS task
      SET status = project_status.category::text
      FROM task_statuses AS project_status
      WHERE task.project_id IS NOT NULL
        AND task.task_status_id = project_status.id
        AND project_status.project_id = task.project_id
        AND project_status.deleted_at IS NULL
        AND task.status IS DISTINCT FROM project_status.category::text;
    `)
  }

  override async down(): Promise<void> {
    // task.status is a legacy mirror; the authoritative task_status_id remains intact.
  }
}

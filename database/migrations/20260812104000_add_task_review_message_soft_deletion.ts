import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddTaskReviewMessageSoftDeletion extends BaseSchema {
  override async up(): Promise<void> {
    await this.db.rawQuery(`
      ALTER TABLE task_review_messages
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id) ON DELETE SET NULL;

      CREATE INDEX IF NOT EXISTS idx_task_review_messages_active_workflow
        ON task_review_messages (workflow_id, created_at)
        WHERE deleted_at IS NULL;
    `)
  }

  override async down(): Promise<void> {
    await this.db.rawQuery(`
      DROP INDEX IF EXISTS idx_task_review_messages_active_workflow;
      ALTER TABLE task_review_messages
        DROP COLUMN IF EXISTS deleted_by,
        DROP COLUMN IF EXISTS deleted_at;
    `)
  }
}

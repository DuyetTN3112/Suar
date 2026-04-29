import { BaseSchema } from '@adonisjs/lucid/schema'

/** Links reviewee responses and dispute reports to one concrete review message. */
export default class extends BaseSchema {
  override async up(): Promise<void> {
    await this.db.rawQuery(`
      ALTER TABLE task_review_messages
        ADD COLUMN IF NOT EXISTS parent_review_message_id UUID
          REFERENCES task_review_messages(id) ON DELETE CASCADE;

      CREATE INDEX IF NOT EXISTS idx_task_review_messages_parent_review
        ON task_review_messages (parent_review_message_id)
        WHERE parent_review_message_id IS NOT NULL;
    `)
  }

  override async down(): Promise<void> {
    await this.db.rawQuery(`
      DROP INDEX IF EXISTS idx_task_review_messages_parent_review;
      ALTER TABLE task_review_messages
        DROP COLUMN IF EXISTS parent_review_message_id;
    `)
  }
}

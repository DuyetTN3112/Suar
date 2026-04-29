import { BaseSchema } from '@adonisjs/lucid/schema'

/** Requires both parties to explicitly settle a task-review dispute. */
export default class extends BaseSchema {
  override async up(): Promise<void> {
    await this.db.rawQuery(`
      ALTER TABLE task_review_messages
        ADD COLUMN IF NOT EXISTS requires_reviewer_confirmation BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS reviewer_agreed_at TIMESTAMPTZ;

      UPDATE task_review_messages
      SET requires_reviewer_confirmation = true
      WHERE reviewee_decision = 'rejected';
    `)
  }

  override async down(): Promise<void> {
    await this.db.rawQuery(`
      ALTER TABLE task_review_messages
        DROP COLUMN IF EXISTS reviewer_agreed_at,
        DROP COLUMN IF EXISTS requires_reviewer_confirmation;
    `)
  }
}

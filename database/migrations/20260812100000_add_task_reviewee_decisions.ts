import { BaseSchema } from '@adonisjs/lucid/schema'

/** Persists the reviewee's accept/reject decision for every task review thread. */
export default class extends BaseSchema {
  override async up(): Promise<void> {
    await this.db.rawQuery(`
      ALTER TABLE task_review_messages
        ADD COLUMN IF NOT EXISTS reviewee_decision VARCHAR(16),
        ADD COLUMN IF NOT EXISTS reviewee_decided_at TIMESTAMPTZ;

      ALTER TABLE task_review_messages
        DROP CONSTRAINT IF EXISTS task_review_messages_reviewee_decision_check;
      ALTER TABLE task_review_messages
        ADD CONSTRAINT task_review_messages_reviewee_decision_check
          CHECK (reviewee_decision IS NULL OR reviewee_decision IN ('accepted', 'rejected'));
    `)
  }

  override async down(): Promise<void> {
    await this.db.rawQuery(`
      ALTER TABLE task_review_messages
        DROP CONSTRAINT IF EXISTS task_review_messages_reviewee_decision_check,
        DROP COLUMN IF EXISTS reviewee_decided_at,
        DROP COLUMN IF EXISTS reviewee_decision;
    `)
  }
}

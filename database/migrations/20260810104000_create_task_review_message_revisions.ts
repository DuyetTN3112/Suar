import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  override async up(): Promise<void> {
    await this.db.rawQuery(`SET LOCAL lock_timeout = '5s'`)
    await this.db.rawQuery(`
      ALTER TABLE task_review_messages
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

      UPDATE task_review_messages
      SET updated_at = created_at
      WHERE updated_at IS NULL;

      ALTER TABLE task_review_messages
        ALTER COLUMN updated_at SET DEFAULT NOW(),
        ALTER COLUMN updated_at SET NOT NULL;

      CREATE TABLE IF NOT EXISTS task_review_message_revisions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
        message_id UUID NOT NULL,
        revision_number INTEGER NOT NULL,
        body TEXT NOT NULL,
        editor_id UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_task_review_message_revision_number
          CHECK (revision_number > 0),
        CONSTRAINT uq_task_review_message_revision_number
          UNIQUE (message_id, revision_number),
        CONSTRAINT fk_task_review_message_revision_message
          FOREIGN KEY (message_id)
          REFERENCES task_review_messages(id)
          ON DELETE CASCADE
      );

      INSERT INTO task_review_message_revisions (
        message_id,
        revision_number,
        body,
        editor_id,
        created_at
      )
      SELECT
        message.id,
        1,
        message.body,
        message.author_id,
        message.created_at
      FROM task_review_messages AS message
      WHERE message.message_type = 'review'
      ON CONFLICT (message_id, revision_number) DO NOTHING;

      CREATE INDEX IF NOT EXISTS idx_task_review_message_revisions_message_created
        ON task_review_message_revisions (message_id, revision_number DESC, created_at DESC);
    `)
  }

  override async down(): Promise<void> {
    await this.db.rawQuery(`SET LOCAL lock_timeout = '5s'`)
    await this.db.rawQuery(`
      DROP TABLE IF EXISTS task_review_message_revisions;
      ALTER TABLE task_review_messages DROP COLUMN IF EXISTS updated_at;
    `)
  }
}

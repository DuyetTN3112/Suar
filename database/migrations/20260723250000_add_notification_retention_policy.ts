import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  static override disableTransactions = true

  override async up() {
    await this.db.rawQuery(`
      ALTER TABLE notifications
        ADD COLUMN IF NOT EXISTS retention_class varchar(64),
        ADD COLUMN IF NOT EXISTS retention_until timestamptz
    `)
    await this.db.rawQuery(`
      UPDATE notifications
      SET
        retention_class = COALESCE(retention_class, 'notification_standard_180d'),
        retention_until = COALESCE(
          retention_until,
          occurred_at + INTERVAL '180 days'
        )
      WHERE retention_class IS NULL OR retention_until IS NULL
    `)
    await this.db.rawQuery(`
      ALTER TABLE notifications
        ALTER COLUMN retention_class SET DEFAULT 'notification_standard_180d',
        ALTER COLUMN retention_class SET NOT NULL,
        ALTER COLUMN retention_until SET DEFAULT (now() + INTERVAL '180 days'),
        ALTER COLUMN retention_until SET NOT NULL
    `)
    await this.db.rawQuery(`
      ALTER TABLE notification_tombstones
        ADD COLUMN IF NOT EXISTS projection_completed_at timestamptz
    `)
    await this.db.rawQuery(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'notifications_retention_class_check'
        ) THEN
          ALTER TABLE notifications
            ADD CONSTRAINT notifications_retention_class_check
            CHECK (
              retention_class ~ '^[a-z][a-z0-9_]{2,63}$'
            ) NOT VALID;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'notifications_retention_deadline_check'
        ) THEN
          ALTER TABLE notifications
            ADD CONSTRAINT notifications_retention_deadline_check
            CHECK (retention_until > occurred_at) NOT VALID;
        END IF;
      END
      $$
    `)
    await this.db.rawQuery(
      'ALTER TABLE notifications VALIDATE CONSTRAINT notifications_retention_class_check'
    )
    await this.db.rawQuery(
      'ALTER TABLE notifications VALIDATE CONSTRAINT notifications_retention_deadline_check'
    )
    await this.db.rawQuery(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS notifications_retention_due_idx
        ON notifications (retention_until, user_id, id)
    `)
    await this.db.rawQuery(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS notification_outbox_processed_retention_idx
        ON notification_outbox (processed_at, sequence)
        WHERE status = 'processed'
    `)
    await this.db.rawQuery(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS notification_fanout_completed_retention_idx
        ON notification_fanout_jobs (completed_at, sequence)
        WHERE status = 'completed'
    `)
    await this.db.rawQuery(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS notification_ledger_terminal_retention_idx
        ON notification_acceptance_ledger (occurred_at, notification_id)
        WHERE terminal_state <> 'active'
    `)
  }

  override async down() {
    await this.db.rawQuery(
      'DROP INDEX CONCURRENTLY IF EXISTS notification_ledger_terminal_retention_idx'
    )
    await this.db.rawQuery(
      'DROP INDEX CONCURRENTLY IF EXISTS notification_fanout_completed_retention_idx'
    )
    await this.db.rawQuery(
      'DROP INDEX CONCURRENTLY IF EXISTS notification_outbox_processed_retention_idx'
    )
    await this.db.rawQuery(
      'DROP INDEX CONCURRENTLY IF EXISTS notifications_retention_due_idx'
    )
    await this.db.rawQuery(`
      ALTER TABLE notifications
        DROP CONSTRAINT IF EXISTS notifications_retention_deadline_check,
        DROP CONSTRAINT IF EXISTS notifications_retention_class_check,
        DROP COLUMN IF EXISTS retention_until,
        DROP COLUMN IF EXISTS retention_class
    `)
    await this.db.rawQuery(`
      ALTER TABLE notification_tombstones
        DROP COLUMN IF EXISTS projection_completed_at
    `)
  }
}

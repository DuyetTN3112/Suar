import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  static override disableTransactions = true

  override async up() {
    await this.db.rawQuery(`
      ALTER TABLE notification_outbox
        ADD COLUMN IF NOT EXISTS disposed_at timestamptz,
        ADD COLUMN IF NOT EXISTS disposed_by uuid,
        ADD COLUMN IF NOT EXISTS disposition_reason text
    `)
    await this.db.rawQuery(`
      ALTER TABLE notification_outbox
        DROP CONSTRAINT IF EXISTS notification_outbox_status_check,
        ADD CONSTRAINT notification_outbox_status_check
          CHECK (status IN (
            'pending',
            'leased',
            'processed',
            'dead_letter',
            'discarded'
          )) NOT VALID
    `)
    await this.db.rawQuery(`
      ALTER TABLE notification_outbox
        VALIDATE CONSTRAINT notification_outbox_status_check
    `)
    await this.db.rawQuery(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'notification_outbox_disposed_by_fk'
        ) THEN
          ALTER TABLE notification_outbox
            ADD CONSTRAINT notification_outbox_disposed_by_fk
            FOREIGN KEY (disposed_by)
            REFERENCES users(id)
            ON DELETE RESTRICT
            NOT VALID;
        END IF;
      END
      $$
    `)
    await this.db.rawQuery(`
      ALTER TABLE notification_outbox
        VALIDATE CONSTRAINT notification_outbox_disposed_by_fk
    `)
    await this.db.rawQuery(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'notification_outbox_disposition_check'
        ) THEN
          ALTER TABLE notification_outbox
            ADD CONSTRAINT notification_outbox_disposition_check
            CHECK (
              (
                status = 'discarded'
                AND disposed_at IS NOT NULL
                AND disposed_by IS NOT NULL
                AND disposition_reason IS NOT NULL
                AND char_length(disposition_reason) BETWEEN 10 AND 500
                AND processed_at IS NOT NULL
              )
              OR (
                status <> 'discarded'
                AND disposed_at IS NULL
                AND disposed_by IS NULL
                AND disposition_reason IS NULL
              )
            ) NOT VALID;
        END IF;
      END
      $$
    `)
    await this.db.rawQuery(`
      ALTER TABLE notification_outbox
        VALIDATE CONSTRAINT notification_outbox_disposition_check
    `)
    await this.db.rawQuery(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS
        notification_outbox_dlq_sequence_idx
      ON notification_outbox (sequence, id)
      WHERE status = 'dead_letter'
    `)
    await this.db.rawQuery(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS
        notification_outbox_dlq_error_sequence_idx
      ON notification_outbox (last_error_class, sequence, id)
      WHERE status = 'dead_letter'
    `)
    await this.db.rawQuery(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS
        notification_outbox_discarded_retention_idx
      ON notification_outbox (processed_at, sequence)
      WHERE status = 'discarded'
    `)
  }

  override async down() {
    await this.db.rawQuery(`
      DROP INDEX CONCURRENTLY IF EXISTS
        notification_outbox_discarded_retention_idx
    `)
    await this.db.rawQuery(`
      DROP INDEX CONCURRENTLY IF EXISTS
        notification_outbox_dlq_error_sequence_idx
    `)
    await this.db.rawQuery(`
      DROP INDEX CONCURRENTLY IF EXISTS
        notification_outbox_dlq_sequence_idx
    `)
    await this.db.rawQuery(`
      ALTER TABLE notification_outbox
        DROP CONSTRAINT IF EXISTS notification_outbox_disposition_check,
        DROP CONSTRAINT IF EXISTS notification_outbox_disposed_by_fk,
        DROP CONSTRAINT IF EXISTS notification_outbox_status_check
    `)
    await this.db.rawQuery(`
      ALTER TABLE notification_outbox
        ADD CONSTRAINT notification_outbox_status_check
          CHECK (status IN ('pending', 'leased', 'processed', 'dead_letter'))
          NOT VALID
    `)
    await this.db.rawQuery(`
      ALTER TABLE notification_outbox
        VALIDATE CONSTRAINT notification_outbox_status_check
    `)
    await this.db.rawQuery(`
      ALTER TABLE notification_outbox
        DROP COLUMN IF EXISTS disposition_reason,
        DROP COLUMN IF EXISTS disposed_by,
        DROP COLUMN IF EXISTS disposed_at
    `)
  }
}

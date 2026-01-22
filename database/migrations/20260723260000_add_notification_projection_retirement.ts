import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  static override disableTransactions = true

  override async up() {
    await this.db.rawQuery(`
      ALTER TABLE notification_projection_targets
        ADD COLUMN IF NOT EXISTS retired_at timestamptz,
        ADD COLUMN IF NOT EXISTS physical_deleted_at timestamptz
    `)
    await this.db.rawQuery(`
      UPDATE notification_projection_targets
      SET retired_at = COALESCE(required_until, updated_at, created_at, now())
      WHERE status = 'retired'
        AND retired_at IS NULL
    `)
    await this.db.rawQuery(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'notification_projection_targets_retirement_check'
        ) THEN
          ALTER TABLE notification_projection_targets
            ADD CONSTRAINT notification_projection_targets_retirement_check
            CHECK (
              (
                status = 'retired'
                AND retired_at IS NOT NULL
                AND (
                  physical_deleted_at IS NULL
                  OR physical_deleted_at >= retired_at
                )
              )
              OR (
                status <> 'retired'
                AND retired_at IS NULL
                AND physical_deleted_at IS NULL
              )
            ) NOT VALID;
        END IF;
      END
      $$
    `)
    await this.db.rawQuery(`
      ALTER TABLE notification_projection_targets
        VALIDATE CONSTRAINT notification_projection_targets_retirement_check
    `)
    await this.db.rawQuery(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS
        notification_projection_targets_rollback_expiry_idx
      ON notification_projection_targets (required_until, id)
      WHERE status = 'rollback'
    `)
    await this.db.rawQuery(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS
        notification_projection_targets_retired_cleanup_idx
      ON notification_projection_targets (retired_at, id)
      WHERE status = 'retired'
        AND physical_deleted_at IS NULL
    `)
  }

  override async down() {
    await this.db.rawQuery(`
      DROP INDEX CONCURRENTLY IF EXISTS
        notification_projection_targets_retired_cleanup_idx
    `)
    await this.db.rawQuery(`
      DROP INDEX CONCURRENTLY IF EXISTS
        notification_projection_targets_rollback_expiry_idx
    `)
    await this.db.rawQuery(`
      ALTER TABLE notification_projection_targets
        DROP CONSTRAINT IF EXISTS notification_projection_targets_retirement_check,
        DROP COLUMN IF EXISTS physical_deleted_at,
        DROP COLUMN IF EXISTS retired_at
    `)
  }
}

import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  static override disableTransactions = true

  override async up() {
    await this.db.rawQuery(`
      ALTER TABLE notification_projection_targets
        ADD COLUMN IF NOT EXISTS rollback_requested_at timestamptz
    `)
    await this.db.rawQuery(`
      UPDATE notification_projection_targets
      SET rollback_requested_at = COALESCE(rolled_back_at, updated_at, created_at)
      WHERE rollback_requested_by IS NOT NULL
        AND rollback_requested_at IS NULL
    `)
    await this.db.rawQuery(`
      ALTER TABLE notification_projection_targets
        DROP CONSTRAINT IF EXISTS notification_projection_targets_rollback_evidence_check
    `)
    await this.db.rawQuery(`
      ALTER TABLE notification_projection_targets
        ADD CONSTRAINT notification_projection_targets_rollback_evidence_check
        CHECK (
          (
            rollback_requested_by IS NULL
            AND rollback_reason IS NULL
            AND rollback_requested_at IS NULL
            AND rolled_back_at IS NULL
          )
          OR (
            rollback_requested_by IS NOT NULL
            AND rollback_reason IS NOT NULL
            AND char_length(rollback_reason) BETWEEN 10 AND 500
            AND rollback_requested_at IS NOT NULL
            AND (rolled_back_at IS NULL OR rolled_back_at >= rollback_requested_at)
          )
        ) NOT VALID
    `)
    await this.db.rawQuery(`
      ALTER TABLE notification_projection_targets
        VALIDATE CONSTRAINT notification_projection_targets_rollback_evidence_check
    `)
  }

  override async down() {
    await this.db.rawQuery(`
      ALTER TABLE notification_projection_targets
        DROP CONSTRAINT IF EXISTS notification_projection_targets_rollback_evidence_check
    `)
    await this.db.rawQuery(`
      ALTER TABLE notification_projection_targets
        ADD CONSTRAINT notification_projection_targets_rollback_evidence_check
        CHECK (
          (
            rollback_requested_by IS NULL
            AND rollback_reason IS NULL
            AND rolled_back_at IS NULL
          )
          OR (
            rollback_requested_by IS NOT NULL
            AND rollback_reason IS NOT NULL
            AND char_length(rollback_reason) BETWEEN 10 AND 500
            AND rolled_back_at IS NOT NULL
          )
        ) NOT VALID
    `)
    await this.db.rawQuery(`
      ALTER TABLE notification_projection_targets
        VALIDATE CONSTRAINT notification_projection_targets_rollback_evidence_check
    `)
    await this.db.rawQuery(`
      ALTER TABLE notification_projection_targets
        DROP COLUMN IF EXISTS rollback_requested_at
    `)
  }
}

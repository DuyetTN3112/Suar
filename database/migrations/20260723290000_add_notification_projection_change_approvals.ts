import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  static override disableTransactions = true

  override async up() {
    await this.db.rawQuery(`
      ALTER TABLE notification_projection_runs
        ADD COLUMN IF NOT EXISTS promotion_requested_by uuid,
        ADD COLUMN IF NOT EXISTS promotion_reason varchar(500),
        ADD COLUMN IF NOT EXISTS promotion_requested_at timestamptz
    `)
    await this.db.rawQuery(`
      ALTER TABLE notification_projection_targets
        ADD COLUMN IF NOT EXISTS rollback_requested_by uuid,
        ADD COLUMN IF NOT EXISTS rollback_reason varchar(500),
        ADD COLUMN IF NOT EXISTS rolled_back_at timestamptz
    `)
    await this.db.rawQuery(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'notification_projection_runs_promotion_actor_fk'
            AND conrelid = 'public.notification_projection_runs'::regclass
        ) THEN
          ALTER TABLE notification_projection_runs
            ADD CONSTRAINT notification_projection_runs_promotion_actor_fk
            FOREIGN KEY (promotion_requested_by)
            REFERENCES users(id)
            ON DELETE RESTRICT
            NOT VALID;
        END IF;
      END
      $$
    `)
    await this.db.rawQuery(`
      ALTER TABLE notification_projection_runs
        VALIDATE CONSTRAINT notification_projection_runs_promotion_actor_fk
    `)
    await this.db.rawQuery(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'notification_projection_targets_rollback_actor_fk'
            AND conrelid = 'public.notification_projection_targets'::regclass
        ) THEN
          ALTER TABLE notification_projection_targets
            ADD CONSTRAINT notification_projection_targets_rollback_actor_fk
            FOREIGN KEY (rollback_requested_by)
            REFERENCES users(id)
            ON DELETE RESTRICT
            NOT VALID;
        END IF;
      END
      $$
    `)
    await this.db.rawQuery(`
      ALTER TABLE notification_projection_targets
        VALIDATE CONSTRAINT notification_projection_targets_rollback_actor_fk
    `)
    await this.db.rawQuery(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'notification_projection_runs_promotion_evidence_check'
            AND conrelid = 'public.notification_projection_runs'::regclass
        ) THEN
          ALTER TABLE notification_projection_runs
            ADD CONSTRAINT notification_projection_runs_promotion_evidence_check
            CHECK (
              (
                promotion_requested_by IS NULL
                AND promotion_reason IS NULL
                AND promotion_requested_at IS NULL
              )
              OR (
                promotion_requested_by IS NOT NULL
                AND promotion_reason IS NOT NULL
                AND char_length(promotion_reason) BETWEEN 10 AND 500
                AND promotion_requested_at IS NOT NULL
              )
            ) NOT VALID;
        END IF;
      END
      $$
    `)
    await this.db.rawQuery(`
      ALTER TABLE notification_projection_runs
        VALIDATE CONSTRAINT notification_projection_runs_promotion_evidence_check
    `)
    await this.db.rawQuery(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'notification_projection_targets_rollback_evidence_check'
            AND conrelid = 'public.notification_projection_targets'::regclass
        ) THEN
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
            ) NOT VALID;
        END IF;
      END
      $$
    `)
    await this.db.rawQuery(`
      ALTER TABLE notification_projection_targets
        VALIDATE CONSTRAINT notification_projection_targets_rollback_evidence_check
    `)
  }

  override async down() {
    await this.db.rawQuery(`
      ALTER TABLE notification_projection_targets
        DROP CONSTRAINT IF EXISTS notification_projection_targets_rollback_evidence_check,
        DROP CONSTRAINT IF EXISTS notification_projection_targets_rollback_actor_fk,
        DROP COLUMN IF EXISTS rolled_back_at,
        DROP COLUMN IF EXISTS rollback_reason,
        DROP COLUMN IF EXISTS rollback_requested_by
    `)
    await this.db.rawQuery(`
      ALTER TABLE notification_projection_runs
        DROP CONSTRAINT IF EXISTS notification_projection_runs_promotion_evidence_check,
        DROP CONSTRAINT IF EXISTS notification_projection_runs_promotion_actor_fk,
        DROP COLUMN IF EXISTS promotion_requested_at,
        DROP COLUMN IF EXISTS promotion_reason,
        DROP COLUMN IF EXISTS promotion_requested_by
    `)
  }
}

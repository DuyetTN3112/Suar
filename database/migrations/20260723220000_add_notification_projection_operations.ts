import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  override async up() {
    await this.schema.raw(`
      ALTER TABLE notification_projection_targets
        ADD COLUMN IF NOT EXISTS backfill_completed_at timestamptz,
        ADD COLUMN IF NOT EXISTS rollback_eligible boolean NOT NULL DEFAULT false
    `)

    await this.schema.raw(`
      CREATE TABLE IF NOT EXISTS notification_projection_runs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        run_kind text NOT NULL,
        status text NOT NULL,
        target_id uuid NOT NULL
          REFERENCES notification_projection_targets(id) ON DELETE RESTRICT,
        source_target_id uuid
          REFERENCES notification_projection_targets(id) ON DELETE RESTRICT,
        s0_sequence bigint NOT NULL,
        s1_sequence bigint,
        last_notification_id uuid,
        last_tombstone_id uuid,
        scanned_count bigint NOT NULL DEFAULT 0,
        projected_count bigint NOT NULL DEFAULT 0,
        missing_count bigint NOT NULL DEFAULT 0,
        stale_count bigint NOT NULL DEFAULT 0,
        extra_count bigint NOT NULL DEFAULT 0,
        dry_run boolean NOT NULL DEFAULT false,
        requested_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        reason varchar(500) NOT NULL,
        alias_swapped_at timestamptz,
        report jsonb NOT NULL DEFAULT '{}'::jsonb,
        last_error_class varchar(200),
        last_error_message varchar(1024),
        started_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        completed_at timestamptz,
        CONSTRAINT notification_projection_runs_kind_check
          CHECK (run_kind IN ('rebuild', 'reconcile')),
        CONSTRAINT notification_projection_runs_status_check
          CHECK (
            status IN (
              'initialized',
              'backfilling',
              'catching_up',
              'reconciling',
              'ready',
              'cutting_over',
              'completed',
              'failed',
              'aborted'
            )
          ),
        CONSTRAINT notification_projection_runs_watermark_check
          CHECK (s0_sequence >= 0 AND (s1_sequence IS NULL OR s1_sequence >= s0_sequence)),
        CONSTRAINT notification_projection_runs_counts_check
          CHECK (
            scanned_count >= 0
            AND projected_count >= 0
            AND missing_count >= 0
            AND stale_count >= 0
            AND extra_count >= 0
          ),
        CONSTRAINT notification_projection_runs_report_size_check
          CHECK (octet_length(report::text) <= 65536)
      )
    `)

    await this.schema.raw(`
      CREATE UNIQUE INDEX IF NOT EXISTS notification_projection_one_active_rebuild_idx
      ON notification_projection_runs (run_kind)
      WHERE run_kind = 'rebuild'
        AND status NOT IN ('completed', 'failed', 'aborted')
    `)
    await this.schema.raw(`
      CREATE INDEX IF NOT EXISTS notification_projection_runs_target_idx
      ON notification_projection_runs (target_id, started_at DESC)
    `)
  }

  override async down() {
    await this.schema.dropTable('notification_projection_runs')
    await this.schema.alterTable('notification_projection_targets', (table) => {
      table.dropColumn('rollback_eligible')
      table.dropColumn('backfill_completed_at')
    })
  }
}

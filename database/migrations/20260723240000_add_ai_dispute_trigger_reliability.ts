import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  override async up() {
    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS ai_dispute_evaluations
      ADD COLUMN IF NOT EXISTS trigger_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
      ADD COLUMN IF NOT EXISTS trigger_state varchar(32) DEFAULT 'pending' NOT NULL,
      ADD COLUMN IF NOT EXISTS trigger_attempt_count integer DEFAULT 0 NOT NULL,
      ADD COLUMN IF NOT EXISTS trigger_last_attempt_at timestamptz,
      ADD COLUMN IF NOT EXISTS trigger_next_attempt_at timestamptz,
      ADD COLUMN IF NOT EXISTS trigger_accepted_at timestamptz,
      ADD COLUMN IF NOT EXISTS trigger_source_table varchar(64),
      ADD COLUMN IF NOT EXISTS trigger_expected_source_status varchar(64),
      ADD COLUMN IF NOT EXISTS trigger_error_code varchar(64),
      ADD COLUMN IF NOT EXISTS trigger_error_retryable boolean
    `)
    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS ai_dispute_evaluations
      DROP CONSTRAINT IF EXISTS ai_dispute_evaluations_trigger_state_check
    `)
    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS ai_dispute_evaluations
      ADD CONSTRAINT ai_dispute_evaluations_trigger_state_check
      CHECK (trigger_state = ANY (ARRAY[
        'pending',
        'dispatching',
        'accepted',
        'retryable_failure',
        'permanent_failure'
      ]))
    `)
    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS ai_dispute_evaluations
      DROP CONSTRAINT IF EXISTS ai_dispute_evaluations_trigger_attempt_count_check
    `)
    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS ai_dispute_evaluations
      ADD CONSTRAINT ai_dispute_evaluations_trigger_attempt_count_check
      CHECK (trigger_attempt_count >= 0)
    `)
    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS idx_ai_dispute_evaluations_trigger_reconciliation
      ON ai_dispute_evaluations (
        trigger_state,
        trigger_next_attempt_at,
        trigger_last_attempt_at,
        created_at
      )
      WHERE status IN ('queued', 'processing')
    `)
  }

  override async down() {
    await this.db.rawQuery(`
      DROP INDEX IF EXISTS idx_ai_dispute_evaluations_trigger_reconciliation
    `)
    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS ai_dispute_evaluations
      DROP CONSTRAINT IF EXISTS ai_dispute_evaluations_trigger_attempt_count_check
    `)
    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS ai_dispute_evaluations
      DROP CONSTRAINT IF EXISTS ai_dispute_evaluations_trigger_state_check
    `)
    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS ai_dispute_evaluations
      DROP COLUMN IF EXISTS trigger_error_retryable,
      DROP COLUMN IF EXISTS trigger_error_code,
      DROP COLUMN IF EXISTS trigger_expected_source_status,
      DROP COLUMN IF EXISTS trigger_source_table,
      DROP COLUMN IF EXISTS trigger_accepted_at,
      DROP COLUMN IF EXISTS trigger_next_attempt_at,
      DROP COLUMN IF EXISTS trigger_last_attempt_at,
      DROP COLUMN IF EXISTS trigger_attempt_count,
      DROP COLUMN IF EXISTS trigger_state,
      DROP COLUMN IF EXISTS trigger_payload
    `)
  }
}

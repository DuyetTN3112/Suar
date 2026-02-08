import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  override async up() {
    await this.db.rawQuery(`
      CREATE TABLE IF NOT EXISTS ai_dispute_auto_queue_intents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        source_type varchar(64) NOT NULL,
        source_id uuid NOT NULL,
        organization_id uuid,
        request_id varchar(255),
        trace_id varchar(255),
        workflow_id varchar(255),
        status varchar(32) NOT NULL DEFAULT 'pending',
        attempt_count integer NOT NULL DEFAULT 0,
        available_at timestamptz NOT NULL DEFAULT NOW(),
        locked_by varchar(255),
        locked_until timestamptz,
        lease_token uuid,
        last_error_code varchar(128),
        processed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ai_dispute_auto_queue_intents_source_type_check
          CHECK (source_type = ANY (ARRAY[
            'review_dispute',
            'sprint_review_dispute',
            'sprint_reverse_review_workflow',
            'task_review_workflow'
          ])),
        CONSTRAINT ai_dispute_auto_queue_intents_status_check
          CHECK (status = ANY (ARRAY['pending', 'leased', 'processed', 'dead_letter'])),
        CONSTRAINT ai_dispute_auto_queue_intents_attempt_count_check
          CHECK (attempt_count >= 0),
        CONSTRAINT ai_dispute_auto_queue_intents_source_unique
          UNIQUE (source_type, source_id)
      )
    `)
    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS ai_dispute_auto_queue_intents_claim_idx
      ON ai_dispute_auto_queue_intents (available_at, created_at)
      WHERE status IN ('pending', 'leased')
    `)
    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS ai_dispute_auto_queue_intents_dead_letter_idx
      ON ai_dispute_auto_queue_intents (updated_at)
      WHERE status = 'dead_letter'
    `)
  }

  override async down() {
    await this.db.rawQuery('DROP TABLE IF EXISTS ai_dispute_auto_queue_intents')
  }
}

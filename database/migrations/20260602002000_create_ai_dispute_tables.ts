import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  override async up(): Promise<void> {
    await this.schema.raw(`
      CREATE TABLE IF NOT EXISTS ai_dispute_evaluations (
        id UUID NOT NULL DEFAULT gen_random_uuid_v7(),
        dispute_id UUID NOT NULL,
        case_file_id UUID NOT NULL,
        provider VARCHAR(80) NOT NULL,
        external_run_id VARCHAR(120),
        status VARCHAR(30) NOT NULL DEFAULT 'queued',
        request_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
        response_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
        recommendation VARCHAR(80),
        confidence_score NUMERIC(5,4),
        summary TEXT,
        error_message TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        CONSTRAINT pk_ai_dispute_evaluations PRIMARY KEY (id)
      );

      CREATE INDEX IF NOT EXISTS idx_ai_dispute_evaluations_dispute
        ON ai_dispute_evaluations (dispute_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_ai_dispute_evaluations_status
        ON ai_dispute_evaluations (status);

      CREATE TABLE IF NOT EXISTS ai_dispute_feedback (
        id UUID NOT NULL DEFAULT gen_random_uuid_v7(),
        ai_evaluation_id UUID NOT NULL,
        dispute_id UUID NOT NULL,
        admin_id UUID NOT NULL,
        feedback_type VARCHAR(40) NOT NULL,
        admin_notes TEXT,
        final_decision VARCHAR(80) NOT NULL,
        final_rationale TEXT NOT NULL,
        ai_was_helpful BOOLEAN NOT NULL DEFAULT FALSE,
        ai_correct_points JSONB NOT NULL DEFAULT '{}'::JSONB,
        ai_missed_points JSONB NOT NULL DEFAULT '{}'::JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_ai_dispute_feedback PRIMARY KEY (id)
      );

      CREATE INDEX IF NOT EXISTS idx_ai_dispute_feedback_evaluation
        ON ai_dispute_feedback (ai_evaluation_id);
      CREATE INDEX IF NOT EXISTS idx_ai_dispute_feedback_dispute
        ON ai_dispute_feedback (dispute_id);
    `)
  }

  override async down(): Promise<void> {
    await this.schema.raw(`
      DROP TABLE IF EXISTS ai_dispute_feedback;
      DROP TABLE IF EXISTS ai_dispute_evaluations;
    `)
  }
}

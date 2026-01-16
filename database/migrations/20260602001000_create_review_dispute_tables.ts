import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  override async up(): Promise<void> {
    await this.schema.raw(`
      CREATE TABLE IF NOT EXISTS review_disputes (
        id UUID NOT NULL DEFAULT gen_random_uuid_v7(),
        review_session_id UUID NOT NULL,
        task_assignment_id UUID NOT NULL,
        task_id UUID NOT NULL,
        reviewee_id UUID NOT NULL,
        opened_by UUID NOT NULL,
        status VARCHAR(40) NOT NULL DEFAULT 'pending',
        dispute_reason TEXT NOT NULL,
        disputed_dimensions JSONB NOT NULL DEFAULT '{}'::JSONB,
        disputed_skill_reviews JSONB NOT NULL DEFAULT '[]'::JSONB,
        requested_outcome VARCHAR(40) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        resolved_at TIMESTAMPTZ,
        resolved_by UUID,
        final_decision VARCHAR(40),
        final_rationale TEXT,
        profile_update_action VARCHAR(80),
        reviewer_credibility_action VARCHAR(80),
        CONSTRAINT pk_review_disputes PRIMARY KEY (id)
      );

      CREATE INDEX IF NOT EXISTS idx_review_disputes_session
        ON review_disputes (review_session_id);
      CREATE INDEX IF NOT EXISTS idx_review_disputes_status
        ON review_disputes (status);
      CREATE INDEX IF NOT EXISTS idx_review_disputes_reviewee
        ON review_disputes (reviewee_id);
      DROP TRIGGER IF EXISTS trg_review_disputes_updated_at ON review_disputes;
      SELECT create_updated_at_trigger('review_disputes');

      CREATE TABLE IF NOT EXISTS review_dispute_comments (
        id UUID NOT NULL DEFAULT gen_random_uuid_v7(),
        dispute_id UUID NOT NULL,
        author_id UUID NOT NULL,
        body TEXT NOT NULL,
        visibility VARCHAR(30) NOT NULL DEFAULT 'all_parties',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT pk_review_dispute_comments PRIMARY KEY (id)
      );

      CREATE INDEX IF NOT EXISTS idx_review_dispute_comments_dispute
        ON review_dispute_comments (dispute_id, created_at DESC)
        WHERE deleted_at IS NULL;
      DROP TRIGGER IF EXISTS trg_review_dispute_comments_updated_at ON review_dispute_comments;
      SELECT create_updated_at_trigger('review_dispute_comments');

      CREATE TABLE IF NOT EXISTS review_dispute_evidences (
        id UUID NOT NULL DEFAULT gen_random_uuid_v7(),
        dispute_id UUID NOT NULL,
        evidence_type VARCHAR(40) NOT NULL,
        url VARCHAR(600) NOT NULL,
        title VARCHAR(255),
        description TEXT,
        uploaded_by UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_review_dispute_evidences PRIMARY KEY (id)
      );

      CREATE INDEX IF NOT EXISTS idx_review_dispute_evidences_dispute
        ON review_dispute_evidences (dispute_id);

      CREATE TABLE IF NOT EXISTS review_dispute_case_files (
        id UUID NOT NULL DEFAULT gen_random_uuid_v7(),
        dispute_id UUID NOT NULL,
        case_version INT NOT NULL,
        task_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
        required_skills_snapshot JSONB NOT NULL DEFAULT '[]'::JSONB,
        acceptance_criteria_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
        assignment_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
        submission_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
        review_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
        skill_reviews_snapshot JSONB NOT NULL DEFAULT '[]'::JSONB,
        evidences_snapshot JSONB NOT NULL DEFAULT '[]'::JSONB,
        self_assessment_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
        task_comments_snapshot JSONB NOT NULL DEFAULT '[]'::JSONB,
        task_history_snapshot JSONB NOT NULL DEFAULT '[]'::JSONB,
        reviewee_profile_context_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
        reviewer_context_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
        dispute_claim_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
        completeness_score SMALLINT NOT NULL DEFAULT 0,
        missing_data JSONB NOT NULL DEFAULT '[]'::JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by UUID,
        CONSTRAINT pk_review_dispute_case_files PRIMARY KEY (id)
      );

      CREATE INDEX IF NOT EXISTS idx_review_dispute_case_files_dispute
        ON review_dispute_case_files (dispute_id, case_version DESC);
    `)
  }

  override async down(): Promise<void> {
    await this.schema.raw(`
      DROP TABLE IF EXISTS review_dispute_case_files;
      DROP TABLE IF EXISTS review_dispute_evidences;
      DROP TABLE IF EXISTS review_dispute_comments;
      DROP TABLE IF EXISTS review_disputes;
    `)
  }
}

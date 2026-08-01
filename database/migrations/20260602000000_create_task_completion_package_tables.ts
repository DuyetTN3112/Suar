import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  override async up(): Promise<void> {
    await this.schema.raw(`
      CREATE TABLE IF NOT EXISTS task_submissions (
        id UUID NOT NULL DEFAULT gen_random_uuid_v7(),
        task_assignment_id UUID NOT NULL,
        task_id UUID NOT NULL,
        submitted_by UUID NOT NULL,
        summary TEXT NOT NULL,
        implementation_notes TEXT,
        known_limitations TEXT,
        test_notes TEXT,
        demo_url VARCHAR(600),
        repository_url VARCHAR(600),
        pull_request_url VARCHAR(600),
        status VARCHAR(30) NOT NULL DEFAULT 'draft',
        submitted_at TIMESTAMPTZ,
        locked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_task_submissions PRIMARY KEY (id)
      );

      CREATE INDEX IF NOT EXISTS idx_task_submissions_task
        ON task_submissions (task_id);
      CREATE INDEX IF NOT EXISTS idx_task_submissions_submitter
        ON task_submissions (submitted_by);
      CREATE INDEX IF NOT EXISTS idx_task_submissions_status
        ON task_submissions (status);
      DROP TRIGGER IF EXISTS trg_task_submissions_updated_at ON task_submissions;
      SELECT create_updated_at_trigger('task_submissions');

      CREATE TABLE IF NOT EXISTS task_submission_evidences (
        id UUID NOT NULL DEFAULT gen_random_uuid_v7(),
        submission_id UUID NOT NULL,
        evidence_type VARCHAR(40) NOT NULL,
        url VARCHAR(600) NOT NULL,
        title VARCHAR(255),
        description TEXT,
        uploaded_by UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_task_submission_evidences PRIMARY KEY (id)
      );

      CREATE INDEX IF NOT EXISTS idx_tse_submission
        ON task_submission_evidences (submission_id);
      CREATE INDEX IF NOT EXISTS idx_tse_type
        ON task_submission_evidences (evidence_type);
      CREATE INDEX IF NOT EXISTS idx_tse_uploaded_by
        ON task_submission_evidences (uploaded_by);

      CREATE TABLE IF NOT EXISTS task_comments (
        id UUID NOT NULL DEFAULT gen_random_uuid_v7(),
        task_id UUID NOT NULL,
        author_id UUID NOT NULL,
        parent_comment_id UUID,
        body TEXT NOT NULL,
        comment_type VARCHAR(30) NOT NULL DEFAULT 'normal',
        visibility VARCHAR(30) NOT NULL DEFAULT 'internal',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT pk_task_comments PRIMARY KEY (id)
      );

      CREATE INDEX IF NOT EXISTS idx_task_comments_task
        ON task_comments (task_id, created_at DESC)
        WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_task_comments_author
        ON task_comments (author_id);
      CREATE INDEX IF NOT EXISTS idx_task_comments_parent
        ON task_comments (parent_comment_id)
        WHERE parent_comment_id IS NOT NULL;
      DROP TRIGGER IF EXISTS trg_task_comments_updated_at ON task_comments;
      SELECT create_updated_at_trigger('task_comments');

      CREATE TABLE IF NOT EXISTS task_attachments (
        id UUID NOT NULL DEFAULT gen_random_uuid_v7(),
        task_id UUID NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INT,
        mime_type VARCHAR(100),
        uploaded_by UUID NOT NULL,
        attachment_type VARCHAR(30) NOT NULL DEFAULT 'other',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT pk_task_attachments PRIMARY KEY (id)
      );

      CREATE INDEX IF NOT EXISTS idx_task_attachments_task
        ON task_attachments (task_id)
        WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_task_attachments_uploaded_by
        ON task_attachments (uploaded_by);
      CREATE INDEX IF NOT EXISTS idx_task_attachments_type
        ON task_attachments (attachment_type);

      CREATE TABLE IF NOT EXISTS task_assignment_snapshots (
        id UUID NOT NULL DEFAULT gen_random_uuid_v7(),
        task_assignment_id UUID NOT NULL,
        task_id UUID NOT NULL,
        snapshot_reason VARCHAR(30) NOT NULL,
        task_snapshot JSONB NOT NULL,
        required_skills_snapshot JSONB NOT NULL DEFAULT '[]'::JSONB,
        acceptance_criteria_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
        workflow_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_task_assignment_snapshots PRIMARY KEY (id)
      );

      CREATE INDEX IF NOT EXISTS idx_tas_assignment
        ON task_assignment_snapshots (task_assignment_id);
      CREATE INDEX IF NOT EXISTS idx_tas_task
        ON task_assignment_snapshots (task_id);
      CREATE INDEX IF NOT EXISTS idx_tas_reason
        ON task_assignment_snapshots (snapshot_reason);

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
      DROP TABLE IF EXISTS task_assignment_snapshots;
      DROP TABLE IF EXISTS task_attachments;
      DROP TABLE IF EXISTS task_comments;
      DROP TABLE IF EXISTS task_submission_evidences;
      DROP TABLE IF EXISTS task_submissions;
    `)
  }
}

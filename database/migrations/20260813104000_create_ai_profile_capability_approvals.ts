import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * An AI conclusion is advisory. This table records the separate, attributable
 * system-admin approval of one capability proposal. It deliberately does not
 * write `user_skills` or a verified accomplishment: profile readers may only
 * consume it after its task-review workflow is terminal.
 */
export default class extends BaseSchema {
  override async up(): Promise<void> {
    await this.db.rawQuery(`
      CREATE TABLE IF NOT EXISTS ai_profile_capability_approvals (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        ai_evaluation_id uuid NOT NULL REFERENCES ai_dispute_evaluations(id) ON DELETE RESTRICT,
        task_review_workflow_id uuid NOT NULL REFERENCES task_review_workflows(id) ON DELETE RESTRICT,
        task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
        task_assignment_id uuid NOT NULL REFERENCES task_assignments(id) ON DELETE RESTRICT,
        subject_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        proposal_index integer NOT NULL CHECK (proposal_index >= 0),
        capability_id uuid NOT NULL,
        capability_name varchar(255) NOT NULL,
        declared_target_level varchar(32) NULL,
        approved_observed_level varchar(32) NOT NULL,
        assessment_status varchar(64) NOT NULL CHECK (assessment_status IN ('supported', 'higher_evidence', 'lower_evidence')),
        work_claim jsonb NOT NULL,
        proposal_payload jsonb NOT NULL,
        evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
        profile_effect text NOT NULL,
        source_payload_hash varchar(72) NOT NULL,
        approved_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        approved_at timestamptz NOT NULL DEFAULT NOW(),
        is_public boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ai_profile_capability_approvals_evaluation_proposal_unique
          UNIQUE (ai_evaluation_id, proposal_index)
      )
    `)
    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS ai_profile_capability_approvals_subject_workflow_idx
        ON ai_profile_capability_approvals (subject_user_id, task_review_workflow_id, approved_at DESC)
    `)
    await this.db.rawQuery(`
      COMMENT ON TABLE ai_profile_capability_approvals IS
        'System-admin approvals of advisory AI profile proposals; profile projection is gated by task-review workflow Done.'
    `)
  }

  override async down(): Promise<void> {
    await this.db.rawQuery('DROP TABLE IF EXISTS ai_profile_capability_approvals')
  }
}

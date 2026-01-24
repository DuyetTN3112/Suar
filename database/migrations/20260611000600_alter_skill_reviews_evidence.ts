import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  override async up(): Promise<void> {
    await this.schema.raw(`
      -- =================================================================
      -- PHASE 9: Nâng cấp skill_reviews — evidence có căn cứ
      -- Không dùng khóa ngoại — ràng buộc xử lý ở application layer.
      -- =================================================================

      -- ------------------------------------------------------------------
      -- ALTER TABLE skill_reviews — thêm columns mới (backward compatible)
      -- ------------------------------------------------------------------
      ALTER TABLE skill_reviews
        ADD COLUMN IF NOT EXISTS observed_level_id UUID,         -- → proficiency_levels.id (nullable = insufficient evidence)
        ADD COLUMN IF NOT EXISTS rubric_version_id UUID,         -- → skill_rubric_versions.id
        ADD COLUMN IF NOT EXISTS confidence VARCHAR(20),
        ADD COLUMN IF NOT EXISTS rationale TEXT,
        ADD COLUMN IF NOT EXISTS observable_behaviors JSONB,     -- mảng behavior strings
        ADD COLUMN IF NOT EXISTS review_status VARCHAR(30) NOT NULL DEFAULT 'submitted',
        ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS superseded_by UUID;             -- → skill_reviews.id (self-reference)

      CREATE INDEX IF NOT EXISTS idx_skill_reviews_status
        ON skill_reviews (review_status);
      CREATE INDEX IF NOT EXISTS idx_skill_reviews_session_status
        ON skill_reviews (review_session_id, review_status);
      CREATE INDEX IF NOT EXISTS idx_skill_reviews_superseded_by
        ON skill_reviews (superseded_by)
        WHERE superseded_by IS NOT NULL;

      -- ------------------------------------------------------------------
      -- TABLE: skill_review_evidence_links
      -- Liên kết cụ thể giữa một skill review và một review evidence
      -- ------------------------------------------------------------------
      CREATE TABLE IF NOT EXISTS skill_review_evidence_links (
        id UUID NOT NULL DEFAULT gen_random_uuid_v7(),
        skill_review_id UUID NOT NULL,              -- → skill_reviews.id
        review_evidence_id UUID NOT NULL,           -- → review_evidences.id
        relevance_type VARCHAR(30) NOT NULL DEFAULT 'direct_observation',
        reviewer_note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_skill_review_evidence_links PRIMARY KEY (id)
      );

      CREATE INDEX IF NOT EXISTS idx_skill_rev_ev_links_review
        ON skill_review_evidence_links (skill_review_id);
      CREATE INDEX IF NOT EXISTS idx_skill_rev_ev_links_evidence
        ON skill_review_evidence_links (review_evidence_id);
    `)
  }

  override async down(): Promise<void> {
    await this.schema.raw(`
      DROP TABLE IF EXISTS skill_review_evidence_links;

      ALTER TABLE skill_reviews
        DROP COLUMN IF EXISTS observed_level_id,
        DROP COLUMN IF EXISTS rubric_version_id,
        DROP COLUMN IF EXISTS confidence,
        DROP COLUMN IF EXISTS rationale,
        DROP COLUMN IF EXISTS observable_behaviors,
        DROP COLUMN IF EXISTS review_status,
        DROP COLUMN IF EXISTS submitted_at,
        DROP COLUMN IF EXISTS superseded_by;
    `)
  }
}

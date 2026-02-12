import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  override async up(): Promise<void> {
    await this.schema.raw(`
      -- =================================================================
      -- PHASE 8: Requirement Versioning — snapshot tại freeze points
      -- Không dùng khóa ngoại — ràng buộc xử lý ở application layer.
      -- =================================================================

      -- ------------------------------------------------------------------
      -- TABLE: task_requirement_versions
      -- Mỗi row = một phiên bản snapshot của toàn bộ requirement của task
      -- ------------------------------------------------------------------
      CREATE TABLE IF NOT EXISTS task_requirement_versions (
        id UUID NOT NULL DEFAULT gen_random_uuid_v7(),
        task_id UUID NOT NULL,                       -- → tasks.id
        version_number INT NOT NULL,
        reason VARCHAR(50) NOT NULL,
        created_by UUID,                             -- → users.id
        professional_role_snapshot JSONB,            -- metadata của professional role tại thời điểm snapshot
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_task_requirement_versions PRIMARY KEY (id)
      );

      CREATE INDEX IF NOT EXISTS idx_task_req_versions_task
        ON task_requirement_versions (task_id);
      CREATE INDEX IF NOT EXISTS idx_task_req_versions_task_ver
        ON task_requirement_versions (task_id, version_number DESC);

      -- ------------------------------------------------------------------
      -- TABLE: task_requirement_version_items
      -- Chi tiết từng skill requirement trong một version snapshot
      -- ------------------------------------------------------------------
      CREATE TABLE IF NOT EXISTS task_requirement_version_items (
        id UUID NOT NULL DEFAULT gen_random_uuid_v7(),
        requirement_version_id UUID NOT NULL,        -- → task_requirement_versions.id
        skill_id UUID NOT NULL,                      -- → skills.id
        project_skill_id UUID,                       -- → project_skills.id
        minimum_level_id UUID,                       -- → proficiency_levels.id
        target_level_id UUID,                        -- → proficiency_levels.id
        assessment_ceiling_level_id UUID,            -- → proficiency_levels.id
        rubric_version_id UUID,                      -- → skill_rubric_versions.id
        required_level_code VARCHAR(50),             -- backward compat inline code
        is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
        importance VARCHAR(20) NOT NULL DEFAULT 'medium',
        weight NUMERIC(5,2) NOT NULL DEFAULT 1.00,
        requirement_source VARCHAR(30) NOT NULL DEFAULT 'manual',
        requirement_notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_task_requirement_version_items PRIMARY KEY (id)
      );

      CREATE INDEX IF NOT EXISTS idx_task_req_ver_items_version
        ON task_requirement_version_items (requirement_version_id);
      CREATE INDEX IF NOT EXISTS idx_task_req_ver_items_skill
        ON task_requirement_version_items (skill_id);
    `)
  }

  override async down(): Promise<void> {
    await this.schema.raw(`
      DROP TABLE IF EXISTS task_requirement_version_items;
      DROP TABLE IF EXISTS task_requirement_versions;
    `)
  }
}

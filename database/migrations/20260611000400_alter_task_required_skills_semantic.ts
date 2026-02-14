import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  override async up(): Promise<void> {
    await this.schema.raw(`
      -- =================================================================
      -- PHASE 7: Nâng cấp task_required_skills — semantic level model
      -- Chỉ ADD COLUMN (backward compatible). Không xóa required_level_code.
      -- Không dùng khóa ngoại — ràng buộc xử lý ở application layer.
      -- =================================================================

      ALTER TABLE task_required_skills
        ADD COLUMN IF NOT EXISTS project_skill_id UUID,
        ADD COLUMN IF NOT EXISTS source_project_professional_role_id UUID,
        ADD COLUMN IF NOT EXISTS source_role_skill_id UUID,
        ADD COLUMN IF NOT EXISTS minimum_level_id UUID,
        ADD COLUMN IF NOT EXISTS target_level_id UUID,
        ADD COLUMN IF NOT EXISTS assessment_ceiling_level_id UUID,
        ADD COLUMN IF NOT EXISTS rubric_version_id UUID,
        ADD COLUMN IF NOT EXISTS importance VARCHAR(20) NOT NULL DEFAULT 'medium',
        ADD COLUMN IF NOT EXISTS weight NUMERIC(5,2) NOT NULL DEFAULT 1.00,
        ADD COLUMN IF NOT EXISTS requirement_source VARCHAR(30) NOT NULL DEFAULT 'manual',
        ADD COLUMN IF NOT EXISTS requirement_notes TEXT;

      CREATE INDEX IF NOT EXISTS idx_task_req_skills_project_skill
        ON task_required_skills (project_skill_id)
        WHERE project_skill_id IS NOT NULL;

      CREATE INDEX IF NOT EXISTS idx_task_req_skills_source_role
        ON task_required_skills (source_project_professional_role_id)
        WHERE source_project_professional_role_id IS NOT NULL;
    `)
  }

  override async down(): Promise<void> {
    await this.schema.raw(`
      ALTER TABLE task_required_skills
        DROP COLUMN IF EXISTS project_skill_id,
        DROP COLUMN IF EXISTS source_project_professional_role_id,
        DROP COLUMN IF EXISTS source_role_skill_id,
        DROP COLUMN IF EXISTS minimum_level_id,
        DROP COLUMN IF EXISTS target_level_id,
        DROP COLUMN IF EXISTS assessment_ceiling_level_id,
        DROP COLUMN IF EXISTS rubric_version_id,
        DROP COLUMN IF EXISTS importance,
        DROP COLUMN IF EXISTS weight,
        DROP COLUMN IF EXISTS requirement_source,
        DROP COLUMN IF EXISTS requirement_notes;
    `)
  }
}

import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  override async up(): Promise<void> {
    await this.schema.raw(`
      CREATE TABLE IF NOT EXISTS project_skills (
        id UUID NOT NULL DEFAULT gen_random_uuid_v7(),
        project_id UUID NOT NULL,
        skill_id UUID NOT NULL,
        display_name_override VARCHAR(100),
        description_override TEXT,
        rubric_version_id UUID,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        is_selectable_for_tasks BOOLEAN NOT NULL DEFAULT TRUE,
        is_visible_in_project BOOLEAN NOT NULL DEFAULT TRUE,
        added_by UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_project_skills PRIMARY KEY (id)
      );

      CREATE INDEX IF NOT EXISTS idx_project_skills_project ON project_skills (project_id);
      DROP TRIGGER IF EXISTS trg_project_skills_updated_at ON project_skills;
      SELECT create_updated_at_trigger('project_skills');
    `)
  }

  override async down(): Promise<void> {
    await this.schema.raw(`
      DROP TABLE IF EXISTS project_skills;
    `)
  }
}

import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  override async up(): Promise<void> {
    await this.schema.raw(`
      -- ============================================================
      -- TABLE: professional_role_templates
      -- Global templates managed by admins (Frontend Engineer, etc.)
      -- ============================================================
      CREATE TABLE IF NOT EXISTS professional_role_templates (
        id UUID NOT NULL DEFAULT gen_random_uuid_v7(),
        code VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_professional_role_templates PRIMARY KEY (id)
      );

      CREATE INDEX IF NOT EXISTS idx_prof_role_templates_active
        ON professional_role_templates (is_active);

      DROP TRIGGER IF EXISTS trg_professional_role_templates_updated_at
        ON professional_role_templates;
      SELECT create_updated_at_trigger('professional_role_templates');

      -- ============================================================
      -- TABLE: professional_role_template_skills
      -- Default skill requirements per global template
      -- ============================================================
      CREATE TABLE IF NOT EXISTS professional_role_template_skills (
        id UUID NOT NULL DEFAULT gen_random_uuid_v7(),
        role_template_id UUID NOT NULL,              -- → professional_role_templates.id
        skill_id UUID NOT NULL,                      -- → skills.id
        minimum_level_id UUID,                       -- → proficiency_levels.id
        target_level_id UUID,                        -- → proficiency_levels.id
        assessment_ceiling_level_id UUID,            -- → proficiency_levels.id
        is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
        importance VARCHAR(20) NOT NULL DEFAULT 'medium',
        weight NUMERIC(5,2) NOT NULL DEFAULT 1.00,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_prof_role_template_skills PRIMARY KEY (id)
      );

      CREATE INDEX IF NOT EXISTS idx_prof_role_template_skills_role
        ON professional_role_template_skills (role_template_id);
      CREATE INDEX IF NOT EXISTS idx_prof_role_template_skills_skill
        ON professional_role_template_skills (skill_id);

      DROP TRIGGER IF EXISTS trg_professional_role_template_skills_updated_at
        ON professional_role_template_skills;
      SELECT create_updated_at_trigger('professional_role_template_skills');

      -- ============================================================
      -- TABLE: project_professional_roles
      -- Per-project professional role instances (cloned or custom)
      -- ============================================================
      CREATE TABLE IF NOT EXISTS project_professional_roles (
        id UUID NOT NULL DEFAULT gen_random_uuid_v7(),
        project_id UUID NOT NULL,                    -- → projects.id
        source_template_id UUID,                     -- → professional_role_templates.id (nullable: custom roles have no template)
        code VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        version INT NOT NULL DEFAULT 1,
        created_by UUID,                             -- → users.id
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_project_professional_roles PRIMARY KEY (id)
      );

      CREATE INDEX IF NOT EXISTS idx_proj_prof_roles_project
        ON project_professional_roles (project_id);
      CREATE INDEX IF NOT EXISTS idx_proj_prof_roles_active
        ON project_professional_roles (project_id, is_active);

      DROP TRIGGER IF EXISTS trg_project_professional_roles_updated_at
        ON project_professional_roles;
      SELECT create_updated_at_trigger('project_professional_roles');

      -- ============================================================
      -- TABLE: project_professional_role_skills
      -- Per-project skill requirements within a project professional role
      -- ============================================================
      CREATE TABLE IF NOT EXISTS project_professional_role_skills (
        id UUID NOT NULL DEFAULT gen_random_uuid_v7(),
        project_professional_role_id UUID NOT NULL, -- → project_professional_roles.id
        project_skill_id UUID NOT NULL,             -- → project_skills.id
        minimum_level_id UUID,                      -- → proficiency_levels.id
        target_level_id UUID,                       -- → proficiency_levels.id
        assessment_ceiling_level_id UUID,           -- → proficiency_levels.id
        is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
        importance VARCHAR(20) NOT NULL DEFAULT 'medium',
        weight NUMERIC(5,2) NOT NULL DEFAULT 1.00,
        sort_order INT NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_proj_prof_role_skills PRIMARY KEY (id)
      );

      CREATE INDEX IF NOT EXISTS idx_proj_prof_role_skills_role
        ON project_professional_role_skills (project_professional_role_id);
      CREATE INDEX IF NOT EXISTS idx_proj_prof_role_skills_skill
        ON project_professional_role_skills (project_skill_id);

      DROP TRIGGER IF EXISTS trg_project_professional_role_skills_updated_at
        ON project_professional_role_skills;
      SELECT create_updated_at_trigger('project_professional_role_skills');
    `)
  }

  override async down(): Promise<void> {
    await this.schema.raw(`
      DROP TABLE IF EXISTS project_professional_role_skills;
      DROP TABLE IF EXISTS project_professional_roles;
      DROP TABLE IF EXISTS professional_role_template_skills;
      DROP TABLE IF EXISTS professional_role_templates;
    `)
  }
}

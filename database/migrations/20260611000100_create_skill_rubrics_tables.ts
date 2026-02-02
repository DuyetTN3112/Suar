import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  override async up(): Promise<void> {
    await this.schema.raw(`
      CREATE TABLE IF NOT EXISTS skill_aliases (
        id UUID NOT NULL DEFAULT gen_random_uuid_v7(),
        skill_id UUID NOT NULL,
        alias VARCHAR(100) NOT NULL,
        normalized_alias VARCHAR(100) NOT NULL,
        locale VARCHAR(10) NOT NULL DEFAULT 'en',
        source VARCHAR(20) NOT NULL DEFAULT 'manual',
        is_primary BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_skill_aliases PRIMARY KEY (id)
      );

      CREATE INDEX IF NOT EXISTS idx_skill_aliases_skill ON skill_aliases (skill_id);
      DROP TRIGGER IF EXISTS trg_skill_aliases_updated_at ON skill_aliases;
      SELECT create_updated_at_trigger('skill_aliases');

        CREATE TABLE IF NOT EXISTS skill_rubric_versions (
        id UUID NOT NULL DEFAULT gen_random_uuid_v7(),
        skill_id UUID NOT NULL,
        version INT NOT NULL,
        status VARCHAR(20) NOT NULL,
        effective_from TIMESTAMPTZ,
        effective_to TIMESTAMPTZ,
        created_by UUID,
        change_summary TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_skill_rubric_versions PRIMARY KEY (id)
      );

      CREATE INDEX IF NOT EXISTS idx_skill_rubric_versions_skill ON skill_rubric_versions (skill_id);
      DROP TRIGGER IF EXISTS trg_skill_rubric_versions_updated_at ON skill_rubric_versions;
      SELECT create_updated_at_trigger('skill_rubric_versions');

      CREATE TABLE IF NOT EXISTS skill_rubric_levels (
        id UUID NOT NULL DEFAULT gen_random_uuid_v7(),
        rubric_version_id UUID NOT NULL,
        proficiency_level_id UUID NOT NULL,
        summary TEXT,
        knowledge_expectations JSONB,
        observable_behaviors JSONB,
        independence_expectations TEXT,
        complexity_expectations TEXT,
        impact_scope_expectations TEXT,
        positive_examples JSONB,
        negative_examples JSONB,
        evidence_guidance TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_skill_rubric_levels PRIMARY KEY (id)
      );

      CREATE INDEX IF NOT EXISTS idx_skill_rubric_levels_ver ON skill_rubric_levels (rubric_version_id);
      CREATE INDEX IF NOT EXISTS idx_skill_rubric_levels_level ON skill_rubric_levels (proficiency_level_id);
      DROP TRIGGER IF EXISTS trg_skill_rubric_levels_updated_at ON skill_rubric_levels;
      SELECT create_updated_at_trigger('skill_rubric_levels');
    `)
  }

  override async down(): Promise<void> {
    await this.schema.raw(`
      DROP TABLE IF EXISTS skill_rubric_levels;
      DROP TABLE IF EXISTS skill_rubric_versions;
      DROP TABLE IF EXISTS skill_aliases;
    `)
  }
}

import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  override async up(): Promise<void> {
    await this.schema.raw(`
      CREATE TABLE IF NOT EXISTS proficiency_scales (
        id UUID NOT NULL DEFAULT gen_random_uuid_v7(),
        code VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        version INT NOT NULL DEFAULT 1,
        is_active BOOLEAN NOT NULL DEFAULT FALSE,
        effective_from TIMESTAMPTZ,
        effective_to TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_proficiency_scales PRIMARY KEY (id)
      );

      DROP TRIGGER IF EXISTS trg_proficiency_scales_updated_at ON proficiency_scales;
      SELECT create_updated_at_trigger('proficiency_scales');

        CREATE TABLE IF NOT EXISTS proficiency_levels (
        id UUID NOT NULL DEFAULT gen_random_uuid_v7(),
        scale_id UUID NOT NULL,
        ordinal INT NOT NULL,
        code VARCHAR(50) NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        short_name VARCHAR(20),
        normalized_value NUMERIC(5,4) NOT NULL,
        generic_description TEXT,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_proficiency_levels PRIMARY KEY (id)
      );

      CREATE INDEX IF NOT EXISTS idx_proficiency_levels_scale ON proficiency_levels (scale_id);
      DROP TRIGGER IF EXISTS trg_proficiency_levels_updated_at ON proficiency_levels;
      SELECT create_updated_at_trigger('proficiency_levels');
    `)
  }

  override async down(): Promise<void> {
    await this.schema.raw(`
      DROP TABLE IF EXISTS proficiency_levels;
      DROP TABLE IF EXISTS proficiency_scales;
    `)
  }
}

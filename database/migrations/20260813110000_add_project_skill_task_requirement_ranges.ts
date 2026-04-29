import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * A Project owns the inclusive range of levels that its tasks may require for
 * a configured skill. These are intentionally distinct from role targets and
 * from any level an AI reviewer may later propose for a person.
 *
 * Both columns stay nullable for legacy project-skill rows. Legacy rows are
 * not selectable for a new task until their Project owner configures a range.
 */
export default class extends BaseSchema {
  override async up(): Promise<void> {
    await this.db.rawQuery(`
      ALTER TABLE project_skills
        ADD COLUMN IF NOT EXISTS minimum_task_requirement_level_id uuid NULL,
        ADD COLUMN IF NOT EXISTS maximum_task_requirement_level_id uuid NULL
    `)
    await this.db.rawQuery(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint AS constraint_row
          JOIN pg_attribute AS attribute_row
            ON attribute_row.attrelid = constraint_row.conrelid
           AND attribute_row.attnum = ANY(constraint_row.conkey)
          WHERE constraint_row.conrelid = 'project_skills'::regclass
            AND constraint_row.contype = 'f'
            AND attribute_row.attname = 'minimum_task_requirement_level_id'
        ) THEN
          ALTER TABLE project_skills
            ADD CONSTRAINT project_skills_min_task_requirement_level_fk
            FOREIGN KEY (minimum_task_requirement_level_id)
            REFERENCES proficiency_levels(id)
            ON DELETE RESTRICT;
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint AS constraint_row
          JOIN pg_attribute AS attribute_row
            ON attribute_row.attrelid = constraint_row.conrelid
           AND attribute_row.attnum = ANY(constraint_row.conkey)
          WHERE constraint_row.conrelid = 'project_skills'::regclass
            AND constraint_row.contype = 'f'
            AND attribute_row.attname = 'maximum_task_requirement_level_id'
        ) THEN
          ALTER TABLE project_skills
            ADD CONSTRAINT project_skills_max_task_requirement_level_fk
            FOREIGN KEY (maximum_task_requirement_level_id)
            REFERENCES proficiency_levels(id)
            ON DELETE RESTRICT;
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conrelid = 'project_skills'::regclass
            AND conname = 'project_skills_task_requirement_range_pair'
        ) THEN
          ALTER TABLE project_skills
            ADD CONSTRAINT project_skills_task_requirement_range_pair
            CHECK (
              (minimum_task_requirement_level_id IS NULL AND maximum_task_requirement_level_id IS NULL)
              OR
              (minimum_task_requirement_level_id IS NOT NULL AND maximum_task_requirement_level_id IS NOT NULL)
            );
        END IF;
      END $$;
    `)
  }

  override async down(): Promise<void> {
    await this.db.rawQuery(
      'ALTER TABLE project_skills DROP CONSTRAINT IF EXISTS project_skills_task_requirement_range_pair'
    )
    await this.db.rawQuery(`
      ALTER TABLE project_skills
        DROP COLUMN IF EXISTS minimum_task_requirement_level_id,
        DROP COLUMN IF EXISTS maximum_task_requirement_level_id
    `)
  }
}

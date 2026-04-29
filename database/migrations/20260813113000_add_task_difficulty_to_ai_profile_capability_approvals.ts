import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Keeps the AI's assessment of the work separate from its assessment of the
 * person. A task entry requirement is neither of those values.
 */
export default class extends BaseSchema {
  override async up(): Promise<void> {
    await this.db.rawQuery(`
      ALTER TABLE ai_profile_capability_approvals
        ADD COLUMN IF NOT EXISTS declared_minimum_level varchar(32) NULL,
        ADD COLUMN IF NOT EXISTS assessed_task_difficulty_level varchar(32) NULL,
        ADD COLUMN IF NOT EXISTS task_difficulty_assessment_status varchar(64) NULL
          CHECK (
            task_difficulty_assessment_status IS NULL OR
            task_difficulty_assessment_status IN (
              'supported', 'higher_evidence', 'lower_evidence', 'insufficient_evidence'
            )
          )
    `)
    await this.db.rawQuery(`
      UPDATE ai_profile_capability_approvals
      SET declared_minimum_level = COALESCE(declared_minimum_level, declared_target_level)
      WHERE declared_minimum_level IS NULL
        AND declared_target_level IS NOT NULL
    `)
  }

  override async down(): Promise<void> {
    await this.db.rawQuery(`
      ALTER TABLE ai_profile_capability_approvals
        DROP COLUMN IF EXISTS task_difficulty_assessment_status,
        DROP COLUMN IF EXISTS assessed_task_difficulty_level,
        DROP COLUMN IF EXISTS declared_minimum_level
    `)
  }
}

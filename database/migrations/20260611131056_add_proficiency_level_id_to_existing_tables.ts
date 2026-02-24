import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  override async up(): Promise<void> {
    await this.db.rawQuery("ALTER TABLE user_skills ADD COLUMN IF NOT EXISTS proficiency_level_id UUID")
    await this.db.rawQuery("CREATE INDEX IF NOT EXISTS idx_user_skills_proficiency_level_id ON user_skills (proficiency_level_id)")

    await this.db.rawQuery("ALTER TABLE skill_reviews ADD COLUMN IF NOT EXISTS proficiency_level_id UUID")
    await this.db.rawQuery("CREATE INDEX IF NOT EXISTS idx_skill_reviews_proficiency_level_id ON skill_reviews (proficiency_level_id)")

    await this.db.rawQuery("ALTER TABLE task_required_skills ADD COLUMN IF NOT EXISTS proficiency_level_id UUID")
    await this.db.rawQuery("CREATE INDEX IF NOT EXISTS idx_task_required_skills_proficiency_level_id ON task_required_skills (proficiency_level_id)")

    await this.db.rawQuery(`
      UPDATE user_skills us SET proficiency_level_id = pl.id
      FROM proficiency_levels pl JOIN proficiency_scales ps ON pl.scale_id = ps.id
      WHERE us.level_code = pl.code AND ps.is_active = true AND us.proficiency_level_id IS NULL
    `)

    await this.db.rawQuery(`
      UPDATE skill_reviews sr SET proficiency_level_id = pl.id
      FROM proficiency_levels pl JOIN proficiency_scales ps ON pl.scale_id = ps.id
      WHERE sr.assigned_level_code = pl.code AND ps.is_active = true AND sr.proficiency_level_id IS NULL
    `)

    await this.db.rawQuery(`
      UPDATE task_required_skills trs SET proficiency_level_id = pl.id
      FROM proficiency_levels pl JOIN proficiency_scales ps ON pl.scale_id = ps.id
      WHERE trs.required_level_code = pl.code AND ps.is_active = true AND trs.proficiency_level_id IS NULL
    `)
  }

  override async down(): Promise<void> {
    await this.db.rawQuery("ALTER TABLE user_skills DROP COLUMN IF EXISTS proficiency_level_id")
    await this.db.rawQuery("ALTER TABLE skill_reviews DROP COLUMN IF EXISTS proficiency_level_id")
    await this.db.rawQuery("ALTER TABLE task_required_skills DROP COLUMN IF EXISTS proficiency_level_id")
  }
}

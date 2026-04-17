import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  override async up() {
    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS skills
      DROP CONSTRAINT IF EXISTS skills_category_code_check
    `)

    await this.db.rawQuery(`
      UPDATE skills
      SET category_code = 'technology'
      WHERE category_code = 'technical'
    `)

    await this.db.rawQuery(`
      UPDATE skills
      SET category_code = 'engineering'
      WHERE skill_code IN ('testing', 'code_review')
    `)

    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS skills
      ADD CONSTRAINT skills_category_code_check
      CHECK (category_code IN ('technology', 'engineering', 'soft_skill', 'delivery'))
    `)
  }

  override async down() {
    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS skills
      DROP CONSTRAINT IF EXISTS skills_category_code_check
    `)

    await this.db.rawQuery(`
      UPDATE skills
      SET category_code = 'technical'
      WHERE category_code = 'technology'
    `)

    await this.db.rawQuery(`
      UPDATE skills
      SET category_code = 'delivery'
      WHERE category_code = 'engineering'
    `)

    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS skills
      ADD CONSTRAINT skills_category_code_check
      CHECK (category_code IN ('technical', 'soft_skill', 'delivery'))
    `)
  }
}

import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  override async up() {
    await this.db.rawQuery(`
      ALTER TABLE project_sprints
      ADD COLUMN IF NOT EXISTS goal text
    `)
  }

  override async down() {
    await this.db.rawQuery(`
      ALTER TABLE project_sprints
      DROP COLUMN IF EXISTS goal
    `)
  }
}

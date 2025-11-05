import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  override async up() {
    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS task_review_workflows
      ADD COLUMN IF NOT EXISTS runtime_context jsonb DEFAULT '{}'::jsonb NOT NULL
    `)
  }

  override async down() {
    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS task_review_workflows
      DROP COLUMN IF EXISTS runtime_context
    `)
  }
}

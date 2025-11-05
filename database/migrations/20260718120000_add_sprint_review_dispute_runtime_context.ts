import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  override async up() {
    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS sprint_review_disputes
      ADD COLUMN IF NOT EXISTS dispute_review_type varchar(32) DEFAULT 'manager_review' NOT NULL
    `)
    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS sprint_review_disputes
      ADD COLUMN IF NOT EXISTS runtime_context jsonb DEFAULT '{}'::jsonb NOT NULL
    `)
  }

  override async down() {
    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS sprint_review_disputes
      DROP COLUMN IF EXISTS runtime_context
    `)
    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS sprint_review_disputes
      DROP COLUMN IF EXISTS dispute_review_type
    `)
  }
}

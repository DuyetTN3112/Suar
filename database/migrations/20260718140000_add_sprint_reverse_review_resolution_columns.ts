import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  override async up() {
    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS sprint_reverse_review_workflows
      ADD COLUMN IF NOT EXISTS final_decision varchar(64)
    `)
    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS sprint_reverse_review_workflows
      ADD COLUMN IF NOT EXISTS final_rationale text
    `)
    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS sprint_reverse_review_workflows
      ADD COLUMN IF NOT EXISTS resolved_at timestamptz
    `)
    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS sprint_reverse_review_workflows
      ADD COLUMN IF NOT EXISTS resolved_by uuid
    `)
  }

  override async down() {
    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS sprint_reverse_review_workflows
      DROP COLUMN IF EXISTS resolved_by
    `)
    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS sprint_reverse_review_workflows
      DROP COLUMN IF EXISTS resolved_at
    `)
    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS sprint_reverse_review_workflows
      DROP COLUMN IF EXISTS final_rationale
    `)
    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS sprint_reverse_review_workflows
      DROP COLUMN IF EXISTS final_decision
    `)
  }
}

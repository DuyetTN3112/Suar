import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  override async up() {
    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS task_review_workflows
      ADD COLUMN IF NOT EXISTS final_decision varchar(40),
      ADD COLUMN IF NOT EXISTS final_rationale text,
      ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
      ADD COLUMN IF NOT EXISTS resolved_by uuid
    `)
  }

  override async down() {
    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS task_review_workflows
      DROP COLUMN IF EXISTS resolved_by,
      DROP COLUMN IF EXISTS resolved_at,
      DROP COLUMN IF EXISTS final_rationale,
      DROP COLUMN IF EXISTS final_decision
    `)
  }
}

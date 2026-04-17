import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  override async up() {
    await this.db.rawQuery(`
      UPDATE task_review_workflows
      SET status = 'in_review',
          updated_at = now()
      WHERE status = 'reviewed'
    `)
  }

  override async down() {
    await this.db.rawQuery(`
      UPDATE task_review_workflows
      SET status = 'reviewed',
          updated_at = now()
      WHERE status = 'in_review'
        AND completed_review_count < required_review_count
    `)
  }
}

import { BaseSchema } from '@adonisjs/lucid/schema'

/** Moves the canonical Docs lane to the Docs role after the enum value is committed. */
export default class extends BaseSchema {
  override async up(): Promise<void> {
    await this.db.rawQuery(`
      UPDATE task_statuses
      SET category = 'docs', updated_at = NOW()
      WHERE slug = 'docs'
        AND category = 'todo'
        AND deleted_at IS NULL
    `)
  }

  override async down(): Promise<void> {
    await this.db.rawQuery(`
      UPDATE task_statuses
      SET category = 'todo', updated_at = NOW()
      WHERE slug = 'docs'
        AND category = 'docs'
        AND deleted_at IS NULL
    `)
  }
}

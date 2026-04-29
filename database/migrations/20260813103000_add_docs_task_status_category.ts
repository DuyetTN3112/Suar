import { BaseSchema } from '@adonisjs/lucid/schema'

/** Adds the non-work Docs role without changing any existing row yet. */
export default class extends BaseSchema {
  override async up(): Promise<void> {
    await this.db.rawQuery(
      "ALTER TYPE task_status_category ADD VALUE IF NOT EXISTS 'docs' AFTER 'todo'"
    )
  }

  override async down(): Promise<void> {
    // PostgreSQL does not safely support removing an enum value in place.
  }
}

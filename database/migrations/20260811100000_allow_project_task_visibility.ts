import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  override async up(): Promise<void> {
    await this.db.rawQuery(`SET LOCAL lock_timeout = '5s'`)
    await this.db.rawQuery(`
      ALTER TABLE tasks
        DROP CONSTRAINT IF EXISTS tasks_task_visibility_check;

      ALTER TABLE tasks
        ADD CONSTRAINT tasks_task_visibility_check
        CHECK (task_visibility IN ('project', 'internal', 'external', 'all'));
    `)
  }

  override async down(): Promise<void> {
    await this.db.rawQuery(`SET LOCAL lock_timeout = '5s'`)
    await this.db.rawQuery(`
      UPDATE tasks
      SET task_visibility = 'internal'
      WHERE task_visibility = 'project';

      ALTER TABLE tasks
        DROP CONSTRAINT IF EXISTS tasks_task_visibility_check;

      ALTER TABLE tasks
        ADD CONSTRAINT tasks_task_visibility_check
        CHECK (task_visibility IN ('internal', 'external', 'all'));
    `)
  }
}

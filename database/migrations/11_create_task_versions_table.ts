import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'task_versions'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table
        .integer('task_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('tasks')
        .onDelete('CASCADE')
      table.string('title', 255).notNullable()
      table.text('description').nullable()
      table.integer('status_id').unsigned().notNullable().references('id').inTable('task_status')
      table.integer('label_id').unsigned().notNullable().references('id').inTable('task_labels')
      table
        .integer('priority_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('task_priorities')
      table
        .integer('assigned_to')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table
        .integer('changed_by')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
    })
    // Trigger đã được tạo trong file 10_create_tasks_table.ts
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}

import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'deleted_messages'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('message_id').notNullable().unsigned()
      table.integer('user_id').notNullable().unsigned()
      table.timestamp('deleted_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.unique(['user_id', 'message_id'])
      // Foreign keys
      table.foreign('message_id').references('id').inTable('messages').onDelete('CASCADE')
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

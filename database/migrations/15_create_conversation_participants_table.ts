import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'conversation_participants'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table
        .integer('conversation_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('conversations')
        .onDelete('CASCADE')
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())

      // Prevent duplicate participants
      table.unique(['conversation_id', 'user_id'])
    })

    // Create index
    this.db.rawQuery(
      'CREATE INDEX idx_conversation_participants_user ON conversation_participants(user_id)'
    )
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}

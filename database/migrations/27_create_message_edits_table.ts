import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'message_edits'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').primary()
      table
        .integer('message_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('messages')
        .onDelete('CASCADE')
      table.text('old_content').notNullable()
      table
        .integer('edited_by')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.timestamp('edited_at', { useTz: true }).notNullable().defaultTo(this.now())
    })

    // Create indexes
    this.db.rawQuery('CREATE INDEX idx_message_edits_message_id ON message_edits(message_id)')
    this.db.rawQuery('CREATE INDEX idx_message_edits_edited_by ON message_edits(edited_by)')
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}

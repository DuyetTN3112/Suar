import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'messages'

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
        .integer('sender_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.text('message').notNullable()
      table.timestamp('read_at', { useTz: true }).nullable()
      table.timestamp('timestamp', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
    })

    // Create view that returns latest message for each conversation
    this.db.rawQuery(`
      CREATE VIEW latest_messages AS
      SELECT m1.*
      FROM messages m1
      INNER JOIN (
        SELECT conversation_id, MAX(timestamp) as latest_timestamp
        FROM messages
        GROUP BY conversation_id
      ) m2 ON m1.conversation_id = m2.conversation_id AND m1.timestamp = m2.latest_timestamp
    `)

    // Create trigger to set timestamp to current_timestamp
    this.db.rawQuery(`
      CREATE TRIGGER set_message_timestamp
      BEFORE INSERT ON messages
      FOR EACH ROW
      BEGIN
        SET NEW.timestamp = CURRENT_TIMESTAMP;
      END
    `)

    // Create index
    this.db.rawQuery('CREATE INDEX idx_messages_conversation ON messages(conversation_id)')
    this.db.rawQuery('CREATE INDEX idx_messages_sender ON messages(sender_id)')
    this.db.rawQuery('CREATE INDEX idx_messages_timestamp ON messages(timestamp)')
  }

  public async down() {
    this.db.rawQuery('DROP VIEW IF EXISTS latest_messages')
    this.schema.dropTable(this.tableName)
  }
}

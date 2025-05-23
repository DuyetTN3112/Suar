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

    // Thêm partitioning cho bảng messages theo thời gian
    this.db.rawQuery(`
      ALTER TABLE messages
      PARTITION BY RANGE (unix_timestamp(timestamp)) (
        PARTITION p202401 VALUES LESS THAN (1706720400),
        PARTITION p202402 VALUES LESS THAN (1709226000),
        PARTITION p202403 VALUES LESS THAN (1711904400),
        PARTITION p202404 VALUES LESS THAN (1714496400),
        PARTITION p202405 VALUES LESS THAN (1717174800),
        PARTITION p202406 VALUES LESS THAN (1719766800),
        PARTITION p202407 VALUES LESS THAN (1722445200),
        PARTITION p202408 VALUES LESS THAN (1725123600),
        PARTITION p202409 VALUES LESS THAN (1727715600),
        PARTITION p202410 VALUES LESS THAN (1730394000),
        PARTITION p202411 VALUES LESS THAN (1732986000),
        PARTITION p202412 VALUES LESS THAN (1735664400),
        PARTITION p202501 VALUES LESS THAN (1738315200),
        PARTITION p202502 VALUES LESS THAN (1740993600),
        PARTITION p202503 VALUES LESS THAN (1743585600),
        PARTITION p202504 VALUES LESS THAN (1746177600),
        PARTITION p202505 VALUES LESS THAN (1748856000),
        PARTITION p202506 VALUES LESS THAN (1751448000),
        PARTITION p202507 VALUES LESS THAN (1754126400),
        PARTITION p202508 VALUES LESS THAN (1756804800),
        PARTITION p202509 VALUES LESS THAN (1759396800),
        PARTITION p202510 VALUES LESS THAN (1762075200),
        PARTITION p202511 VALUES LESS THAN (1764667200),
        PARTITION p202512 VALUES LESS THAN (1767345600),
        PARTITION p202601 VALUES LESS THAN (1770024000),
        PARTITION p202602 VALUES LESS THAN (1772616000),
        PARTITION p202603 VALUES LESS THAN (1775208000),
        PARTITION p202604 VALUES LESS THAN (1777800000),
        PARTITION p202605 VALUES LESS THAN (1780392000),
        PARTITION p202606 VALUES LESS THAN (1782984000),
        PARTITION p202607 VALUES LESS THAN (1785576000),
        PARTITION p202608 VALUES LESS THAN (1788168000),
        PARTITION p202609 VALUES LESS THAN (1790760000),
        PARTITION p202610 VALUES LESS THAN (1793352000),
        PARTITION p202611 VALUES LESS THAN (1795944000),
        PARTITION p202612 VALUES LESS THAN (1798536000),
        PARTITION future VALUES LESS THAN MAXVALUE
      )
    `)

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

    // Create indexes
    this.db.rawQuery('CREATE INDEX idx_messages_timestamp ON messages(timestamp)')
    this.db.rawQuery('CREATE INDEX idx_messages_read_at ON messages(read_at)')
    this.db.rawQuery(
      'CREATE INDEX idx_messages_conversation_timestamp ON messages(conversation_id, timestamp)'
    )
  }

  public async down() {
    this.db.rawQuery('DROP VIEW IF EXISTS latest_messages')
    // Không thể trực tiếp xóa partition khi xóa bảng
    this.schema.dropTable(this.tableName)
  }
}

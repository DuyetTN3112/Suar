import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'messages'

  public async up() {
    // Kiểm tra xem bảng đã tồn tại chưa
    const tableExists = await this.db
      .query()
      .from('information_schema.tables')
      .where('table_name', this.tableName)
      .first()
    if (!tableExists) {
      // Tạo bảng nếu chưa tồn tại
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
        table.enum('send_status', ['sending', 'sent', 'failed']).notNullable().defaultTo('sent')
        table.boolean('is_recalled').notNullable().defaultTo(false)
        table.timestamp('recalled_at', { useTz: true }).nullable()
        table.enum('recall_scope', ['self', 'all']).nullable()
        table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
        table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
        table.timestamp('read_at', { useTz: true }).nullable()
      })

      // Create trigger to update updated_at
      this.db.rawQuery(`
        CREATE TRIGGER before_message_update
        BEFORE UPDATE ON messages
        FOR EACH ROW
        BEGIN
          SET NEW.updated_at = CURRENT_TIMESTAMP;
        END
      `)

      // Create indexes
      this.db.rawQuery('CREATE INDEX idx_messages_conversation_id ON messages(conversation_id)')
      this.db.rawQuery('CREATE INDEX idx_messages_sender_id ON messages(sender_id)')
      this.db.rawQuery('CREATE INDEX idx_read_at ON messages(read_at)')
    } else {
      // Kiểm tra xem cột read_at đã tồn tại chưa
      const hasReadAtColumn = await this.db
        .query()
        .from('information_schema.columns')
        .where('table_name', this.tableName)
        .where('column_name', 'read_at')
        .first()

      if (!hasReadAtColumn) {
        // Thêm cột read_at nếu chưa tồn tại
        this.schema.alterTable(this.tableName, (table) => {
          table.timestamp('read_at', { useTz: true }).nullable()
        })
        // Thêm index cho cột read_at
        this.db.rawQuery('CREATE INDEX idx_read_at ON messages(read_at)')
      }
    }
  }

  public async down() {
    // Kiểm tra xem bảng có tồn tại không
    const tableExists = await this.db
      .query()
      .from('information_schema.tables')
      .where('table_name', this.tableName)
      .first()
    if (tableExists) {
      // Kiểm tra xem cột read_at có tồn tại không
      const hasReadAtColumn = await this.db
        .query()
        .from('information_schema.columns')
        .where('table_name', this.tableName)
        .where('column_name', 'read_at')
        .first()

      if (hasReadAtColumn) {
        // Xóa index trước khi xóa cột
        try {
          this.db.rawQuery('DROP INDEX idx_read_at ON messages')
        } catch (error) {
          // Bỏ qua lỗi nếu index không tồn tại
        }
        // Xóa cột read_at
        this.schema.alterTable(this.tableName, (table) => {
          table.dropColumn('read_at')
        })
      }
      // Xóa toàn bộ bảng nếu tồn tại
      this.schema.dropTable(this.tableName)
    }
  }
}

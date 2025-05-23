import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'conversations'

  public async up() {
    // Kiểm tra nếu cột last_message_id chưa tồn tại thì mới thêm vào
    const hasColumn = await this.db
      .query()
      .from('information_schema.columns')
      .where('table_name', this.tableName)
      .where('column_name', 'last_message_id')
      .first()

    if (!hasColumn) {
      this.schema.alterTable(this.tableName, (table) => {
        table.bigInteger('last_message_id').nullable()
      })
    }
  }

  public async down() {
    // Kiểm tra nếu cột last_message_id tồn tại thì mới xóa
    const hasColumn = await this.db
      .query()
      .from('information_schema.columns')
      .where('table_name', this.tableName)
      .where('column_name', 'last_message_id')
      .first()

    if (hasColumn) {
      this.schema.alterTable(this.tableName, (table) => {
        table.dropColumn('last_message_id')
      })
    }
  }
}

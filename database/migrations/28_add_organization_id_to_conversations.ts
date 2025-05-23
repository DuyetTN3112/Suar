import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'conversations'

  public async up() {
    // Kiểm tra nếu cột organization_id chưa tồn tại thì mới thêm vào
    const hasColumn = await this.db
      .query()
      .from('information_schema.columns')
      .where('table_name', this.tableName)
      .where('column_name', 'organization_id')
      .first()

    if (!hasColumn) {
      this.schema.alterTable(this.tableName, (table) => {
        table
          .integer('organization_id')
          .unsigned()
          .nullable()
          .references('id')
          .inTable('organizations')
      })
    }
  }

  public async down() {
    // Kiểm tra nếu cột organization_id tồn tại thì mới xóa
    const hasColumn = await this.db
      .query()
      .from('information_schema.columns')
      .where('table_name', this.tableName)
      .where('column_name', 'organization_id')
      .first()

    if (hasColumn) {
      this.schema.alterTable(this.tableName, (table) => {
        table.dropColumn('organization_id')
      })
    }
  }
}

import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'project_status'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('name', 50).notNullable()
      table.string('description', 255).nullable()

      table.timestamp('created_at').notNullable().defaultTo(this.now())
      table.timestamp('updated_at').notNullable().defaultTo(this.now())
    })

    // Thêm dữ liệu mặc định
    await this.db.table(this.tableName).multiInsert([
      { name: 'pending', description: 'Dự án đang chờ phê duyệt' },
      { name: 'in_progress', description: 'Dự án đang được thực hiện' },
      { name: 'completed', description: 'Dự án đã hoàn thành' },
      { name: 'cancelled', description: 'Dự án đã bị hủy' },
    ])
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

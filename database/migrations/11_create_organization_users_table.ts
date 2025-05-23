import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'organization_users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .integer('organization_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('organizations')
        .onDelete('CASCADE')
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.integer('role_id').unsigned().notNullable().defaultTo(3)
      table.enum('status', ['pending', 'approved', 'rejected']).defaultTo('approved')
      table
        .integer('invited_by')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')

      table.timestamp('created_at').notNullable().defaultTo(this.now())
      table.timestamp('updated_at').notNullable().defaultTo(this.now())

      // Primary key
      table.primary(['organization_id', 'user_id'])
    })

    // Tạo chỉ mục cho trường user_id
    this.db.rawQuery('CREATE INDEX idx_organization_users_user ON organization_users(user_id)')
    // Thêm foreign key cho role_id
    this.db.rawQuery(`
      ALTER TABLE organization_users
      ADD CONSTRAINT fk_organization_users_role 
      FOREIGN KEY (role_id) REFERENCES user_roles(id)
    `)
    // Thêm foreign key cho invited_by
    this.db.rawQuery(`
      ALTER TABLE organization_users
      ADD CONSTRAINT fk_invited_by 
      FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL
    `)
  }

  async down() {
    // Xóa foreign key constraint trước
    this.db.rawQuery('ALTER TABLE organization_users DROP FOREIGN KEY fk_organization_users_role')
    this.db.rawQuery('ALTER TABLE organization_users DROP FOREIGN KEY fk_invited_by')
    this.schema.dropTable(this.tableName)
  }
}

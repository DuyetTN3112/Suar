import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'user_details'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .integer('user_id')
        .unsigned()
        .primary()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')
      table.string('phone_number', 50).nullable()
      table.text('bio').nullable()
      table.string('avatar_url', 255).nullable()

      table.timestamp('created_at').defaultTo(this.now())
      table.timestamp('updated_at').defaultTo(this.now())
    })
    // Add phone number validation constraint (MySQL)
    this.db.rawQuery(`
      ALTER TABLE user_details
      ADD CONSTRAINT chk_phone CHECK (phone_number REGEXP '^\\+?[0-9]{10,15}$')
    `)
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}

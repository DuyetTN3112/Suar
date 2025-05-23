import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'user_apps'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')
      table
        .integer('app_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('apps')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')
      table.boolean('is_connected').defaultTo(false)
      table.timestamp('connected_at', { useTz: true }).nullable()
      table.string('access_token', 255).nullable()
      table.string('refresh_token', 255).nullable()
      table.timestamp('expires_at', { useTz: true }).nullable()
      table.timestamp('created_at').defaultTo(this.now())
      table.timestamp('updated_at').defaultTo(this.now())
    })

    // Add unique constraint and indexes
    this.db.rawQuery(
      'ALTER TABLE user_apps ADD CONSTRAINT unique_user_app UNIQUE (user_id, app_id)'
    )
    this.db.rawQuery('CREATE INDEX idx_user_apps_user ON user_apps(user_id)')
    this.db.rawQuery('CREATE INDEX idx_user_apps_app ON user_apps(app_id)')
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}

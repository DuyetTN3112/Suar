import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  override async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.jsonb('user_setting').nullable()
    })
  }

  override async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('user_setting')
    })
  }
}

import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'skill_reviews'

  override async up(): Promise<void> {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('is_fraud').notNullable().defaultTo(false)
    })
  }

  override async down(): Promise<void> {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('is_fraud')
    })
  }
}

import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'app_categories'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('name', 100).notNullable().unique()
      table.string('description', 255).nullable()

      table.timestamp('created_at').defaultTo(this.now())
      table.timestamp('updated_at').defaultTo(this.now())
    })

    // Add slug as a generated column (MySQL specific)
    this.db.rawQuery(`
      ALTER TABLE app_categories
      ADD COLUMN slug VARCHAR(100) 
      GENERATED ALWAYS AS (LOWER(REPLACE(name, ' ', '-'))) STORED
    `)

    // Add unique index for slug
    this.db.rawQuery('CREATE UNIQUE INDEX idx_app_categories_slug ON app_categories(slug)')
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}

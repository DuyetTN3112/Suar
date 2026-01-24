import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'subscription_packages'

  override async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.string('name', 100).notNullable()
      table.string('short_name', 20).notNullable()
      table.string('storage_plan', 50).notNullable()
      table.integer('price').notNullable()
      table.string('price_label', 100).notNullable()
      table.string('payment_content_prefix', 50).notNullable()
      table.jsonb('features').notNullable().defaultTo('[]')
      table.boolean('is_active').notNullable().defaultTo(true)
      table.integer('sort_order').notNullable().defaultTo(0)
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    })

    this.defer(async (db) => {
      const now = new Date()
      await db
        .insertQuery()
        .table('subscription_packages')
        .multiInsert([
          {
            id: 'c8088924-f72c-4977-bc6d-c529d48b1110',
            name: 'Pro',
            short_name: 'PRO',
            storage_plan: 'pro',
            price: 399000,
            price_label: '399.000đ / tháng',
            payment_content_prefix: 'SUAR PRO',
            features: JSON.stringify(['Marketplace boost', 'Advanced profile proof', 'Priority support']),
            is_active: true,
            sort_order: 1,
            created_at: now,
            updated_at: now,
          },
          {
            id: 'c8088924-f72c-4977-bc6d-c529d48b1111',
            name: 'Pro Max',
            short_name: 'PROMAX',
            storage_plan: 'enterprise',
            price: 799000,
            price_label: '799.000đ / tháng',
            payment_content_prefix: 'SUAR PROMAX',
            features: JSON.stringify([
              'Everything in Pro',
              'Premium ranking priority',
              'Extended analytics',
              'Dedicated moderation queue',
            ]),
            is_active: true,
            sort_order: 2,
            created_at: now,
            updated_at: now,
          },
        ])
    })
  }

  override async down() {
    this.schema.dropTable(this.tableName)
  }
}

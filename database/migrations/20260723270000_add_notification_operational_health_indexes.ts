import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  static override disableTransactions = true

  override async up() {
    await this.db.rawQuery(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS
        notification_outbox_operational_status_idx
      ON notification_outbox (status, sequence)
    `)
    await this.db.rawQuery(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS
        notification_outbox_operational_age_idx
      ON notification_outbox (created_at)
      WHERE status IN ('pending', 'leased')
    `)
    await this.db.rawQuery(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS
        notification_fanout_targets_operational_status_idx
      ON notification_fanout_targets (status, sequence)
    `)
    await this.db.rawQuery(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS
        notification_fanout_targets_operational_age_idx
      ON notification_fanout_targets (created_at)
      WHERE status IN ('pending', 'leased')
    `)
  }

  override async down() {
    await this.db.rawQuery(`
      DROP INDEX CONCURRENTLY IF EXISTS
        notification_fanout_targets_operational_age_idx
    `)
    await this.db.rawQuery(`
      DROP INDEX CONCURRENTLY IF EXISTS
        notification_fanout_targets_operational_status_idx
    `)
    await this.db.rawQuery(`
      DROP INDEX CONCURRENTLY IF EXISTS
        notification_outbox_operational_age_idx
    `)
    await this.db.rawQuery(`
      DROP INDEX CONCURRENTLY IF EXISTS
        notification_outbox_operational_status_idx
    `)
  }
}

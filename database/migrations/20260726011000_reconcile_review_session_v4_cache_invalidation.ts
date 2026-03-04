import { BaseSchema } from '@adonisjs/lucid/schema'

import { CACHE_INVALIDATION_OUTBOX_UP_SQL } from '#database/cache_invalidation_outbox_schema'

/**
 * Forward-only reconciliation for databases whose outbox trigger still emits
 * the pre-v4 review-session cache key.
 */
export default class extends BaseSchema {
  override async up() {
    for (const statement of CACHE_INVALIDATION_OUTBOX_UP_SQL) {
      await this.db.rawQuery(statement)
    }
  }

  override async down() {
    // Do not restore an invalidation trigger that misses the active v4 key.
  }
}

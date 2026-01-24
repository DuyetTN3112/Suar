import { BaseSchema } from '@adonisjs/lucid/schema'

import { CACHE_INVALIDATION_OUTBOX_UP_SQL } from '#database/cache_invalidation_outbox_schema'

/**
 * Forward-only reconciliation for databases that already installed the
 * invalidation trigger before organization membership changes became a
 * dependency of task-form metadata.
 */
export default class extends BaseSchema {
  override async up() {
    for (const statement of CACHE_INVALIDATION_OUTBOX_UP_SQL) {
      await this.db.rawQuery(statement)
    }
  }

  override async down() {
    // Do not restore a trigger that can serve stale organization-member metadata.
  }
}

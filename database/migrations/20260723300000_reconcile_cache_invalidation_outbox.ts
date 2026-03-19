import { BaseSchema } from '@adonisjs/lucid/schema'

import { CACHE_INVALIDATION_OUTBOX_UP_SQL } from '#database/cache_invalidation_outbox_schema'

/**
 * Forward-only reconciliation for databases that already applied the original
 * outbox migration. Re-running the idempotent schema replaces the trigger
 * function with the current bounded patterns and removes the obsolete snapshot
 * trigger now that profile snapshot reads deliberately bypass Redis.
 */
export default class extends BaseSchema {
  override async up() {
    for (const statement of CACHE_INVALIDATION_OUTBOX_UP_SQL) {
      await this.db.rawQuery(statement)
    }
  }

  override async down() {
    // Do not restore the obsolete trigger or dead profile-cache patterns.
  }
}

import { BaseSchema } from '@adonisjs/lucid/schema'

import {
  CACHE_INVALIDATION_OUTBOX_DOWN_SQL,
  CACHE_INVALIDATION_OUTBOX_UP_SQL,
} from '#database/cache_invalidation_outbox_schema'

export default class extends BaseSchema {
  override async up() {
    for (const statement of CACHE_INVALIDATION_OUTBOX_UP_SQL) {
      await this.db.rawQuery(statement)
    }
  }

  override async down() {
    for (const statement of CACHE_INVALIDATION_OUTBOX_DOWN_SQL) {
      await this.db.rawQuery(statement)
    }
  }
}

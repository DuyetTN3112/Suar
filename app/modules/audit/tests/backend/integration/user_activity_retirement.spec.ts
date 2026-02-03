import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { assertSafeTestDatastores } from '#tests/helpers/test_datastore_guard'

test.group('Integration | Retired user activity archive', (group) => {
  group.setup(() => assertSafeTestDatastores())

  test('keeps Audit canonical and rejects archive mutations', async ({ assert }) => {
    const unsafeRelationState: unknown = await db.rawQuery(`
          SELECT
            to_regclass('public.user_activity_events') AS live_relation,
            to_regclass('public.retired_user_activity_events') AS retired_relation,
            col_description(
              'public.audit_events'::regclass,
              (
                SELECT attnum
                FROM pg_attribute
                WHERE attrelid = 'public.audit_events'::regclass
                  AND attname = 'source_occurred_at'
                  AND NOT attisdropped
              )
            ) AS source_timestamp_comment,
            obj_description(
              'public.retired_user_activity_events'::regclass,
              'pg_class'
            ) AS archive_comment
        `)
    const relationState = (
      unsafeRelationState as {
        rows: [
          {
            live_relation: string | null
            retired_relation: string | null
            source_timestamp_comment: string | null
            archive_comment: string | null
          },
        ]
      }
    ).rows[0]

    assert.isNull(relationState.live_relation)
    assert.equal(relationState.retired_relation, 'retired_user_activity_events')
    assert.include(relationState.source_timestamp_comment ?? '', 'Producer-observed event time')
    assert.include(relationState.archive_comment ?? '', 'retired:user_activity')

    await assert.rejects(
      () =>
        db.table('retired_user_activity_events').insert({
          id: randomUUID(),
          user_id: randomUUID(),
          action_type: 'forbidden_runtime_write',
        }),
      /read-only archive/
    )
  })
})

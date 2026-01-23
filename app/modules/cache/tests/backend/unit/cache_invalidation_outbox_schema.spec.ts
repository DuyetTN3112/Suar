import { test } from '@japa/runner'

import { CACHE_INVALIDATION_OUTBOX_UP_SQL } from '#database/cache_invalidation_outbox_schema'

test.group('Cache invalidation outbox schema', () => {
  test('reconciliation removes triggers and patterns for deliberately uncached raw records', ({
    assert,
  }) => {
    const schemaSql = CACHE_INVALIDATION_OUTBOX_UP_SQL.join('\n')

    assert.include(
      schemaSql,
      'DROP TRIGGER IF EXISTS cache_invalidation_outbox_after_change\n          ON public.user_profile_snapshots'
    )
    assert.notInclude(schemaSql, "WHEN 'user_profile_snapshots'")
    assert.notInclude(schemaSql, 'profile:snapshot')
    assert.notInclude(schemaSql, 'users:profile')
    assert.notInclude(schemaSql, 'users:detail')
    assert.notInclude(schemaSql, 'users:skills')
    assert.notInclude(schemaSql, 'users:list')
    assert.notInclude(schemaSql, 'projects:list')
    assert.notInclude(schemaSql, 'projects:detail')
    assert.notInclude(schemaSql, 'projects:members')
    assert.notInclude(schemaSql, 'task:detail')
    assert.notInclude(schemaSql, 'perm:')
    assert.include(schemaSql, 'users:featured_reviews:v2:')
  })
})

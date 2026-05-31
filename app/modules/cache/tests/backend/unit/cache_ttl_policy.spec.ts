import { test } from '@japa/runner'

import {
  CACHE_TTL_JITTER_FRACTION,
  cacheTtlWithDeterministicJitter,
} from '#modules/cache/domain/cache-runtime/cache_ttl_policy'

test.group('Cache TTL policy', () => {
  test('is deterministic and never extends the requested staleness bound', ({ assert }) => {
    const key = 'cache-ttl-policy:organization:actor:list'
    const requestedTtl = 300
    const first = cacheTtlWithDeterministicJitter(key, requestedTtl)

    assert.equal(cacheTtlWithDeterministicJitter(key, requestedTtl), first)
    assert.isAtLeast(first, requestedTtl * (1 - CACHE_TTL_JITTER_FRACTION))
    assert.isAtMost(first, requestedTtl)
    assert.equal(cacheTtlWithDeterministicJitter(key, 1), 1)
  })

  test('distributes different keys across the bounded expiry window', ({ assert }) => {
    const requestedTtl = 300
    const effectiveTtls = Array.from({ length: 512 }, (_, index) =>
      cacheTtlWithDeterministicJitter(`cache-ttl-policy:key:${index}`, requestedTtl)
    )

    for (const ttl of effectiveTtls) {
      assert.isAtLeast(ttl, 270)
      assert.isAtMost(ttl, requestedTtl)
    }
    assert.isAbove(new Set(effectiveTtls).size, 20)
  })
})

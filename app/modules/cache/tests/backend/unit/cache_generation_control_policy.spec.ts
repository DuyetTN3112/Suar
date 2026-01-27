import { test } from '@japa/runner'

import {
  CACHE_GENERATION_CONTROL_DEFAULT_TTL_SECONDS,
  CACHE_GENERATION_CONTROL_MAX_TTL_SECONDS,
  CACHE_GENERATION_CONTROL_MIN_TTL_SECONDS,
  resolveCacheGenerationControlTtlSeconds,
} from '#modules/cache/domain/cache_generation_control_policy'

test.group('Cache generation control policy', () => {
  test('defaults to a bounded seven-day lifecycle', ({ assert }) => {
    assert.equal(
      resolveCacheGenerationControlTtlSeconds(undefined),
      CACHE_GENERATION_CONTROL_DEFAULT_TTL_SECONDS
    )
  })

  test('accepts the inclusive lifecycle boundaries', ({ assert }) => {
    assert.equal(
      resolveCacheGenerationControlTtlSeconds(CACHE_GENERATION_CONTROL_MIN_TTL_SECONDS),
      CACHE_GENERATION_CONTROL_MIN_TTL_SECONDS
    )
    assert.equal(
      resolveCacheGenerationControlTtlSeconds(String(CACHE_GENERATION_CONTROL_MAX_TTL_SECONDS)),
      CACHE_GENERATION_CONTROL_MAX_TTL_SECONDS
    )
  })

  test('rejects malformed, shorter-than-payload, and unbounded lifecycles', ({ assert }) => {
    for (const configuredValue of [
      '',
      'not-a-number',
      CACHE_GENERATION_CONTROL_MIN_TTL_SECONDS - 1,
      CACHE_GENERATION_CONTROL_MAX_TTL_SECONDS + 1,
      86_400.5,
    ]) {
      assert.throws(
        () => resolveCacheGenerationControlTtlSeconds(configuredValue),
        /integer between 86401 and 7776000 seconds/
      )
    }
  })
})

import { test } from '@japa/runner'
import { PAGINATION, CACHE_TTL } from '#constants/common_constants'

// ============================================================================
// PAGINATION
// ============================================================================
test.group('PAGINATION', () => {
  test('has correct default page', ({ assert }) => {
    assert.equal(PAGINATION.DEFAULT_PAGE, 1)
  })

  test('has correct default per page', ({ assert }) => {
    assert.equal(PAGINATION.DEFAULT_PER_PAGE, 20)
  })

  test('has correct max per page', ({ assert }) => {
    assert.equal(PAGINATION.MAX_PER_PAGE, 100)
  })

  test('max per page is greater than default', ({ assert }) => {
    assert.isTrue(PAGINATION.MAX_PER_PAGE > PAGINATION.DEFAULT_PER_PAGE)
  })
})

// ============================================================================
// CACHE_TTL
// ============================================================================
test.group('CACHE_TTL', () => {
  test('SHORT is 60 seconds (1 minute)', ({ assert }) => {
    assert.equal(CACHE_TTL.SHORT, 60)
  })

  test('MEDIUM is 300 seconds (5 minutes)', ({ assert }) => {
    assert.equal(CACHE_TTL.MEDIUM, 300)
  })

  test('LONG is 3600 seconds (1 hour)', ({ assert }) => {
    assert.equal(CACHE_TTL.LONG, 3600)
  })

  test('DAY is 86400 seconds (24 hours)', ({ assert }) => {
    assert.equal(CACHE_TTL.DAY, 86400)
  })

  test('TTLs are in ascending order', ({ assert }) => {
    assert.isTrue(CACHE_TTL.SHORT < CACHE_TTL.MEDIUM)
    assert.isTrue(CACHE_TTL.MEDIUM < CACHE_TTL.LONG)
    assert.isTrue(CACHE_TTL.LONG < CACHE_TTL.DAY)
  })
})

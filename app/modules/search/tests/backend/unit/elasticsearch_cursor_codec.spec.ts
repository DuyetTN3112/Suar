import { test } from '@japa/runner'

import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'
import { ElasticsearchCursorCodec } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_cursor_codec'

test.group('Elasticsearch signed cursor codec', () => {
  test('round-trips sort/tie-break/schema/ranking/generation/PIT without plaintext disclosure', ({
    assert,
  }) => {
    const codec = new ElasticsearchCursorCodec({
      secret: 'wp13-test-cursor-secret-that-is-long-enough',
      ttlMs: 60_000,
      clock: () => new Date('2026-08-01T00:00:00.000Z'),
    })
    const cursor = codec.encode({
      context: 'filter.reference.conformance',
      schemaVersion: 3,
      criteriaHash: 'criteria-hash-v3',
      authorizationHash: 'authorization-hash-v9',
      sort: [{ field: 'score', direction: 'desc' }],
      searchAfter: [42, 'record-secret-id'],
      tieBreakId: 'record-secret-id',
      rankingVersion: 'ranking-v4',
      indexGeneration: 'tasks-v8-generation-blue',
      pitId: 'pit-secret-token',
    })
    const decoded = codec.decode(cursor, {
      context: 'filter.reference.conformance',
      schemaVersion: 3,
      criteriaHash: 'criteria-hash-v3',
      authorizationHash: 'authorization-hash-v9',
      sort: [{ field: 'score', direction: 'desc' }],
      rankingVersion: 'ranking-v4',
      indexGeneration: 'tasks-v8-generation-blue',
    })

    assert.deepEqual(decoded.searchAfter, [42, 'record-secret-id'])
    assert.equal(decoded.tieBreakId, 'record-secret-id')
    assert.equal(decoded.pitId, 'pit-secret-token')
    assert.notInclude(cursor, 'record-secret-id')
    assert.notInclude(cursor, 'pit-secret-token')
    assert.notInclude(cursor, 'tasks-v8-generation-blue')
  })

  test('distinguishes invalid, expired, and stale cursors without exposing identity state', ({
    assert,
  }) => {
    let now = new Date('2026-08-01T00:00:00.000Z')
    const codec = new ElasticsearchCursorCodec({
      secret: 'wp13-test-cursor-secret-that-is-long-enough',
      ttlMs: 10,
      clock: () => new Date(now),
    })
    const expected = {
      context: 'ctx',
      schemaVersion: 1,
      criteriaHash: 'criteria-v1',
      authorizationHash: 'auth-v1',
      sort: [{ field: 'createdAt', direction: 'desc' as const }],
      rankingVersion: 'rank-v1',
      indexGeneration: 'generation-v1',
    }
    const cursor = codec.encode({
      ...expected,
      searchAfter: ['2026-08-01T00:00:00.000Z', 'id-1'],
      tieBreakId: 'id-1',
    })
    const tampered = `${cursor.slice(0, -1)}${cursor.endsWith('x') ? 'y' : 'x'}`
    const mismatches = [
      [tampered, expected, 'FILTER_CURSOR_INVALID'],
      [cursor, { ...expected, authorizationHash: 'auth-v2' }, 'FILTER_CURSOR_INVALID'],
      [cursor, { ...expected, rankingVersion: 'rank-v2' }, 'FILTER_CURSOR_STALE'],
      [cursor, { ...expected, indexGeneration: 'generation-v2' }, 'FILTER_CURSOR_STALE'],
      [
        cursor,
        { ...expected, sort: [{ field: 'createdAt', direction: 'asc' as const }] },
        'FILTER_CURSOR_INVALID',
      ],
    ] as const

    for (const [candidate, expectation, expectedCode] of mismatches) {
      const error = (() => {
        try {
          codec.decode(candidate, expectation)
        } catch (caught) {
          return caught
        }
        return undefined
      })()
      assert.instanceOf(error, FilterExecutionError)
      assert.equal((error as FilterExecutionError).code, expectedCode)
    }

    now = new Date(now.getTime() + 11)
    const expired = (() => {
      try {
        codec.decode(cursor, expected)
      } catch (error) {
        return error
      }
      return undefined
    })()
    assert.instanceOf(expired, FilterExecutionError)
    assert.equal((expired as FilterExecutionError).code, 'FILTER_CURSOR_EXPIRED')
  })
})

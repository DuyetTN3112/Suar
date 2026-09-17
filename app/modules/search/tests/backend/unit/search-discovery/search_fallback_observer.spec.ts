import { test } from '@japa/runner'

import type { PlatformEvent } from '#modules/observability/public_contracts/platform_event'
import { SearchFallbackObserver } from '#modules/search/public_contracts/search_fallback_observer'

test.group('Search fallback observer', () => {
  test('records a bounded degradation event without query text or secrets', ({ assert }) => {
    const records: Array<{ level: string; event: PlatformEvent }> = []
    const observer = new SearchFallbackObserver({
      log(level, event) {
        records.push({ level, event })
      },
    })

    observer.record({
      surface: 'tasks.public.list',
      error: new Error(
        'Authorization: Bearer secret-access-token\r\nquery=private customer search'
      ),
    })

    assert.lengthOf(records, 1)
    const record = records[0]
    assert.exists(record)
    if (!record) {
      throw new Error('Expected one fallback observation')
    }
    const serialized = JSON.stringify(record.event)

    assert.equal(record.level, 'warn')
    assert.equal(record.event.event_name, 'search.candidate_lookup.degraded')
    assert.equal(record.event.outcome, 'warning')
    assert.equal(record.event.target?.scope, 'tasks.public.list')
    assert.deepEqual(record.event.runtime, {
      primary_dependency: 'elasticsearch',
      fallback_dependency: 'postgresql',
      fallback_applied: true,
    })
    assert.notInclude(serialized, 'secret-access-token')
    assert.notInclude(serialized, 'private customer search')
    assert.notInclude(serialized, '\r')
    assert.notInclude(serialized, '\n')
  })

  test('does not let a logger sink failure break the business fallback', ({ assert }) => {
    const observer = new SearchFallbackObserver({
      log() {
        throw new Error('logger transport unavailable')
      },
    })

    assert.doesNotThrow(() => {
      observer.record({
        surface: 'organizations.members.list',
        error: new Error('search dependency unavailable'),
      })
    })
  })
})

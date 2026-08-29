import { test } from '@japa/runner'

import LegacyAccomplishmentReadComparisonObserverAdapter from '#composition/adapters/accomplishments/publication/legacy_accomplishment_read_comparison_observer'
import type { PlatformEvent } from '#modules/observability/public_contracts/platform_event'
import { platformOperationalLogger } from '#modules/observability/public_contracts/platform_operational_logger'

test.group('Unit | legacy accomplishment read comparison observer adapter', () => {
  test('emits count-only redacted operational evidence', ({ assert, cleanup }) => {
    const originalLog = platformOperationalLogger.log.bind(platformOperationalLogger)
    const events: Array<{ level: string; event: PlatformEvent }> = []
    platformOperationalLogger.log = (level, event) => {
      events.push({ level, event })
    }
    cleanup(() => {
      platformOperationalLogger.log = originalLog
    })

    new LegacyAccomplishmentReadComparisonObserverAdapter().observe({
      userId: 'user-sensitive-id',
      viewerScope: 'public',
      legacyCandidateCount: 3,
      verifiedCandidateCount: 2,
      overlapCount: 1,
      legacyOnlyCount: 2,
      verifiedOnlyCount: 1,
      mergedCount: 3,
    })

    assert.equal(events.length, 1)
    assert.equal(events[0]?.level, 'info')
    assert.equal(events[0]?.event.event_name, 'accomplishment.legacy_read.comparison')
    assert.deepEqual(events[0]?.event.change, {
      legacy_candidate_count: 3,
      verified_candidate_count: 2,
      overlap_count: 1,
      legacy_only_count: 2,
      verified_only_count: 1,
      merged_count: 3,
    })
    assert.equal(events[0]?.event.target?.id, null)
    assert.equal(events[0]?.event.compliance.redaction_applied, true)
    assert.equal(events[0]?.event.compliance.contains_sensitive_fields, false)
  })
})

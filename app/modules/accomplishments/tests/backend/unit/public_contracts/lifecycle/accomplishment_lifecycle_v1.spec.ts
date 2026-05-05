import { test } from '@japa/runner'

import { validAccomplishmentLifecycleRevisionV1 } from '../verified-work/accomplishment_contract_fixtures.js'

import {
  isAccomplishmentLifecycleRevisionV1,
  parseAccomplishmentLifecycleRevisionV1,
} from '#modules/accomplishments/public_contracts/lifecycle/accomplishment_lifecycle_v1'

test.group('Accomplishment public contract | lifecycle V1', () => {
  test('FR-TVA-026 represents append-only state changes with source fact provenance', ({
    assert,
  }) => {
    const input = validAccomplishmentLifecycleRevisionV1()
    const parsed = parseAccomplishmentLifecycleRevisionV1(input)

    assert.isTrue(isAccomplishmentLifecycleRevisionV1(input))
    assert.equal(parsed.previousState, 'under_review')
    assert.equal(parsed.nextState, 'verified')
    assert.equal(parsed.reasonCode, 'verification_completed')
    assert.equal(parsed.sourceFact.type, 'review_finalized')
  })

  test('keeps publication visibility separate from lifecycle state', ({ assert }) => {
    const input = validAccomplishmentLifecycleRevisionV1()

    assert.equal(
      parseAccomplishmentLifecycleRevisionV1({ ...input, visibility: 'public' }).visibility,
      'public'
    )
    assert.throws(() => parseAccomplishmentLifecycleRevisionV1({ ...input, nextState: 'public' }))
  })

  test('rejects malformed revision identity, unknown reasons and unbounded actor payloads', ({
    assert,
  }) => {
    const input = validAccomplishmentLifecycleRevisionV1()

    assert.throws(() => parseAccomplishmentLifecycleRevisionV1({ ...input, sequence: 0 }))
    assert.throws(() =>
      parseAccomplishmentLifecycleRevisionV1({ ...input, reasonCode: 'silent_delete' })
    )
    assert.throws(() =>
      parseAccomplishmentLifecycleRevisionV1({
        ...input,
        actor: { ...input.actor, email: 'reviewer@example.com' },
      })
    )
  })
})

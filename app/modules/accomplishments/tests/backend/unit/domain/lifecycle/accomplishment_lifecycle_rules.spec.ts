import { test } from '@japa/runner'

import {
  ACCOMPLISHMENT_LIFECYCLE_CODES,
  validateAccomplishmentLifecycleTransition,
} from '#modules/accomplishments/domain/lifecycle/accomplishment_lifecycle_rules'

test.group('Unit | Accomplishment lifecycle rules', () => {
  test('allows the governed candidate, review, verification, publication and dispute paths', ({
    assert,
  }) => {
    const transitions = [
      validateAccomplishmentLifecycleTransition({
        previousState: null,
        nextState: 'candidate',
        previousVisibility: null,
        nextVisibility: 'private',
        reasonCode: 'candidate_created',
      }),
      validateAccomplishmentLifecycleTransition({
        previousState: 'candidate',
        nextState: 'under_review',
        previousVisibility: 'private',
        nextVisibility: 'private',
        reasonCode: 'review_started',
      }),
      validateAccomplishmentLifecycleTransition({
        previousState: 'under_review',
        nextState: 'verified',
        previousVisibility: 'private',
        nextVisibility: 'private',
        reasonCode: 'verification_completed',
      }),
      validateAccomplishmentLifecycleTransition({
        previousState: 'verified',
        nextState: 'verified',
        previousVisibility: 'private',
        nextVisibility: 'public',
        reasonCode: 'publication_changed',
      }),
      validateAccomplishmentLifecycleTransition({
        previousState: 'verified',
        nextState: 'frozen',
        previousVisibility: 'public',
        nextVisibility: 'private',
        reasonCode: 'dispute_opened',
      }),
      validateAccomplishmentLifecycleTransition({
        previousState: 'frozen',
        nextState: 'verified',
        previousVisibility: 'private',
        nextVisibility: 'private',
        reasonCode: 'dispute_resolved',
      }),
    ]

    assert.isTrue(transitions.every((transition) => transition.allowed))
  })

  test('allows partial verification and governed terminal correction outcomes', ({ assert }) => {
    const partial = validateAccomplishmentLifecycleTransition({
      previousState: 'under_review',
      nextState: 'partially_verified',
      previousVisibility: 'private',
      nextVisibility: 'private',
      reasonCode: 'partial_verification_completed',
    })
    const superseded = validateAccomplishmentLifecycleTransition({
      previousState: 'frozen',
      nextState: 'superseded',
      previousVisibility: 'private',
      nextVisibility: 'private',
      reasonCode: 'superseded',
    })
    const revoked = validateAccomplishmentLifecycleTransition({
      previousState: 'frozen',
      nextState: 'revoked',
      previousVisibility: 'private',
      nextVisibility: 'private',
      reasonCode: 'governance_revoked',
    })

    assert.isTrue(partial.allowed)
    assert.isTrue(superseded.allowed)
    assert.isTrue(revoked.allowed)
  })

  test('rejects reason mismatches, direct publication and revival of terminal facts', ({ assert }) => {
    const reasonMismatch = validateAccomplishmentLifecycleTransition({
      previousState: 'candidate',
      nextState: 'verified',
      previousVisibility: 'private',
      nextVisibility: 'private',
      reasonCode: 'candidate_created',
    })
    const directPublication = validateAccomplishmentLifecycleTransition({
      previousState: 'candidate',
      nextState: 'candidate',
      previousVisibility: 'private',
      nextVisibility: 'public',
      reasonCode: 'publication_changed',
    })
    const revive = validateAccomplishmentLifecycleTransition({
      previousState: 'revoked',
      nextState: 'verified',
      previousVisibility: 'private',
      nextVisibility: 'private',
      reasonCode: 'dispute_resolved',
    })

    assert.include(reasonMismatch.blockerCodes, ACCOMPLISHMENT_LIFECYCLE_CODES.invalidTransition)
    assert.include(reasonMismatch.blockerCodes, ACCOMPLISHMENT_LIFECYCLE_CODES.reasonMismatch)
    assert.include(
      directPublication.blockerCodes,
      ACCOMPLISHMENT_LIFECYCLE_CODES.publicationNotVerified
    )
    assert.include(revive.blockerCodes, ACCOMPLISHMENT_LIFECYCLE_CODES.terminalState)
  })

  test('requires a dispute resolution before a frozen accomplishment can be published', ({
    assert,
  }) => {
    const result = validateAccomplishmentLifecycleTransition({
      previousState: 'frozen',
      nextState: 'frozen',
      previousVisibility: 'private',
      nextVisibility: 'public',
      reasonCode: 'publication_changed',
    })

    assert.isFalse(result.allowed)
    assert.include(result.blockerCodes, ACCOMPLISHMENT_LIFECYCLE_CODES.publicationNotVerified)
  })
})

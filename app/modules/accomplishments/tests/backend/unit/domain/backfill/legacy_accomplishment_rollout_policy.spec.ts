import { test } from '@japa/runner'

import {
  evaluateLegacyAccomplishmentRollout,
  resolveLegacyAccomplishmentCutover,
} from '#modules/accomplishments/domain/backfill/legacy_accomplishment_rollout_policy'

test.group('Unit | legacy accomplishment rollout policy', () => {
  test('rejects impossible downstream flag activation', ({ assert }) => {
    const result = evaluateLegacyAccomplishmentRollout({
      authoring: false,
      assignment: true,
      completion: true,
      accomplishment: true,
      profile: true,
      search: true,
    })

    assert.isFalse(result.allowed)
    assert.deepEqual(result.blockers, [
      'assignment_requires_authoring',
      'completion_requires_assignment',
      'accomplishment_requires_completion',
      'search_requires_accomplishment',
    ])
  })

  test('permits an explicitly compatible staged rollout', ({ assert }) => {
    assert.deepEqual(
      evaluateLegacyAccomplishmentRollout({
        authoring: true,
        assignment: true,
        completion: true,
        accomplishment: true,
        profile: true,
        search: true,
      }),
      { allowed: true, blockers: [] }
    )
  })

  test('rollback keeps legacy reads and disables new reads/writes', ({ assert }) => {
    assert.deepEqual(resolveLegacyAccomplishmentCutover('rollback'), {
      allowLegacyRead: true,
      allowNewRead: false,
      allowNewWrite: false,
    })
    assert.deepEqual(resolveLegacyAccomplishmentCutover('dual_read'), {
      allowLegacyRead: true,
      allowNewRead: true,
      allowNewWrite: true,
    })
  })
})

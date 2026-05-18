import { test } from '@japa/runner'

import { readLegacyAccomplishmentCutoverDecision } from '#composition/accomplishments/backfill/legacy_accomplishment_backfill_composition'

test.group('Unit | legacy accomplishment backfill composition', () => {
  test('maps the operator rollback state to a safe application decision', ({ assert }) => {
    assert.deepEqual(
      readLegacyAccomplishmentCutoverDecision({ TVA_ACCOMPLISHMENT_CUTOVER: 'rollback' }),
      { allowLegacyRead: true, allowNewRead: false, allowNewWrite: false }
    )
  })

  test('defaults an unknown operator state to legacy-only behavior', ({ assert }) => {
    assert.deepEqual(
      readLegacyAccomplishmentCutoverDecision({ TVA_ACCOMPLISHMENT_CUTOVER: 'unexpected' }),
      { allowLegacyRead: true, allowNewRead: false, allowNewWrite: false }
    )
  })
})

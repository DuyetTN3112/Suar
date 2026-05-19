import { test } from '@japa/runner'

import {
  ACCOMPLISHMENT_TEST_IDS,
  validCapabilitySignalV1,
} from './accomplishment_contract_fixtures.js'

import {
  isAccomplishmentCapabilitySignalV1,
  parseAccomplishmentCapabilitySignalV1,
} from '#modules/accomplishments/public_contracts/verified-work/accomplishment_capability_signal_v1'

test.group('Accomplishment public contract | CapabilitySignalV1', () => {
  test('FR-TVA-019 retains observation, evidence, context, ceiling and confidence provenance', ({
    assert,
  }) => {
    const input = validCapabilitySignalV1()
    const parsed = parseAccomplishmentCapabilitySignalV1(input)

    assert.isTrue(isAccomplishmentCapabilitySignalV1(input))
    assert.equal(parsed.accomplishmentId, ACCOMPLISHMENT_TEST_IDS.accomplishment)
    assert.equal(parsed.observedLevelCode, 'l7')
    assert.equal(parsed.assessmentCeilingCode, 'l8')
    assert.equal(parsed.context.ownershipLevel, 'primary_owner')
    assert.deepEqual(parsed.reviewObservationIds, [ACCOMPLISHMENT_TEST_IDS.reviewObservation])
  })

  test('BR-TVA-008 RV-015 rejects requirement and target fields masquerading as observed proof', ({
    assert,
  }) => {
    const input = validCapabilitySignalV1()

    assert.throws(() =>
      parseAccomplishmentCapabilitySignalV1({
        ...input,
        targetLevelCode: 'l10',
      })
    )
    assert.throws(() =>
      parseAccomplishmentCapabilitySignalV1({
        ...input,
        requiredSkillId: input.capabilityId,
      })
    )
    assert.throws(() =>
      parseAccomplishmentCapabilitySignalV1({
        ...input,
        reviewObservationIds: [],
      })
    )
  })

  test('rejects duplicate provenance, invalid confidence and unknown signal states', ({
    assert,
  }) => {
    const input = validCapabilitySignalV1()

    assert.throws(() =>
      parseAccomplishmentCapabilitySignalV1({
        ...input,
        evidenceReferences: [input.evidenceReferences[0], input.evidenceReferences[0]],
      })
    )
    assert.throws(() => parseAccomplishmentCapabilitySignalV1({ ...input, confidenceScore: -0.01 }))
    assert.throws(() =>
      parseAccomplishmentCapabilitySignalV1({ ...input, signalState: 'published' })
    )
  })
})

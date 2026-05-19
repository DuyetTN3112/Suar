import { test } from '@japa/runner'

import {
  ACCOMPLISHMENT_TEST_HASHES,
  validVerifiedWorkAccomplishmentV1,
} from './accomplishment_contract_fixtures.js'

import {
  isVerifiedWorkAccomplishmentV1,
  parseVerifiedWorkAccomplishmentV1,
} from '#modules/accomplishments/public_contracts/verified-work/verified_work_accomplishment_v1'

test.group('Accomplishment public contract | VerifiedWorkAccomplishmentV1', () => {
  test('FR-TVA-021 FR-TVA-022 parses actual verified work with immutable provenance', ({
    assert,
  }) => {
    const input = validVerifiedWorkAccomplishmentV1()
    const parsed = parseVerifiedWorkAccomplishmentV1(input)

    assert.isTrue(isVerifiedWorkAccomplishmentV1(input))
    assert.equal(parsed.contractVersion, 1)
    assert.equal(parsed.action, 'design_and_implement')
    assert.equal(parsed.ownershipLevel, 'primary_owner')
    assert.equal(parsed.provenance.assignmentSnapshotId, input.provenance.assignmentSnapshotId)
    assert.equal(parsed.provenance.taskContractVersionId, input.provenance.taskContractVersionId)
    assert.equal(parsed.provenance.completionReportId, input.provenance.completionReportId)
    assert.deepEqual(parsed.provenance.reviewObservationIds, input.provenance.reviewObservationIds)
  })

  test('BR-TVA-007 RV-015 keeps task requirement and target level out of proof', ({ assert }) => {
    const input = validVerifiedWorkAccomplishmentV1()

    assert.throws(() =>
      parseVerifiedWorkAccomplishmentV1({
        ...input,
        requiredSkills: [{ skillId: 'api-design', targetLevel: 'l10' }],
      })
    )
    assert.throws(() =>
      parseVerifiedWorkAccomplishmentV1({
        ...input,
        targetLevel: 'l10',
      })
    )
    assert.isFalse(
      isVerifiedWorkAccomplishmentV1({
        ...input,
        expectedDeliverables: ['Everything requested by the task'],
      })
    )
  })

  test('NFR-TVA-001 rejects verified facts with missing or malformed source provenance', ({
    assert,
  }) => {
    const input = validVerifiedWorkAccomplishmentV1()

    assert.throws(() =>
      parseVerifiedWorkAccomplishmentV1({
        ...input,
        provenance: {
          ...input.provenance,
          assignmentSnapshotId: undefined,
        },
      })
    )
    assert.throws(() =>
      parseVerifiedWorkAccomplishmentV1({
        ...input,
        provenance: {
          ...input.provenance,
          reviewObservationIds: [],
        },
      })
    )
    assert.throws(() =>
      parseVerifiedWorkAccomplishmentV1({
        ...input,
        provenance: {
          ...input.provenance,
          sourceHashes: {
            ...input.provenance.sourceHashes,
            taskContract: 'not-a-content-hash',
          },
        },
      })
    )
  })

  test('OP-006 rejects unknown contract versions, future enums and non-canonical arrays', ({
    assert,
  }) => {
    const input = validVerifiedWorkAccomplishmentV1()

    assert.throws(() => parseVerifiedWorkAccomplishmentV1({ ...input, contractVersion: 2 }))
    assert.throws(() =>
      parseVerifiedWorkAccomplishmentV1({ ...input, lifecycleState: 'published' })
    )
    assert.throws(() =>
      parseVerifiedWorkAccomplishmentV1({
        ...input,
        evidenceReferences: [input.evidenceReferences[0], input.evidenceReferences[0]],
      })
    )
    assert.throws(() =>
      parseVerifiedWorkAccomplishmentV1({
        ...input,
        canonicalHash: ACCOMPLISHMENT_TEST_HASHES.canonical.toUpperCase(),
      })
    )
  })

  test('FR-TVA-028 distinguishes retrospective proof and rejects legacy-unverified inflation', ({
    assert,
  }) => {
    const input = validVerifiedWorkAccomplishmentV1()
    const reconstruction = {
      reconstructedAt: '2026-08-01T11:00:00.000Z',
      reconstructedByUserId: input.userId,
      limitations: ['The work contract was reconstructed after completion.'],
      firsthandReviewerConfirmed: true,
    }

    const retrospective = parseVerifiedWorkAccomplishmentV1({
      ...input,
      provenance: {
        ...input.provenance,
        provenanceClass: 'retrospective',
        reconstruction,
      },
    })

    assert.equal(retrospective.provenance.provenanceClass, 'retrospective')
    assert.deepEqual(retrospective.provenance.reconstruction, reconstruction)
    assert.throws(() =>
      parseVerifiedWorkAccomplishmentV1({
        ...input,
        provenance: {
          ...input.provenance,
          provenanceClass: 'legacy_unverified',
        },
      })
    )
    assert.throws(() =>
      parseVerifiedWorkAccomplishmentV1({
        ...input,
        provenance: {
          ...input.provenance,
          provenanceClass: 'native_prework',
          reconstruction,
        },
      })
    )
  })

  test('rejects invalid dates, confidence and oversized narrative fields', ({ assert }) => {
    const input = validVerifiedWorkAccomplishmentV1()

    assert.throws(() => parseVerifiedWorkAccomplishmentV1({ ...input, createdAt: 'yesterday' }))
    assert.throws(() =>
      parseVerifiedWorkAccomplishmentV1({
        ...input,
        verification: { ...input.verification, confidenceScore: 1.01 },
      })
    )
    assert.throws(() =>
      parseVerifiedWorkAccomplishmentV1({
        ...input,
        detailedStatement: 'x'.repeat(20_001),
      })
    )
  })
})

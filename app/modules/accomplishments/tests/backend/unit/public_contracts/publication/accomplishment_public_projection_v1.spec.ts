import { test } from '@japa/runner'

import { validAccomplishmentPublicProjectionV1 } from '../verified-work/accomplishment_contract_fixtures.js'

import {
  isAccomplishmentPublicProjectionV1,
  parseAccomplishmentPublicProjectionV1,
} from '#modules/accomplishments/public_contracts/publication/accomplishment_public_projection_v1'

test.group('Accomplishment public contract | public-safe projection V1', () => {
  test('PS-003 PS-005 parses only an explicit recruiter-safe demonstrated-work shape', ({
    assert,
  }) => {
    const input = validAccomplishmentPublicProjectionV1()
    const parsed = parseAccomplishmentPublicProjectionV1(input)

    assert.isTrue(isAccomplishmentPublicProjectionV1(input))
    assert.equal(parsed.action, 'design_and_implement')
    assert.equal(parsed.object, 'pre_order_api')
    assert.equal(parsed.ownershipLevel, 'primary_owner')
    assert.equal(parsed.verification.status, 'verified')
    assert.equal(parsed.verification.provenanceClass, 'native_prework')
  })

  test('TC-TVA-018 RV-018 rejects private/internal fields outside the public allowlist', ({
    assert,
  }) => {
    const input = validAccomplishmentPublicProjectionV1()
    const forbiddenTopLevelFields = {
      organizationId: '00000000-0000-4000-8000-000000000003',
      projectId: '00000000-0000-4000-8000-000000000004',
      taskId: '00000000-0000-4000-8000-000000000005',
      detailedStatement: 'Private implementation detail',
      evidenceReferences: [{ url: 'https://private.example/evidence' }],
      reviewerIds: ['00000000-0000-4000-8000-000000000016'],
    }

    for (const [field, value] of Object.entries(forbiddenTopLevelFields)) {
      assert.throws(() =>
        parseAccomplishmentPublicProjectionV1({
          ...input,
          [field]: value,
        })
      )
    }
  })

  test('PS-005 rejects nested raw evidence, source URLs and reviewer identity leakage', ({
    assert,
  }) => {
    const input = validAccomplishmentPublicProjectionV1()

    assert.throws(() =>
      parseAccomplishmentPublicProjectionV1({
        ...input,
        context: {
          ...input.context,
          privateIncidentId: 'INC-SECRET-1',
        },
      })
    )
    assert.throws(() =>
      parseAccomplishmentPublicProjectionV1({
        ...input,
        verification: {
          ...input.verification,
          reviewerId: '00000000-0000-4000-8000-000000000016',
          rawEvidenceUrl: 'https://private.example/logs',
        },
      })
    )
    assert.throws(() =>
      parseAccomplishmentPublicProjectionV1({
        ...input,
        capabilities: [
          {
            ...input.capabilities[0],
            sourceObservationId: '00000000-0000-4000-8000-000000000015',
          },
        ],
      })
    )
  })

  test('rejects unpublished lifecycle states, future versions and oversized public wording', ({
    assert,
  }) => {
    const input = validAccomplishmentPublicProjectionV1()

    assert.throws(() =>
      parseAccomplishmentPublicProjectionV1({
        ...input,
        contractVersion: 2,
      })
    )
    assert.throws(() =>
      parseAccomplishmentPublicProjectionV1({
        ...input,
        verification: { ...input.verification, status: 'frozen' },
      })
    )
    assert.throws(() =>
      parseAccomplishmentPublicProjectionV1({
        ...input,
        conciseStatement: 'x'.repeat(1_001),
      })
    )
  })
})

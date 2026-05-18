import { test } from '@japa/runner'

import {
  buildAccomplishmentProjectionIdentity,
  hashVerifiedAccomplishmentPayload,
  type AccomplishmentProjectionIdentityInput,
} from '#modules/accomplishments/domain/verified-work/accomplishment_projection_identity'
import { NodeAccomplishmentContentHasher } from '#modules/accomplishments/infra/adapters/verified-work/node_accomplishment_content_hasher'
import {
  parseVerifiedWorkAccomplishmentV1,
  type VerifiedWorkAccomplishmentV1,
} from '#modules/accomplishments/public_contracts/verified-work/verified_work_accomplishment_v1'
import { validVerifiedWorkAccomplishmentV1 } from '#modules/accomplishments/tests/backend/unit/public_contracts/verified-work/accomplishment_contract_fixtures'

const hasher = new NodeAccomplishmentContentHasher()

function input(
  overrides: Partial<AccomplishmentProjectionIdentityInput> = {}
): AccomplishmentProjectionIdentityInput {
  return {
    taskAssignmentId: '30000000-0000-4000-8000-000000000001',
    assignmentSnapshotId: '30000000-0000-4000-8000-000000000002',
    assignmentSnapshotHash: `sha256:${'1'.repeat(64)}`,
    completionReportId: '30000000-0000-4000-8000-000000000003',
    completionReportHash: `sha256:${'2'.repeat(64)}`,
    subjectUserId: '30000000-0000-4000-8000-000000000004',
    completionClaims: [
      {
        id: '30000000-0000-4000-8000-000000000005',
        hash: `sha256:${'3'.repeat(64)}`,
      },
      {
        id: '30000000-0000-4000-8000-000000000006',
        hash: `sha256:${'4'.repeat(64)}`,
      },
    ],
    reviewWorkflowId: '30000000-0000-4000-8000-000000000007',
    reviewObservations: [
      {
        id: '30000000-0000-4000-8000-000000000008',
        hash: `sha256:${'5'.repeat(64)}`,
      },
      {
        id: '30000000-0000-4000-8000-000000000009',
        hash: `sha256:${'6'.repeat(64)}`,
      },
    ],
    semanticBoundary: {
      action: 'designed',
      object: 'pre-order-api',
      ownershipLevel: 'primary_owner',
      deliverableIds: [
        '30000000-0000-4000-8000-000000000010',
        '30000000-0000-4000-8000-000000000011',
      ],
      criterionResultIds: ['30000000-0000-4000-8000-000000000012'],
      evidenceIds: [
        '30000000-0000-4000-8000-000000000013',
        '30000000-0000-4000-8000-000000000014',
      ],
    },
    policyVersion: 'accomplishment-policy-2026.08',
    ...overrides,
  }
}

test.group('Unit | Accomplishment projection identity', () => {
  test('is stable across source set order and object key order', ({ assert }) => {
    const original = input()
    const reordered = input({
      completionClaims: [...original.completionClaims].reverse(),
      reviewObservations: [...original.reviewObservations].reverse(),
      semanticBoundary: {
        evidenceIds: [...original.semanticBoundary.evidenceIds].reverse(),
        criterionResultIds: [...original.semanticBoundary.criterionResultIds].reverse(),
        deliverableIds: [...original.semanticBoundary.deliverableIds].reverse(),
        ownershipLevel: original.semanticBoundary.ownershipLevel,
        object: original.semanticBoundary.object,
        action: original.semanticBoundary.action,
      },
    })

    assert.deepEqual(
      buildAccomplishmentProjectionIdentity(original, hasher),
      buildAccomplishmentProjectionIdentity(reordered, hasher)
    )
  })

  test('changes identity when policy, source hash or semantic boundary changes', ({ assert }) => {
    const baseline = buildAccomplishmentProjectionIdentity(input(), hasher)
    const policy = buildAccomplishmentProjectionIdentity(
      input({ policyVersion: 'accomplishment-policy-2026.09' }),
      hasher
    )
    const source = buildAccomplishmentProjectionIdentity(
      input({ completionReportHash: `sha256:${'f'.repeat(64)}` }),
      hasher
    )
    const boundary = buildAccomplishmentProjectionIdentity(
      input({
        semanticBoundary: { ...input().semanticBoundary, ownershipLevel: 'contributor' },
      }),
      hasher
    )

    assert.notEqual(baseline.projectionKey, policy.projectionKey)
    assert.notEqual(baseline.projectionKey, source.projectionKey)
    assert.notEqual(baseline.projectionKey, boundary.projectionKey)
  })

  test('derives a stable UUID for exact replay before any row is loaded', ({ assert }) => {
    const first = buildAccomplishmentProjectionIdentity(input(), hasher)
    const second = buildAccomplishmentProjectionIdentity(input(), hasher)

    assert.equal(first.accomplishmentId, second.accomplishmentId)
    assert.match(
      first.accomplishmentId,
      /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    )
  })

  test('hashes canonical accomplishment content without self-referencing canonicalHash', ({
    assert,
  }) => {
    const payload = parseVerifiedWorkAccomplishmentV1(validVerifiedWorkAccomplishmentV1())
    const changedHashOnly: VerifiedWorkAccomplishmentV1 = {
      ...payload,
      canonicalHash: `sha256:${'f'.repeat(64)}`,
    }
    const changedAction: VerifiedWorkAccomplishmentV1 = { ...payload, action: 'implemented' }

    const first = hashVerifiedAccomplishmentPayload(payload, hasher)
    const second = hashVerifiedAccomplishmentPayload(changedHashOnly, hasher)
    const changed = hashVerifiedAccomplishmentPayload(changedAction, hasher)

    assert.match(first, /^sha256:[0-9a-f]{64}$/)
    assert.equal(first, second)
    assert.notEqual(first, changed)
  })
})

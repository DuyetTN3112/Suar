import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import type { CreateVerifiedAccomplishmentAggregateInput } from '#modules/accomplishments/actions/ports/outbound/verified-work/verified_accomplishment_writer'
import { hashVerifiedAccomplishmentPayload } from '#modules/accomplishments/domain/verified-work/accomplishment_projection_identity'
import { NodeAccomplishmentContentHasher } from '#modules/accomplishments/infra/adapters/verified-work/node_accomplishment_content_hasher'
import {
  VerifiedAccomplishmentProjectionCollisionException,
  VerifiedAccomplishmentRepository,
} from '#modules/accomplishments/infra/repositories/verified-work/verified_accomplishment_repository'
import type { AccomplishmentCapabilitySignalV1 } from '#modules/accomplishments/public_contracts/verified-work/accomplishment_capability_signal_v1'
import { parseAccomplishmentCapabilitySignalV1 } from '#modules/accomplishments/public_contracts/verified-work/accomplishment_capability_signal_v1'
import type { AccomplishmentLifecycleRevisionV1 } from '#modules/accomplishments/public_contracts/lifecycle/accomplishment_lifecycle_v1'
import type { VerifiedWorkAccomplishmentV1 } from '#modules/accomplishments/public_contracts/verified-work/verified_work_accomplishment_v1'
import { parseVerifiedWorkAccomplishmentV1 } from '#modules/accomplishments/public_contracts/verified-work/verified_work_accomplishment_v1'
import {
  ACCOMPLISHMENT_TEST_HASHES,
  ACCOMPLISHMENT_TEST_IDS,
  validCapabilitySignalV1,
  validVerifiedWorkAccomplishmentV1,
} from '#modules/accomplishments/tests/backend/unit/public_contracts/verified-work/accomplishment_contract_fixtures'
import type { CompletionClaimV1 } from '#modules/reviews/public_contracts/observation/completion_review_contracts'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

const hasher = new NodeAccomplishmentContentHasher()

function completionClaim(): CompletionClaimV1 {
  const ids = ACCOMPLISHMENT_TEST_IDS
  return {
    schemaVersion: 'suar.completion_claim.v1',
    id: ids.completionClaim,
    completionReportId: ids.completionReport,
    completionReportRevision: 1,
    completionReportHash: ACCOMPLISHMENT_TEST_HASHES.completion,
    assignmentSnapshotId: ids.assignmentSnapshot,
    taskContractVersionId: ids.taskContractVersion,
    userId: ids.user,
    action: 'design_and_implement',
    object: 'pre_order_api',
    proposedTitle: 'Designed and implemented the pre-order module API',
    proposedStatement: 'Designed and implemented an idempotent pre-order API.',
    actualRole: 'backend_engineer',
    actualOwnership: 'primary_owner',
    actualAutonomy: 'independent',
    contributionStatement: 'Owned the API contract and implementation.',
    deliverableRefs: ['00000000-0000-4000-8000-000000000023'],
    criterionResultRefs: ['00000000-0000-4000-8000-000000000024'],
    evidenceRefs: [ids.evidence],
    outcomeData: { acceptanceScenariosPassed: 12 },
    publicClaimDraft: null,
    privacyClassification: 'confidential',
    status: 'under_review',
    createdAt: '2026-07-30T10:00:00.000Z',
  }
}

function lifecycle(
  accomplishmentId: string,
  lifecycleState: 'verified' | 'partially_verified',
  ids: readonly string[] = [randomUUID(), randomUUID(), randomUUID()]
): AccomplishmentLifecycleRevisionV1[] {
  const reason =
    lifecycleState === 'verified'
      ? ('verification_completed' as const)
      : ('partial_verification_completed' as const)
  return [
    {
      contractVersion: 1,
      id: ids[0] as string,
      accomplishmentId,
      sequence: 1,
      previousState: null,
      nextState: 'candidate',
      visibility: 'internal',
      reasonCode: 'candidate_created',
      sourceFact: {
        id: ACCOMPLISHMENT_TEST_IDS.completionClaim,
        type: 'completion_claim',
        hash: ACCOMPLISHMENT_TEST_HASHES.sourceFact,
      },
      actor: { type: 'system', userId: null },
      policyVersion: 'accomplishment-policy-v1',
      supersedesRevisionId: null,
      relatedAccomplishmentId: null,
      occurredAt: '2026-07-30T10:00:00.000Z',
    },
    {
      contractVersion: 1,
      id: ids[1] as string,
      accomplishmentId,
      sequence: 2,
      previousState: 'candidate',
      nextState: 'under_review',
      visibility: 'internal',
      reasonCode: 'review_started',
      sourceFact: {
        id: ACCOMPLISHMENT_TEST_IDS.reviewObservation,
        type: 'review_observation',
        hash: ACCOMPLISHMENT_TEST_HASHES.sourceFact,
      },
      actor: { type: 'user', userId: ACCOMPLISHMENT_TEST_IDS.reviewer },
      policyVersion: 'accomplishment-policy-v1',
      supersedesRevisionId: null,
      relatedAccomplishmentId: null,
      occurredAt: '2026-07-31T09:00:00.000Z',
    },
    {
      contractVersion: 1,
      id: ids[2] as string,
      accomplishmentId,
      sequence: 3,
      previousState: 'under_review',
      nextState: lifecycleState,
      visibility: 'internal',
      reasonCode: reason,
      sourceFact: {
        id: ACCOMPLISHMENT_TEST_IDS.reviewWorkflow,
        type: 'review_finalized',
        hash: ACCOMPLISHMENT_TEST_HASHES.review,
      },
      actor: { type: 'user', userId: ACCOMPLISHMENT_TEST_IDS.reviewer },
      policyVersion: 'accomplishment-policy-v1',
      supersedesRevisionId: null,
      relatedAccomplishmentId: null,
      occurredAt: '2026-07-31T10:00:00.000Z',
    },
  ]
}

function aggregate(
  overrides: {
    accomplishmentId?: string
    projectionKey?: string
    signalId?: string
    signalProjectionKey?: string
    title?: string
    lifecycleIds?: string[]
  } = {}
): CreateVerifiedAccomplishmentAggregateInput {
  const accomplishmentId = overrides.accomplishmentId ?? ACCOMPLISHMENT_TEST_IDS.accomplishment
  const signalId = overrides.signalId ?? ACCOMPLISHMENT_TEST_IDS.capabilitySignal
  const base = parseVerifiedWorkAccomplishmentV1(validVerifiedWorkAccomplishmentV1())
  const withoutCanonical: VerifiedWorkAccomplishmentV1 = {
    ...base,
    id: accomplishmentId,
    title: overrides.title ?? base.title,
    capabilitySignalIds: [signalId],
  }
  const accomplishment: VerifiedWorkAccomplishmentV1 = {
    ...withoutCanonical,
    canonicalHash: hashVerifiedAccomplishmentPayload(withoutCanonical, hasher),
  }
  const baseSignal = parseAccomplishmentCapabilitySignalV1(validCapabilitySignalV1())
  const signal: AccomplishmentCapabilitySignalV1 = {
    ...baseSignal,
    id: signalId,
    accomplishmentId,
  }
  const claim = completionClaim()
  return {
    projectionKey: overrides.projectionKey ?? 'vwa:v1:repository-integration-fixture',
    accomplishment,
    claimLinks: [
      {
        claim,
        projectedClaimStatus: 'verified',
        projectedOwnershipLevel: 'primary_owner',
        sourceClaimHash: ACCOMPLISHMENT_TEST_HASHES.sourceFact,
      },
    ],
    evidenceLinks: [
      {
        evidenceId: ACCOMPLISHMENT_TEST_IDS.evidence,
        completionClaimId: ACCOMPLISHMENT_TEST_IDS.completionClaim,
        evidenceType: 'design_specification',
        accessClassification: 'confidential',
        availability: 'available',
        contentHash: ACCOMPLISHMENT_TEST_HASHES.sourceFact,
        evidencePayload: { title: 'OpenAPI specification' },
      },
    ],
    reviewObservationLinks: [
      {
        reviewObservationId: ACCOMPLISHMENT_TEST_IDS.reviewObservation,
        observationRevisionId: '00000000-0000-4000-8000-000000000025',
        observationFactId: '00000000-0000-4000-8000-000000000026',
        observationType: 'accomplishment_claim',
        sourceObservationHash: ACCOMPLISHMENT_TEST_HASHES.sourceFact,
        disposition: 'confirm',
        governanceState: 'final',
        linkPayload: { claimId: ACCOMPLISHMENT_TEST_IDS.completionClaim },
      },
    ],
    capabilitySignals: [
      {
        projectionKey:
          overrides.signalProjectionKey ?? 'signal:v1:repository-integration-fixture',
        signal,
        sourceObservationHash: ACCOMPLISHMENT_TEST_HASHES.sourceFact,
      },
    ],
    lifecycleRevisions: lifecycle(
      accomplishmentId,
      'verified',
      overrides.lifecycleIds
    ),
  }
}

async function cleanup(): Promise<void> {
  for (const table of [
    'accomplishment_public_projections',
    'accomplishment_capability_signals',
    'accomplishment_review_observation_links',
    'accomplishment_evidence_links',
    'accomplishment_claim_links',
    'accomplishment_lifecycle_revisions',
    'verified_work_accomplishments',
  ]) {
    await db.from(table).delete()
  }
}

test.group('Integration | Verified accomplishment repository', (group) => {
  const repository = new VerifiedAccomplishmentRepository()

  group.setup(async () => {
    await setupApp()
  })
  group.each.setup(cleanup)
  group.each.teardown(cleanup)
  group.teardown(async () => {
    await teardownApp()
  })

  test('atomically persists the canonical aggregate and exact immutable children', async ({
    assert,
  }) => {
    const result = await repository.createOrLoad(aggregate())

    assert.isTrue(result.inserted)
    assert.equal(result.lifecycleSequence, 3)
    assert.equal(result.lifecycleState, 'verified')
    for (const [table, expected] of [
      ['verified_work_accomplishments', 1],
      ['accomplishment_claim_links', 1],
      ['accomplishment_evidence_links', 1],
      ['accomplishment_review_observation_links', 1],
      ['accomplishment_capability_signals', 1],
      ['accomplishment_lifecycle_revisions', 3],
    ] as const) {
      const row = (await db.from(table).count('* as total').first()) as { total: string }
      assert.equal(Number(row.total), expected, table)
    }
  })

  test('participates in an outer transaction so a source/projection phase can roll back together', async ({
    assert,
  }) => {
    await assert.rejects(
      () =>
        db.transaction(async (trx) => {
          await repository.createOrLoad(aggregate(), trx)
          throw new Error('simulated source boundary failure')
        }),
      /simulated source boundary failure/
    )

    const row = (await db
      .from('verified_work_accomplishments')
      .where('projection_key', 'vwa:v1:repository-integration-fixture')
      .first()) as Record<string, unknown> | undefined
    assert.isNull(row)
    const lifecycleCount = (await db
      .from('accomplishment_lifecycle_revisions')
      .count('* as total')
      .first()) as { total: string }
    assert.equal(Number(lifecycleCount.total), 0)
  })

  test('returns an exact replay and detects same-key changed-content collision', async ({
    assert,
  }) => {
    const firstInput = aggregate()
    const first = await repository.createOrLoad(firstInput)
    const replay = await repository.createOrLoad(firstInput)

    assert.isTrue(first.inserted)
    assert.isFalse(replay.inserted)
    assert.equal(replay.accomplishmentId, first.accomplishmentId)
    await assert.rejects(
      () => repository.createOrLoad(aggregate({ title: 'Changed historical statement' })),
      VerifiedAccomplishmentProjectionCollisionException
    )
  })

  test('rejects a replay whose normalized child provenance changed under the same key', async ({
    assert,
  }) => {
    const original = aggregate()
    await repository.createOrLoad(original)
    const claimLink = original.claimLinks[0]
    const observationLink = original.reviewObservationLinks[0]
    if (!claimLink || !observationLink) throw new Error('fixture must include source links')
    const changedClaim = {
      ...original,
      claimLinks: [{ ...claimLink, sourceClaimHash: `sha256:${'f'.repeat(64)}` as const }],
    }
    const changedObservation = {
      ...original,
      reviewObservationLinks: [
        {
          ...observationLink,
          sourceObservationHash: `sha256:${'e'.repeat(64)}` as const,
        },
      ],
      capabilitySignals: original.capabilitySignals.map((signal) => ({
        ...signal,
        sourceObservationHash: `sha256:${'e'.repeat(64)}` as const,
      })),
    }

    await assert.rejects(
      () => repository.createOrLoad(changedClaim),
      VerifiedAccomplishmentProjectionCollisionException
    )
    await assert.rejects(
      () => repository.createOrLoad(changedObservation),
      VerifiedAccomplishmentProjectionCollisionException
    )
  })

  test('rejects replay when any immutable child payload or lifecycle authority changes', async ({
    assert,
  }) => {
    const original = aggregate()
    await repository.createOrLoad(original)
    const claimLink = original.claimLinks[0]
    const evidenceLink = original.evidenceLinks[0]
    const observationLink = original.reviewObservationLinks[0]
    const signalLink = original.capabilitySignals[0]
    const finalRevision = original.lifecycleRevisions[2]
    if (!claimLink || !evidenceLink || !observationLink || !signalLink || !finalRevision) {
      throw new Error('fixture must include every immutable aggregate child')
    }

    const collisions: CreateVerifiedAccomplishmentAggregateInput[] = [
      {
        ...original,
        claimLinks: [
          {
            ...claimLink,
            claim: { ...claimLink.claim, contributionStatement: 'Changed historical claim.' },
          },
        ],
      },
      {
        ...original,
        evidenceLinks: [
          { ...evidenceLink, evidencePayload: { title: 'Changed historical evidence.' } },
        ],
      },
      {
        ...original,
        reviewObservationLinks: [
          { ...observationLink, linkPayload: { claimId: randomUUID() } },
        ],
      },
      {
        ...original,
        capabilitySignals: [
          {
            ...signalLink,
            signal: {
              ...signalLink.signal,
              observedBehaviour: 'Changed historical capability observation.',
            },
          },
        ],
      },
      {
        ...original,
        lifecycleRevisions: original.lifecycleRevisions.map((revision) =>
          revision.sequence === finalRevision.sequence
            ? {
                ...revision,
                actor: { type: 'user' as const, userId: randomUUID() },
                policyVersion: 'changed-governance-policy',
              }
            : revision
        ),
      },
    ]

    for (const changed of collisions) {
      await assert.rejects(
        () => repository.createOrLoad(changed),
        VerifiedAccomplishmentProjectionCollisionException
      )
    }
  })

  test('rejects initial child metadata that contradicts canonical evidence or signal semantics', async ({
    assert,
  }) => {
    const original = aggregate()
    const evidenceLink = original.evidenceLinks[0]
    const signalLink = original.capabilitySignals[0]
    if (!evidenceLink || !signalLink) throw new Error('fixture must include evidence and signal')

    const contradictions: CreateVerifiedAccomplishmentAggregateInput[] = [
      {
        ...original,
        evidenceLinks: [{ ...evidenceLink, accessClassification: 'public' }],
      },
      {
        ...original,
        capabilitySignals: [
          {
            ...signalLink,
            signal: {
              ...signalLink.signal,
              context: { ...signalLink.signal.context, action: 'forged_action' },
            },
          },
        ],
      },
      {
        ...original,
        capabilitySignals: [
          {
            ...signalLink,
            sourceObservationHash: `sha256:${'9'.repeat(64)}`,
          },
        ],
      },
    ]

    for (const invalid of contradictions) {
      await assert.rejects(
        () => repository.createOrLoad(invalid),
        InvariantViolationException
      )
    }
  })

  test('detects canonical payload self-hash and denormalized-column tampering on replay', async ({
    assert,
  }) => {
    const original = aggregate()
    await repository.createOrLoad(original)
    const stored = (await db
      .from('verified_work_accomplishments')
      .where('id', original.accomplishment.id)
      .firstOrFail()) as { canonical_payload: VerifiedWorkAccomplishmentV1 }

    await db
      .from('verified_work_accomplishments')
      .where('id', original.accomplishment.id)
      .update({
        canonical_payload: JSON.stringify({
          ...stored.canonical_payload,
          canonicalHash: `sha256:${'f'.repeat(64)}`,
        }),
      })
    await assert.rejects(
      () => repository.createOrLoad(original),
      PersistedDataIntegrityException
    )

    await db
      .from('verified_work_accomplishments')
      .where('id', original.accomplishment.id)
      .update({
        canonical_payload: JSON.stringify(original.accomplishment),
        action: 'tampered_action',
      })
    await assert.rejects(
      () => repository.createOrLoad(original),
      PersistedDataIntegrityException
    )
  })

  test('serializes concurrent exact projection attempts to one aggregate', async ({ assert }) => {
    const input = aggregate()
    const results = await Promise.all(
      Array.from({ length: 8 }, () => repository.createOrLoad(input))
    )

    assert.equal(results.filter(({ inserted }) => inserted).length, 1)
    assert.equal(new Set(results.map(({ accomplishmentId }) => accomplishmentId)).size, 1)
    const row = (await db.from('verified_work_accomplishments').count('* as total').first()) as {
      total: string
    }
    assert.equal(Number(row.total), 1)
  })

  test('rolls back the whole second aggregate when a child insert fails', async ({ assert }) => {
    const first = aggregate()
    await repository.createOrLoad(first)
    const firstSignal = first.capabilitySignals[0]
    if (!firstSignal) throw new Error('first aggregate must include a capability signal')
    const secondId = randomUUID()
    const second = aggregate({
      accomplishmentId: secondId,
      projectionKey: `vwa:v1:${secondId}`,
      signalId: randomUUID(),
      signalProjectionKey: firstSignal.projectionKey,
      lifecycleIds: [randomUUID(), randomUUID(), randomUUID()],
    })

    await assert.rejects(() => repository.createOrLoad(second), /capability_signal_projection/)
    const rolledBack = (await db
      .from('verified_work_accomplishments')
      .where('id', secondId)
      .count('* as total')
      .first()) as { total: string }
    assert.equal(Number(rolledBack.total), 0)
  })
})

import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import type { GovernAccomplishmentLifecycleInput } from '#modules/accomplishments/actions/ports/outbound/lifecycle/accomplishment_lifecycle_governance_writer'
import type {
  CreateVerifiedAccomplishmentAggregateInput,
  PersistedVerifiedAccomplishmentResult,
} from '#modules/accomplishments/actions/ports/outbound/verified-work/verified_accomplishment_writer'
import { hashVerifiedAccomplishmentPayload } from '#modules/accomplishments/domain/verified-work/accomplishment_projection_identity'
import { NodeAccomplishmentContentHasher } from '#modules/accomplishments/infra/adapters/verified-work/node_accomplishment_content_hasher'
import {
  AccomplishmentLifecycleSourceCollisionException,
  AccomplishmentLifecycleTransitionConflictException,
  LucidAccomplishmentLifecycleGovernanceRepository,
} from '#modules/accomplishments/infra/repositories/lifecycle/lucid_accomplishment_lifecycle_governance_repository'
import { VerifiedAccomplishmentRepository } from '#modules/accomplishments/infra/repositories/verified-work/verified_accomplishment_repository'
import type { AccomplishmentCapabilitySignalV1 } from '#modules/accomplishments/public_contracts/verified-work/accomplishment_capability_signal_v1'
import { parseAccomplishmentCapabilitySignalV1 } from '#modules/accomplishments/public_contracts/verified-work/accomplishment_capability_signal_v1'
import type { AccomplishmentLifecycleRevisionV1 } from '#modules/accomplishments/public_contracts/lifecycle/accomplishment_lifecycle_v1'
import type { VerifiedWorkAccomplishmentV1 } from '#modules/accomplishments/public_contracts/verified-work/verified_work_accomplishment_v1'
import { parseVerifiedWorkAccomplishmentV1 } from '#modules/accomplishments/public_contracts/verified-work/verified_work_accomplishment_v1'
import {
  ACCOMPLISHMENT_TEST_HASHES,
  ACCOMPLISHMENT_TEST_IDS,
  validAccomplishmentPublicProjectionV1,
  validCapabilitySignalV1,
  validVerifiedWorkAccomplishmentV1,
} from '#modules/accomplishments/tests/backend/unit/public_contracts/verified-work/accomplishment_contract_fixtures'
import type { CompletionClaimV1 } from '#modules/reviews/public_contracts/observation/completion_review_contracts'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

const hasher = new NodeAccomplishmentContentHasher()
const aggregateRepository = new VerifiedAccomplishmentRepository(hasher)
const lifecycleRepository = new LucidAccomplishmentLifecycleGovernanceRepository(hasher)

interface AccomplishmentDbRow {
  canonical_hash: string
  canonical_payload: unknown
  lifecycle_state: string
  title: string
  visibility: string
}

interface CapabilitySignalDbRow {
  signal_payload: unknown
  signal_state: string
}

interface PublicProjectionDbRow {
  retired_at: Date | string | null
}

function completionClaim(): CompletionClaimV1 {
  return {
    schemaVersion: 'suar.completion_claim.v1',
    id: ACCOMPLISHMENT_TEST_IDS.completionClaim,
    completionReportId: ACCOMPLISHMENT_TEST_IDS.completionReport,
    completionReportRevision: 1,
    completionReportHash: ACCOMPLISHMENT_TEST_HASHES.completion,
    assignmentSnapshotId: ACCOMPLISHMENT_TEST_IDS.assignmentSnapshot,
    taskContractVersionId: ACCOMPLISHMENT_TEST_IDS.taskContractVersion,
    userId: ACCOMPLISHMENT_TEST_IDS.user,
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
    evidenceRefs: [ACCOMPLISHMENT_TEST_IDS.evidence],
    outcomeData: { acceptanceScenariosPassed: 12 },
    publicClaimDraft: null,
    privacyClassification: 'confidential',
    status: 'under_review',
    createdAt: '2026-07-30T10:00:00.000Z',
  }
}

function initialLifecycle(
  accomplishmentId: string,
  state: 'verified' | 'partially_verified'
): AccomplishmentLifecycleRevisionV1[] {
  return [
    {
      contractVersion: 1,
      id: randomUUID(),
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
      id: randomUUID(),
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
      id: randomUUID(),
      accomplishmentId,
      sequence: 3,
      previousState: 'under_review',
      nextState: state,
      visibility: 'internal',
      reasonCode:
        state === 'verified' ? 'verification_completed' : 'partial_verification_completed',
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

function aggregate(input: {
  accomplishmentId?: string
  capabilitySignalId?: string
  projectionKey?: string
  signalProjectionKey?: string
  state?: 'verified' | 'partially_verified'
  title?: string
} = {}): CreateVerifiedAccomplishmentAggregateInput {
  const state = input.state ?? 'verified'
  const accomplishmentId = input.accomplishmentId ?? ACCOMPLISHMENT_TEST_IDS.accomplishment
  const capabilitySignalId =
    input.capabilitySignalId ?? ACCOMPLISHMENT_TEST_IDS.capabilitySignal
  const base = parseVerifiedWorkAccomplishmentV1(validVerifiedWorkAccomplishmentV1())
  const withoutHash: VerifiedWorkAccomplishmentV1 = {
    ...base,
    id: accomplishmentId,
    title: input.title ?? base.title,
    lifecycleState: state,
    verification: { ...base.verification, status: state },
    capabilitySignalIds: [capabilitySignalId],
  }
  const accomplishment: VerifiedWorkAccomplishmentV1 = {
    ...withoutHash,
    canonicalHash: hashVerifiedAccomplishmentPayload(withoutHash, hasher),
  }
  const baseSignal = parseAccomplishmentCapabilitySignalV1(validCapabilitySignalV1())
  const signal: AccomplishmentCapabilitySignalV1 = {
    ...baseSignal,
    id: capabilitySignalId,
    accomplishmentId,
  }
  return {
    projectionKey: input.projectionKey ?? `vwa:v1:${randomUUID()}`,
    accomplishment,
    claimLinks: [
      {
        claim: completionClaim(),
        projectedClaimStatus: state,
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
        observationRevisionId: randomUUID(),
        observationFactId: randomUUID(),
        observationType: 'accomplishment_claim',
        sourceObservationHash: ACCOMPLISHMENT_TEST_HASHES.sourceFact,
        disposition: state === 'verified' ? 'confirm' : 'partially_verify',
        governanceState: 'final',
        linkPayload: { claimId: ACCOMPLISHMENT_TEST_IDS.completionClaim },
      },
    ],
    capabilitySignals: [
      {
        projectionKey: input.signalProjectionKey ?? `signal:v1:${randomUUID()}`,
        signal,
        sourceObservationHash: ACCOMPLISHMENT_TEST_HASHES.sourceFact,
      },
    ],
    lifecycleRevisions: initialLifecycle(accomplishmentId, state),
  }
}

function transition(
  created: PersistedVerifiedAccomplishmentResult,
  overrides: Partial<GovernAccomplishmentLifecycleInput> = {}
): GovernAccomplishmentLifecycleInput {
  return {
    accomplishmentId: created.accomplishmentId,
    expectedLifecycleRevisionId: created.lifecycleRevisionId,
    expectedLifecycleSequence: created.lifecycleSequence,
    expectedLifecycleState: created.lifecycleState,
    expectedVisibility: 'internal',
    nextLifecycleState: 'frozen',
    nextVisibility: 'private',
    reasonCode: 'dispute_opened',
    sourceFact: { id: randomUUID(), type: 'dispute', hash: ACCOMPLISHMENT_TEST_HASHES.sourceFact },
    actor: { type: 'user', userId: ACCOMPLISHMENT_TEST_IDS.user },
    policyVersion: 'accomplishment-policy-v1',
    relatedAccomplishmentId: null,
    occurredAt: '2026-08-01T14:00:00.000Z',
    ...overrides,
  }
}

async function insertPublicProjection(input: {
  accomplishmentId: string
  sourceLifecycleRevisionId: string
  sourceCanonicalHash: string
}): Promise<string> {
  const id = randomUUID()
  const fixture = {
    ...validAccomplishmentPublicProjectionV1(),
    id,
    accomplishmentId: input.accomplishmentId,
    sourceLifecycleRevisionId: input.sourceLifecycleRevisionId,
    sourceCanonicalHash: input.sourceCanonicalHash,
    publishedAt: '2026-08-01T13:00:00.000Z',
    sourceUpdatedAt: '2026-08-01T12:00:00.000Z',
  }
  await db.table('accomplishment_public_projections').insert({
    id,
    projection_key: `public:v1:${randomUUID()}`,
    contract_version: 1,
    schema_version: 'suar.accomplishment_public_projection.v1',
    disclosure_policy_version: fixture.disclosure.disclosurePolicyVersion,
    accomplishment_id: fixture.accomplishmentId,
    user_id: fixture.userId,
    publication_version: fixture.publicationVersion,
    source_lifecycle_revision_id: fixture.sourceLifecycleRevisionId,
    source_canonical_hash: fixture.sourceCanonicalHash,
    title: fixture.title,
    concise_statement: fixture.conciseStatement,
    action: fixture.action,
    object: fixture.object,
    task_type: fixture.taskType,
    business_domain: fixture.businessDomain,
    problem_category: fixture.problemCategory,
    role: fixture.role,
    ownership_level: fixture.ownershipLevel,
    autonomy_level: fixture.autonomyLevel,
    collaboration_type: fixture.collaborationType,
    environment: fixture.context.environment,
    system_area: fixture.context.systemArea,
    scale_summary: fixture.context.scaleSummary,
    verification_status: fixture.verification.status,
    confidence_band: fixture.verification.confidenceBand,
    provenance_class: fixture.verification.provenanceClass,
    evidence_availability: fixture.verification.evidenceAvailability,
    redaction_state: fixture.disclosure.redactionState,
    public_payload: JSON.stringify(fixture),
    published_at: new Date(fixture.publishedAt),
    source_updated_at: new Date(fixture.sourceUpdatedAt),
    retired_at: null,
    created_at: new Date(fixture.publishedAt),
  })
  return id
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

test.group('Integration | Accomplishment lifecycle governance repository', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.each.setup(cleanup)
  group.each.teardown(cleanup)
  group.teardown(async () => {
    await teardownApp()
  })

  test('freezes canonical state and signals, retires public projection, and distinguishes replay from collision', async ({
    assert,
  }) => {
    const created = await aggregateRepository.createOrLoad(aggregate())
    const published = await lifecycleRepository.transition(
      transition(created, {
        nextLifecycleState: 'verified',
        nextVisibility: 'public',
        reasonCode: 'publication_changed',
        sourceFact: {
          id: randomUUID(),
          type: 'publication',
          hash: ACCOMPLISHMENT_TEST_HASHES.sourceFact,
        },
        occurredAt: '2026-08-01T12:00:00.000Z',
      })
    )
    const publicProjectionId = await insertPublicProjection({
      accomplishmentId: created.accomplishmentId,
      sourceLifecycleRevisionId: published.revision.id,
      sourceCanonicalHash: published.currentCanonicalHash,
    })
    const freeze = transition(created, {
      expectedLifecycleRevisionId: published.revision.id,
      expectedLifecycleSequence: published.revision.sequence,
      expectedLifecycleState: 'verified',
      expectedVisibility: 'public',
      sourceFact: {
        id: randomUUID(),
        type: 'dispute',
        hash: ACCOMPLISHMENT_TEST_HASHES.sourceFact,
      },
    })

    const frozen = await lifecycleRepository.transition(freeze)
    const replay = await lifecycleRepository.transition(freeze)

    assert.isTrue(frozen.inserted)
    assert.isFalse(replay.inserted)
    assert.deepEqual(replay.revision, frozen.revision)
    const accomplishment = (await db
      .from('verified_work_accomplishments')
      .where('id', created.accomplishmentId)
      .firstOrFail()) as AccomplishmentDbRow
    const payload = parseVerifiedWorkAccomplishmentV1(accomplishment.canonical_payload)
    assert.equal(accomplishment.lifecycle_state, 'frozen')
    assert.equal(accomplishment.visibility, 'private')
    assert.equal(payload.lifecycleState, 'frozen')
    assert.equal(payload.title, 'Designed and implemented the pre-order module API')
    assert.equal(payload.action, 'design_and_implement')
    assert.equal(payload.object, 'pre_order_api')
    assert.equal(hashVerifiedAccomplishmentPayload(payload, hasher), accomplishment.canonical_hash)

    const signal = (await db
      .from('accomplishment_capability_signals')
      .where('accomplishment_id', created.accomplishmentId)
      .firstOrFail()) as CapabilitySignalDbRow
    assert.equal(signal.signal_state, 'frozen')
    assert.equal(parseAccomplishmentCapabilitySignalV1(signal.signal_payload).signalState, 'frozen')
    const projection = (await db
      .from('accomplishment_public_projections')
      .where('id', publicProjectionId)
      .firstOrFail()) as PublicProjectionDbRow
    assert.isNotNull(projection.retired_at)

    await assert.rejects(
      () =>
        lifecycleRepository.transition({
          ...freeze,
          sourceFact: { ...freeze.sourceFact, hash: `sha256:${'8'.repeat(64)}` },
        }),
      AccomplishmentLifecycleSourceCollisionException
    )
  })

  test('restores only the exact pre-dispute partial state and can then revoke it', async ({
    assert,
  }) => {
    const created = await aggregateRepository.createOrLoad(aggregate({ state: 'partially_verified' }))
    const frozen = await lifecycleRepository.transition(transition(created))
    const wrongRestore = transition(created, {
      expectedLifecycleRevisionId: frozen.revision.id,
      expectedLifecycleSequence: frozen.revision.sequence,
      expectedLifecycleState: 'frozen',
      expectedVisibility: 'private',
      nextLifecycleState: 'verified',
      nextVisibility: 'private',
      reasonCode: 'dispute_resolved',
      sourceFact: { id: randomUUID(), type: 'dispute', hash: ACCOMPLISHMENT_TEST_HASHES.sourceFact },
      actor: { type: 'governance', userId: ACCOMPLISHMENT_TEST_IDS.reviewer },
      occurredAt: '2026-08-01T15:00:00.000Z',
    })
    await assert.rejects(() => lifecycleRepository.transition(wrongRestore), BusinessLogicException)

    const restored = await lifecycleRepository.transition({
      ...wrongRestore,
      nextLifecycleState: 'partially_verified',
      sourceFact: { ...wrongRestore.sourceFact, id: randomUUID() },
    })
    const activeSignal = (await db
      .from('accomplishment_capability_signals')
      .where('accomplishment_id', created.accomplishmentId)
      .firstOrFail()) as CapabilitySignalDbRow
    assert.equal(activeSignal.signal_state, 'active')

    const revoked = await lifecycleRepository.transition(
      transition(created, {
        expectedLifecycleRevisionId: restored.revision.id,
        expectedLifecycleSequence: restored.revision.sequence,
        expectedLifecycleState: 'partially_verified',
        expectedVisibility: 'private',
        nextLifecycleState: 'revoked',
        nextVisibility: 'private',
        reasonCode: 'governance_revoked',
        sourceFact: {
          id: randomUUID(),
          type: 'governance',
          hash: ACCOMPLISHMENT_TEST_HASHES.sourceFact,
        },
        actor: { type: 'governance', userId: ACCOMPLISHMENT_TEST_IDS.reviewer },
        occurredAt: '2026-08-01T16:00:00.000Z',
      })
    )
    assert.equal(revoked.currentLifecycleState, 'revoked')
    const revokedSignal = (await db
      .from('accomplishment_capability_signals')
      .where('accomplishment_id', created.accomplishmentId)
      .firstOrFail()) as CapabilitySignalDbRow
    assert.equal(revokedSignal.signal_state, 'revoked')
  })

  test('supersedes through an existing same-assignment successor without rewriting statements', async ({
    assert,
  }) => {
    const original = await aggregateRepository.createOrLoad(aggregate())
    const successorId = randomUUID()
    await aggregateRepository.createOrLoad(
      aggregate({
        accomplishmentId: successorId,
        capabilitySignalId: randomUUID(),
        title: 'Corrected pre-order API accomplishment',
      })
    )
    const frozen = await lifecycleRepository.transition(transition(original))
    const superseded = await lifecycleRepository.transition(
      transition(original, {
        expectedLifecycleRevisionId: frozen.revision.id,
        expectedLifecycleSequence: frozen.revision.sequence,
        expectedLifecycleState: 'frozen',
        expectedVisibility: 'private',
        nextLifecycleState: 'superseded',
        nextVisibility: 'private',
        reasonCode: 'correction_issued',
        sourceFact: {
          id: randomUUID(),
          type: 'correction',
          hash: ACCOMPLISHMENT_TEST_HASHES.sourceFact,
        },
        actor: { type: 'governance', userId: ACCOMPLISHMENT_TEST_IDS.reviewer },
        relatedAccomplishmentId: successorId,
        occurredAt: '2026-08-01T15:00:00.000Z',
      })
    )

    assert.equal(superseded.currentLifecycleState, 'superseded')
    assert.equal(superseded.revision.relatedAccomplishmentId, successorId)
    assert.equal(superseded.revision.supersedesRevisionId, frozen.revision.id)
    const originalRow = (await db
      .from('verified_work_accomplishments')
      .where('id', original.accomplishmentId)
      .firstOrFail()) as AccomplishmentDbRow
    const originalPayload = parseVerifiedWorkAccomplishmentV1(originalRow.canonical_payload)
    assert.equal(originalRow.title, 'Designed and implemented the pre-order module API')
    assert.equal(originalPayload.title, 'Designed and implemented the pre-order module API')
    const signal = (await db
      .from('accomplishment_capability_signals')
      .where('accomplishment_id', original.accomplishmentId)
      .firstOrFail()) as CapabilitySignalDbRow
    assert.equal(signal.signal_state, 'superseded')
  })

  test('uses lifecycle-head CAS so concurrent different transitions have exactly one winner', async ({
    assert,
  }) => {
    const created = await aggregateRepository.createOrLoad(aggregate())
    const first = transition(created, {
      sourceFact: { id: randomUUID(), type: 'dispute', hash: ACCOMPLISHMENT_TEST_HASHES.sourceFact },
    })
    const second = transition(created, {
      sourceFact: { id: randomUUID(), type: 'dispute', hash: ACCOMPLISHMENT_TEST_HASHES.sourceFact },
    })

    const outcomes = await Promise.allSettled([
      lifecycleRepository.transition(first),
      lifecycleRepository.transition(second),
    ])

    assert.equal(outcomes.filter(({ status }) => status === 'fulfilled').length, 1)
    const rejected = outcomes.find(({ status }) => status === 'rejected')
    assert.equal(rejected?.status, 'rejected')
    if (rejected?.status === 'rejected') {
      assert.instanceOf(rejected.reason, AccomplishmentLifecycleTransitionConflictException)
    }
    const count = (await db
      .from('accomplishment_lifecycle_revisions')
      .where('accomplishment_id', created.accomplishmentId)
      .count('* as total')
      .firstOrFail()) as { total: string }
    assert.equal(Number(count.total), 4)
  })
})

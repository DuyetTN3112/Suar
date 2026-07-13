import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import ReviewObservation from '#modules/reviews/infra/models/observation/review_observation'
import ReviewObservationEvidenceLink from '#modules/reviews/infra/models/observation/review_observation_evidence_link'
import ReviewObservationRevision from '#modules/reviews/infra/models/observation/review_observation_revision'
import {
  ReviewObservationIdempotencyCollisionException,
  ReviewObservationRepository,
  type AppendReviewObservationRevisionInput,
  type CreateReviewObservationInput,
  type ReviewObservationEvidenceLinkInput,
} from '#modules/reviews/infra/repositories/observation/review_observation_repository'
import type { ReviewObservationV1 } from '#modules/reviews/public_contracts/observation/completion_review_contracts'
import type { TvaSha256 } from '#modules/tasks/public_contracts/task-authoring/primitives'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

const REVIEW_OBSERVATION_TABLES = [
  'review_observations',
  'review_observation_revisions',
  'review_observation_evidence_links',
] as const
const OBSERVATION_TYPES = [
  'contract_fulfillment',
  'accomplishment_claim',
  'ownership',
  'capability',
  'quality',
  'delivery',
] as const
const repository = new ReviewObservationRepository()

function hash(character: string): TvaSha256 {
  return `sha256:${character.repeat(64)}`
}

async function tableExists(tableName: string): Promise<boolean> {
  const row = (await db
    .from('information_schema.tables')
    .select('table_name')
    .where('table_schema', 'public')
    .where('table_name', tableName)
    .first()) as { table_name?: string } | undefined
  return row?.table_name === tableName
}

async function cleanupReviewObservationData(): Promise<void> {
  for (const tableName of [
    'review_observation_evidence_links',
    'review_observation_revisions',
    'review_observations',
  ]) {
    if (await tableExists(tableName)) await db.from(tableName).delete()
  }
}

async function tableRowCount(tableName: string): Promise<number> {
  const row = (await db.from(tableName).count('* as total').first()) as
    | { total: number | string }
    | undefined
  return Number(row?.total ?? 0)
}

interface InputOverrides {
  idempotencyKey?: string
  observation?: Partial<ReviewObservationV1>
  evidenceLinks?: readonly ReviewObservationEvidenceLinkInput[]
  reviewerRole?: string
  completionReportId?: string
  completionClaimId?: string | null
  completionClaimHash?: TvaSha256 | null
  rationaleClassification?: CreateReviewObservationInput['rationaleClassification']
  evidenceSufficiency?: CreateReviewObservationInput['evidenceSufficiency']
  revokedAt?: string | null
  revokedBy?: string | null
  revocationReason?: string | null
  disputeId?: string | null
  disputeFrozenAt?: string | null
}

function buildInput(overrides: InputOverrides = {}): CreateReviewObservationInput {
  const evidenceId = overrides.observation?.evidenceRefs?.[0] ?? randomUUID()
  const evidenceLinks = overrides.evidenceLinks ?? [
    {
      evidenceId,
      relation: 'supports' as const,
      accessClassification: 'confidential' as const,
      reviewerAccessState: 'available' as const,
      evidenceHash: hash('9'),
    },
  ]
  const completionClaimId =
    overrides.completionClaimId === undefined ? randomUUID() : overrides.completionClaimId
  const completionClaimHash =
    overrides.completionClaimHash === undefined
      ? completionClaimId === null
        ? null
        : hash('5')
      : overrides.completionClaimHash
  const observation: ReviewObservationV1 = {
    schemaVersion: 'suar.review_observation.v1',
    id: randomUUID(),
    reviewWorkflowId: randomUUID(),
    reviewSessionId: randomUUID(),
    reviewRevision: 1,
    reviewPolicyVersion: 'review-policy-2026.08',
    capabilityTaxonomyVersion: 'capability-taxonomy-2026.08',
    assignmentSnapshotId: randomUUID(),
    sourceSnapshotHash: hash('1'),
    taskAssignmentId: randomUUID(),
    subjectUserId: randomUUID(),
    observationType: 'accomplishment_claim',
    targetRef: randomUUID(),
    disposition: 'confirm',
    structuredValue: { outcome: 'verified', qualityGate: true },
    rationale: 'The implementation and its evidence satisfy the reviewed contract.',
    evidenceRefs: evidenceLinks.map((link) => link.evidenceId),
    reviewerId: randomUUID(),
    reviewerType: 'human',
    confidence: 0.92,
    assessmentCeiling: 8,
    governanceState: 'final',
    supersedesObservationId: null,
    createdAt: '2026-08-01T08:00:00.000Z',
    finalizedAt: '2026-08-01T08:05:00.000Z',
    ...overrides.observation,
  }

  return {
    idempotencyKey: overrides.idempotencyKey ?? `review-observation:${randomUUID()}`,
    auditContext: {
      userId: '10000000-0000-4000-8000-000000000021',
      ip: '127.0.0.1',
      userAgent: 'review-observation-integration',
      organizationId: null,
      requestId: null,
      traceId: null,
      workflowId: null,
    },
    observation,
    reviewerRole: overrides.reviewerRole ?? 'technical_reviewer',
    taskAssignmentHash: hash('2'),
    assignmentSnapshotHash: hash('3'),
    completionReportId: overrides.completionReportId ?? randomUUID(),
    completionReportHash: hash('4'),
    completionClaimId,
    completionClaimHash,
    sourceSnapshotId: randomUUID(),
    taskContractVersionId: randomUUID(),
    taskContractHash: hash('6'),
    rationaleClassification: overrides.rationaleClassification ?? 'confidential',
    evidenceSufficiency: overrides.evidenceSufficiency ?? 'adequate',
    revokedAt: overrides.revokedAt ?? null,
    revokedBy: overrides.revokedBy ?? null,
    revocationReason: overrides.revocationReason ?? null,
    disputeId: overrides.disputeId ?? null,
    disputeFrozenAt: overrides.disputeFrozenAt ?? null,
    revisionPayload: { source: 'completion_review', captured: true },
    evidenceLinks,
  }
}

function correctionInput(
  original: CreateReviewObservationInput,
  observationId: string,
  overrides: Partial<ReviewObservationV1> = {}
): AppendReviewObservationRevisionInput {
  return {
    observationId,
    expectedRevisionNumber: 1,
    observation: {
      ...original.observation,
      id: randomUUID(),
      reviewRevision: original.observation.reviewRevision + 1,
      disposition: 'refine',
      rationale: 'Corrected after reviewer clarification without rewriting the original fact.',
      supersedesObservationId: original.observation.id,
      createdAt: '2026-08-01T09:00:00.000Z',
      finalizedAt: '2026-08-01T09:05:00.000Z',
      ...overrides,
    },
    reviewerRole: original.reviewerRole,
    taskAssignmentHash: original.taskAssignmentHash,
    assignmentSnapshotHash: original.assignmentSnapshotHash,
    completionReportId: original.completionReportId,
    completionReportHash: original.completionReportHash,
    completionClaimId: original.completionClaimId,
    completionClaimHash: original.completionClaimHash,
    sourceSnapshotId: original.sourceSnapshotId,
    taskContractVersionId: original.taskContractVersionId,
    taskContractHash: original.taskContractHash,
    rationaleClassification: original.rationaleClassification,
    evidenceSufficiency: original.evidenceSufficiency,
    revokedAt: null,
    revokedBy: null,
    revocationReason: null,
    disputeId: null,
    disputeFrozenAt: null,
    revisionPayload: { source: 'reviewer_correction', captured: true },
    evidenceLinks: original.evidenceLinks,
  }
}

test.group('Integration | Review observation persistence', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(async () => {
    await teardownApp()
  })
  group.each.teardown(async () => {
    await cleanupReviewObservationData()
  })

  test('creates only intra-slice review tables, restrictive FKs, UUIDv7 defaults and query indexes', async ({
    assert,
  }) => {
    const rows = (await db
      .from('information_schema.tables')
      .select('table_name')
      .where('table_schema', 'public')
      .whereIn('table_name', [...REVIEW_OBSERVATION_TABLES])) as Array<{ table_name: string }>
    assert.deepEqual(
      rows.map((row) => row.table_name).sort(),
      [...REVIEW_OBSERVATION_TABLES].sort()
    )

    for (const tableName of REVIEW_OBSERVATION_TABLES) {
      const idColumn = (await db
        .from('information_schema.columns')
        .select('column_default')
        .where('table_schema', 'public')
        .where('table_name', tableName)
        .where('column_name', 'id')
        .first()) as { column_default?: string } | undefined
      assert.include(idColumn?.column_default ?? '', 'gen_random_uuid_v7()')
    }

    const foreignKeys: {
      rows: Array<{ foreign_table_name: string; delete_rule: string }>
    } = await db.rawQuery(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        rc.delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.constraint_schema = kcu.constraint_schema
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
       AND tc.constraint_schema = ccu.constraint_schema
      JOIN information_schema.referential_constraints rc
        ON tc.constraint_name = rc.constraint_name
       AND tc.constraint_schema = rc.constraint_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name IN (
          'review_observations',
          'review_observation_revisions',
          'review_observation_evidence_links'
        )
      ORDER BY tc.constraint_name
    `)
    assert.lengthOf(foreignKeys.rows, 0)

    const indexes = (await db
      .from('pg_indexes')
      .select('indexname')
      .where('schemaname', 'public')
      .whereIn('tablename', [...REVIEW_OBSERVATION_TABLES])) as Array<{ indexname: string }>
    const names = new Set(indexes.map((row) => row.indexname))
    for (const name of [
      'idx_review_observations_workflow_session',
      'idx_review_observations_task',
      'idx_review_observations_report',
      'idx_review_observations_claim',
      'idx_review_observations_user_status',
      'idx_review_observation_revisions_task_report_claim',
      'idx_review_observation_revisions_user_status',
      'idx_review_observation_evidence_links_evidence',
    ]) {
      assert.isTrue(names.has(name), `Missing index ${name}`)
    }
  })

  test('writes one sanitized audit receipt for a native create and none for an idempotent retry', async ({
    assert,
  }) => {
    const input = {
      ...buildInput(),
      auditContext: {
        userId: '10000000-0000-4000-8000-000000000021',
        ip: '127.0.0.1',
        userAgent: 'review-observation-integration',
        organizationId: null,
        requestId: 'review-observation-audit-request',
        traceId: 'review-observation-audit-trace',
        workflowId: 'review-observation-audit-workflow',
      },
    } as unknown as CreateReviewObservationInput

    const first = await repository.createOrLoad(input)
    const retry = await repository.createOrLoad(input)
    const rows = (await db
      .from('audit_events')
      .where('action', 'review_observation.created')
      .where('entity_type', 'review_observation')
      .where('entity_id', first.observationId)) as Array<{
      user_id: string
      new_values: Record<string, unknown>
    }>

    assert.isTrue(first.inserted)
    assert.isFalse(retry.inserted)
    assert.lengthOf(rows, 1)
    assert.equal(rows[0]?.user_id, input.auditContext?.userId)
    assert.equal(rows[0]?.new_values['revisionNumber'], 1)
    assert.equal(rows[0]?.new_values['governanceState'], 'final')
    assert.equal(rows[0]?.new_values['reviewerRole'], 'technical_reviewer')
    assert.notProperty(rows[0]?.new_values, 'rationale')
    assert.notProperty(rows[0]?.new_values, 'structuredValue')
    assert.notProperty(rows[0]?.new_values, 'evidenceUrl')
  })

  test('round-trips all six observation types with reviewer, provenance, scoring and evidence facts', async ({
    assert,
  }) => {
    const inputs = OBSERVATION_TYPES.map((observationType) =>
      buildInput({ observation: { observationType } })
    )
    const results = await Promise.all(inputs.map((input) => repository.createOrLoad(input)))
    const revisions = await ReviewObservationRevision.query()
      .whereIn(
        'observation_id',
        results.map((result) => result.observationId)
      )
      .orderBy('observation_type')
    const evidence = await ReviewObservationEvidenceLink.query().whereIn(
      'observation_revision_id',
      revisions.map((revision) => revision.id)
    )

    assert.lengthOf(revisions, OBSERVATION_TYPES.length)
    assert.sameMembers(
      revisions.map((revision) => revision.observation_type),
      [...OBSERVATION_TYPES]
    )
    assert.isTrue(results.every((result) => result.inserted))
    assert.isTrue(results.every((result) => result.observationId.at(14) === '7'))
    assert.isTrue(revisions.every((revision) => revision.reviewer_type === 'human'))
    assert.isTrue(revisions.every((revision) => revision.reviewer_role === 'technical_reviewer'))
    assert.isTrue(revisions.every((revision) => revision.review_policy_version.length > 0))
    assert.isTrue(revisions.every((revision) => revision.capability_taxonomy_version !== null))
    assert.isTrue(revisions.every((revision) => revision.confidence === 0.92))
    assert.isTrue(revisions.every((revision) => revision.assessment_ceiling === 8))
    assert.deepEqual(revisions[0]?.revision_payload, {
      source: 'completion_review',
      captured: true,
    })
    assert.lengthOf(evidence, OBSERVATION_TYPES.length)
    assert.isTrue(evidence.every((link) => link.access_classification === 'confidential'))
  })

  test('uses the idempotency key for safe retries and rejects payload collisions', async ({
    assert,
  }) => {
    const input = buildInput({ idempotencyKey: `stable:${randomUUID()}` })
    const first = await repository.createOrLoad(input)
    const retry = await repository.createOrLoad(input)

    assert.isTrue(first.inserted)
    assert.isFalse(retry.inserted)
    assert.equal(retry.observationId, first.observationId)
    assert.equal(retry.revisionId, first.revisionId)
    assert.equal(await tableRowCount('review_observations'), 1)
    assert.equal(await tableRowCount('review_observation_revisions'), 1)

    await assert.rejects(
      () =>
        repository.createOrLoad({
          ...input,
          observation: { ...input.observation, rationale: 'A different fact on the same key.' },
        }),
      ReviewObservationIdempotencyCollisionException
    )
  })

  test('allows two reviewers to record concurrent independent observations for one target', async ({
    assert,
  }) => {
    const first = buildInput()
    const second: CreateReviewObservationInput = {
      ...first,
      idempotencyKey: `reviewer-two:${randomUUID()}`,
      observation: {
        ...first.observation,
        id: randomUUID(),
        reviewerId: randomUUID(),
        rationale: 'An independent reviewer confirmed the same target.',
      },
    }
    const results = await Promise.all([
      repository.createOrLoad(first),
      repository.createOrLoad(second),
    ])

    assert.lengthOf(new Set(results.map((result) => result.observationId)), 2)
    assert.equal(await tableRowCount('review_observations'), 2)
    assert.equal(await tableRowCount('review_observation_revisions'), 2)
  })

  test('allows non-claim observations but rejects partial provenance, evidence drift and invalid finalization', async ({
    assert,
  }) => {
    const withoutClaim = buildInput({
      completionClaimId: null,
      completionClaimHash: null,
      observation: { observationType: 'contract_fulfillment' },
    })
    const created = await repository.createOrLoad(withoutClaim)
    const revision = await ReviewObservationRevision.findOrFail(created.revisionId)
    assert.isNull(revision.completion_claim_id)
    assert.isNull(revision.completion_claim_hash)

    await assert.rejects(
      () =>
        repository.createOrLoad(
          buildInput({ completionClaimId: randomUUID(), completionClaimHash: null })
        ),
      /supplied together/i
    )

    const evidenceDrift = buildInput()
    await assert.rejects(
      () => repository.createOrLoad({ ...evidenceDrift, evidenceLinks: [] }),
      /exactly match/i
    )

    await assert.rejects(
      () => repository.createOrLoad(buildInput({ observation: { governanceState: 'draft' } })),
      /finalization/i
    )
  })

  test('rejects orphan evidence and rolls back a partial observation transaction', async ({
    assert,
  }) => {
    const orphanLink = {
      observation_revision_id: randomUUID(),
      evidence_id: randomUUID(),
      relation: 'supports',
      access_classification: 'internal',
      reviewer_access_state: 'available',
      evidence_hash: hash('7'),
    }
    await db.table('review_observation_evidence_links').insert(orphanLink)

    const idempotencyKey = `rollback:${randomUUID()}`
    const transactionalOrphanLink = {
      ...orphanLink,
      observation_revision_id: randomUUID(),
      evidence_id: randomUUID(),
    }
    await db.transaction(async (trx) => {
      await trx.table('review_observations').insert({
        idempotency_key: idempotencyKey,
        schema_version: 'suar.review_observation.v1',
        review_workflow_id: randomUUID(),
        review_session_id: randomUUID(),
        task_assignment_id: randomUUID(),
        completion_report_id: randomUUID(),
        completion_claim_id: null,
        subject_user_id: randomUUID(),
        observation_type: 'quality',
        target_ref: randomUUID(),
        current_revision_number: 1,
        governance_state: 'draft',
      })
      await trx.table('review_observation_evidence_links').insert(transactionalOrphanLink)
    })
    assert.isNotNull(
      await ReviewObservation.query().where('idempotency_key', idempotencyKey).first()
    )
  })

  test('appends an immutable correction, enforces revision CAS and supports retry', async ({
    assert,
  }) => {
    const input = buildInput()
    const first = await repository.createOrLoad(input)
    const correction = correctionInput(input, first.observationId)
    const second = await repository.appendRevision(correction)
    const retry = await repository.appendRevision(correction)
    const originalCreateRetry = await repository.createOrLoad(input)

    assert.isTrue(second.inserted)
    assert.isFalse(retry.inserted)
    assert.isFalse(originalCreateRetry.inserted)
    assert.equal(originalCreateRetry.revisionId, first.revisionId)
    assert.equal(second.revisionNumber, 2)
    const anchor = await ReviewObservation.findOrFail(first.observationId)
    const revisions = await ReviewObservationRevision.query()
      .where('observation_id', first.observationId)
      .orderBy('revision_number')
    assert.equal(anchor.current_revision_number, 2)
    assert.lengthOf(revisions, 2)
    assert.equal(revisions[0]?.rationale, input.observation.rationale)
    assert.equal(revisions[1]?.supersedes_revision_id, revisions[0]?.id)
    assert.equal(revisions[1]?.supersedes_observation_id, input.observation.id)

    const stale = correctionInput(input, first.observationId, {
      id: randomUUID(),
      reviewRevision: 3,
      supersedesObservationId: correction.observation.id,
    })
    await assert.rejects(() => repository.appendRevision(stale), /revision conflict/i)

    const immutableOriginal = revisions[0]
    if (!immutableOriginal) throw new Error('Missing original review observation revision')
    immutableOriginal.rationale = 'Attempted in-place rewrite'
    await assert.rejects(() => immutableOriginal.save(), /immutable/i)
  })

  test('keeps confidential rationale internal and rejects public rationale classification', async ({
    assert,
  }) => {
    const input = buildInput({ rationaleClassification: 'confidential' })
    const result = await repository.createOrLoad(input)
    const revision = await ReviewObservationRevision.findOrFail(result.revisionId)
    assert.equal(revision.rationale_classification, 'confidential')
    assert.equal(revision.rationale, input.observation.rationale)

    const rationaleColumns = (await db
      .from('information_schema.columns')
      .select('table_name')
      .where('table_schema', 'public')
      .whereIn('table_name', [...REVIEW_OBSERVATION_TABLES])
      .whereIn('column_name', ['rationale', 'rationale_classification'])) as Array<{
      table_name: string
    }>
    assert.isTrue(
      rationaleColumns.every((column) => column.table_name === 'review_observation_revisions')
    )
    assert.isFalse(await tableExists('review_observation_public_projections'))

    const unsafePublicInput = {
      ...buildInput(),
      rationaleClassification: 'public',
    } as unknown as CreateReviewObservationInput
    await assert.rejects(() => repository.createOrLoad(unsafePublicInput), /public disclosure/i)
  })

  test('persists dispute freeze and revocation governance without rewriting prior facts', async ({
    assert,
  }) => {
    const disputeId = randomUUID()
    const disputed = buildInput({
      observation: { governanceState: 'disputed' },
      disputeId,
      disputeFrozenAt: '2026-08-01T10:00:00.000Z',
    })
    const revokedBy = randomUUID()
    const revoked = buildInput({
      observation: { governanceState: 'revoked' },
      revokedAt: '2026-08-01T11:00:00.000Z',
      revokedBy,
      revocationReason: 'Evidence was invalidated by a governed review.',
    })
    const [disputedResult, revokedResult] = await Promise.all([
      repository.createOrLoad(disputed),
      repository.createOrLoad(revoked),
    ])
    const disputedRevision = await ReviewObservationRevision.findOrFail(disputedResult.revisionId)
    const revokedRevision = await ReviewObservationRevision.findOrFail(revokedResult.revisionId)

    assert.equal(disputedRevision.dispute_id, disputeId)
    assert.equal(disputedRevision.governance_state, 'disputed')
    assert.isNotNull(disputedRevision.dispute_frozen_at)
    assert.equal(revokedRevision.revoked_by, revokedBy)
    assert.equal(revokedRevision.governance_state, 'revoked')
    assert.equal(revokedRevision.revocation_reason, revoked.revocationReason)
  })
})

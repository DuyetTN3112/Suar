import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import type { CreateAccomplishmentPublicProjectionInput } from '#modules/accomplishments/actions/ports/outbound/publication/accomplishment_public_projection_writer'
import { hashVerifiedAccomplishmentPayload } from '#modules/accomplishments/domain/verified-work/accomplishment_projection_identity'
import { NodeAccomplishmentContentHasher } from '#modules/accomplishments/infra/adapters/verified-work/node_accomplishment_content_hasher'
import {
  AccomplishmentPublicProjectionCollisionException,
  AccomplishmentPublicProjectionRepository,
  StaleAccomplishmentPublicationSourceException,
} from '#modules/accomplishments/infra/repositories/publication/accomplishment_public_projection_repository'
import type { VerifiedWorkAccomplishmentV1 } from '#modules/accomplishments/public_contracts/verified-work/verified_work_accomplishment_v1'
import { parseVerifiedWorkAccomplishmentV1 } from '#modules/accomplishments/public_contracts/verified-work/verified_work_accomplishment_v1'
import { validVerifiedWorkAccomplishmentV1 } from '#modules/accomplishments/tests/backend/unit/public_contracts/verified-work/accomplishment_contract_fixtures'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

const hasher = new NodeAccomplishmentContentHasher()

interface SeededAccomplishment {
  accomplishment: VerifiedWorkAccomplishmentV1
  lifecycleRevisionId: string
}

interface PublicProjectionRow {
  id: string
  retired_at: Date | string | null
}

interface CountRow {
  total: number | string
}

async function seedVerifiedAccomplishment(): Promise<SeededAccomplishment> {
  const base = parseVerifiedWorkAccomplishmentV1(validVerifiedWorkAccomplishmentV1())
  const baseEvidence = base.evidenceReferences[0]
  if (!baseEvidence) throw new Error('fixture requires canonical evidence')
  const withoutHash: VerifiedWorkAccomplishmentV1 = {
    ...base,
    id: randomUUID(),
    userId: randomUUID(),
    organizationId: randomUUID(),
    projectId: randomUUID(),
    taskId: randomUUID(),
    taskAssignmentId: randomUUID(),
    verification: {
      ...base.verification,
      reviewerReferences: [{ reviewerId: randomUUID(), reviewerRole: 'backend_lead' }],
    },
    evidenceReferences: [
      {
        ...baseEvidence,
        evidenceId: randomUUID(),
      },
    ],
    capabilitySignalIds: [randomUUID()],
    provenance: {
      ...base.provenance,
      projectContextVersionId: randomUUID(),
      workPackageVersionId: randomUUID(),
      taskSpecificationVersionId: randomUUID(),
      taskContractVersionId: randomUUID(),
      assignmentSnapshotId: randomUUID(),
      completionReportId: randomUUID(),
      completionClaimIds: [randomUUID()],
      reviewWorkflowId: randomUUID(),
      reviewObservationIds: [randomUUID()],
    },
  }
  const accomplishment: VerifiedWorkAccomplishmentV1 = {
    ...withoutHash,
    canonicalHash: hashVerifiedAccomplishmentPayload(withoutHash, hasher),
  }
  await db.table('verified_work_accomplishments').insert({
    id: accomplishment.id,
    projection_key: `vwa:test:${accomplishment.id}`,
    contract_version: 1,
    schema_version: 'suar.verified_work_accomplishment.v1',
    policy_version: accomplishment.provenance.policyVersion,
    user_id: accomplishment.userId,
    organization_id: accomplishment.organizationId,
    project_id: accomplishment.projectId,
    task_id: accomplishment.taskId,
    task_assignment_id: accomplishment.taskAssignmentId,
    title: accomplishment.title,
    concise_statement: accomplishment.conciseStatement,
    detailed_statement: accomplishment.detailedStatement,
    action: accomplishment.action,
    object: accomplishment.object,
    task_type: accomplishment.taskType,
    business_domain: accomplishment.businessDomain,
    problem_category: accomplishment.problemCategory,
    role: accomplishment.role,
    ownership_level: accomplishment.ownershipLevel,
    autonomy_level: accomplishment.autonomyLevel,
    collaboration_type: accomplishment.collaborationType,
    environment: accomplishment.context.environment,
    system_area: accomplishment.context.systemArea,
    scale_summary: accomplishment.context.scaleSummary,
    verification_method: accomplishment.verification.method,
    confidence_score: accomplishment.verification.confidenceScore,
    confidence_band: accomplishment.verification.confidenceBand,
    evidence_sufficiency: accomplishment.verification.evidenceSufficiency,
    lifecycle_state: accomplishment.lifecycleState,
    visibility: accomplishment.visibility,
    provenance_class: accomplishment.provenance.provenanceClass,
    project_context_version_id: accomplishment.provenance.projectContextVersionId,
    work_package_version_id: accomplishment.provenance.workPackageVersionId,
    task_specification_version_id: accomplishment.provenance.taskSpecificationVersionId,
    task_contract_version_id: accomplishment.provenance.taskContractVersionId,
    assignment_snapshot_id: accomplishment.provenance.assignmentSnapshotId,
    completion_report_id: accomplishment.provenance.completionReportId,
    review_workflow_id: accomplishment.provenance.reviewWorkflowId,
    task_specification_hash: accomplishment.provenance.sourceHashes.taskSpecification,
    task_contract_hash: accomplishment.provenance.sourceHashes.taskContract,
    assignment_snapshot_hash: accomplishment.provenance.sourceHashes.assignmentSnapshot,
    completion_report_hash: accomplishment.provenance.sourceHashes.completionReport,
    review_hash: accomplishment.provenance.sourceHashes.review,
    canonical_hash: accomplishment.canonicalHash,
    canonical_payload: JSON.stringify(accomplishment),
    verified_at: accomplishment.verification.verifiedAt,
    created_at: accomplishment.createdAt,
    updated_at: accomplishment.updatedAt,
  })
  const lifecycleRevisionId = randomUUID()
  await db.table('accomplishment_lifecycle_revisions').insert({
    id: lifecycleRevisionId,
    contract_version: 1,
    schema_version: 'suar.accomplishment_lifecycle_revision.v1',
    accomplishment_id: accomplishment.id,
    sequence: 3,
    previous_state: 'under_review',
    next_state: 'verified',
    visibility: 'internal',
    reason_code: 'verification_completed',
    source_fact_id: randomUUID(),
    source_fact_type: 'review_finalized',
    source_fact_hash: `sha256:${'c'.repeat(64)}`,
    actor_type: 'system',
    actor_user_id: null,
    policy_version: 'accomplishment-policy-v1',
    supersedes_revision_id: null,
    related_accomplishment_id: null,
    revision_payload: {},
    occurred_at: new Date('2026-07-31T10:00:00.000Z'),
  })
  return { accomplishment, lifecycleRevisionId }
}

function input(
  seeded: SeededAccomplishment,
  overrides: Partial<CreateAccomplishmentPublicProjectionInput> & {
    title?: string
    publishedAt?: string
    organizationLabel?: string | null
  } = {}
): CreateAccomplishmentPublicProjectionInput {
  const projectionKey = overrides.projectionKey ?? `appub:v1:${'a'.repeat(64)}`
  return {
    projectionKey,
    projection: {
      contractVersion: 1,
      id: overrides.projection?.id ?? randomUUID(),
      accomplishmentId: seeded.accomplishment.id,
      userId: seeded.accomplishment.userId,
      sourceLifecycleRevisionId: seeded.lifecycleRevisionId,
      sourceCanonicalHash: seeded.accomplishment.canonicalHash,
      title: overrides.title ?? seeded.accomplishment.title,
      conciseStatement: seeded.accomplishment.conciseStatement,
      action: seeded.accomplishment.action,
      object: seeded.accomplishment.object,
      taskType: seeded.accomplishment.taskType,
      businessDomain: seeded.accomplishment.businessDomain,
      problemCategory: seeded.accomplishment.problemCategory,
      role: seeded.accomplishment.role,
      ownershipLevel: seeded.accomplishment.ownershipLevel,
      autonomyLevel: seeded.accomplishment.autonomyLevel,
      collaborationType: seeded.accomplishment.collaborationType,
      context: {
        environment: 'production',
        systemArea: 'order_workflow',
        scaleSummary: 'Multi-service transaction flow',
      },
      deliverableSummaries: ['OpenAPI specification'],
      outcomeSummaries: ['Acceptance scenarios verified'],
      technology: ['AdonisJS', 'PostgreSQL'],
      capabilities: [
        { capabilityId: randomUUID(), label: 'API design', confidenceBand: 'high' },
      ],
      verification: {
        status: 'verified',
        methodLabel: 'Design and code review',
        confidenceBand: 'high',
        reviewerRoleLabels: ['Backend Lead'],
        verifiedAt: '2026-07-31T10:00:00.000Z',
        evidenceAvailability: 'not_disclosed',
        provenanceClass: 'native_prework',
      },
      disclosure: {
        redactionState: 'generalized',
        disclosurePolicyVersion: 'public-disclosure-v1',
        organizationLabel: overrides.organizationLabel ?? null,
        projectLabel: null,
      },
      publishedAt: overrides.publishedAt ?? '2026-08-01T10:00:00.000Z',
      sourceUpdatedAt: seeded.accomplishment.updatedAt,
    },
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

test.group('Integration | Accomplishment public projection repository', (group) => {
  const repository = new AccomplishmentPublicProjectionRepository()

  group.setup(async () => {
    await setupApp()
  })
  group.each.setup(cleanup)
  group.each.teardown(cleanup)
  group.teardown(async () => {
    await teardownApp()
  })

  test('persists one version and returns the exact row on idempotent replay', async ({ assert }) => {
    const seeded = await seedVerifiedAccomplishment()
    const request = input(seeded)

    const created = await repository.publish(request)
    const replay = await repository.publish(request)

    assert.isTrue(created.inserted)
    assert.isFalse(replay.inserted)
    assert.deepEqual(replay.projection, created.projection)
    const count = (await db
      .from('accomplishment_public_projections')
      .count('* as total')
      .first()) as CountRow | undefined
    assert.equal(Number(count?.total), 1)
  })

  test('rejects same idempotency identity with different approved content', async ({ assert }) => {
    const seeded = await seedVerifiedAccomplishment()
    const request = input(seeded)
    await repository.publish(request)

    await assert.rejects(
      () =>
        repository.publish(
          input(seeded, { ...request, organizationLabel: 'Different approved organization' })
        ),
      AccomplishmentPublicProjectionCollisionException
    )
  })

  test('versions replacements atomically, retires the prior row and keeps one active projection', async ({
    assert,
  }) => {
    const seeded = await seedVerifiedAccomplishment()
    const firstRequest = input(seeded)
    const first = await repository.publish(firstRequest)
    const second = await repository.publish(
      input(seeded, {
        projectionKey: `appub:v1:${'b'.repeat(64)}`,
        projection: { ...firstRequest.projection, id: randomUUID() },
        organizationLabel: 'Approved public organization',
        publishedAt: '2026-08-02T10:00:00.000Z',
      })
    )
    const oldReplay = await repository.publish(firstRequest)
    const rows = (await db
      .from('accomplishment_public_projections')
      .where('accomplishment_id', seeded.accomplishment.id)
      .orderBy('publication_version', 'asc')) as PublicProjectionRow[]

    assert.equal(first.projection.publicationVersion, 1)
    assert.equal(second.projection.publicationVersion, 2)
    assert.isFalse(oldReplay.inserted)
    assert.isNotNull(rows[0]?.retired_at)
    assert.isNull(rows[1]?.retired_at)
    assert.equal(rows.filter((row) => row.retired_at === null).length, 1)
  })

  test('unpublishes by retiring the target version and an old replay cannot retire a republish', async ({
    assert,
  }) => {
    const seeded = await seedVerifiedAccomplishment()
    const firstRequest = input(seeded)
    const first = await repository.publish(firstRequest)
    const retirement = {
      accomplishmentId: seeded.accomplishment.id,
      subjectUserId: seeded.accomplishment.userId,
      projectionId: first.projection.id,
      publicationVersion: first.projection.publicationVersion,
      retiredAt: '2026-08-02T10:00:00.000Z',
    }

    const firstRetirement = await repository.retireActive(retirement)
    const retirementReplay = await repository.retireActive(retirement)
    assert.isTrue(firstRetirement.changed)
    assert.isFalse(retirementReplay.changed)

    const second = await repository.publish(
      input(seeded, {
        projectionKey: `appub:v1:${'b'.repeat(64)}`,
        publishedAt: '2026-08-03T10:00:00.000Z',
      })
    )
    const staleRetirement = await repository.retireActive(retirement)
    assert.isFalse(staleRetirement.changed)
    const active = (await db
      .from('accomplishment_public_projections')
      .where('accomplishment_id', seeded.accomplishment.id)
      .whereNull('retired_at')
      .first()) as PublicProjectionRow | undefined
    assert.equal(active?.id, second.projection.id)
  })

  test('rejects a stale source after the lifecycle becomes frozen', async ({ assert }) => {
    const seeded = await seedVerifiedAccomplishment()
    await db.table('accomplishment_lifecycle_revisions').insert({
      id: randomUUID(),
      contract_version: 1,
      schema_version: 'suar.accomplishment_lifecycle_revision.v1',
      accomplishment_id: seeded.accomplishment.id,
      sequence: 4,
      previous_state: 'verified',
      next_state: 'frozen',
      visibility: 'internal',
      reason_code: 'dispute_opened',
      source_fact_id: randomUUID(),
      source_fact_type: 'dispute',
      source_fact_hash: `sha256:${'d'.repeat(64)}`,
      actor_type: 'system',
      actor_user_id: null,
      policy_version: 'accomplishment-policy-v1',
      supersedes_revision_id: null,
      related_accomplishment_id: null,
      revision_payload: {},
      occurred_at: new Date('2026-08-01T09:30:00.000Z'),
    })

    await assert.rejects(
      () => repository.publish(input(seeded)),
      StaleAccomplishmentPublicationSourceException
    )
  })

  test('serializes concurrent publications into monotonic versions with one active row', async ({
    assert,
  }) => {
    const seeded = await seedVerifiedAccomplishment()
    const [left, right] = await Promise.all([
      repository.publish(input(seeded, { projectionKey: `appub:v1:${'a'.repeat(64)}` })),
      repository.publish(
        input(seeded, {
          projectionKey: `appub:v1:${'b'.repeat(64)}`,
          publishedAt: '2026-08-01T10:01:00.000Z',
        })
      ),
    ])

    assert.deepEqual(
      [left.projection.publicationVersion, right.projection.publicationVersion].sort(),
      [1, 2]
    )
    const activeCount = (await db
      .from('accomplishment_public_projections')
      .where('accomplishment_id', seeded.accomplishment.id)
      .whereNull('retired_at')
      .count('* as total')
      .first()) as CountRow | undefined
    assert.equal(Number(activeCount?.total), 1)
  })
})

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import {
  ACCOMPLISHMENT_TEST_HASHES,
  ACCOMPLISHMENT_TEST_IDS,
  validAccomplishmentLifecycleRevisionV1,
  validAccomplishmentPublicProjectionV1,
  validCapabilitySignalV1,
  validVerifiedWorkAccomplishmentV1,
} from '../unit/public_contracts/verified-work/accomplishment_contract_fixtures.js'

import AccomplishmentCapabilitySignal from '#modules/accomplishments/infra/models/verified-work/accomplishment_capability_signal'
import AccomplishmentClaimLink from '#modules/accomplishments/infra/models/verified-work/accomplishment_claim_link'
import AccomplishmentEvidenceLink from '#modules/accomplishments/infra/models/verified-work/accomplishment_evidence_link'
import AccomplishmentLifecycleRevision from '#modules/accomplishments/infra/models/lifecycle/accomplishment_lifecycle_revision'
import AccomplishmentPublicProjection from '#modules/accomplishments/infra/models/publication/accomplishment_public_projection'
import VerifiedWorkAccomplishment from '#modules/accomplishments/infra/models/verified-work/verified_work_accomplishment'
import { parseAccomplishmentCapabilitySignalV1 } from '#modules/accomplishments/public_contracts/verified-work/accomplishment_capability_signal_v1'
import { parseAccomplishmentLifecycleRevisionV1 } from '#modules/accomplishments/public_contracts/lifecycle/accomplishment_lifecycle_v1'
import { parseAccomplishmentPublicProjectionV1 } from '#modules/accomplishments/public_contracts/publication/accomplishment_public_projection_v1'
import { parseVerifiedWorkAccomplishmentV1 } from '#modules/accomplishments/public_contracts/verified-work/verified_work_accomplishment_v1'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { testId } from '#tests/helpers/test_utils'

const ACCOMPLISHMENT_TABLES = [
  'verified_work_accomplishments',
  'accomplishment_claim_links',
  'accomplishment_evidence_links',
  'accomplishment_review_observation_links',
  'accomplishment_capability_signals',
  'accomplishment_lifecycle_revisions',
  'accomplishment_public_projections',
] as const

const ACCOMPLISHMENT_SCHEMA_VERSIONS = {
  accomplishment: 'suar.verified_work_accomplishment.v1',
  claimLink: 'suar.accomplishment_claim_link.v1',
  evidenceLink: 'suar.accomplishment_evidence_link.v1',
  capabilitySignal: 'suar.accomplishment_capability_signal.v1',
  lifecycleRevision: 'suar.accomplishment_lifecycle_revision.v1',
  publicProjection: 'suar.accomplishment_public_projection.v1',
} as const

async function cleanupAccomplishmentTables(): Promise<void> {
  for (const table of [...ACCOMPLISHMENT_TABLES].reverse()) {
    await db.from(table).delete()
  }
}

type CanonicalCreateInput = Parameters<typeof VerifiedWorkAccomplishment.create>[0]

function canonicalAccomplishmentRow(
  overrides: Partial<CanonicalCreateInput> = {}
): CanonicalCreateInput {
  const payload = parseVerifiedWorkAccomplishmentV1(validVerifiedWorkAccomplishmentV1())
  const completionClaimId = payload.provenance.completionClaimIds[0]
  if (!completionClaimId) {
    throw new Error('Canonical fixture must include a completion claim')
  }

  return {
    id: payload.id,
    projection_key: `review:${payload.provenance.reviewWorkflowId}:${completionClaimId}`,
    contract_version: 1 as const,
    schema_version: ACCOMPLISHMENT_SCHEMA_VERSIONS.accomplishment,
    policy_version: payload.provenance.policyVersion,
    user_id: payload.userId,
    organization_id: payload.organizationId,
    project_id: payload.projectId,
    task_id: payload.taskId,
    task_assignment_id: payload.taskAssignmentId,
    title: payload.title,
    concise_statement: payload.conciseStatement,
    detailed_statement: payload.detailedStatement,
    action: payload.action,
    object: payload.object,
    task_type: payload.taskType,
    business_domain: payload.businessDomain,
    problem_category: payload.problemCategory,
    role: payload.role,
    ownership_level: payload.ownershipLevel,
    autonomy_level: payload.autonomyLevel,
    collaboration_type: payload.collaborationType,
    environment: payload.context.environment,
    system_area: payload.context.systemArea,
    scale_summary: payload.context.scaleSummary,
    verification_method: payload.verification.method,
    confidence_score: payload.verification.confidenceScore,
    confidence_band: payload.verification.confidenceBand,
    evidence_sufficiency: payload.verification.evidenceSufficiency,
    lifecycle_state: payload.lifecycleState,
    visibility: payload.visibility,
    provenance_class: payload.provenance.provenanceClass,
    project_context_version_id: payload.provenance.projectContextVersionId,
    work_package_version_id: payload.provenance.workPackageVersionId,
    task_specification_version_id: payload.provenance.taskSpecificationVersionId,
    task_contract_version_id: payload.provenance.taskContractVersionId,
    assignment_snapshot_id: payload.provenance.assignmentSnapshotId,
    completion_report_id: payload.provenance.completionReportId,
    review_workflow_id: payload.provenance.reviewWorkflowId,
    task_specification_hash: payload.provenance.sourceHashes.taskSpecification,
    task_contract_hash: payload.provenance.sourceHashes.taskContract,
    assignment_snapshot_hash: payload.provenance.sourceHashes.assignmentSnapshot,
    completion_report_hash: payload.provenance.sourceHashes.completionReport,
    review_hash: payload.provenance.sourceHashes.review,
    canonical_hash: payload.canonicalHash,
    canonical_payload: payload,
    verified_at: payload.verification.verifiedAt
      ? DateTime.fromISO(payload.verification.verifiedAt)
      : null,
    ...overrides,
  }
}

async function createCanonicalAccomplishment(): Promise<VerifiedWorkAccomplishment> {
  return VerifiedWorkAccomplishment.create(canonicalAccomplishmentRow())
}

test.group('Integration | Accomplishment persistence schema', (group) => {
  group.setup(async () => {
    await setupApp()
  })

  group.each.setup(async () => {
    await cleanupAccomplishmentTables()
  })

  group.each.teardown(async () => {
    await cleanupAccomplishmentTables()
  })

  group.teardown(async () => {
    await teardownApp()
  })

  test('WP-06 creates every canonical accomplishment persistence table', async ({ assert }) => {
    const rows = (await db
      .from('information_schema.tables')
      .select('table_name')
      .where('table_schema', 'public')
      .whereIn('table_name', [...ACCOMPLISHMENT_TABLES])) as Array<{ table_name: string }>

    assert.deepEqual(rows.map((row) => row.table_name).sort(), [...ACCOMPLISHMENT_TABLES].sort())
  })

  test('round-trips canonical work, links, signals, lifecycle and public-safe projection', async ({
    assert,
  }) => {
    const ids = ACCOMPLISHMENT_TEST_IDS
    const canonicalPayload = parseVerifiedWorkAccomplishmentV1(validVerifiedWorkAccomplishmentV1())
    const capabilityPayload = parseAccomplishmentCapabilitySignalV1(validCapabilitySignalV1())
    const lifecyclePayload = parseAccomplishmentLifecycleRevisionV1(
      validAccomplishmentLifecycleRevisionV1()
    )
    const publicPayload = parseAccomplishmentPublicProjectionV1(
      validAccomplishmentPublicProjectionV1()
    )
    const accomplishment = await createCanonicalAccomplishment()
    const reviewObservationId = capabilityPayload.reviewObservationIds[0]
    if (!reviewObservationId) {
      throw new Error('Capability fixture must include a review observation')
    }

    await AccomplishmentClaimLink.create({
      id: testId(),
      accomplishment_id: accomplishment.id,
      completion_claim_id: ids.completionClaim,
      subject_user_id: ids.user,
      claim_status: 'verified',
      ownership_level: 'primary_owner',
      source_claim_hash: ACCOMPLISHMENT_TEST_HASHES.completion,
      schema_version: ACCOMPLISHMENT_SCHEMA_VERSIONS.claimLink,
      claim_payload: {
        actualAction: canonicalPayload.action,
        actualObject: canonicalPayload.object,
      },
    })

    await AccomplishmentEvidenceLink.create({
      id: testId(),
      accomplishment_id: accomplishment.id,
      evidence_id: ids.evidence,
      completion_claim_id: ids.completionClaim,
      evidence_type: 'design_specification',
      access_classification: 'confidential',
      availability: 'available',
      content_hash: ACCOMPLISHMENT_TEST_HASHES.sourceFact,
      schema_version: ACCOMPLISHMENT_SCHEMA_VERSIONS.evidenceLink,
      evidence_payload: { title: 'Restricted design specification' },
    })

    await AccomplishmentCapabilitySignal.create({
      id: capabilityPayload.id,
      projection_key: `signal:${capabilityPayload.accomplishmentId}:${reviewObservationId}:${capabilityPayload.capabilityId}`,
      contract_version: 1,
      schema_version: ACCOMPLISHMENT_SCHEMA_VERSIONS.capabilitySignal,
      policy_version: capabilityPayload.policyVersion,
      accomplishment_id: capabilityPayload.accomplishmentId,
      subject_user_id: capabilityPayload.subjectUserId,
      capability_id: capabilityPayload.capabilityId,
      observed_behaviour: capabilityPayload.observedBehaviour,
      observed_level_code: capabilityPayload.observedLevelCode,
      assessment_ceiling_code: capabilityPayload.assessmentCeilingCode,
      direction: capabilityPayload.direction,
      applicability: capabilityPayload.applicability,
      action: capabilityPayload.context.action,
      object: capabilityPayload.context.object,
      ownership_level: capabilityPayload.context.ownershipLevel,
      complexity_summary: capabilityPayload.context.complexitySummary,
      confidence_score: capabilityPayload.confidenceScore,
      confidence_band: capabilityPayload.confidenceBand,
      signal_state: capabilityPayload.signalState,
      evidence_reference_ids: capabilityPayload.evidenceReferences,
      review_observation_ids: capabilityPayload.reviewObservationIds,
      source_observation_hash: ACCOMPLISHMENT_TEST_HASHES.review,
      signal_payload: capabilityPayload,
      observed_at: DateTime.fromISO(capabilityPayload.observedAt),
    })

    await AccomplishmentLifecycleRevision.create({
      id: lifecyclePayload.id,
      contract_version: 1,
      schema_version: ACCOMPLISHMENT_SCHEMA_VERSIONS.lifecycleRevision,
      accomplishment_id: lifecyclePayload.accomplishmentId,
      sequence: lifecyclePayload.sequence,
      previous_state: lifecyclePayload.previousState,
      next_state: lifecyclePayload.nextState,
      visibility: lifecyclePayload.visibility,
      reason_code: lifecyclePayload.reasonCode,
      source_fact_id: lifecyclePayload.sourceFact.id,
      source_fact_type: lifecyclePayload.sourceFact.type,
      source_fact_hash: lifecyclePayload.sourceFact.hash,
      actor_type: lifecyclePayload.actor.type,
      actor_user_id: lifecyclePayload.actor.userId,
      policy_version: lifecyclePayload.policyVersion,
      supersedes_revision_id: lifecyclePayload.supersedesRevisionId,
      related_accomplishment_id: lifecyclePayload.relatedAccomplishmentId,
      revision_payload: lifecyclePayload,
      occurred_at: DateTime.fromISO(lifecyclePayload.occurredAt),
    })

    await AccomplishmentPublicProjection.create({
      id: publicPayload.id,
      projection_key: `public:${publicPayload.accomplishmentId}:${publicPayload.publicationVersion}`,
      contract_version: 1,
      schema_version: ACCOMPLISHMENT_SCHEMA_VERSIONS.publicProjection,
      disclosure_policy_version: publicPayload.disclosure.disclosurePolicyVersion,
      accomplishment_id: publicPayload.accomplishmentId,
      user_id: publicPayload.userId,
      publication_version: publicPayload.publicationVersion,
      source_lifecycle_revision_id: publicPayload.sourceLifecycleRevisionId,
      source_canonical_hash: publicPayload.sourceCanonicalHash,
      title: publicPayload.title,
      concise_statement: publicPayload.conciseStatement,
      action: publicPayload.action,
      object: publicPayload.object,
      task_type: publicPayload.taskType,
      business_domain: publicPayload.businessDomain,
      problem_category: publicPayload.problemCategory,
      role: publicPayload.role,
      ownership_level: publicPayload.ownershipLevel,
      autonomy_level: publicPayload.autonomyLevel,
      collaboration_type: publicPayload.collaborationType,
      environment: publicPayload.context.environment,
      system_area: publicPayload.context.systemArea,
      scale_summary: publicPayload.context.scaleSummary,
      verification_status: publicPayload.verification.status,
      confidence_band: publicPayload.verification.confidenceBand,
      provenance_class: publicPayload.verification.provenanceClass,
      evidence_availability: publicPayload.verification.evidenceAvailability,
      redaction_state: publicPayload.disclosure.redactionState,
      public_payload: publicPayload,
      published_at: DateTime.fromISO(publicPayload.publishedAt),
      source_updated_at: DateTime.fromISO(publicPayload.sourceUpdatedAt),
      retired_at: null,
    })

    const reloaded = await VerifiedWorkAccomplishment.findOrFail(accomplishment.id)
    const signal = await AccomplishmentCapabilitySignal.findOrFail(capabilityPayload.id)
    const projection = await AccomplishmentPublicProjection.findOrFail(publicPayload.id)

    assert.equal(reloaded.canonical_payload.action, 'design_and_implement')
    assert.equal(reloaded.assignment_snapshot_hash, ACCOMPLISHMENT_TEST_HASHES.assignment)
    assert.equal(signal.signal_payload.observedLevelCode, 'l7')
    assert.deepEqual(signal.review_observation_ids, [ids.reviewObservation])
    assert.equal(projection.public_payload.ownershipLevel, 'primary_owner')
    assert.equal(projection.public_payload.verification.evidenceAvailability, 'not_disclosed')
    const claimCount = (await db.from('accomplishment_claim_links').count('* as total').first()) as
      | { total: string | number }
      | undefined
    const evidenceCount = (await db
      .from('accomplishment_evidence_links')
      .count('* as total')
      .first()) as { total: string | number } | undefined
    assert.equal(Number(claimCount?.total), 1)
    assert.equal(Number(evidenceCount?.total), 1)
  })

  test('RV-012 rejects a replay that reuses the canonical projection key', async ({ assert }) => {
    const existing = await createCanonicalAccomplishment()

    await assert.rejects(
      () =>
        VerifiedWorkAccomplishment.create(
          canonicalAccomplishmentRow({
            id: testId(),
            projection_key: existing.projection_key,
          })
        ),
      /uq_verified_work_accomplishments_projection_key/
    )
  })

  test('RV-011 enforces one append-only lifecycle revision per sequence', async ({ assert }) => {
    const accomplishment = await createCanonicalAccomplishment()
    const payload = parseAccomplishmentLifecycleRevisionV1(validAccomplishmentLifecycleRevisionV1())
    const baseRevision: Parameters<typeof AccomplishmentLifecycleRevision.create>[0] = {
      id: payload.id,
      contract_version: 1 as const,
      schema_version: ACCOMPLISHMENT_SCHEMA_VERSIONS.lifecycleRevision,
      accomplishment_id: accomplishment.id,
      sequence: payload.sequence,
      previous_state: payload.previousState,
      next_state: payload.nextState,
      visibility: payload.visibility,
      reason_code: payload.reasonCode,
      source_fact_id: payload.sourceFact.id,
      source_fact_type: payload.sourceFact.type,
      source_fact_hash: payload.sourceFact.hash,
      actor_type: payload.actor.type,
      actor_user_id: payload.actor.userId,
      policy_version: payload.policyVersion,
      supersedes_revision_id: payload.supersedesRevisionId,
      related_accomplishment_id: payload.relatedAccomplishmentId,
      revision_payload: payload,
      occurred_at: DateTime.fromISO(payload.occurredAt),
    }

    await AccomplishmentLifecycleRevision.create(baseRevision)
    await assert.rejects(
      () =>
        AccomplishmentLifecycleRevision.create({
          ...baseRevision,
          id: testId(),
          source_fact_id: testId(),
        }),
      /uq_accomplishment_lifecycle_sequence/
    )
  })

  test('PS-005 keeps private source identities out of the public projection columns', async ({
    assert,
  }) => {
    const rows = (await db
      .from('information_schema.columns')
      .select('column_name')
      .where('table_schema', 'public')
      .where('table_name', 'accomplishment_public_projections')) as Array<{
      column_name: string
    }>
    const columns = new Set(rows.map((row) => row.column_name))

    for (const forbidden of [
      'organization_id',
      'project_id',
      'task_id',
      'reviewer_ids',
      'evidence_ids',
      'source_url',
    ]) {
      assert.isFalse(columns.has(forbidden), `Public projection leaked column ${forbidden}`)
    }
  })

  test('keeps accomplishment tables free of database-owned relational business rules', async ({
    assert,
  }) => {
    const rows = (await db
      .from('pg_constraint as c')
      .join('pg_class as source', 'source.oid', 'c.conrelid')
      .join('pg_class as target', 'target.oid', 'c.confrelid')
      .whereIn('source.relname', [...ACCOMPLISHMENT_TABLES])
      .where('c.contype', 'f')
      .select(
        'source.relname as source_table',
        'target.relname as target_table',
        'c.conname as constraint_name',
        'c.confdeltype as delete_action'
      )) as Array<{
      source_table: string
      target_table: string
      constraint_name: string
      delete_action: string
    }>

    assert.lengthOf(rows, 0)
  })

  test('stores link rows without pretending storage is application validation', async ({ assert }) => {
    const ids = ACCOMPLISHMENT_TEST_IDS
    const orphanId = testId()
    await AccomplishmentClaimLink.create({
      id: orphanId,
      accomplishment_id: testId(),
      completion_claim_id: ids.completionClaim,
      subject_user_id: ids.user,
      claim_status: 'verified',
      ownership_level: 'primary_owner',
      source_claim_hash: ACCOMPLISHMENT_TEST_HASHES.completion,
      schema_version: ACCOMPLISHMENT_SCHEMA_VERSIONS.claimLink,
      claim_payload: { action: 'design_and_implement' },
    })
    assert.equal((await AccomplishmentClaimLink.find(orphanId))?.id, orphanId)
  })

  test('still rolls back partial accomplishment writes at the transaction boundary', async ({ assert }) => {
    const ids = ACCOMPLISHMENT_TEST_IDS
    const rollbackId = testId()
    await assert.rejects(async () => {
      await db.transaction(async (trx) => {
        await VerifiedWorkAccomplishment.create(canonicalAccomplishmentRow({ id: rollbackId }), {
          client: trx,
        })
        await AccomplishmentClaimLink.create(
          {
            id: testId(),
            accomplishment_id: rollbackId,
            completion_claim_id: ids.completionClaim,
            subject_user_id: ids.user,
            claim_status: 'verified',
            ownership_level: 'primary_owner',
            source_claim_hash: ACCOMPLISHMENT_TEST_HASHES.completion,
            schema_version: ACCOMPLISHMENT_SCHEMA_VERSIONS.claimLink,
            claim_payload: { action: 'design_and_implement' },
          },
          { client: trx }
        )
        throw new Error('force accomplishment transaction rollback')
      })
    }, /force accomplishment transaction rollback/)

    const accomplishment = await VerifiedWorkAccomplishment.find(rollbackId)
    const claim = await AccomplishmentClaimLink.findBy('accomplishment_id', rollbackId)
    assert.isNull(accomplishment)
    assert.isNull(claim)
  })
})

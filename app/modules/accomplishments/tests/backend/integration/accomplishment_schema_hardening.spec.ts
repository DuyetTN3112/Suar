import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import AccomplishmentReviewObservationLink from '#modules/accomplishments/infra/models/verified-work/accomplishment_review_observation_link'
import VerifiedWorkAccomplishment from '#modules/accomplishments/infra/models/verified-work/verified_work_accomplishment'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

const HASH = `sha256:${'a'.repeat(64)}`

type AccomplishmentCreateInput = Parameters<typeof VerifiedWorkAccomplishment.create>[0]

function accomplishmentInput(id: string): AccomplishmentCreateInput {
  return {
    id,
    projection_key: `projection:${id}`,
    contract_version: 1,
    schema_version: 'suar.verified_work_accomplishment.v1',
    policy_version: 'accomplishment-policy-v1',
    user_id: randomUUID(),
    organization_id: null,
    project_id: null,
    task_id: randomUUID(),
    task_assignment_id: randomUUID(),
    title: 'Designed an order API',
    concise_statement: 'Designed a reviewed order API contract.',
    detailed_statement: null,
    action: 'design',
    object: 'order_api',
    task_type: 'feature_development',
    business_domain: 'commerce',
    problem_category: 'api_design',
    role: 'backend_engineer',
    ownership_level: 'primary_owner',
    autonomy_level: 'independent',
    collaboration_type: 'team',
    environment: 'production',
    system_area: 'orders',
    scale_summary: null,
    verification_method: 'peer_review',
    confidence_score: 0.9,
    confidence_band: 'high',
    evidence_sufficiency: 'adequate',
    lifecycle_state: 'verified',
    visibility: 'internal',
    provenance_class: 'native_prework',
    project_context_version_id: null,
    work_package_version_id: null,
    task_specification_version_id: randomUUID(),
    task_contract_version_id: randomUUID(),
    assignment_snapshot_id: randomUUID(),
    completion_report_id: randomUUID(),
    review_workflow_id: randomUUID(),
    task_specification_hash: HASH,
    task_contract_hash: HASH,
    assignment_snapshot_hash: HASH,
    completion_report_hash: HASH,
    review_hash: HASH,
    canonical_hash: HASH,
    canonical_payload: {},
    verified_at: null,
  }
}

function lifecycleRow(
  accomplishmentId: string,
  id: string,
  sequence: number,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    id,
    contract_version: 1,
    schema_version: 'suar.accomplishment_lifecycle_revision.v1',
    accomplishment_id: accomplishmentId,
    sequence,
    previous_state: sequence === 1 ? null : 'verified',
    next_state: 'verified',
    visibility: 'internal',
    reason_code: 'verification_completed',
    source_fact_id: randomUUID(),
    source_fact_type: 'review_finalized',
    source_fact_hash: HASH,
    actor_type: 'system',
    actor_user_id: null,
    policy_version: 'accomplishment-policy-v1',
    supersedes_revision_id: null,
    related_accomplishment_id: null,
    revision_payload: {},
    occurred_at: new Date(),
    ...overrides,
  }
}

function publicProjectionRow(
  accomplishment: VerifiedWorkAccomplishment,
  sourceLifecycleRevisionId: string
): Record<string, unknown> {
  return {
    projection_key: `public:${accomplishment.id}:1`,
    contract_version: 1,
    schema_version: 'suar.accomplishment_public_projection.v1',
    disclosure_policy_version: 'disclosure-policy-v1',
    accomplishment_id: accomplishment.id,
    user_id: accomplishment.user_id,
    publication_version: 1,
    source_lifecycle_revision_id: sourceLifecycleRevisionId,
    source_canonical_hash: HASH,
    title: accomplishment.title,
    concise_statement: accomplishment.concise_statement,
    action: accomplishment.action,
    object: accomplishment.object,
    task_type: accomplishment.task_type,
    business_domain: accomplishment.business_domain,
    problem_category: accomplishment.problem_category,
    role: accomplishment.role,
    ownership_level: accomplishment.ownership_level,
    autonomy_level: accomplishment.autonomy_level,
    collaboration_type: accomplishment.collaboration_type,
    environment: accomplishment.environment,
    system_area: accomplishment.system_area,
    scale_summary: accomplishment.scale_summary,
    verification_status: 'verified',
    confidence_band: 'high',
    provenance_class: accomplishment.provenance_class,
    evidence_availability: 'not_disclosed',
    redaction_state: 'redacted',
    public_payload: {},
    published_at: new Date(),
    source_updated_at: new Date(),
    retired_at: null,
  }
}

async function cleanup(): Promise<void> {
  for (const table of [
    'accomplishment_review_observation_links',
    'accomplishment_public_projections',
    'accomplishment_lifecycle_revisions',
    'accomplishment_evidence_links',
    'accomplishment_claim_links',
    'verified_work_accomplishments',
  ]) {
    await db.from(table).delete()
  }
}

test.group('Integration | Accomplishment schema hardening', (group) => {
  group.setup(async () => {
    await setupApp()
  })

  group.each.setup(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await cleanup()
  })

  group.teardown(async () => {
    await teardownApp()
  })

  test('normalizes exact immutable review-observation provenance', async ({ assert }) => {
    const accomplishment = await VerifiedWorkAccomplishment.create(
      accomplishmentInput(randomUUID())
    )
    const observationId = randomUUID()
    const revisionId = randomUUID()
    const factId = randomUUID()

    const link = await AccomplishmentReviewObservationLink.create({
      accomplishment_id: accomplishment.id,
      review_observation_id: observationId,
      observation_revision_id: revisionId,
      observation_fact_id: factId,
      observation_type: 'accomplishment_claim',
      disposition: 'confirm',
      governance_state: 'final',
      source_observation_hash: HASH,
      schema_version: 'suar.accomplishment_review_observation_link.v1',
      link_payload: { observationId, revisionId, factId },
    })
    const reloaded = await AccomplishmentReviewObservationLink.findOrFail(link.id)

    assert.equal(reloaded.accomplishment_id, accomplishment.id)
    assert.equal(reloaded.review_observation_id, observationId)
    assert.equal(reloaded.observation_revision_id, revisionId)
    assert.equal(reloaded.observation_fact_id, factId)
    assert.deepEqual(reloaded.link_payload, { observationId, revisionId, factId })
    assert.equal(reloaded.id.at(14), '7')

    await assert.rejects(
      () =>
        AccomplishmentReviewObservationLink.create({
          accomplishment_id: accomplishment.id,
          review_observation_id: observationId,
          observation_revision_id: revisionId,
          observation_fact_id: factId,
          observation_type: 'accomplishment_claim',
          disposition: 'confirm',
          governance_state: 'final',
          source_observation_hash: HASH,
          schema_version: 'suar.accomplishment_review_observation_link.v1',
          link_payload: {},
        }),
      /uq_accomplishment_review_observation_links_revision/
    )
  })

  test('stores evidence links without enforcing cross-row ownership in the database', async ({
    assert,
  }) => {
    const first = await VerifiedWorkAccomplishment.create(accomplishmentInput(randomUUID()))
    const second = await VerifiedWorkAccomplishment.create(accomplishmentInput(randomUUID()))
    const claimId = randomUUID()

    await db.table('accomplishment_claim_links').insert({
      accomplishment_id: second.id,
      completion_claim_id: claimId,
      subject_user_id: second.user_id,
      claim_status: 'verified',
      ownership_level: 'primary_owner',
      source_claim_hash: HASH,
      schema_version: 'suar.accomplishment_claim_link.v1',
      claim_payload: {},
    })

    await db.table('accomplishment_evidence_links').insert({
      accomplishment_id: first.id,
      evidence_id: randomUUID(),
      completion_claim_id: claimId,
      evidence_type: 'design_specification',
      access_classification: 'confidential',
      availability: 'available',
      content_hash: HASH,
      schema_version: 'suar.accomplishment_evidence_link.v1',
      evidence_payload: {},
    })
    const evidenceCount = (await db
      .from('accomplishment_evidence_links')
      .where('accomplishment_id', first.id)
      .count('* as total')
      .first()) as { total?: string | number } | undefined
    assert.equal(Number(evidenceCount?.total), 1)
  })

  test('does not declare accomplishment foreign keys after invariant migration', async ({ assert }) => {
    const rows = (await db
      .from('pg_constraint')
      .select('conname')
      .select(db.raw('pg_get_constraintdef(oid) AS definition'))
      .whereIn('conname', [
        'fk_alr_supersedes_same_accomplishment',
        'fk_alr_related_accomplishment',
        'fk_app_lifecycle_same_accomplishment',
      ])) as Array<{ conname: string; definition: string }>
    assert.lengthOf(rows, 0)
  })

  test('keeps TVA storage tables free of database-owned foreign keys and checks', async ({
    assert,
  }) => {
    const tvaStorageTables = [
      'project_context_versions',
      'work_packages',
      'work_package_versions',
      'task_specification_versions',
      'task_contract_versions',
      'task_supporting_references',
      'task_evidence_requirements',
      'task_readiness_assessments',
      'task_authoring_heads',
      'task_completion_reports',
      'task_completion_criterion_results',
      'task_completion_evidence_manifest',
      'task_completion_contributor_claims',
      'task_completion_evidence_mappings',
      'task_assignment_contract_heads',
      'task_assignment_snapshots',
      'task_assignment_acknowledgements',
      'task_assignment_clarification_requests',
      'task_review_workflows',
      'review_sessions',
      'review_observations',
      'review_observation_revisions',
      'review_observation_evidence_links',
      'verified_work_accomplishments',
      'accomplishment_claim_links',
      'accomplishment_evidence_links',
      'accomplishment_review_observation_links',
      'accomplishment_capability_signals',
      'accomplishment_lifecycle_revisions',
      'accomplishment_public_projections',
    ]

    const rows = (await db
      .from('pg_constraint as c')
      .join('pg_class as t', 't.oid', 'c.conrelid')
      .join('pg_namespace as n', 'n.oid', 't.relnamespace')
      .where('n.nspname', 'public')
      .whereIn('t.relname', tvaStorageTables)
      .whereIn('c.contype', ['f', 'c'])
      .select('t.relname as table_name', 'c.conname as constraint_name')) as Array<{
      table_name: string
      constraint_name: string
    }>

    assert.deepEqual(rows, [])
  })

  test('stores lifecycle and publication references for application validation', async ({
    assert,
  }) => {
    const first = await VerifiedWorkAccomplishment.create(accomplishmentInput(randomUUID()))
    const second = await VerifiedWorkAccomplishment.create(accomplishmentInput(randomUUID()))
    const firstRevisionId = randomUUID()
    const secondRevisionId = randomUUID()
    await db.table('accomplishment_lifecycle_revisions').insert([
      lifecycleRow(first.id, firstRevisionId, 1),
      lifecycleRow(second.id, secondRevisionId, 1),
    ])

    await db.table('accomplishment_lifecycle_revisions').insert(
      lifecycleRow(first.id, randomUUID(), 2, {
        supersedes_revision_id: secondRevisionId,
      })
    )
    await db.table('accomplishment_lifecycle_revisions').insert(
      lifecycleRow(first.id, randomUUID(), 3, {
        supersedes_revision_id: firstRevisionId,
        related_accomplishment_id: randomUUID(),
      })
    )
    await db.table('accomplishment_public_projections').insert(publicProjectionRow(first, secondRevisionId))
    const projectionCount = (await db
      .from('accomplishment_public_projections')
      .where('accomplishment_id', first.id)
      .count('* as total')
      .first()) as { total?: string | number } | undefined
    assert.equal(Number(projectionCount?.total), 1)
  })

  test('stores orphan normalized review-observation links for application validation', async ({ assert }) => {
    const link = await AccomplishmentReviewObservationLink.create({
      accomplishment_id: randomUUID(),
      review_observation_id: randomUUID(),
      observation_revision_id: randomUUID(),
      observation_fact_id: randomUUID(),
      observation_type: 'accomplishment_claim',
      disposition: 'confirm',
      governance_state: 'final',
      source_observation_hash: HASH,
      schema_version: 'suar.accomplishment_review_observation_link.v1',
      link_payload: {},
    })
    assert.exists(link.id)
  })
})

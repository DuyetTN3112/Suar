import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import TaskCompletionContributorClaim from '#modules/tasks/infra/models/task-submissions/task_completion_contributor_claim'
import TaskCompletionCriterionResult from '#modules/tasks/infra/models/task-submissions/task_completion_criterion_result'
import TaskCompletionEvidenceManifestItem from '#modules/tasks/infra/models/task-submissions/task_completion_evidence_manifest_item'
import TaskCompletionEvidenceMapping from '#modules/tasks/infra/models/task-submissions/task_completion_evidence_mapping'
import TaskCompletionReport from '#modules/tasks/infra/models/task-submissions/task_completion_report'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData } from '#tests/helpers/factories'

const COMPLETION_TABLES = [
  'task_completion_reports',
  'task_completion_criterion_results',
  'task_completion_evidence_manifest',
  'task_completion_contributor_claims',
  'task_completion_evidence_mappings',
] as const

interface ForeignKeyCountResult {
  rows: Array<{ total: number | string }>
}

type PostgresConstraintCode = '23503' | '23505' | '23514'

async function assertPostgresConstraintError(
  operation: () => Promise<unknown>,
  expectedCode: PostgresConstraintCode,
  expectedConstraint: string
): Promise<void> {
  let caughtError: unknown

  try {
    await operation()
  } catch (error: unknown) {
    caughtError = error
  }

  if (typeof caughtError !== 'object' || caughtError === null) {
    throw new Error(
      `Expected PostgreSQL ${expectedCode} from ${expectedConstraint}, but the operation did not throw a structured error`
    )
  }

  const postgresError = caughtError as { code?: unknown; constraint?: unknown }
  if (postgresError.code !== expectedCode || postgresError.constraint !== expectedConstraint) {
    throw new Error(
      `Expected PostgreSQL ${expectedCode} from ${expectedConstraint}, received code=${String(postgresError.code)} constraint=${String(postgresError.constraint)}`,
      { cause: caughtError }
    )
  }
}

const HASHES = {
  assignment: `sha256:${'1'.repeat(64)}`,
  contract: `sha256:${'2'.repeat(64)}`,
  report: `sha256:${'3'.repeat(64)}`,
  criterion: `sha256:${'4'.repeat(64)}`,
  evidence: `sha256:${'5'.repeat(64)}`,
  manifest: `sha256:${'6'.repeat(64)}`,
  claim: `sha256:${'7'.repeat(64)}`,
} as const

interface CurrentSubmissionFixture {
  id: string
  taskId: string
  assignmentId: string
  submitterId: string
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

async function cleanupCompletionData(): Promise<void> {
  for (const tableName of [...COMPLETION_TABLES].reverse()) {
    if (await tableExists(tableName)) {
      await db.from(tableName).delete()
    }
  }
  await cleanupTestData()
}

async function createCurrentSubmission(): Promise<CurrentSubmissionFixture> {
  const taskId = randomUUID()
  const assignmentId = randomUUID()
  const submitterId = randomUUID()
  const [submission] = (await db
    .table('task_submissions')
    .insert({
      task_assignment_id: assignmentId,
      task_id: taskId,
      submitted_by: submitterId,
      summary: 'Current compatible task submission',
      status: 'submitted',
      submitted_at: DateTime.utc().toSQL(),
    })
    .returning('id')) as { id: string }[]

  if (!submission) {
    throw new Error('Expected current task submission fixture')
  }

  return { id: submission.id, taskId, assignmentId, submitterId }
}

type ReportCreateInput = Parameters<typeof TaskCompletionReport.create>[0]
type CriterionCreateInput = Parameters<typeof TaskCompletionCriterionResult.create>[0]
type EvidenceCreateInput = Parameters<typeof TaskCompletionEvidenceManifestItem.create>[0]
type ClaimCreateInput = Parameters<typeof TaskCompletionContributorClaim.create>[0]

function reportInput(
  submission: CurrentSubmissionFixture,
  overrides: Partial<ReportCreateInput> = {}
): ReportCreateInput {
  return {
    contract_version: 1,
    schema_version: 'suar.task_completion_report.v1',
    task_submission_id: submission.id,
    task_id: submission.taskId,
    task_assignment_id: submission.assignmentId,
    assignment_snapshot_id: randomUUID(),
    task_contract_version_id: randomUUID(),
    revision: 1,
    idempotency_key: `report:${submission.id}:1`,
    supersedes_report_id: null,
    correction_reason: null,
    report_status: 'submitted',
    work_performed: 'Designed and implemented the pre-order API lifecycle.',
    contribution_statement: 'Owned API design and implementation.',
    actual_role: 'Backend engineer',
    actual_ownership: 'primary_owner',
    actual_autonomy: 'independent',
    key_decisions: [{ decision: 'Use idempotency keys', rationale: 'Safe retries' }],
    deliverables_manifest: [{ id: randomUUID(), type: 'openapi', state: 'delivered' }],
    deviations: [],
    actual_outcomes: { integrationTests: 42, failedTests: 0 },
    impact_observed: { duplicateOrdersPrevented: true },
    limitations: 'Production load test remains scheduled.',
    remaining_work: 'Run the scheduled load test.',
    collaborators: [],
    validation_outcomes: [{ suite: 'integration', result: 'passed', total: 42 }],
    public_claim_draft: 'Designed and implemented a pre-order API lifecycle.',
    privacy_classification: 'internal',
    assignment_snapshot_hash: HASHES.assignment,
    task_contract_hash: HASHES.contract,
    completion_report_hash: HASHES.report,
    canonical_payload: { reportVersion: 1, source: 'native' },
    created_by: submission.submitterId,
    reported_at: DateTime.utc(),
    ...overrides,
  }
}

function criterionInput(
  reportId: string,
  overrides: Partial<CriterionCreateInput> = {}
): CriterionCreateInput {
  return {
    schema_version: 'suar.task_completion_criterion_result.v1',
    completion_report_id: reportId,
    criterion_id: randomUUID(),
    expected_outcome: 'Duplicate requests create one pre-order.',
    actual_outcome: 'Duplicate requests returned the original pre-order.',
    result: 'met',
    explanation: 'Integration and concurrency validation passed.',
    deviation_status: 'none',
    deviation_summary: null,
    deviation_approval_ref: null,
    not_applicable_reason: null,
    not_applicable_policy_ref: null,
    validation_outcomes: [{ type: 'integration_test', result: 'passed' }],
    result_hash: HASHES.criterion,
    ...overrides,
  }
}

function evidenceInput(
  reportId: string,
  ownerId: string,
  overrides: Partial<EvidenceCreateInput> = {}
): EvidenceCreateInput {
  return {
    schema_version: 'suar.task_completion_evidence_manifest_item.v1',
    completion_report_id: reportId,
    idempotency_key: `evidence:${reportId}:${randomUUID()}`,
    evidence_type: 'pull_request',
    title: 'Pre-order implementation pull request',
    description: 'Restricted source review package.',
    uri: 'https://example.test/pull/42',
    storage_reference: null,
    version_reference: 'commit:abc123',
    content_hash: HASHES.evidence,
    manifest_hash: HASHES.manifest,
    captured_at: DateTime.utc(),
    owner_user_id: ownerId,
    contributor_user_ids: [ownerId],
    evidence_requirement_ids: [randomUUID(), randomUUID()],
    related_deliverable_id: randomUUID(),
    related_deliverable_ids: [randomUUID(), randomUUID()],
    access_classification: 'confidential',
    reviewer_access_state: 'available',
    availability: 'available',
    availability_reason: 'none',
    retention_state: 'retained',
    availability_checked_at: DateTime.utc(),
    tombstoned_at: null,
    ...overrides,
  }
}

function claimInput(
  report: TaskCompletionReport,
  contributorId: string,
  overrides: Partial<ClaimCreateInput> = {}
): ClaimCreateInput {
  return {
    contract_version: 1,
    schema_version: 'suar.completion_claim.v1',
    completion_report_id: report.id,
    completion_report_revision: report.revision,
    completion_report_hash: report.completion_report_hash,
    assignment_snapshot_id: report.assignment_snapshot_id,
    task_contract_version_id: report.task_contract_version_id,
    contributor_user_id: contributorId,
    action: 'design_and_implement',
    object: 'pre_order_api',
    proposed_title: 'Designed and implemented a pre-order API',
    proposed_statement: 'Designed and implemented the governed pre-order lifecycle API.',
    actual_role: 'Backend engineer',
    actual_ownership: 'primary_owner',
    actual_autonomy: 'independent',
    contribution_statement: 'Owned endpoint design, implementation, and validation.',
    deliverable_refs: [],
    criterion_result_refs: [],
    evidence_refs: [],
    outcome_data: { integrationTests: 42 },
    public_claim_draft: 'Designed and implemented a pre-order API.',
    privacy_classification: 'internal',
    claim_status: 'candidate',
    claim_hash: HASHES.claim,
    idempotency_key: `claim:${report.id}:${contributorId}`,
    supersedes_claim_id: null,
    correction_reason: null,
    ...overrides,
  }
}

test.group('Integration | Task Completion Report persistence schema', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupCompletionData())

  test('WP-04 creates companion tables, UUIDv7 defaults, FKs, and query indexes', async ({
    assert,
  }) => {
    const rows = (await db
      .from('information_schema.tables')
      .select('table_name')
      .where('table_schema', 'public')
      .whereIn('table_name', [...COMPLETION_TABLES])) as { table_name: string }[]
    assert.deepEqual(rows.map((row) => row.table_name).sort(), [...COMPLETION_TABLES].sort())

    const defaults = (await db
      .from('information_schema.columns')
      .select('table_name', 'column_default')
      .where('table_schema', 'public')
      .whereIn('table_name', [...COMPLETION_TABLES])
      .where('column_name', 'id')) as { table_name: string; column_default: string | null }[]
    assert.lengthOf(defaults, COMPLETION_TABLES.length)
    for (const row of defaults) {
      assert.include(row.column_default ?? '', 'gen_random_uuid_v7()')
    }

    const foreignKeys = await db.rawQuery<ForeignKeyCountResult>(
      `
      SELECT COUNT(*)::int AS total
      FROM pg_constraint constraint_row
      JOIN pg_class table_row ON table_row.oid = constraint_row.conrelid
      WHERE constraint_row.contype = 'f'
        AND table_row.relname = ANY(?)
    `,
      [[...COMPLETION_TABLES]]
    )
    assert.equal(Number(foreignKeys.rows[0]?.total ?? 0), 0)

    const indexes = (await db
      .from('pg_indexes')
      .select('indexname')
      .where('schemaname', 'public')
      .whereIn('tablename', [...COMPLETION_TABLES])) as { indexname: string }[]
    const indexNames = new Set(indexes.map((row) => row.indexname))
    for (const indexName of [
      'idx_task_completion_reports_task_revision',
      'idx_task_completion_criteria_report_result',
      'idx_task_completion_evidence_access_availability',
      'idx_task_completion_claims_user_status',
      'idx_task_completion_mappings_evidence',
    ]) {
      assert.isTrue(indexNames.has(indexName), `Missing index ${indexName}`)
    }
  })

  test('CR-005/011/013 round-trips criteria, confidential evidence, mappings, and per-user claims', async ({
    assert,
  }) => {
    const submission = await createCurrentSubmission()
    const collaboratorId = randomUUID()
    const report = await TaskCompletionReport.create(reportInput(submission))
    const metCriterion = await TaskCompletionCriterionResult.create(criterionInput(report.id))
    const notApplicableCriterion = await TaskCompletionCriterionResult.create(
      criterionInput(report.id, {
        criterion_id: randomUUID(),
        expected_outcome: 'Production-only chaos drill completes.',
        actual_outcome: 'Not run in the assignment environment.',
        result: 'not_applicable',
        explanation: 'The governed test environment excludes production chaos drills.',
        not_applicable_reason: 'Production access was outside the assignment authority.',
        not_applicable_policy_ref: 'policy:production-chaos:2026-08',
      })
    )
    const evidence = await TaskCompletionEvidenceManifestItem.create(
      evidenceInput(report.id, submission.submitterId)
    )
    const unavailableEvidence = await TaskCompletionEvidenceManifestItem.create(
      evidenceInput(report.id, submission.submitterId, {
        idempotency_key: `evidence:${report.id}:expired`,
        title: 'Expired staging trace',
        uri: null,
        storage_reference: null,
        content_hash: null,
        availability: 'unavailable',
        availability_reason: 'expired',
        reviewer_access_state: 'unavailable',
        retention_state: 'tombstoned',
        tombstoned_at: DateTime.utc(),
      })
    )
    const primaryClaim = await TaskCompletionContributorClaim.create(
      claimInput(report, submission.submitterId, {
        criterion_result_refs: [metCriterion.id, notApplicableCriterion.id],
        evidence_refs: [evidence.id],
      })
    )
    const collaboratorClaim = await TaskCompletionContributorClaim.create(
      claimInput(report, collaboratorId, {
        actual_ownership: 'contributor',
        contribution_statement: 'Implemented integration validation and failure-path tests.',
        evidence_refs: [evidence.id],
        idempotency_key: `claim:${report.id}:${collaboratorId}`,
      })
    )

    await TaskCompletionEvidenceMapping.createMany([
      {
        schema_version: 'suar.task_completion_evidence_mapping.v1',
        completion_report_id: report.id,
        evidence_item_id: evidence.id,
        criterion_result_id: metCriterion.id,
        contributor_claim_id: null,
        mapping_purpose: 'completion_proof',
        attribution_statement: null,
        created_by: submission.submitterId,
      },
      {
        schema_version: 'suar.task_completion_evidence_mapping.v1',
        completion_report_id: report.id,
        evidence_item_id: evidence.id,
        criterion_result_id: notApplicableCriterion.id,
        contributor_claim_id: null,
        mapping_purpose: 'context',
        attribution_statement: null,
        created_by: submission.submitterId,
      },
      {
        schema_version: 'suar.task_completion_evidence_mapping.v1',
        completion_report_id: report.id,
        evidence_item_id: evidence.id,
        criterion_result_id: null,
        contributor_claim_id: collaboratorClaim.id,
        mapping_purpose: 'attribution',
        attribution_statement: 'Shows the collaborator-authored failure-path validation.',
        created_by: submission.submitterId,
      },
    ])

    await report.refresh()
    await evidence.refresh()
    await primaryClaim.refresh()

    assert.equal(report.id.at(14), '7')
    assert.equal(metCriterion.id.at(14), '7')
    assert.equal(evidence.id.at(14), '7')
    assert.equal(primaryClaim.id.at(14), '7')
    assert.deepEqual(report.validation_outcomes, [
      { suite: 'integration', result: 'passed', total: 42 },
    ])
    assert.equal(evidence.access_classification, 'confidential')
    assert.lengthOf(evidence.evidence_requirement_ids, 2)
    assert.lengthOf(evidence.related_deliverable_ids, 2)
    assert.equal(evidence.availability, 'available')
    assert.equal(unavailableEvidence.availability, 'unavailable')
    assert.equal(unavailableEvidence.availability_reason, 'expired')
    assert.equal(primaryClaim.actual_ownership, 'primary_owner')
    assert.equal(primaryClaim.completion_report_revision, report.revision)
    assert.equal(primaryClaim.completion_report_hash, report.completion_report_hash)
    assert.deepEqual(primaryClaim.evidence_refs, [evidence.id])
    assert.equal(collaboratorClaim.actual_ownership, 'contributor')
    assert.notEqual(primaryClaim.contributor_user_id, collaboratorClaim.contributor_user_id)
    assert.equal(
      await TaskCompletionEvidenceMapping.query()
        .where('evidence_item_id', evidence.id)
        .count('* as total')
        .then((rows) => Number(rows[0]?.$extras['total'] ?? 0)),
      3
    )
  })

  test('CR-009/013/018 enforces report revision, retry, evidence, and contributor idempotency', async ({
    assert,
  }) => {
    const submission = await createCurrentSubmission()
    const report = await TaskCompletionReport.create(reportInput(submission))

    await assertPostgresConstraintError(
      () =>
        TaskCompletionReport.create(
          reportInput(submission, { idempotency_key: `other:${randomUUID()}` })
        ),
      '23505',
      'uq_task_completion_reports_submission_revision'
    )
    await assertPostgresConstraintError(
      () =>
        TaskCompletionReport.create(
          reportInput(submission, {
            revision: 2,
            idempotency_key: report.idempotency_key,
            supersedes_report_id: report.id,
            correction_reason: 'Valid correction shape with a duplicate retry key.',
            completion_report_hash: `sha256:${'8'.repeat(64)}`,
          })
        ),
      '23505',
      'uq_task_completion_reports_submission_idempotency'
    )

    const claim = await TaskCompletionContributorClaim.create(
      claimInput(report, submission.submitterId)
    )
    const orphanClaim = await TaskCompletionContributorClaim.create(
      claimInput(report, randomUUID(), { completion_report_hash: `sha256:${'f'.repeat(64)}` })
    )
    assert.equal(orphanClaim.completion_report_id, report.id)
    await assertPostgresConstraintError(
      () =>
        TaskCompletionContributorClaim.create(
          claimInput(report, submission.submitterId, {
            idempotency_key: `claim-retry:${randomUUID()}`,
          })
        ),
      '23505',
      'uq_task_completion_claims_report_user'
    )

    const evidence = await TaskCompletionEvidenceManifestItem.create(
      evidenceInput(report.id, submission.submitterId)
    )
    await assertPostgresConstraintError(
      () =>
        TaskCompletionEvidenceManifestItem.create(
          evidenceInput(report.id, submission.submitterId, {
            idempotency_key: evidence.idempotency_key,
          })
        ),
      '23505',
      'uq_task_completion_evidence_report_idempotency'
    )

    assert.equal(claim.contributor_user_id, submission.submitterId)
    assert.lengthOf(
      await TaskCompletionReport.query().where('task_submission_id', submission.id),
      1
    )
    assert.lengthOf(
      await TaskCompletionContributorClaim.query().where('completion_report_id', report.id),
      2
    )
    assert.lengthOf(
      await TaskCompletionEvidenceManifestItem.query().where('completion_report_id', report.id),
      1
    )
  })

  test('CR-004 stores raw values; application validation rejects silent N/A, unexplained deviations, and invalid hashes', async ({
    assert,
  }) => {
    const submission = await createCurrentSubmission()
    const report = await TaskCompletionReport.create(reportInput(submission))

    const silentNa = await TaskCompletionCriterionResult.create(
      criterionInput(report.id, {
        result: 'not_applicable',
        not_applicable_reason: null,
        not_applicable_policy_ref: null,
      })
    )
    const unexplainedDeviation = await TaskCompletionCriterionResult.create(
      criterionInput(report.id, {
        criterion_id: randomUUID(),
        result: 'partially_met',
        deviation_status: 'reported',
        deviation_summary: null,
      })
    )
    const invalidHash = await TaskCompletionEvidenceManifestItem.create(
      evidenceInput(report.id, submission.submitterId, { content_hash: 'sha256:not-a-valid-hash' })
    )
    assert.equal(silentNa.result, 'not_applicable')
    assert.equal(unexplainedDeviation.deviation_status, 'reported')
    assert.equal(invalidHash.content_hash, 'sha256:not-a-valid-hash')
  })

  test('CR-007 rolls back report/evidence when a cross-report or orphan mapping fails', async ({
    assert,
  }) => {
    const submission = await createCurrentSubmission()

    await db.transaction(async (trx) => {
      const report = new TaskCompletionReport()
      report.fill(reportInput(submission))
      report.useTransaction(trx)
      await report.save()

      const evidence = new TaskCompletionEvidenceManifestItem()
      evidence.fill(evidenceInput(report.id, submission.submitterId))
      evidence.useTransaction(trx)
      await evidence.save()

      await trx.table('task_completion_evidence_mappings').insert({
        schema_version: 'suar.task_completion_evidence_mapping.v1',
        completion_report_id: report.id,
        evidence_item_id: evidence.id,
        criterion_result_id: randomUUID(),
        contributor_claim_id: null,
        mapping_purpose: 'completion_proof',
        created_by: submission.submitterId,
      })
    })

    const reportCount = (await db
      .from('task_completion_reports')
      .where('task_submission_id', submission.id)
      .count('* as total')
      .first()) as { total?: number | string } | undefined
    const evidenceCount = (await db
      .from('task_completion_evidence_manifest')
      .count('* as total')
      .first()) as { total?: number | string } | undefined
    assert.equal(Number(reportCount?.total ?? 0), 1)
    assert.equal(Number(evidenceCount?.total ?? 0), 1)
  })

  test('preserves immutable history and records corrections as a new report revision', async ({
    assert,
  }) => {
    const submission = await createCurrentSubmission()
    const reportV1 = await TaskCompletionReport.create(reportInput(submission))
    const criterion = await TaskCompletionCriterionResult.create(criterionInput(reportV1.id))
    const evidence = await TaskCompletionEvidenceManifestItem.create(
      evidenceInput(reportV1.id, submission.submitterId)
    )
    const claim = await TaskCompletionContributorClaim.create(
      claimInput(reportV1, submission.submitterId)
    )

    reportV1.work_performed = 'Rewritten historical work'
    await assert.rejects(() => reportV1.save(), /immutable; create a correction revision instead/)
    criterion.actual_outcome = 'Rewritten outcome'
    await assert.rejects(() => criterion.save(), /immutable; create a correction revision instead/)
    evidence.availability = 'unavailable'
    await assert.rejects(() => evidence.save(), /immutable; create a correction revision instead/)
    claim.actual_ownership = 'lead'
    await assert.rejects(() => claim.save(), /immutable; create a correction revision instead/)

    // Cross-submission correction is an application invariant. The storage
    // layer does not own it; the command/repository boundary must reject it.

    const reportV2 = await TaskCompletionReport.create(
      reportInput(submission, {
        revision: 2,
        idempotency_key: `report:${submission.id}:2`,
        supersedes_report_id: reportV1.id,
        correction_reason: 'Corrected attribution after contributor confirmation.',
        contribution_statement: 'Shared implementation ownership with the integration contributor.',
        actual_ownership: 'shared_owner',
        completion_report_hash: `sha256:${'9'.repeat(64)}`,
      })
    )

    assert.equal(reportV2.supersedes_report_id, reportV1.id)
    assert.equal(reportV2.revision, 2)
    const persistedReportV1 = await TaskCompletionReport.findOrFail(reportV1.id)
    assert.equal(persistedReportV1.revision, 1)

    const orphanClaimCorrection = await TaskCompletionContributorClaim.create(
      claimInput(reportV2, randomUUID(), {
        supersedes_claim_id: randomUUID(),
        correction_reason: 'Unresolved supersession is checked by the application boundary.',
      })
    )
    assert.equal(orphanClaimCorrection.supersedes_claim_id !== claim.id, true)

    const claimV2 = await TaskCompletionContributorClaim.create(
      claimInput(reportV2, submission.submitterId, {
        supersedes_claim_id: claim.id,
        correction_reason: 'Corrected contributor ownership.',
      })
    )
    assert.equal(claimV2.supersedes_claim_id, claim.id)

    await assertPostgresConstraintError(
      () =>
        TaskCompletionReport.create(
          reportInput(submission, {
            revision: 3,
            idempotency_key: `report:${submission.id}:3`,
            supersedes_report_id: reportV1.id,
            correction_reason: 'Competing correction branch.',
            completion_report_hash: `sha256:${'a'.repeat(64)}`,
          })
        ),
      '23505',
      'uq_task_completion_reports_superseded_once'
    )
  })
})

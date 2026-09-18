import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

import type TaskCompletionContributorClaim from '#modules/tasks/infra/models/task-submissions/task_completion_contributor_claim'
import type TaskCompletionCriterionResult from '#modules/tasks/infra/models/task-submissions/task_completion_criterion_result'
import type TaskCompletionEvidenceManifestItem from '#modules/tasks/infra/models/task-submissions/task_completion_evidence_manifest_item'
import type TaskCompletionReport from '#modules/tasks/infra/models/task-submissions/task_completion_report'
import { cleanupTestData } from '#tests/helpers/factories'

export const COMPLETION_TABLES = [
  'task_completion_reports',
  'task_completion_criterion_results',
  'task_completion_evidence_manifest',
  'task_completion_contributor_claims',
  'task_completion_evidence_mappings',
] as const

export interface ForeignKeyCountResult {
  rows: Array<{ total: number | string }>
}

export type PostgresConstraintCode = '23503' | '23505' | '23514'

export async function assertPostgresConstraintError(
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

export const HASHES = {
  assignment: `sha256:${'1'.repeat(64)}`,
  contract: `sha256:${'2'.repeat(64)}`,
  report: `sha256:${'3'.repeat(64)}`,
  criterion: `sha256:${'4'.repeat(64)}`,
  evidence: `sha256:${'5'.repeat(64)}`,
  manifest: `sha256:${'6'.repeat(64)}`,
  claim: `sha256:${'7'.repeat(64)}`,
} as const

export interface CurrentSubmissionFixture {
  id: string
  taskId: string
  assignmentId: string
  submitterId: string
}

export async function tableExists(tableName: string): Promise<boolean> {
  const row = (await db
    .from('information_schema.tables')
    .select('table_name')
    .where('table_schema', 'public')
    .where('table_name', tableName)
    .first()) as { table_name?: string } | undefined

  return row?.table_name === tableName
}

export async function cleanupCompletionData(): Promise<void> {
  for (const tableName of [...COMPLETION_TABLES].reverse()) {
    if (await tableExists(tableName)) {
      await db.from(tableName).delete()
    }
  }
  await cleanupTestData()
}

export async function createCurrentSubmission(): Promise<CurrentSubmissionFixture> {
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

export type ReportCreateInput = Parameters<typeof TaskCompletionReport.create>[0]
export type CriterionCreateInput = Parameters<typeof TaskCompletionCriterionResult.create>[0]
export type EvidenceCreateInput = Parameters<typeof TaskCompletionEvidenceManifestItem.create>[0]
export type ClaimCreateInput = Parameters<typeof TaskCompletionContributorClaim.create>[0]

export function reportInput(
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

export function criterionInput(
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

export function evidenceInput(
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

export function claimInput(
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

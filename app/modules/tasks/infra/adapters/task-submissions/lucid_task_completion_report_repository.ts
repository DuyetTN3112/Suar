import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'
import type {
  PersistedTaskCompletionReport,
  TaskCompletionReportFactBundle,
  TaskCompletionReportAccessIdentity,
  TaskCompletionReportRepository,
  TaskCompletionReportSubmissionParent,
  TaskCompletionReportWrite,
} from '#modules/tasks/actions/ports/outbound/task_completion_report_repository'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TvaJsonObject, TvaSha256 } from '#modules/tasks/public_contracts/task-authoring/primitives'

function client(transaction?: TaskTransaction): TransactionClientContract | typeof db {
  return (transaction as TransactionClientContract | undefined) ?? db
}

function asObject(value: unknown): TvaJsonObject {
  if (typeof value === 'string') return JSON.parse(value) as TvaJsonObject
  return value as TvaJsonObject
}

function mapReport(row: Record<string, unknown>): PersistedTaskCompletionReport {
  const reportedAt = row['reported_at']
  return {
    id: String(row['id']),
    taskSubmissionId: String(row['task_submission_id']),
    taskId: String(row['task_id']),
    taskAssignmentId: String(row['task_assignment_id']),
    assignmentSnapshotId: String(row['assignment_snapshot_id']),
    assignmentSnapshotHash: String(row['assignment_snapshot_hash']) as TvaSha256,
    taskContractVersionId: String(row['task_contract_version_id']),
    reportedBy: String(row['created_by']),
    revision: Number(row['revision']),
    idempotencyKey: String(row['idempotency_key']),
    status: row['report_status'] as 'draft' | 'submitted',
    completionReportHash: String(row['completion_report_hash']) as TvaSha256,
    canonicalPayload: asObject(row['canonical_payload']),
    reportedAt:
      typeof reportedAt === 'string'
        ? new Date(reportedAt).toISOString()
        : reportedAt instanceof Date
          ? reportedAt.toISOString()
          : null,
  }
}

export class LucidTaskCompletionReportRepository implements TaskCompletionReportRepository {
  async findAccessIdentityById(
    reportId: string,
    transaction?: TaskTransaction
  ): Promise<TaskCompletionReportAccessIdentity | null> {
    const row = (await client(transaction)
      .from('task_completion_reports')
      .where('id', reportId)
      .select('id', 'task_id', 'task_assignment_id', 'created_by', 'report_status')
      .first()) as Record<string, unknown> | undefined
    if (!row) return null
    return {
      id: String(row['id']),
      taskId: String(row['task_id']),
      taskAssignmentId: String(row['task_assignment_id']),
      reportedBy: String(row['created_by']),
      status: row['report_status'] as TaskCompletionReportAccessIdentity['status'],
    }
  }

  async lockSubmissionParent(
    taskSubmissionId: string,
    transaction: TaskTransaction
  ): Promise<TaskCompletionReportSubmissionParent | null> {
    const row = (await client(transaction)
      .from('task_submissions')
      .where('id', taskSubmissionId)
      .forUpdate()
      .select('id', 'task_id', 'task_assignment_id', 'submitted_by', 'status')
      .first()) as Record<string, unknown> | undefined
    if (!row) return null
    return {
      id: String(row['id']),
      taskId: String(row['task_id']),
      taskAssignmentId: String(row['task_assignment_id']),
      submittedBy: String(row['submitted_by']),
      status: row['status'] as TaskCompletionReportSubmissionParent['status'],
    }
  }

  async findLatestBySubmission(
    taskSubmissionId: string,
    transaction?: TaskTransaction
  ): Promise<PersistedTaskCompletionReport | null> {
    const row = (await client(transaction)
      .from('task_completion_reports')
      .where('task_submission_id', taskSubmissionId)
      .orderBy('revision', 'desc')
      .orderBy('id', 'desc')
      .first()) as Record<string, unknown> | undefined
    return row ? mapReport(row) : null
  }

  async findBySubmissionIdempotency(
    taskSubmissionId: string,
    idempotencyKey: string,
    transaction: TaskTransaction
  ): Promise<PersistedTaskCompletionReport | null> {
    const row = (await client(transaction)
      .from('task_completion_reports')
      .where('task_submission_id', taskSubmissionId)
      .where('idempotency_key', idempotencyKey)
      .first()) as Record<string, unknown> | undefined
    return row ? mapReport(row) : null
  }

  async findById(
    reportId: string,
    transaction?: TaskTransaction
  ): Promise<PersistedTaskCompletionReport | null> {
    const row = (await client(transaction)
      .from('task_completion_reports')
      .where('id', reportId)
      .first()) as Record<string, unknown> | undefined
    return row ? mapReport(row) : null
  }

  async findFactBundleById(
    reportId: string,
    transaction?: TaskTransaction
  ): Promise<TaskCompletionReportFactBundle | null> {
    const report = await this.findById(reportId, transaction)
    if (!report) return null
    return this.loadFactBundle(report, transaction)
  }

  async findLatestFactBundleByAssignment(
    assignmentId: string,
    transaction?: TaskTransaction
  ): Promise<TaskCompletionReportFactBundle | null> {
    const row = (await client(transaction)
      .from('task_completion_reports')
      .where('task_assignment_id', assignmentId)
      .orderBy('revision', 'desc')
      .orderBy('id', 'desc')
      .first()) as Record<string, unknown> | undefined
    if (!row) return null
    return this.loadFactBundle(mapReport(row), transaction)
  }

  private async loadFactBundle(
    report: PersistedTaskCompletionReport,
    transaction?: TaskTransaction
  ): Promise<TaskCompletionReportFactBundle> {
    const query = client(transaction)
    const [criterionResults, evidenceManifest, contributorClaims, evidenceMappings] =
      await Promise.all([
        query
          .from('task_completion_criterion_results')
          .where('completion_report_id', report.id)
          .orderBy('id', 'asc'),
        query
          .from('task_completion_evidence_manifest')
          .where('completion_report_id', report.id)
          .orderBy('id', 'asc'),
        query
          .from('task_completion_contributor_claims')
          .where('completion_report_id', report.id)
          .orderBy('id', 'asc'),
        query
          .from('task_completion_evidence_mappings')
          .where('completion_report_id', report.id)
          .orderBy('id', 'asc'),
      ])

    return {
      report,
      criterionResults: criterionResults as Record<string, unknown>[],
      evidenceManifest: evidenceManifest as Record<string, unknown>[],
      contributorClaims: contributorClaims as Record<string, unknown>[],
      evidenceMappings: evidenceMappings as Record<string, unknown>[],
    }
  }

  async insertRevision(
    write: TaskCompletionReportWrite,
    transaction: TaskTransaction
  ): Promise<PersistedTaskCompletionReport> {
    const query = client(transaction)
    const inserted = (await query.table('task_completion_reports').insert(write.report).returning('*')) as
      | Array<Record<string, unknown>>
      | Record<string, unknown>
    const report = Array.isArray(inserted) ? inserted[0] : inserted
    if (!report) throw new PersistedDataIntegrityException('Completion Report insert did not return a row')
    if (write.criterionResults.length > 0) {
      await query.table('task_completion_criterion_results').insert(write.criterionResults)
    }
    if (write.evidence.length > 0) {
      await query.table('task_completion_evidence_manifest').insert(write.evidence)
    }
    if (write.contributorClaims.length > 0) {
      await query.table('task_completion_contributor_claims').insert(write.contributorClaims)
    }
    if (write.evidenceMappings.length > 0) {
      await query.table('task_completion_evidence_mappings').insert(write.evidenceMappings)
    }
    return mapReport(report)
  }
}

import AppException from '#modules/errors/public_contracts/application_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'
import { Result } from '#modules/errors/public_contracts/result'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type { TaskAssignmentContractRepository } from '#modules/tasks/actions/ports/outbound/task_assignment_contract_repository'
import type { TaskCompletionReportRepository } from '#modules/tasks/actions/ports/outbound/task_completion_report_repository'
import type { TaskCompletionReviewPackageAccessReader } from '#modules/tasks/actions/ports/outbound/task_completion_review_package_access_reader'
import type { TaskContractContentHasher } from '#modules/tasks/actions/ports/outbound/task_contract_content_hasher'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import type { CanonicalTaskAssignmentContractSnapshotV1 } from '#modules/tasks/domain/task-assignment/task_assignment_contract_snapshot'
import type {
  TvaJsonObject,
  TvaSha256,
} from '#modules/tasks/public_contracts/task-authoring/primitives'

export interface TaskCompletionReviewPackageV1 {
  readonly schemaVersion: 'suar.task_completion_review_package.v1'
  readonly reportId: string
  readonly taskId: string
  readonly taskAssignmentId: string
  readonly reportRevision: number
  readonly completionReportHash: TvaSha256
  readonly assignmentContract: CanonicalTaskAssignmentContractSnapshotV1
  readonly reportCanonicalPayload: TvaJsonObject
  readonly criterionResults: readonly TvaJsonObject[]
  readonly evidenceManifest: readonly TvaJsonObject[]
  readonly contributorClaims: readonly TvaJsonObject[]
  readonly evidenceMappings: readonly TvaJsonObject[]
  readonly packageHash: TvaSha256
}

export interface LoadTaskCompletionReviewPackageDependencies {
  readonly reports: TaskCompletionReportRepository
  readonly assignmentContracts: TaskAssignmentContractRepository
  readonly access: TaskCompletionReviewPackageAccessReader
  readonly hasher: TaskContractContentHasher
}

function toJsonObject(value: Record<string, unknown>): TvaJsonObject {
  return JSON.parse(JSON.stringify(value)) as TvaJsonObject
}

function assertChildBoundary(
  reportId: string,
  rows: readonly Record<string, unknown>[],
  factType: string
): void {
  if (rows.some((row) => row['completion_report_id'] !== reportId)) {
    throw new PersistedDataIntegrityException(
      `Completion Review Package contains a foreign ${factType} fact`,
      { reportId, factType }
    )
  }
}

export default class LoadTaskCompletionReviewPackageQuery {
  constructor(
    private readonly execCtx: TaskActionContext,
    private readonly dependencies: LoadTaskCompletionReviewPackageDependencies
  ) {}

  async execute(reportId: string): Promise<TaskCompletionReviewPackageV1> {
    const actorId = this.execCtx.userId
    if (!actorId) throw new UnauthorizedException()
    const identity = await this.dependencies.reports.findAccessIdentityById(reportId)
    if (!identity || identity.status !== 'submitted') {
      throw new NotFoundException('Completion Review Package not found')
    }
    if (
      actorId !== identity.reportedBy &&
      !(await this.dependencies.access.canRead({
        actorId,
        reportId: identity.id,
        taskId: identity.taskId,
        taskAssignmentId: identity.taskAssignmentId,
      }))
    ) {
      throw new ForbiddenException('Actor cannot read this Completion Review Package')
    }

    const bundle = await this.dependencies.reports.findFactBundleById(reportId)
    if (!bundle) throw new NotFoundException('Completion Review Package not found')
    if (
      bundle.report.id !== identity.id ||
      bundle.report.taskId !== identity.taskId ||
      bundle.report.taskAssignmentId !== identity.taskAssignmentId ||
      bundle.report.reportedBy !== identity.reportedBy ||
      bundle.report.status !== identity.status
    ) {
      throw new PersistedDataIntegrityException(
        'Completion Report access identity changed while hydrating the review package',
        { reportId: bundle.report.id }
      )
    }

    const computedReportHash = this.dependencies.hasher.hash(bundle.report.canonicalPayload)
    if (computedReportHash !== bundle.report.completionReportHash) {
      throw new PersistedDataIntegrityException(
        'Completion Report canonical payload hash does not match its immutable row',
        { reportId: bundle.report.id }
      )
    }
    const history = await this.dependencies.assignmentContracts.findHistory(
      bundle.report.taskAssignmentId
    )
    const assignmentContract = history.find(
      (record) =>
        record.id === bundle.report.assignmentSnapshotId &&
        record.snapshotHash === bundle.report.assignmentSnapshotHash
    )
    if (
      !assignmentContract ||
      assignmentContract.taskId !== bundle.report.taskId ||
      assignmentContract.envelope.snapshot.resolvedContract.versionId !==
        bundle.report.taskContractVersionId
    ) {
      throw new PersistedDataIntegrityException(
        'Completion Report cannot be joined to its exact immutable Assignment Contract',
        {
          reportId: bundle.report.id,
          assignmentId: bundle.report.taskAssignmentId,
          snapshotId: bundle.report.assignmentSnapshotId,
        }
      )
    }

    assertChildBoundary(bundle.report.id, bundle.criterionResults, 'criterion result')
    assertChildBoundary(bundle.report.id, bundle.evidenceManifest, 'evidence manifest')
    assertChildBoundary(bundle.report.id, bundle.contributorClaims, 'contributor claim')
    assertChildBoundary(bundle.report.id, bundle.evidenceMappings, 'evidence mapping')
    const packageWithoutHash = {
      schemaVersion: 'suar.task_completion_review_package.v1' as const,
      reportId: bundle.report.id,
      taskId: bundle.report.taskId,
      taskAssignmentId: bundle.report.taskAssignmentId,
      reportRevision: bundle.report.revision,
      completionReportHash: bundle.report.completionReportHash,
      assignmentContract: assignmentContract.envelope,
      reportCanonicalPayload: bundle.report.canonicalPayload,
      criterionResults: bundle.criterionResults.map(toJsonObject),
      evidenceManifest: bundle.evidenceManifest.map(toJsonObject),
      contributorClaims: bundle.contributorClaims.map(toJsonObject),
      evidenceMappings: bundle.evidenceMappings.map(toJsonObject),
    }
    return {
      ...packageWithoutHash,
      packageHash: this.dependencies.hasher.hash(packageWithoutHash),
    }
  }

  async executeAndWrap(
    reportId: string
  ): Promise<Result<TaskCompletionReviewPackageV1, AppException>> {
    try {
      return Result.ok(await this.execute(reportId))
    } catch (error) {
      if (error instanceof AppException) return Result.fail(error)
      throw error
    }
  }
}

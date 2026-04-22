import type AppException from '#modules/errors/public_contracts/application_exception'
import { Result } from '#modules/errors/public_contracts/result'
import {
  ApplyForTaskDTO,
  GetOrganizationTaskApplicationsDTO,
  GetTaskApplicationsDTO,
  ProcessApplicationDTO,
  WithdrawApplicationDTO,
} from '#modules/tasks/actions/dtos/request/task_application_dtos'
import type { GetApplicationMatchScoreDTO } from '#modules/tasks/actions/queries/task-applications/get_application_match_score_query'
import type {
  GetTaskApplicationsRankingDTO,
  RankedApplication,
} from '#modules/tasks/actions/queries/task-applications/get_task_applications_ranking_query'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import type { MatchScoreResult } from '#modules/tasks/public_contracts/applicant_match'
import type {
  CurrentApplicantTaskApplication,
  DecideTaskApplicationInput,
  ListCurrentApplicantTaskApplicationsInput,
  ListOrganizationTaskApplicationsInput,
  ListTaskApplicationsInput,
  RankedTaskApplication,
  RankTaskApplicationsInput,
  ScoreTaskApplicationInput,
  SubmitTaskApplicationInput,
  SubmittedTaskApplication,
  TaskApplicationCapability,
  TaskApplicationCapabilityContext,
  TaskApplicationCapabilityStatus,
  TaskApplicationForReview,
  TaskApplicationPage,
  TaskApplicationScore,
  WithdrawTaskApplicationInput,
} from '#modules/tasks/public_contracts/task_application_capability'
import { ApplicationStatus } from '#modules/tasks/public_contracts/task_constants'
import type {
  PaginatedTaskApplicationRecords,
  TaskApplicationRecord,
} from '#modules/tasks/types/task_records'

interface TaskApplicationFacadeDependencies {
  makeApply: (context: TaskActionContext) => {
    executeAndWrap(input: ApplyForTaskDTO): Promise<Result<TaskApplicationRecord, AppException>>
  }
  makeProcess: (context: TaskActionContext) => {
    executeAndWrap(input: ProcessApplicationDTO): Promise<Result<TaskApplicationRecord, AppException>>
  }
  makeWithdraw: (context: TaskActionContext) => {
    executeAndWrap(input: WithdrawApplicationDTO): Promise<Result<void, AppException>>
  }
  makeListForTask: (context: TaskActionContext) => {
    executeAndWrap(
      input: GetTaskApplicationsDTO
    ): Promise<Result<PaginatedTaskApplicationRecords, AppException>>
  }
  makeListForCurrentApplicant: (context: TaskActionContext) => {
    executeAndWrap(input: {
      status?: TaskApplicationCapabilityStatus | 'all'
      page: number
      per_page: number
    }): Promise<Result<PaginatedTaskApplicationRecords, AppException>>
  }
  makeListForOrganization: (context: TaskActionContext) => {
    executeAndWrap(
      input: GetOrganizationTaskApplicationsDTO
    ): Promise<Result<PaginatedTaskApplicationRecords, AppException>>
  }
  makeScore: (context: TaskActionContext) => {
    executeAndWrap(input: GetApplicationMatchScoreDTO): Promise<Result<MatchScoreResult, AppException>>
  }
  makeRank: (context: TaskActionContext) => {
    executeAndWrap(
      input: GetTaskApplicationsRankingDTO
    ): Promise<Result<RankedApplication[], AppException>>
  }
}

function toInternalStatus(
  status: TaskApplicationCapabilityStatus | 'all'
): ApplicationStatus | 'all' {
  switch (status) {
    case 'pending':
      return ApplicationStatus.PENDING
    case 'approved':
      return ApplicationStatus.APPROVED
    case 'rejected':
      return ApplicationStatus.REJECTED
    case 'withdrawn':
      return ApplicationStatus.WITHDRAWN
    case 'all':
      return 'all'
  }
}

function toPageMeta(result: PaginatedTaskApplicationRecords) {
  return {
    total: result.meta.total,
    perPage: result.meta.per_page,
    currentPage: result.meta.current_page,
    lastPage: result.meta.last_page,
  }
}

function toReviewApplication(record: TaskApplicationRecord): TaskApplicationForReview {
  const applicant = record.applicant

  return {
    id: record.id,
    taskId: record.task_id,
    applicationStatus: record.application_status,
    message: record.message,
    portfolioLinks: record.portfolio_links ? [...record.portfolio_links] : [],
    appliedAt: record.applied_at ?? null,
    applicant:
      applicant && typeof applicant['id'] === 'string'
        ? {
            id: applicant['id'],
            username: typeof applicant['username'] === 'string' ? applicant['username'] : null,
            email: typeof applicant['email'] === 'string' ? applicant['email'] : null,
          }
        : null,
    task: record.task
      ? {
          id: record.task.id,
          title: record.task.title,
          status: record.task.status,
        }
      : null,
    candidateSource: 'external',
  }
}

function toCurrentApplicantApplication(
  record: TaskApplicationRecord
): CurrentApplicantTaskApplication {
  const task = record.task

  return {
    id: record.id,
    taskId: record.task_id,
    applicationStatus: record.application_status,
    message: record.message,
    portfolioLinks: record.portfolio_links ? [...record.portfolio_links] : [],
    rejectionReason: record.rejection_reason,
    appliedAt: record.applied_at ?? null,
    reviewedAt: record.reviewed_at ?? null,
    task: task
      ? {
          id: task.id,
          title: task.title,
          status: task.status,
          organizationName: task.organization?.name ?? null,
          projectName: task.project?.name ?? null,
        }
      : null,
  }
}

function toScore(result: {
  match_score: number
  skill_match: number
  domain_match: number
  delivery_reliability: number
  trust_score: number
  evidence_confidence: 'low' | 'medium' | 'high'
  evidence_warnings: string[]
  explanations: string[]
  risks: string[]
}): TaskApplicationScore {
  return {
    matchScore: result.match_score,
    skillMatch: result.skill_match,
    domainMatch: result.domain_match,
    deliveryReliability: result.delivery_reliability,
    trustScore: result.trust_score,
    evidenceConfidence: result.evidence_confidence,
    evidenceWarnings: [...result.evidence_warnings],
    explanations: [...result.explanations],
    risks: [...result.risks],
  }
}

function toRankedApplication(result: RankedApplication): RankedTaskApplication {
  return {
    applicationId: result.application_id,
    applicantId: result.applicant_id,
    applicantName: result.applicant_name,
    ...toScore(result),
    candidateSource: result.candidate_source,
    fitLabel: result.fit_label,
    reviewedSkillsCount: result.reviewed_skills_count,
    importedSkillsCount: result.imported_skills_count,
    underDisputeSkillsCount: result.under_dispute_skills_count,
    latestConfidenceSignal: result.latest_confidence_signal,
  }
}

/**
 * Outer inbound adapter exposing the stable cross-module capability while
 * delegating each intent to its Tasks command or query.
 */
export class TasksTaskApplicationCapabilityAdapter implements TaskApplicationCapability {
  constructor(private readonly dependencies: TaskApplicationFacadeDependencies) {}

  async submit(
    context: TaskApplicationCapabilityContext,
    input: SubmitTaskApplicationInput
  ): Promise<Result<SubmittedTaskApplication, AppException>> {
    const result = await this.dependencies.makeApply(context).executeAndWrap(
      new ApplyForTaskDTO({
        task_id: input.taskId,
        message: input.message,
        portfolio_links: input.portfolioLinks,
        application_source: input.applicationSource,
      })
    )

    if (result.isFailure()) {
      return Result.fail(result.getError())
    }

    const application = result.getValue()
    return Result.ok({
      id: application.id,
      taskId: application.task_id,
      applicantId: application.applicant_id,
      message: application.message,
      portfolioLinks: application.portfolio_links ? [...application.portfolio_links] : null,
      applicationSource: application.application_source,
    })
  }

  async decide(
    context: TaskApplicationCapabilityContext,
    input: DecideTaskApplicationInput
  ): Promise<Result<void, AppException>> {
    const result = await this.dependencies.makeProcess(context).executeAndWrap(
      new ProcessApplicationDTO({
        application_id: input.applicationId,
        action: input.action,
        rejection_reason: input.rejectionReason,
        assignment_type: input.assignmentType,
        estimated_hours: input.estimatedHours,
      })
    )

    if (result.isFailure()) {
      return Result.fail(result.getError())
    }

    return Result.ok()
  }

  async withdraw(
    context: TaskApplicationCapabilityContext,
    input: WithdrawTaskApplicationInput
  ): Promise<Result<void, AppException>> {
    const result = await this.dependencies
      .makeWithdraw(context)
      .executeAndWrap(new WithdrawApplicationDTO(input.applicationId))

    if (result.isFailure()) {
      return Result.fail(result.getError())
    }

    return Result.ok()
  }

  async listForTask(
    context: TaskApplicationCapabilityContext,
    input: ListTaskApplicationsInput
  ): Promise<Result<TaskApplicationPage<TaskApplicationForReview>, AppException>> {
    const result = await this.dependencies.makeListForTask(context).executeAndWrap(
      new GetTaskApplicationsDTO({
        task_id: input.taskId,
        status: toInternalStatus(input.status),
        page: input.page,
        per_page: input.perPage,
      })
    )

    if (result.isFailure()) {
      return Result.fail(result.getError())
    }

    const page = result.getValue()
    return Result.ok({
      data: page.data.map(toReviewApplication),
      meta: toPageMeta(page),
    })
  }

  async listForCurrentApplicant(
    context: TaskApplicationCapabilityContext,
    input: ListCurrentApplicantTaskApplicationsInput
  ): Promise<Result<TaskApplicationPage<CurrentApplicantTaskApplication>, AppException>> {
    const result = await this.dependencies.makeListForCurrentApplicant(context).executeAndWrap({
      ...(input.status === undefined ? {} : { status: input.status }),
      page: input.page,
      per_page: input.perPage,
    })

    if (result.isFailure()) {
      return Result.fail(result.getError())
    }

    const page = result.getValue()
    return Result.ok({
      data: page.data.map(toCurrentApplicantApplication),
      meta: toPageMeta(page),
    })
  }

  async listForOrganization(
    context: TaskApplicationCapabilityContext,
    input: ListOrganizationTaskApplicationsInput
  ): Promise<Result<TaskApplicationPage<TaskApplicationForReview>, AppException>> {
    const result = await this.dependencies.makeListForOrganization(context).executeAndWrap(
      new GetOrganizationTaskApplicationsDTO({
        organization_id: input.organizationId,
        status: input.status === undefined ? 'all' : toInternalStatus(input.status),
        page: input.page,
        per_page: input.perPage,
      })
    )

    if (result.isFailure()) {
      return Result.fail(result.getError())
    }

    const page = result.getValue()
    return Result.ok({
      data: page.data.map(toReviewApplication),
      meta: toPageMeta(page),
    })
  }

  async score(
    context: TaskApplicationCapabilityContext,
    input: ScoreTaskApplicationInput
  ): Promise<Result<TaskApplicationScore, AppException>> {
    const result = await this.dependencies.makeScore(context).executeAndWrap({
      task_id: input.taskId,
      application_id: input.applicationId,
    })

    if (result.isFailure()) {
      return Result.fail(result.getError())
    }

    return Result.ok(toScore(result.getValue()))
  }

  async rank(
    context: TaskApplicationCapabilityContext,
    input: RankTaskApplicationsInput
  ): Promise<Result<RankedTaskApplication[], AppException>> {
    const result = await this.dependencies.makeRank(context).executeAndWrap({
      task_id: input.taskId,
    })

    if (result.isFailure()) {
      return Result.fail(result.getError())
    }

    return Result.ok(result.getValue().map(toRankedApplication))
  }
}

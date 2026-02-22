import {
  ApplyForTaskDTO,
  GetOrganizationTaskApplicationsDTO,
  GetTaskApplicationsDTO,
  ProcessApplicationDTO,
  WithdrawApplicationDTO,
} from '#modules/tasks/actions/dtos/request/task_application_dtos'
import type { GetApplicationMatchScoreDTO } from '#modules/tasks/actions/queries/get_application_match_score_query'
import type {
  GetTaskApplicationsRankingDTO,
  RankedApplication,
} from '#modules/tasks/actions/queries/get_task_applications_ranking_query'
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
    handle(input: ApplyForTaskDTO): Promise<TaskApplicationRecord>
  }
  makeProcess: (context: TaskActionContext) => {
    handle(input: ProcessApplicationDTO): Promise<TaskApplicationRecord>
  }
  makeWithdraw: (context: TaskActionContext) => {
    handle(input: WithdrawApplicationDTO): Promise<void>
  }
  makeListForTask: (context: TaskActionContext) => {
    handle(input: GetTaskApplicationsDTO): Promise<PaginatedTaskApplicationRecords>
  }
  makeListForCurrentApplicant: (context: TaskActionContext) => {
    handle(input: {
      status?: TaskApplicationCapabilityStatus | 'all'
      page: number
      per_page: number
    }): Promise<PaginatedTaskApplicationRecords>
  }
  makeListForOrganization: (context: TaskActionContext) => {
    handle(input: GetOrganizationTaskApplicationsDTO): Promise<PaginatedTaskApplicationRecords>
  }
  makeScore: (context: TaskActionContext) => {
    handle(input: GetApplicationMatchScoreDTO): Promise<MatchScoreResult>
  }
  makeRank: (context: TaskActionContext) => {
    handle(input: GetTaskApplicationsRankingDTO): Promise<RankedApplication[]>
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
  ): Promise<SubmittedTaskApplication> {
    const application = await this.dependencies.makeApply(context).handle(
      new ApplyForTaskDTO({
        task_id: input.taskId,
        message: input.message,
        portfolio_links: input.portfolioLinks,
        application_source: input.applicationSource,
      })
    )
    return {
      id: application.id,
      taskId: application.task_id,
      applicantId: application.applicant_id,
      message: application.message,
      portfolioLinks: application.portfolio_links ? [...application.portfolio_links] : null,
      applicationSource: application.application_source,
    }
  }

  async decide(
    context: TaskApplicationCapabilityContext,
    input: DecideTaskApplicationInput
  ): Promise<void> {
    await this.dependencies.makeProcess(context).handle(
      new ProcessApplicationDTO({
        application_id: input.applicationId,
        action: input.action,
        rejection_reason: input.rejectionReason,
        assignment_type: input.assignmentType,
        estimated_hours: input.estimatedHours,
      })
    )
  }

  async withdraw(
    context: TaskApplicationCapabilityContext,
    input: WithdrawTaskApplicationInput
  ): Promise<void> {
    await this.dependencies
      .makeWithdraw(context)
      .handle(new WithdrawApplicationDTO(input.applicationId))
  }

  async listForTask(
    context: TaskApplicationCapabilityContext,
    input: ListTaskApplicationsInput
  ): Promise<TaskApplicationPage<TaskApplicationForReview>> {
    const result = await this.dependencies.makeListForTask(context).handle(
      new GetTaskApplicationsDTO({
        task_id: input.taskId,
        status: toInternalStatus(input.status),
        page: input.page,
        per_page: input.perPage,
      })
    )
    return {
      data: result.data.map(toReviewApplication),
      meta: toPageMeta(result),
    }
  }

  async listForCurrentApplicant(
    context: TaskApplicationCapabilityContext,
    input: ListCurrentApplicantTaskApplicationsInput
  ): Promise<TaskApplicationPage<CurrentApplicantTaskApplication>> {
    const result = await this.dependencies.makeListForCurrentApplicant(context).handle({
      ...(input.status === undefined ? {} : { status: input.status }),
      page: input.page,
      per_page: input.perPage,
    })
    return {
      data: result.data.map(toCurrentApplicantApplication),
      meta: toPageMeta(result),
    }
  }

  async listForOrganization(
    context: TaskApplicationCapabilityContext,
    input: ListOrganizationTaskApplicationsInput
  ): Promise<TaskApplicationPage<TaskApplicationForReview>> {
    const result = await this.dependencies.makeListForOrganization(context).handle(
      new GetOrganizationTaskApplicationsDTO({
        organization_id: input.organizationId,
        status: input.status === undefined ? 'all' : toInternalStatus(input.status),
        page: input.page,
        per_page: input.perPage,
      })
    )
    return {
      data: result.data.map(toReviewApplication),
      meta: toPageMeta(result),
    }
  }

  async score(
    context: TaskApplicationCapabilityContext,
    input: ScoreTaskApplicationInput
  ): Promise<TaskApplicationScore> {
    const result = await this.dependencies.makeScore(context).handle({
      task_id: input.taskId,
      application_id: input.applicationId,
    })
    return toScore(result)
  }

  async rank(
    context: TaskApplicationCapabilityContext,
    input: RankTaskApplicationsInput
  ): Promise<RankedTaskApplication[]> {
    const result = await this.dependencies.makeRank(context).handle({
      task_id: input.taskId,
    })
    return result.map(toRankedApplication)
  }
}

import type AppException from '#modules/errors/public_contracts/application_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type {
  CurrentApplicantMarketplaceApplication,
  DecideMarketplaceApplicationInput,
  ListCurrentApplicantApplicationsInput,
  ListMarketplaceTaskApplicationsInput,
  ListOrganizationMarketplaceApplicationsInput,
  MarketplaceApplicationExecutionContext,
  MarketplaceApplicationForReview,
  MarketplaceApplicationPage,
  MarketplaceApplicationScore,
  RankedMarketplaceApplication,
  RankMarketplaceTaskApplicationsInput,
  ScoreMarketplaceApplicationInput,
  SubmittedMarketplaceApplication,
  SubmitMarketplaceApplicationInput,
  WithdrawMarketplaceApplicationInput,
} from '#modules/marketplace/actions/dtos/marketplace-application/marketplace_application'
import type { TaskApplicationFlowPort } from '#modules/marketplace/actions/ports/outbound/marketplace-application/task_application_flow_port'
import type {
  CurrentApplicantTaskApplication,
  RankedTaskApplication,
  TaskApplicationCapability,
  TaskApplicationForReview,
  TaskApplicationPage,
  TaskApplicationScore,
} from '#modules/tasks/public_contracts/task_application_capability'

function mapScore(score: TaskApplicationScore): MarketplaceApplicationScore {
  return {
    matchScore: score.matchScore,
    skillMatch: score.skillMatch,
    domainMatch: score.domainMatch,
    deliveryReliability: score.deliveryReliability,
    trustScore: score.trustScore,
    evidenceConfidence: score.evidenceConfidence,
    evidenceWarnings: [...score.evidenceWarnings],
    explanations: [...score.explanations],
    risks: [...score.risks],
  }
}

function mapPageMeta<Item>(page: TaskApplicationPage<Item>) {
  return {
    total: page.meta.total,
    perPage: page.meta.perPage,
    currentPage: page.meta.currentPage,
    lastPage: page.meta.lastPage,
  }
}

function mapForReview(application: TaskApplicationForReview): MarketplaceApplicationForReview {
  return {
    id: application.id,
    taskId: application.taskId,
    applicationStatus: application.applicationStatus,
    message: application.message,
    portfolioLinks: [...application.portfolioLinks],
    appliedAt: application.appliedAt,
    applicant: application.applicant ? { ...application.applicant } : null,
    task: application.task ? { ...application.task } : null,
    candidateSource: application.candidateSource,
  }
}

function mapForCurrentApplicant(
  application: CurrentApplicantTaskApplication
): CurrentApplicantMarketplaceApplication {
  return {
    id: application.id,
    taskId: application.taskId,
    applicationStatus: application.applicationStatus,
    message: application.message,
    portfolioLinks: [...application.portfolioLinks],
    rejectionReason: application.rejectionReason,
    appliedAt: application.appliedAt,
    reviewedAt: application.reviewedAt,
    task: application.task ? { ...application.task } : null,
  }
}

function mapRanked(application: RankedTaskApplication): RankedMarketplaceApplication {
  return {
    applicationId: application.applicationId,
    applicantId: application.applicantId,
    applicantName: application.applicantName,
    ...mapScore(application),
    candidateSource: application.candidateSource,
    fitLabel: application.fitLabel,
    reviewedSkillsCount: application.reviewedSkillsCount,
    importedSkillsCount: application.importedSkillsCount,
    underDisputeSkillsCount: application.underDisputeSkillsCount,
    latestConfidenceSignal: application.latestConfidenceSignal,
  }
}

export class TasksMarketplaceTaskApplicationAdapter implements TaskApplicationFlowPort {
  constructor(private readonly tasks: TaskApplicationCapability) {}

  async submit(
    context: MarketplaceApplicationExecutionContext,
    input: SubmitMarketplaceApplicationInput
  ): Promise<Result<SubmittedMarketplaceApplication, AppException>> {
    const result = await this.tasks.submit(context, input)
    if (result.isFailure()) {
      return Result.fail(result.getError())
    }

    const application = result.getValue()
    return Result.ok({
      id: application.id,
      taskId: application.taskId,
      applicantId: application.applicantId,
      message: application.message,
      portfolioLinks: application.portfolioLinks ? [...application.portfolioLinks] : null,
      applicationSource: application.applicationSource,
    })
  }

  async decide(
    context: MarketplaceApplicationExecutionContext,
    input: DecideMarketplaceApplicationInput
  ): Promise<Result<void, AppException>> {
    const result = await this.tasks.decide(context, input)
    if (result.isFailure()) {
      return Result.fail(result.getError())
    }

    return Result.ok()
  }

  async withdraw(
    context: MarketplaceApplicationExecutionContext,
    input: WithdrawMarketplaceApplicationInput
  ): Promise<Result<void, AppException>> {
    const result = await this.tasks.withdraw(context, input)
    if (result.isFailure()) {
      return Result.fail(result.getError())
    }

    return Result.ok()
  }

  async listForTask(
    context: MarketplaceApplicationExecutionContext,
    input: ListMarketplaceTaskApplicationsInput
  ): Promise<Result<MarketplaceApplicationPage<MarketplaceApplicationForReview>, AppException>> {
    const result = await this.tasks.listForTask(context, input)
    if (result.isFailure()) {
      return Result.fail(result.getError())
    }

    const page = result.getValue()
    return Result.ok({
      data: page.data.map(mapForReview),
      meta: mapPageMeta(page),
    })
  }

  async listForCurrentApplicant(
    context: MarketplaceApplicationExecutionContext,
    input: ListCurrentApplicantApplicationsInput
  ): Promise<Result<MarketplaceApplicationPage<CurrentApplicantMarketplaceApplication>, AppException>> {
    const result = await this.tasks.listForCurrentApplicant(context, input)
    if (result.isFailure()) {
      return Result.fail(result.getError())
    }

    const page = result.getValue()
    return Result.ok({
      data: page.data.map(mapForCurrentApplicant),
      meta: mapPageMeta(page),
    })
  }

  async listForOrganization(
    context: MarketplaceApplicationExecutionContext,
    input: ListOrganizationMarketplaceApplicationsInput
  ): Promise<Result<MarketplaceApplicationPage<MarketplaceApplicationForReview>, AppException>> {
    const result = await this.tasks.listForOrganization(context, input)
    if (result.isFailure()) {
      return Result.fail(result.getError())
    }

    const page = result.getValue()
    return Result.ok({
      data: page.data.map(mapForReview),
      meta: mapPageMeta(page),
    })
  }

  async score(
    context: MarketplaceApplicationExecutionContext,
    input: ScoreMarketplaceApplicationInput
  ): Promise<Result<MarketplaceApplicationScore, AppException>> {
    const result = await this.tasks.score(context, input)

    if (result.isFailure()) {
      return Result.fail(result.getError())
    }

    return Result.ok(mapScore(result.getValue()))
  }

  async rank(
    context: MarketplaceApplicationExecutionContext,
    input: RankMarketplaceTaskApplicationsInput
  ): Promise<Result<RankedMarketplaceApplication[], AppException>> {
    const result = await this.tasks.rank(context, input)
    if (result.isFailure()) {
      return Result.fail(result.getError())
    }

    return Result.ok(result.getValue().map(mapRanked))
  }
}

import type AppException from '#modules/errors/public_contracts/application_exception'
import type { Result } from '#modules/errors/public_contracts/result'

export type TaskApplicationCapabilityStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn'
export type TaskApplicationCapabilitySource = 'public_listing' | 'invitation' | 'referral'
export type TaskApplicationCapabilityAssignment = 'member' | 'external_contributor' | 'volunteer'

export interface TaskApplicationCapabilityContext {
  readonly userId: string | null
  readonly ip: string
  readonly userAgent: string
  readonly organizationId: string | null
  readonly requestId?: string | null
  readonly traceId?: string | null
  readonly workflowId?: string | null
}

export interface SubmitTaskApplicationInput {
  taskId: string
  message: string | null
  portfolioLinks: string[] | null
  applicationSource: TaskApplicationCapabilitySource
}

export interface DecideTaskApplicationInput {
  applicationId: string
  action: 'approve' | 'reject'
  rejectionReason: string | null
  assignmentType: TaskApplicationCapabilityAssignment
  estimatedHours: number | null
}

export interface WithdrawTaskApplicationInput {
  applicationId: string
}

export interface ListTaskApplicationsInput {
  taskId: string
  status: TaskApplicationCapabilityStatus | 'all'
  page: number
  perPage: number
}

export interface ListCurrentApplicantTaskApplicationsInput {
  status?: TaskApplicationCapabilityStatus | 'all'
  page: number
  perPage: number
}

export interface ListOrganizationTaskApplicationsInput {
  organizationId: string
  status?: TaskApplicationCapabilityStatus | 'all'
  page: number
  perPage: number
}

export interface ScoreTaskApplicationInput {
  taskId: string
  applicationId: string
}

export interface RankTaskApplicationsInput {
  taskId: string
}

export interface SubmittedTaskApplication {
  id: string
  taskId: string
  applicantId: string
  message: string | null
  portfolioLinks: string[] | null
  applicationSource: TaskApplicationCapabilitySource
}

export interface TaskApplicationPageMeta {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
}

export interface TaskApplicationForReview {
  id: string
  taskId: string
  applicationStatus: TaskApplicationCapabilityStatus
  message: string | null
  portfolioLinks: string[]
  appliedAt: string | null
  applicant: {
    id: string
    username: string | null
    email: string | null
  } | null
  task: {
    id: string
    title: string
    status: string
  } | null
  candidateSource: 'project_member' | 'org_member' | 'external'
}

export interface CurrentApplicantTaskApplication {
  id: string
  taskId: string
  applicationStatus: TaskApplicationCapabilityStatus
  message: string | null
  portfolioLinks: string[]
  rejectionReason: string | null
  appliedAt: string | null
  reviewedAt: string | null
  task: {
    id: string
    title: string
    status: string
    organizationName: string | null
    projectName: string | null
  } | null
}

export interface TaskApplicationPage<Item> {
  data: Item[]
  meta: TaskApplicationPageMeta
}

export interface TaskApplicationScore {
  matchScore: number
  skillMatch: number
  domainMatch: number
  deliveryReliability: number
  trustScore: number
  evidenceConfidence: 'low' | 'medium' | 'high'
  evidenceWarnings: string[]
  explanations: string[]
  risks: string[]
}

export interface RankedTaskApplication extends TaskApplicationScore {
  applicationId: string
  applicantId: string
  applicantName: string
  candidateSource: 'project_member' | 'org_member' | 'external'
  fitLabel: 'strong_match' | 'good_match' | 'partial_match' | 'weak_match'
  reviewedSkillsCount: number
  importedSkillsCount: number
  underDisputeSkillsCount: number
  latestConfidenceSignal: 'low' | 'medium' | 'high' | null
}

export interface TaskApplicationCapability {
  submit(
    context: TaskApplicationCapabilityContext,
    input: SubmitTaskApplicationInput
  ): Promise<Result<SubmittedTaskApplication, AppException>>
  decide(
    context: TaskApplicationCapabilityContext,
    input: DecideTaskApplicationInput
  ): Promise<Result<void, AppException>>
  withdraw(
    context: TaskApplicationCapabilityContext,
    input: WithdrawTaskApplicationInput
  ): Promise<Result<void, AppException>>
  listForTask(
    context: TaskApplicationCapabilityContext,
    input: ListTaskApplicationsInput
  ): Promise<Result<TaskApplicationPage<TaskApplicationForReview>, AppException>>
  listForCurrentApplicant(
    context: TaskApplicationCapabilityContext,
    input: ListCurrentApplicantTaskApplicationsInput
  ): Promise<Result<TaskApplicationPage<CurrentApplicantTaskApplication>, AppException>>
  listForOrganization(
    context: TaskApplicationCapabilityContext,
    input: ListOrganizationTaskApplicationsInput
  ): Promise<Result<TaskApplicationPage<TaskApplicationForReview>, AppException>>
  score(
    context: TaskApplicationCapabilityContext,
    input: ScoreTaskApplicationInput
  ): Promise<Result<TaskApplicationScore, AppException>>
  rank(
    context: TaskApplicationCapabilityContext,
    input: RankTaskApplicationsInput
  ): Promise<Result<RankedTaskApplication[], AppException>>
}

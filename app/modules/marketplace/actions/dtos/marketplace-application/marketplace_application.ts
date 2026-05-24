export type MarketplaceApplicationStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn'
export type MarketplaceApplicationSource = 'public_listing' | 'invitation' | 'referral'
export type MarketplaceAssignmentType = 'member' | 'external_contributor' | 'volunteer'

export interface MarketplaceApplicationExecutionContext {
  readonly userId: string | null
  readonly ip: string
  readonly userAgent: string
  readonly organizationId: string | null
  readonly requestId?: string | null
  readonly traceId?: string | null
  readonly workflowId?: string | null
}

export interface SubmitMarketplaceApplicationInput {
  taskId: string
  message: string | null
  portfolioLinks: string[] | null
  applicationSource: MarketplaceApplicationSource
}

export interface DecideMarketplaceApplicationInput {
  applicationId: string
  action: 'approve' | 'reject'
  rejectionReason: string | null
  assignmentType: MarketplaceAssignmentType
  estimatedHours: number | null
}

export interface WithdrawMarketplaceApplicationInput {
  applicationId: string
}

export interface ListMarketplaceTaskApplicationsInput {
  taskId: string
  status: MarketplaceApplicationStatus | 'all'
  page: number
  perPage: number
}

export interface ListCurrentApplicantApplicationsInput {
  status?: MarketplaceApplicationStatus | 'all'
  page: number
  perPage: number
}

export interface ListOrganizationMarketplaceApplicationsInput {
  organizationId: string
  status?: MarketplaceApplicationStatus | 'all'
  page: number
  perPage: number
}

export interface ScoreMarketplaceApplicationInput {
  taskId: string
  applicationId: string
}

export interface RankMarketplaceTaskApplicationsInput {
  taskId: string
}

export interface SubmittedMarketplaceApplication {
  id: string
  taskId: string
  applicantId: string
  message: string | null
  portfolioLinks: string[] | null
  applicationSource: MarketplaceApplicationSource
}

export interface MarketplaceApplicationPageMeta {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
}

export interface MarketplaceApplicationForReview {
  id: string
  taskId: string
  applicationStatus: MarketplaceApplicationStatus
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

export interface CurrentApplicantMarketplaceApplication {
  id: string
  taskId: string
  applicationStatus: MarketplaceApplicationStatus
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

export interface MarketplaceApplicationPage<Item> {
  data: Item[]
  meta: MarketplaceApplicationPageMeta
}

export interface MarketplaceApplicationScore {
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

export interface RankedMarketplaceApplication extends MarketplaceApplicationScore {
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

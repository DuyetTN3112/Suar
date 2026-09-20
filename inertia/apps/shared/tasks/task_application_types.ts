import type { ApplicationStatus } from '@/apps/user/shared/constants'
import type { OffsetPagePagination } from '@/apps/user/shared/lib/pagination'

export interface ApplicationUser {
  id: string
  username: string
  email: string
}

export type CandidateSource = 'project_member' | 'org_member' | 'external' | string

export interface Application {
  id: string
  user?: ApplicationUser
  status: ApplicationStatus
  cover_letter?: string
  portfolio_links?: string[]
  estimated_duration?: number
  created_at: string
  candidate_source?: CandidateSource | null
}

export type EvidenceConfidence = 'low' | 'medium' | 'high'
export type FitLabel = 'strong_match' | 'good_match' | 'partial_match' | 'weak_match'

export interface RankedApplication {
  applicationId: string
  rank?: number
  matchScore: number
  skillMatch?: number | null
  domainMatch?: number | null
  deliveryReliability?: number | null
  trustScore: number
  evidenceConfidence?: EvidenceConfidence
  evidenceWarnings?: string[]
  explanations?: string[]
  risks?: string[]
  candidateSource?: string
  fitLabel?: FitLabel
  reviewedSkillsCount?: number
  importedSkillsCount?: number
  underDisputeSkillsCount?: number
  latestConfidenceSignal?: EvidenceConfidence | null
}

export type AssignmentType = 'member' | 'external_contributor' | 'volunteer'

export interface TaskApplicationsProps {
  shellMode?: 'app' | 'organization'
  auth?: { user?: { current_organization_role?: string | null } }
  taskId: string
  applications: Application[]
  pagination: OffsetPagePagination
  statusFilter: string
}

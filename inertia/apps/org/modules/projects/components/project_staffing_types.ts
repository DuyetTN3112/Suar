import type { ProjectMember } from '../types'

export interface ProfessionalRoleOption {
  id: string
  name: string
  code: string
  isActive?: boolean
}

export interface RoleCandidateSummary {
  userId: string
  username: string
  source: 'project_member' | 'org_member' | 'external'
  matchScore: number
  matchedSkills: number
  totalRequiredSkills: number
  skillGaps: string[]
  reviewedSkillsCount: number
  importedSkillsCount: number
  underDisputeSkillsCount: number
  latestConfidenceSignal: 'low' | 'medium' | 'high' | null
}

export interface RoleCandidateInsight {
  roleId: string
  roleName: string
  roleCode: string
  totalCandidates: number
  orgMemberCandidates: number
  projectMemberCandidates: number
  topCandidate: RoleCandidateSummary | null
  topCandidates: RoleCandidateSummary[]
}

export interface AutoFillPreviewItem {
  roleId: string
  roleName: string
  candidate: RoleCandidateSummary | null
  excluded: boolean
  actionType: 'add_member' | 'update_member' | null
}

export interface AutoFillResultItem {
  roleId: string
  roleName: string
  candidateUserId: string | null
  candidateUsername: string | null
  actionType: 'add_member' | 'update_member' | null
  status: 'success' | 'error'
  errorMessage?: string
  reviewedSkillsCount?: number | null
  importedSkillsCount?: number | null
  underDisputeSkillsCount?: number | null
  latestConfidenceSignal?: 'low' | 'medium' | 'high' | null
  matchedSkills?: number | null
  totalRequiredSkills?: number | null
  skillGaps?: string[]
}

export interface RoleCandidateResponsePayload {
  data: {
    role: { id: string; name: string; code: string }
    candidates: RoleCandidateSummary[]
    orgMembers?: unknown[]
    projectMembers?: unknown[]
  }
}

export interface ProjectStaffingStoreProps {
  projectId: string
  members: ProjectMember[]
  activeProfessionalRoles: ProfessionalRoleOption[]
  unstaffedProfessionalRoles: ProfessionalRoleOption[]
}

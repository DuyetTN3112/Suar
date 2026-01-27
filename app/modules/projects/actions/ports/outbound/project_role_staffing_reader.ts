export interface ProjectRoleStaffingRequirementProjection {
  skillId: string
  skillName: string
  minimumLevelId: string | null
  targetLevelId: string | null
  assessmentCeilingLevelId: string | null
  isMandatory: boolean
  importance: string
  weight: number
}

export interface ProjectRoleStaffingLevelProjection {
  id: string
  code: string
  ordinal: number
}

export interface ProjectRoleStaffingRoleProjection {
  id: string
  projectId: string
  name: string
  code: string
  requirements: ProjectRoleStaffingRequirementProjection[]
  levels: ProjectRoleStaffingLevelProjection[]
}

export interface ProjectRoleStaffingCandidateProjection {
  userId: string
  username: string
  email: string
  skills: Array<{
    skillId: string
    proficiencyCode: string
  }>
  reviewedSkillsCount: number
  importedSkillsCount: number
  underDisputeSkillsCount: number
  latestConfidenceSignal: 'low' | 'medium' | 'high' | null
}

export interface ProjectRoleStaffingCandidatePoolProjection {
  candidates: ProjectRoleStaffingCandidateProjection[]
  projectMemberUserIds: string[]
  organizationMemberUserIds: string[]
}

export abstract class ProjectRoleStaffingReader {
  abstract findRole(roleId: string): Promise<ProjectRoleStaffingRoleProjection | null>

  abstract loadCandidatePool(
    projectId: string,
    organizationId: string,
    requiredSkillIds: string[]
  ): Promise<ProjectRoleStaffingCandidatePoolProjection>
}

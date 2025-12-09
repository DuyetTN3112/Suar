export interface ProjectProfessionalRoleOption {
  id: string
  name: string
  code: string
}

export interface ProjectProfessionalRolesResponse {
  data?: ProjectProfessionalRoleOption[]
}

export interface RoleRequirementRecord {
  skillId: string
  skillName: string
  categoryCode?: string | null
  projectSkillId?: string
  sourceProjectProfessionalRoleId?: string
  sourceRoleSkillId?: string
  minimumLevelId?: string
  targetLevelId?: string
  assessmentCeilingLevelId?: string
  minimumLevelCode?: string | null
  targetLevelCode?: string | null
  assessmentCeilingLevelCode?: string | null
  requiredLevelCode?: string
  isMandatory?: boolean
  importance?: string
  weight?: number
  requirementSource?: string
  requirementNotes?: string
}

export interface RoleRequirementsResponse {
  data?: {
    roleId?: string
    roleName?: string
    requirements?: RoleRequirementRecord[]
  }
}

export interface ProjectDetailMemberRecord {
  userId: string
  username: string
  email: string
  role: string
  projectProfessionalRoleId?: string | null
  professionalRoleName?: string | null
}

export interface ProjectDetailApiResponse {
  data?: {
    project?: {
      visibility?: string | null
    }
    members?: ProjectDetailMemberRecord[]
  }
}

export interface ProjectMemberCandidateResponse {
  data?: {
    userId: string
    username: string
    email: string
    orgRole: string
  }[]
}

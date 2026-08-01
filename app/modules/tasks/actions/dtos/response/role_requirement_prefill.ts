export interface RoleRequirementPrefillItem {
  skillId: string
  skillName: string
  categoryCode: string | null
  projectSkillId: string
  sourceProjectProfessionalRoleId: string
  sourceRoleSkillId: string
  minimumLevelId: string | null
  targetLevelId: string | null
  assessmentCeilingLevelId: string | null
  minimumLevelCode: string | null
  targetLevelCode: string | null
  assessmentCeilingLevelCode: string | null
  requiredLevelCode: string
  isMandatory: boolean
  importance: string
  weight: number
  requirementSource: 'professional_role_prefill'
  requirementNotes: string | null
}

export interface GetRoleRequirementsResult {
  roleId: string
  roleName: string
  requirements: RoleRequirementPrefillItem[]
}

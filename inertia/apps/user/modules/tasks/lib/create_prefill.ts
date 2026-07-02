interface RoleRequirementRecord {
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

export interface PrefilledTaskSkill {
  id: string
  name: string
  level: string
  categoryCode?: string | null
  custom_name?: string
  category_code?: string | null
  project_skill_id?: string
  source_project_professional_role_id?: string
  source_role_skill_id?: string
  minimum_level_id?: string
  target_level_id?: string
  assessment_ceiling_level_id?: string
  minimum_level_code?: string | null
  target_level_code?: string | null
  assessment_ceiling_level_code?: string | null
  is_mandatory?: boolean
  importance?: string
  weight?: number
  requirement_source?: string
  requirement_notes?: string
}

export interface RoleMatchedProjectMember {
  id: string
  username: string
  email: string
  governanceRole?: string | null
  deliveryRoleName?: string | null
  projectProfessionalRoleId?: string | null
}

export function buildPrefilledTaskSkills(
  requirements: RoleRequirementRecord[] | null | undefined
): PrefilledTaskSkill[] {
  return (requirements ?? []).map((req) => ({
    id: req.skillId,
    name: req.skillName,
    level: req.requiredLevelCode?.trim().toLowerCase() || 'l4',
    categoryCode: req.categoryCode ?? null,
    project_skill_id: req.projectSkillId,
    source_project_professional_role_id: req.sourceProjectProfessionalRoleId,
    source_role_skill_id: req.sourceRoleSkillId,
    minimum_level_id: req.minimumLevelId,
    target_level_id: req.targetLevelId,
    assessment_ceiling_level_id: req.assessmentCeilingLevelId,
    minimum_level_code: req.minimumLevelCode?.trim().toLowerCase() || null,
    target_level_code: req.targetLevelCode?.trim().toLowerCase() || null,
    assessment_ceiling_level_code: req.assessmentCeilingLevelCode?.trim().toLowerCase() || null,
    is_mandatory: req.isMandatory,
    importance: req.importance,
    weight: req.weight,
    requirement_source: req.requirementSource,
    requirement_notes: req.requirementNotes,
  }))
}

export function findRoleMatchedProjectMembers(
  roleId: string | null | undefined,
  projectMembers: RoleMatchedProjectMember[] | null | undefined
): RoleMatchedProjectMember[] {
  if (!roleId) return []

  return (projectMembers ?? []).filter((member) => member.projectProfessionalRoleId === roleId)
}

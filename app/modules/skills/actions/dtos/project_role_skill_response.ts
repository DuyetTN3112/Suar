import type { SkillImportance } from '#modules/skills/public_contracts/skill_constants'

/**
 * Application result shape consumed by project-role presentation mappers.
 * Persistence relations remain private to the repository port.
 */
export interface ProjectRoleSkillResponseRecord {
  id: string
  project_professional_role_id: string
  project_skill_id: string
  minimum_level_id: string | null
  target_level_id: string | null
  assessment_ceiling_level_id: string | null
  is_mandatory: boolean
  importance: SkillImportance
  weight: number
  sort_order: number
  notes: string | null
}

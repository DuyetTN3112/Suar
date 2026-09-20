export interface Skill {
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
  rubric_version_id?: string | null
  minimum_level_code?: string | null
  target_level_code?: string | null
  assessment_ceiling_level_code?: string | null
  is_mandatory?: boolean
  importance?: string
  weight?: number
  requirement_source?: string
  requirement_notes?: string
}

export interface AvailableSkill {
  id: string
  projectSkillId?: string | null
  name: string
  categoryCode?: string | null
  rubricVersionId?: string | null
  rubric_version_id?: string | null
  minimumTaskRequirementLevelId?: string | null
  maximumTaskRequirementLevelId?: string | null
  minimumTaskRequirementLevelCode?: string | null
  maximumTaskRequirementLevelCode?: string | null
}

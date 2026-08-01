export interface TaskRequirementSkillProjection {
  id: string
  skill_name: string
  skill_code: string
  category_code: string
  icon_url: string | null
}

export interface TaskRequirementProficiencyLevelProjection {
  id: string
  code: string
  display_name: string
  short_name: string | null
  ordinal: number
}

export interface TaskRequirementProjection {
  id: string
  task_id: string
  skill_id: string
  project_skill_id: string | null
  source_project_professional_role_id: string | null
  source_role_skill_id: string | null
  minimum_level_id: string | null
  target_level_id: string | null
  assessment_ceiling_level_id: string | null
  rubric_version_id: string | null
  required_public_proficiency_code: string
  proficiency_level_id: string | null
  is_mandatory: boolean
  importance: 'low' | 'medium' | 'high' | 'critical'
  weight: number
  requirement_source:
    | 'manual'
    | 'professional_role_prefill'
    | 'template'
    | 'copied_task'
    | 'imported_legacy'
  requirement_notes: string | null
  created_at: string | null
  skill: TaskRequirementSkillProjection
  minimum_level: TaskRequirementProficiencyLevelProjection | null
  target_level: TaskRequirementProficiencyLevelProjection | null
  assessment_ceiling_level: TaskRequirementProficiencyLevelProjection | null
}


export interface SkillActiveSkillOption {
  id: string
  skill_name: string
  category_code: string | null
  is_active: boolean
}

export interface SkillReader {
  listActiveSkills(): Promise<SkillActiveSkillOption[]>
}

export interface SkillExternalDependencies {
  skill: SkillReader
}
